import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/authorization"
import { writeAdminAudit } from "@/lib/adminAudit"
import { DEFAULT_EXPOSURE_POLICY, getExposurePolicy } from "@/lib/exposureRanking"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const [{ data: row }, { data: sellers }] = await Promise.all([
    supabaseAdmin.from("ExposurePolicy").select("*").eq("id", "default").maybeSingle(),
    supabaseAdmin.from("Seller").select("id, marketName").eq("status", "APPROVED").eq("isOpen", true).order("marketName"),
  ])
  return NextResponse.json({ policy: row ?? { id: "default", ...DEFAULT_EXPOSURE_POLICY }, sellers: sellers ?? [] })
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const body = await req.json()
  const inventoryMode = String(body.inventoryMode ?? "NONE")
  if (!["NONE", "HIGH_STOCK", "LOW_STOCK"].includes(inventoryMode)) return NextResponse.json({ error: "재고 정렬 정책을 확인해주세요" }, { status: 400 })
  const preferredSellerIds = [...new Set((Array.isArray(body.preferredSellerIds) ? body.preferredSellerIds : []).map(String))].slice(0, 20)
  if (preferredSellerIds.length) {
    const { data: valid } = await supabaseAdmin.from("Seller").select("id").in("id", preferredSellerIds)
    if ((valid ?? []).length !== preferredSellerIds.length) return NextResponse.json({ error: "우선 판매처를 확인해주세요" }, { status: 400 })
  }
  const before = await getExposurePolicy()
  const after = {
    id: "default",
    nonghyupPriorityEnabled: body.nonghyupPriorityEnabled !== false,
    preferredSellerIds,
    inventoryMode,
    adminPromotionsEnabled: body.adminPromotionsEnabled !== false,
    sellerPoliciesEnabled: body.sellerPoliciesEnabled !== false,
    updatedAt: new Date().toISOString(),
  }
  const { data, error } = await supabaseAdmin.from("ExposurePolicy").upsert(after).select("*").single()
  if (error) return NextResponse.json({ error: "노출 정책을 저장하지 못했어요. DB 마이그레이션 적용 여부를 확인해주세요." }, { status: 500 })
  await writeAdminAudit({ actorId: admin.id, action: "EXPOSURE_POLICY_UPDATE", targetType: "EXPOSURE_POLICY", targetId: "default", before, after })
  return NextResponse.json({ policy: data })
}

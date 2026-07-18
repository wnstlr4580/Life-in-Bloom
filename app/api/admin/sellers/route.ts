import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireAdmin } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const { data, error } = await supabaseAdmin
    .from("Seller")
    .select("id, status, marketName, legalBusinessName, businessNumber, representativeName, managerName, managerPhone, sellerType, submittedAt, offersCustomBouquet, offersDiyFlowers, User(email)")
    .order("submittedAt", { ascending: false })
  if (error) return NextResponse.json({ error: "판매처 목록을 불러오지 못했어요" }, { status: 500 })
  return NextResponse.json({ sellers: data ?? [] })
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const { sellerId, status, reason } = await req.json()
  if (!sellerId || !["UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"].includes(status)) {
    return NextResponse.json({ error: "처리 상태를 확인해주세요" }, { status: 400 })
  }
  if ((status === "REJECTED" || status === "SUSPENDED") && !String(reason ?? "").trim()) {
    return NextResponse.json({ error: "반려 또는 정지 사유를 입력해주세요" }, { status: 400 })
  }

  const { data: seller } = await supabaseAdmin.from("Seller").select("*").eq("id", sellerId).maybeSingle()
  if (!seller) return NextResponse.json({ error: "판매처를 찾을 수 없어요" }, { status: 404 })
  if (seller.status === status) return NextResponse.json({ ok: true, unchanged: true })
  const now = new Date().toISOString()
  let requestedChanges: Record<string, string> = {}
  if (status === "APPROVED") {
    const { data: latest } = await supabaseAdmin.from("SellerReview").select("snapshot").eq("sellerId", sellerId).eq("toStatus", "UNDER_REVIEW").order("createdAt", { ascending: false }).limit(1).maybeSingle()
    const snapshot = latest?.snapshot as { requestType?: string; requestedChanges?: Record<string, string> } | null
    if (snapshot?.requestType === "SELLER_CHANGE_REQUEST") requestedChanges = snapshot.requestedChanges ?? {}
  }
  const { error } = await supabaseAdmin
    .from("Seller")
    .update({ ...requestedChanges, status, approvedAt: status === "APPROVED" ? now : seller.approvedAt, updatedAt: now })
    .eq("id", sellerId)
  if (error) return NextResponse.json({ error: "상태 변경에 실패했어요" }, { status: 500 })

  await supabaseAdmin.from("SellerReview").insert({
    id: nanoid(), sellerId, reviewerId: admin.id, fromStatus: seller.status,
    toStatus: status, reason: String(reason ?? "").trim() || null, snapshot: seller,
  })
  return NextResponse.json({ ok: true, status })
}

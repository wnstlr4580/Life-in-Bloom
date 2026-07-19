import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { requireAdmin } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { writeAdminAudit } from "@/lib/adminAudit"

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const q = req.nextUrl.searchParams.get("q")?.trim()
  const role = req.nextUrl.searchParams.get("role")
  const status = req.nextUrl.searchParams.get("status")
  const region = req.nextUrl.searchParams.get("region")?.trim()
  const sellerOnly = req.nextUrl.searchParams.get("sellerOnly") === "true"
  let query = supabaseAdmin.from("User")
    .select("id, email, name, role, status, city, points, suspendedAt, suspendedUntil, suspendedReason, passwordResetRequired, createdAt, Seller(id, marketName, status, roadAddress)")
    .order("createdAt", { ascending: false }).limit(200)
  if (q) query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%`)
  if (role && role !== "ALL") query = query.eq("role", role)
  if (status && status !== "ALL") query = query.eq("status", status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: "사용자 목록을 불러오지 못했어요" }, { status: 500 })
  const users = (data ?? []).filter((user) => {
    const seller = Array.isArray(user.Seller) ? user.Seller[0] : user.Seller
    if (sellerOnly && !seller) return false
    if (region && region !== "ALL" && !`${user.city ?? ""} ${seller?.roadAddress ?? ""}`.includes(region)) return false
    return true
  })
  return NextResponse.json({ users })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const { userId, action, reason, suspendedUntil } = await req.json()
  const { data: user } = await supabaseAdmin.from("User").select("*").eq("id", userId).maybeSingle()
  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없어요" }, { status: 404 })
  if (user.id === admin.id && action === "SUSPEND") return NextResponse.json({ error: "현재 관리자 계정은 차단할 수 없어요" }, { status: 400 })
  let update: Record<string, unknown> = {}
  let temporaryPassword: string | undefined
  if (action === "SUSPEND") {
    if (!String(reason ?? "").trim()) return NextResponse.json({ error: "차단 사유를 입력해주세요" }, { status: 400 })
    update = { status: "SUSPENDED", suspendedAt: new Date().toISOString(), suspendedUntil: suspendedUntil || null, suspendedReason: String(reason).trim() }
  } else if (action === "ACTIVATE") {
    update = { status: "ACTIVE", suspendedAt: null, suspendedUntil: null, suspendedReason: null }
  } else if (action === "RESET_PASSWORD") {
    temporaryPassword = `Bloom!${Math.random().toString(36).slice(2, 10)}`
    update = { password: await bcrypt.hash(temporaryPassword, 12), passwordResetRequired: true }
  } else {
    return NextResponse.json({ error: "처리 유형을 확인해주세요" }, { status: 400 })
  }
  const { error } = await supabaseAdmin.from("User").update(update).eq("id", userId)
  if (error) return NextResponse.json({ error: "사용자 상태 변경에 실패했어요" }, { status: 500 })
  await writeAdminAudit({ actorId: admin.id, action, targetType: "USER", targetId: userId, reason, before: user, after: update })
  return NextResponse.json({ ok: true, temporaryPassword })
}

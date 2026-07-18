import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(req: Request) {
  const actor = await requireSeller()
  if (!actor?.seller) return NextResponse.json({ error: "판매자 로그인이 필요해요" }, { status: 403 })
  const body = await req.json()
  const reason = String(body.reason ?? "").trim()
  const businessNumber = String(body.businessNumber ?? "").replace(/\D/g, "")
  const legalBusinessName = String(body.legalBusinessName ?? "").trim()
  const representativeName = String(body.representativeName ?? "").trim()
  const settlementBank = String(body.settlementBank ?? "").trim()
  const settlementAccount = String(body.settlementAccount ?? "").replace(/\D/g, "")
  const settlementHolder = String(body.settlementHolder ?? "").trim()
  if (reason.length < 5 || reason.length > 500) return NextResponse.json({ error: "변경 사유를 5~500자로 입력해주세요" }, { status: 400 })
  if (businessNumber.length !== 10 || !legalBusinessName || !representativeName) return NextResponse.json({ error: "변경할 사업자 정보를 확인해주세요" }, { status: 400 })
  if (!settlementBank || settlementAccount.length < 8 || settlementAccount.length > 20 || !settlementHolder) return NextResponse.json({ error: "변경할 정산 정보를 확인해주세요" }, { status: 400 })
  const { data: seller } = await supabaseAdmin.from("Seller").select("*").eq("id", actor.seller.id).single()
  if (!seller) return NextResponse.json({ error: "판매처를 찾을 수 없어요" }, { status: 404 })
  if (seller.status === "UNDER_REVIEW") return NextResponse.json({ error: "이미 재심사가 진행 중입니다" }, { status: 409 })
  const requestedChanges = { businessNumber, legalBusinessName, representativeName, settlementBank, settlementAccount, settlementHolder }
  const now = new Date().toISOString()
  const { error } = await supabaseAdmin.from("SellerReview").insert({
    id: nanoid(), sellerId: seller.id, reviewerId: null, fromStatus: seller.status,
    toStatus: "UNDER_REVIEW", reason, snapshot: { seller, requestedChanges, requestType: "SELLER_CHANGE_REQUEST" },
  })
  if (error) return NextResponse.json({ error: "재심사 요청을 저장하지 못했어요" }, { status: 500 })
  await supabaseAdmin.from("Seller").update({ status: "UNDER_REVIEW", submittedAt: now, updatedAt: now }).eq("id", seller.id)
  return NextResponse.json({ ok: true, status: "UNDER_REVIEW" })
}

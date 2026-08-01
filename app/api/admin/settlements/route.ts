import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/authorization"
import { writeAdminAudit } from "@/lib/adminAudit"
import { calculateSettlement, nextWeeklyPayoutDate } from "@/lib/settlement"
import { supabaseAdmin } from "@/lib/supabase"

const FIELDS = `id, orderId, sellerId, quantity, price, commissionRate, commissionFee, commissionVat,
  shippingFeeAmount, discountShare, pgFee, pgFeeVat, adjustmentAmount, settlementAmount,
  settlementStatus, settlementDueAt, settledAt, confirmedAt,
  seller:Seller(id, marketName, settlementBank, settlementAccount, settlementHolder, commissionRate), product:Product(name)`

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const { data, error } = await supabaseAdmin.from("OrderItem").select(FIELDS).in("settlementStatus", ["WAITING", "READY", "HOLD", "PAID"]).order("settlementDueAt", { ascending: true, nullsFirst: false }).limit(1000)
  if (error) return NextResponse.json({ error: "정산 내역을 불러오지 못했어요" }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const body = await req.json()
  const action = String(body.action ?? "")
  const reason = String(body.reason ?? "").trim()

  if (action === "UPDATE_SELLER_RATE") {
    const sellerId = String(body.sellerId ?? "")
    const commissionRate = Number(body.commissionRate)
    if (!sellerId || !Number.isInteger(commissionRate) || commissionRate < 0 || commissionRate > 100) return NextResponse.json({ error: "수수료율은 0~100 사이의 정수여야 해요" }, { status: 400 })
    const { data: before } = await supabaseAdmin.from("Seller").select("commissionRate").eq("id", sellerId).maybeSingle()
    if (!before) return NextResponse.json({ error: "판매처를 찾을 수 없어요" }, { status: 404 })
    const { error } = await supabaseAdmin.from("Seller").update({ commissionRate }).eq("id", sellerId)
    if (error) return NextResponse.json({ error: "수수료율을 저장하지 못했어요" }, { status: 500 })
    await writeAdminAudit({ actorId: admin.id, action: "SELLER_COMMISSION_RATE_UPDATE", targetType: "SELLER", targetId: sellerId, reason, before, after: { commissionRate } })
    return NextResponse.json({ ok: true })
  }

  const itemIds = [...new Set((Array.isArray(body.itemIds) ? body.itemIds : []).map(String))]
  if (!itemIds.length || !["PAY", "HOLD", "RELEASE", "ADJUST"].includes(action)) return NextResponse.json({ error: "정산 처리 대상을 확인해주세요" }, { status: 400 })
  const { data: items } = await supabaseAdmin.from("OrderItem").select("*").in("id", itemIds)
  if (!items || items.length !== itemIds.length) return NextResponse.json({ error: "일부 정산 건을 찾을 수 없어요" }, { status: 404 })
  if ((action === "HOLD" || action === "ADJUST") && !reason) return NextResponse.json({ error: "보류·조정 사유를 입력해주세요" }, { status: 400 })

  if (action === "PAY") {
    const now = new Date()
    if (items.some((item) => item.settlementStatus !== "READY" || !item.settlementDueAt || new Date(item.settlementDueAt) > now)) return NextResponse.json({ error: "지급일이 도래한 정산 예정 건만 지급 처리할 수 있어요" }, { status: 409 })
    await supabaseAdmin.from("OrderItem").update({ settlementStatus: "PAID", settledAt: now.toISOString() }).in("id", itemIds)
  } else if (action === "HOLD") {
    if (items.some((item) => !["WAITING", "READY"].includes(item.settlementStatus))) return NextResponse.json({ error: "대기·예정 건만 보류할 수 있어요" }, { status: 409 })
    await supabaseAdmin.from("OrderItem").update({ settlementStatus: "HOLD" }).in("id", itemIds)
  } else if (action === "RELEASE") {
    if (items.some((item) => item.settlementStatus !== "HOLD")) return NextResponse.json({ error: "보류 건만 해제할 수 있어요" }, { status: 409 })
    await supabaseAdmin.from("OrderItem").update({ settlementStatus: "READY", settlementDueAt: nextWeeklyPayoutDate(new Date()).toISOString() }).in("id", itemIds)
  } else {
    if (items.length !== 1 || ["PAID", "CANCELLED"].includes(items[0].settlementStatus)) return NextResponse.json({ error: "미지급 정산 건 하나만 조정할 수 있어요" }, { status: 409 })
    const adjustmentAmount = Math.round(Number(body.adjustmentAmount))
    if (!Number.isFinite(adjustmentAmount)) return NextResponse.json({ error: "조정 금액을 확인해주세요" }, { status: 400 })
    const item = items[0]
    const calculated = calculateSettlement({ grossAmount: item.price * item.quantity, shippingFeeAmount: item.shippingFeeAmount, commissionRate: item.commissionRate, discountShare: item.discountShare, pgFee: item.pgFee, adjustmentAmount })
    await supabaseAdmin.from("OrderItem").update({ adjustmentAmount, settlementAmount: calculated.settlementAmount }).eq("id", item.id)
  }
  await writeAdminAudit({ actorId: admin.id, action: `SETTLEMENT_${action}`, targetType: "ORDER_ITEM", targetId: itemIds.join(","), reason, before: items, after: { action, adjustmentAmount: body.adjustmentAmount } })
  return NextResponse.json({ ok: true })
}

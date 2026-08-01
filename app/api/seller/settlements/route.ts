import { NextResponse } from "next/server"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const actor = await requireSeller(true)
  if (!actor?.seller) {
    const pendingActor = await requireSeller()
    return NextResponse.json({ error: "현재 판매처 심사가 진행 중입니다. 승인 완료 후 정산 내역을 확인할 수 있어요.", status: pendingActor?.seller?.status }, { status: 403 })
  }
  const { data: seller } = await supabaseAdmin.from("Seller").select("settlementBank, settlementAccount, settlementHolder").eq("id", actor.seller.id).single()
  const { data, error } = await supabaseAdmin.from("OrderItem").select(`
    id, orderId, quantity, price, itemType, fulfillmentStatus, commissionRate, commissionFee, commissionVat,
    shippingFeeAmount, discountShare, pgFee, pgFeeVat, adjustmentAmount, settlementAmount, settlementStatus, settlementDueAt, settledAt,
    product:Product(name), order:Order(createdAt)
  `).eq("sellerId", actor.seller.id).neq("fulfillmentStatus", "CANCELLED").order("id", { ascending: false })
  if (error) return NextResponse.json({ error: "정산 내역을 불러오지 못했어요" }, { status: 500 })
  const items = data ?? []
  const sum = (status?: string) => items.filter((item) => !status || item.settlementStatus === status).reduce((total, item) => total + (item.settlementAmount ?? 0), 0)
  return NextResponse.json({
    items,
    summary: {
      gross: items.reduce((total, item) => total + item.price * item.quantity, 0),
      commission: items.reduce((total, item) => total + (item.commissionFee ?? 0), 0),
      commissionVat: items.reduce((total, item) => total + (item.commissionVat ?? 0), 0),
      shipping: items.reduce((total, item) => total + (item.shippingFeeAmount ?? 0), 0),
      adjustments: items.reduce((total, item) => total + (item.adjustmentAmount ?? 0), 0),
      waiting: sum("WAITING"), ready: sum("READY"), paid: sum("PAID"),
    },
    account: {
      bank: seller?.settlementBank, account: seller?.settlementAccount, holder: seller?.settlementHolder,
    },
  })
}

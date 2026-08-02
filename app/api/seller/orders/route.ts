import { NextResponse } from "next/server"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { revokeAllPointsForOrder } from "@/lib/points"

const STATUS = new Set(["PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"])
const TRANSITIONS: Record<string, string[]> = {
  PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
}

export async function GET(req: Request) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const url = new URL(req.url)
  const status = url.searchParams.get("status")
  const type = url.searchParams.get("type")
  const q = url.searchParams.get("q")?.trim().toLowerCase()
  let query = supabaseAdmin.from("OrderItem").select(`
    id, orderId, productId, quantity, price, itemType, fulfillmentStatus, courier, trackingNumber,
    shippedAt, deliveredAt, commissionFee, settlementAmount,
    product:Product(name, images, category),
    order:Order(id, createdAt, deliveryType, deliveryAt, shippingAddr, giftMessage, giftWrapping, paymentMethod)
  `).eq("sellerId", actor.seller.id).order("id", { ascending: false })
  if (status) query = query.eq("fulfillmentStatus", status)
  if (type) query = query.eq("itemType", type)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: "주문을 불러오지 못했어요" }, { status: 500 })
  const items = (data ?? []).filter((item) => {
    if (!q) return true
    const product = Array.isArray(item.product) ? item.product[0] : item.product
    const order = Array.isArray(item.order) ? item.order[0] : item.order
    const address = order?.shippingAddr as Record<string, string> | null
    return [item.orderId, product?.name, address?.name, address?.phone].some((value) => String(value ?? "").toLowerCase().includes(q))
  })
  return NextResponse.json({ items })
}

export async function PATCH(req: Request) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const body = await req.json()
  const id = String(body.id ?? "")
  const nextStatus = String(body.status ?? "")
  if (!id || !STATUS.has(nextStatus)) return NextResponse.json({ error: "주문 상태를 확인해주세요" }, { status: 400 })
  const { data: current } = await supabaseAdmin.from("OrderItem").select("fulfillmentStatus, orderId").eq("id", id).eq("sellerId", actor.seller.id).maybeSingle()
  if (!current) return NextResponse.json({ error: "주문상품을 찾을 수 없어요" }, { status: 404 })
  if (!TRANSITIONS[current.fulfillmentStatus]?.includes(nextStatus)) return NextResponse.json({ error: `${current.fulfillmentStatus} 상태에서는 해당 변경을 할 수 없어요` }, { status: 409 })
  const update: Record<string, unknown> = { fulfillmentStatus: nextStatus }
  if (nextStatus === "SHIPPED") {
    const courier = String(body.courier ?? "").trim()
    const trackingNumber = String(body.trackingNumber ?? "").replace(/\s/g, "")
    if (!courier || trackingNumber.length < 5) return NextResponse.json({ error: "택배사와 송장번호를 입력해주세요" }, { status: 400 })
    Object.assign(update, { courier, trackingNumber, shippedAt: new Date().toISOString() })
  }
  if (nextStatus === "DELIVERED") {
    const deliveredAt = new Date()
    Object.assign(update, {
      deliveredAt: deliveredAt.toISOString(), settlementStatus: "WAITING", settlementDueAt: null,
    })
  }
  if (nextStatus === "CANCELLED") Object.assign(update, { settlementStatus: "CANCELLED", settlementDueAt: null, settlementAmount: 0 })
  const { error } = await supabaseAdmin.from("OrderItem").update(update).eq("id", id).eq("sellerId", actor.seller.id)
  if (error) return NextResponse.json({ error: "주문 상태를 변경하지 못했어요" }, { status: 500 })
  const { data: siblings } = await supabaseAdmin.from("OrderItem").select("fulfillmentStatus").eq("orderId", current.orderId)
  const statuses = (siblings ?? []).map((item) => item.fulfillmentStatus)
  const orderStatus = statuses.every((value) => value === "CANCELLED") ? "CANCELLED"
    : statuses.every((value) => ["DELIVERED", "CANCELLED"].includes(value)) ? "DELIVERED"
    : statuses.some((value) => value === "SHIPPED") ? "SHIPPED"
    : statuses.some((value) => value === "PREPARING") ? "PREPARING" : "PAID"
  await supabaseAdmin.from("Order").update({ status: orderStatus }).eq("id", current.orderId)

  // 주문 전체가 취소로 확정되면 이 주문으로 오갔던 포인트를 전부 되돌린다 (회수/사용포인트 환급)
  if (orderStatus === "CANCELLED") {
    const { data: order } = await supabaseAdmin.from("Order").select("userId").eq("id", current.orderId).maybeSingle()
    if (order?.userId) await revokeAllPointsForOrder(current.orderId, order.userId)
  }

  return NextResponse.json({ ok: true })
}

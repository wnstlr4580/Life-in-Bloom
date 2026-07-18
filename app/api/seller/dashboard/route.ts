import { NextResponse } from "next/server"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const now = new Date()
  const soon = new Date(now.getTime() + 7 * 86400000).toISOString()
  const { data: products, error } = await supabaseAdmin
    .from("Product").select("id, stock, isActive, displayEndAt").eq("sellerId", actor.seller.id).neq("category", "custom")
  if (error) return NextResponse.json({ error: "대시보드 정보를 불러오지 못했어요" }, { status: 500 })
  const ids = (products ?? []).map((p) => p.id)
  let orderItems: { orderId: string; order: { status: string } | { status: string }[] | null }[] = []
  if (ids.length) {
    const { data } = await supabaseAdmin.from("OrderItem").select("orderId, order:Order(status)").in("productId", ids)
    orderItems = (data ?? []) as typeof orderItems
  }
  const orderStatuses = new Map<string, string>()
  orderItems.forEach((item) => {
    const order = Array.isArray(item.order) ? item.order[0] : item.order
    if (order) orderStatuses.set(item.orderId, order.status)
  })
  return NextResponse.json({
    totalProducts: products?.length ?? 0,
    activeProducts: products?.filter((p) => p.isActive).length ?? 0,
    soldOutProducts: products?.filter((p) => p.stock === 0).length ?? 0,
    endingSoonProducts: products?.filter((p) => p.displayEndAt && p.displayEndAt >= now.toISOString() && p.displayEndAt <= soon).length ?? 0,
    newOrders: [...orderStatuses.values()].filter((status) => status === "PAID").length,
    preparingOrders: [...orderStatuses.values()].filter((status) => status === "PREPARING").length,
  })
}

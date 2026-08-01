import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { nextWeeklyPayoutDate } from "@/lib/settlement"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })
  const { id } = await params
  const { data: item } = await supabaseAdmin.from("OrderItem")
    .select("id, fulfillmentStatus, order:Order!inner(userId, status)").eq("id", id).eq("order.userId", session.user.id).maybeSingle()
  if (!item) return NextResponse.json({ error: "주문 상품을 찾을 수 없어요" }, { status: 404 })
  const order = Array.isArray(item.order) ? item.order[0] : item.order
  if (item.fulfillmentStatus !== "DELIVERED" || order?.status === "CANCELLED") return NextResponse.json({ error: "배송 완료된 주문만 구매확정할 수 있어요" }, { status: 409 })
  const confirmedAt = new Date().toISOString()
  const settlementDueAt = nextWeeklyPayoutDate(new Date()).toISOString()
  const { error } = await supabaseAdmin.from("OrderItem").update({ fulfillmentStatus: "PURCHASE_CONFIRMED", confirmedAt, settlementStatus: "READY", settlementDueAt }).eq("id", id)
  if (error) return NextResponse.json({ error: "구매확정 처리에 실패했어요" }, { status: 500 })
  return NextResponse.json({ confirmedAt, settlementDueAt })
}

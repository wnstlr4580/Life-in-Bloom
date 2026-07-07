import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// 비회원 주문조회 — 주문번호 + 연락처가 일치해야 조회 가능
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get("orderId")?.trim()
  const phone = searchParams.get("phone")?.replace(/\D/g, "")

  if (!orderId || !phone) {
    return NextResponse.json({ error: "주문번호와 연락처를 입력해주세요" }, { status: 400 })
  }

  const { data: order } = await supabaseAdmin
    .from("Order")
    .select(`
      id, status, totalAmount, createdAt, deliveryType, shippingAddr,
      items:OrderItem(id, quantity, price, product:Product(name, images))
    `)
    .eq("id", orderId)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: "주문을 찾을 수 없어요" }, { status: 404 })

  const addr = order.shippingAddr as Record<string, string> | null
  const savedPhones = [addr?.phone, addr?.ordererPhone]
    .filter(Boolean)
    .map((p) => String(p).replace(/\D/g, ""))

  if (!savedPhones.includes(phone)) {
    return NextResponse.json({ error: "주문번호와 연락처가 일치하지 않아요" }, { status: 403 })
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    deliveryType: order.deliveryType,
    deliveryDate: addr?.deliveryDate ?? null,
    recipientName: addr?.name ?? null,
    items: order.items,
  })
}

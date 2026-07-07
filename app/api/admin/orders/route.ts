import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { isAdmin } from "@/lib/adminAuth"

const VALID_STATUS = ["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"]

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "권한이 없어요" }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from("Order")
    .select(`
      id, status, totalAmount, createdAt, deliveryType, shippingAddr, giftMessage,
      items:OrderItem(id, quantity, price, product:Product(name))
    `)
    .order("createdAt", { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "권한이 없어요" }, { status: 403 })

  const { orderId, status } = await req.json()
  if (!orderId || !VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("Order")
    .update({ status })
    .eq("id", orderId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

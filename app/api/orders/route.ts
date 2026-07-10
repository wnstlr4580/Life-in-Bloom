import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { nanoid } from "nanoid"

interface OrderItemInput {
  productId: string
  quantity: number
  price: number
}

export async function POST(req: Request) {
  // 로그인 없이도 주문할 수 있다 — 비회원 주문은 userId 없이 저장되고,
  // /orders/lookup(주문번호 + 연락처)으로 조회한다.
  const session = await auth()

  const { items, totalAmount, shippingFee, deliveryType, shippingAddr, giftMessage, giftWrapping, paymentId } = await req.json()

  if (!items?.length || !totalAmount || !deliveryType || !shippingAddr) {
    return NextResponse.json({ error: "필수 정보가 누락되었습니다" }, { status: 400 })
  }

  const orderId = nanoid()

  const { error: orderError } = await supabaseAdmin
    .from("Order")
    .insert({
      id: orderId,
      userId: session?.user?.id ?? null,
      totalAmount,
      shippingFee: shippingFee ?? 0,
      deliveryType,
      shippingAddr,
      giftMessage: giftMessage ?? null,
      giftWrapping: giftWrapping ?? false,
      qrCode: nanoid(12),
      status: paymentId ? "PAID" : "PENDING",
      paymentId: paymentId ?? null,
    })

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  const { error: itemsError } = await supabaseAdmin
    .from("OrderItem")
    .insert(
      (items as OrderItemInput[]).map((item) => ({
        id: nanoid(),
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      }))
    )

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  return NextResponse.json({ orderId }, { status: 201 })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from("Order")
    .select(`
      id, status, totalAmount, createdAt,
      items:OrderItem(
        id, quantity, price,
        product:Product(id, name, images, price)
      )
    `)
    .eq("userId", session.user.id)
    .order("createdAt", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] })
}

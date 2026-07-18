import { NextResponse } from "next/server"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const { data: seller } = await supabaseAdmin.from("Seller").select("offersCustomBouquet").eq("id", actor.seller.id).single()
  if (!seller?.offersCustomBouquet) return NextResponse.json({ error: "나만의 꽃다발 서비스를 먼저 활성화해주세요" }, { status: 403 })
  const { data: products, error } = await supabaseAdmin
    .from("Product").select("id, name, price, stock, images, flowerMeaning, isActive, createdAt")
    .eq("sellerId", actor.seller.id).eq("category", "custom").order("createdAt", { ascending: false })
  if (error) return NextResponse.json({ error: "커스텀 상품을 불러오지 못했어요" }, { status: 500 })
  const ids = (products ?? []).map((product) => product.id)
  let orders: unknown[] = []
  if (ids.length) {
    const { data } = await supabaseAdmin.from("OrderItem")
      .select("id, quantity, price, productId, order:Order(id, status, createdAt, shippingAddr, giftMessage)")
      .in("productId", ids).order("id", { ascending: false })
    orders = data ?? []
  }
  return NextResponse.json({ products: products ?? [], orders })
}

export async function PATCH(req: Request) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const { id, stock, isActive } = await req.json()
  if (!id || !Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: "재고 수량을 확인해주세요" }, { status: 400 })
  const { data, error } = await supabaseAdmin.from("Product")
    .update({ stock, isActive: Boolean(isActive) }).eq("id", id).eq("sellerId", actor.seller.id).eq("category", "custom")
    .select("id, stock, isActive").maybeSingle()
  if (error || !data) return NextResponse.json({ error: "커스텀 상품 재고를 수정하지 못했어요" }, { status: 400 })
  return NextResponse.json(data)
}

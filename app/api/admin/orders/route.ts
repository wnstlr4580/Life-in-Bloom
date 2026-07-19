import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { isAdmin } from "@/lib/adminAuth"

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "권한이 없어요" }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from("Order")
    .select(`
      id, status, totalAmount, createdAt, deliveryType, shippingAddr, giftMessage,
      items:OrderItem(id, quantity, price, itemType, fulfillmentStatus, seller:Seller(marketName), product:Product(name))
    `)
    .order("createdAt", { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] })
}

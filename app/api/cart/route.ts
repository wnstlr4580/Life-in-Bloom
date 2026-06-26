import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { nanoid } from "nanoid"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from("CartItem")
    .select("*, product:Product(id, name, price, images, stock)")
    .eq("userId", session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { productId, quantity = 1 } = await req.json()
  const userId = session.user.id

  const { data: existing } = await supabaseAdmin
    .from("CartItem")
    .select("id, quantity")
    .eq("userId", userId)
    .eq("productId", productId)
    .single()

  if (existing) {
    const { data } = await supabaseAdmin
      .from("CartItem")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id)
      .select("*, product:Product(id, name, price, images)")
      .single()
    return NextResponse.json(data)
  }

  const { data } = await supabaseAdmin
    .from("CartItem")
    .insert({ id: nanoid(), userId, productId, quantity })
    .select("*, product:Product(id, name, price, images)")
    .single()

  return NextResponse.json(data)
}

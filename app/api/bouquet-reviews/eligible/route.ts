import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ items: [] })
  const productId = new URL(req.url).searchParams.get("productId")
  let query = supabaseAdmin.from("OrderItem").select("id, confirmedAt, previewImageUrl, bouquetMode, composition, product:Product(id, name, images), order:Order!inner(userId, createdAt), review:Review(id)")
    .eq("order.userId", session.user.id).not("confirmedAt", "is", null).order("confirmedAt", { ascending: false })
  if (productId) query = query.eq("productId", productId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: "리뷰 가능한 구매내역을 불러오지 못했어요" }, { status: 500 })
  return NextResponse.json({ items: (data ?? []).filter((item) => !item.review || (Array.isArray(item.review) && item.review.length === 0)) })
}

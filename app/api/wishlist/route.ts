import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ productIds: [] })
  const { data, error } = await supabaseAdmin.from("WishlistItem").select("productId").eq("userId", session.user.id)
  if (error) return NextResponse.json({ error: "관심상품을 불러오지 못했어요" }, { status: 500 })
  return NextResponse.json({ productIds: (data ?? []).map((item) => item.productId) })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })
  const { productId } = await req.json()
  if (!productId) return NextResponse.json({ error: "상품을 선택해주세요" }, { status: 400 })
  const { error } = await supabaseAdmin.from("WishlistItem").upsert(
    { id: nanoid(), userId: session.user.id, productId }, { onConflict: "userId,productId", ignoreDuplicates: true }
  )
  if (error) return NextResponse.json({ error: "관심상품 저장에 실패했어요" }, { status: 500 })
  return NextResponse.json({ wished: true }, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })
  const productId = new URL(req.url).searchParams.get("productId")
  if (!productId) return NextResponse.json({ error: "상품을 선택해주세요" }, { status: 400 })
  const { error } = await supabaseAdmin.from("WishlistItem").delete().eq("userId", session.user.id).eq("productId", productId)
  if (error) return NextResponse.json({ error: "관심상품 해제에 실패했어요" }, { status: 500 })
  return NextResponse.json({ wished: false })
}

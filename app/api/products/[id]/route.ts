import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("Product")
    .select(`
      *,
      reviews:Review(
        id, rating, content, createdAt, userId,
        user:User(name, image)
      )
    `)
    .eq("id", id)
    .single()

  if (error || !data) return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 })

  return NextResponse.json(data)
}

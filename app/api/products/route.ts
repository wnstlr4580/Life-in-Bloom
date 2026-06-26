import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const ohaeng = searchParams.get("ohaeng")
  const color = searchParams.get("color")
  const page = Number(searchParams.get("page") ?? "1")
  const limit = 12

  let query = supabaseAdmin
    .from("Product")
    .select("id, name, price, images, flowerMeaning, category, stock", { count: "exact" })
    .eq("isActive", true)
    .order("createdAt", { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (category) query = query.eq("category", category)
  if (ohaeng) query = query.contains("ohaengTags", [ohaeng])
  if (color) query = query.contains("colorTags", [color])

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = count ?? 0
  return NextResponse.json({ products: data ?? [], total, page, totalPages: Math.ceil(total / limit) })
}

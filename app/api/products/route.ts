import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const ohaeng = searchParams.get("ohaeng")
  const color = searchParams.get("color")
  const q = searchParams.get("q")
  const use = searchParams.get("use") // 용도: 생일/축하/개업/결혼/추모/감사
  const sort = searchParams.get("sort") // latest(기본) | price_asc | price_desc
  const page = Number(searchParams.get("page") ?? "1")
  const limit = 12

  let query = supabaseAdmin
    .from("Product")
    .select("id, name, price, images, flowerMeaning, category, stock, reviews:Review(rating)", { count: "exact" })
    .eq("isActive", true)

  if (sort === "price_asc") query = query.order("price", { ascending: true })
  else if (sort === "price_desc") query = query.order("price", { ascending: false })
  else query = query.order("createdAt", { ascending: false })

  query = query.range((page - 1) * limit, page * limit - 1)

  if (category) query = query.eq("category", category)
  if (ohaeng) query = query.contains("ohaengTags", [ohaeng])
  if (color) query = query.contains("colorTags", [color])
  if (use) query = query.contains("useTags", [use])
  if (q) query = query.or(`name.ilike.%${q}%,flowerMeaning.ilike.%${q}%`)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 리뷰 평균 별점·후기 수 집계 (원본 리뷰 배열은 응답에서 제거)
  const products = (data ?? []).map((p) => {
    const { reviews, ...rest } = p as typeof p & { reviews: { rating: number }[] | null }
    const list = reviews ?? []
    return {
      ...rest,
      reviewCount: list.length,
      ratingAvg: list.length > 0 ? +(list.reduce((a, r) => a + r.rating, 0) / list.length).toFixed(1) : null,
    }
  })

  const total = count ?? 0
  return NextResponse.json({ products, total, page, totalPages: Math.ceil(total / limit) })
}

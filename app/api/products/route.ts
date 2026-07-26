import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const ohaeng = searchParams.get("ohaeng")
  const color = searchParams.get("color")
  const sellerName = searchParams.get("seller")
  const minPriceParam = searchParams.get("minPrice")
  const maxPriceParam = searchParams.get("maxPrice")
  const minPrice = minPriceParam === null || minPriceParam === "" ? null : Number(minPriceParam)
  const maxPrice = maxPriceParam === null || maxPriceParam === "" ? null : Number(maxPriceParam)
  const inStock = searchParams.get("inStock") === "true"
  const q = searchParams.get("q")
  const uses = searchParams.getAll("use") // 복수 용도: 생일/축하/개업/결혼/추모/감사
  const sort = searchParams.get("sort") // latest(기본) | price_asc | price_desc
  const page = Number(searchParams.get("page") ?? "1")
  const limit = 12
  const now = new Date().toISOString()

  const sellerLookup = sellerName || q
    ? await supabaseAdmin.from("Seller").select("id, marketName").ilike("marketName", `%${sellerName || q}%`)
    : { data: [] as { id: string; marketName: string }[] }
  const sellerIds = (sellerLookup.data ?? []).map((seller) => seller.id)

  let query = supabaseAdmin
    .from("Product")
    .select("id, name, price, images, flowerMeaning, category, stock, saleStatus, purchaseType, externalUrl, partnerName, partnerBadge, seller:Seller(marketName, productDeliveryScope, productDeliveryRegions), reviews:Review(rating)", { count: "exact" })
    .eq("isActive", true)
    .in("saleStatus", ["ON_SALE", "SOLD_OUT"])
    .or(`displayStartAt.is.null,displayStartAt.lte.${now}`)
    .or(`displayEndAt.is.null,displayEndAt.gte.${now}`)

  query = query.order("isPromoted", { ascending: false }).order("exposurePriority", { ascending: false })
  if (sort === "price_asc") query = query.order("price", { ascending: true })
  else if (sort === "price_desc") query = query.order("price", { ascending: false })
  else query = query.order("createdAt", { ascending: false })

  query = query.range((page - 1) * limit, page * limit - 1)

  if (category) query = query.eq("category", category)
  if (ohaeng) query = query.contains("ohaengTags", [ohaeng])
  if (color) query = query.contains("colorTags", [color])
  if (uses.length) query = query.overlaps("useTags", uses)
  if (minPrice !== null && Number.isFinite(minPrice) && minPrice >= 0) query = query.gte("price", minPrice)
  if (maxPrice !== null && Number.isFinite(maxPrice) && maxPrice >= 0) query = query.lte("price", maxPrice)
  if (inStock) query = query.gt("stock", 0)
  if (sellerName) {
    const clauses = [`partnerName.ilike.%${sellerName.replace(/[,%()]/g, " ")}%`]
    if (sellerIds.length) clauses.push(`sellerId.in.(${sellerIds.join(",")})`)
    query = query.or(clauses.join(","))
  }
  if (q) {
    const term = q.replace(/[,%()]/g, " ").trim()
    const clauses = [
      `name.ilike.%${term}%`, `description.ilike.%${term}%`, `composition.ilike.%${term}%`,
      `flowerMeaning.ilike.%${term}%`, `partnerName.ilike.%${term}%`,
    ]
    if (sellerIds.length) clauses.push(`sellerId.in.(${sellerIds.join(",")})`)
    query = query.or(clauses.join(","))
  }

  const [{ data, count, error }, { data: facetRows }] = await Promise.all([
    query,
    supabaseAdmin.from("Product")
      .select("colorTags, useTags, partnerName, seller:Seller(marketName)")
      .eq("isActive", true).in("saleStatus", ["ON_SALE", "SOLD_OUT"])
      .or(`displayStartAt.is.null,displayStartAt.lte.${now}`)
      .or(`displayEndAt.is.null,displayEndAt.gte.${now}`),
  ])

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
  const colors = [...new Set((facetRows ?? []).flatMap((row) => row.colorTags ?? []))].sort()
  const facetUses = [...new Set((facetRows ?? []).flatMap((row) => row.useTags ?? []))].sort()
  const sellers = [...new Set((facetRows ?? []).flatMap((row) => {
    const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller
    return [row.partnerName, seller?.marketName].filter((value): value is string => Boolean(value))
  }))].sort()
  return NextResponse.json({ products, total, page, totalPages: Math.ceil(total / limit), facets: { colors, uses: facetUses, sellers } })
}

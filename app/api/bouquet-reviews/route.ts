import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { nanoid } from "nanoid"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { grantPointsOnce, POINT_POLICY } from "@/lib/points"
import { FLOWERS } from "@/lib/customFlowers"

const ALLOWED_TAGS = new Set(["사진과 같아요", "꽃이 풍성해요", "색감이 예뻐요", "포장이 꼼꼼해요", "신선해요", "선물하기 좋아요", "직접 만들기 쉬워요", "재구매하고 싶어요"])

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const limit = Math.min(Number(params.get("limit") ?? 20), 50)
  const id = params.get("id")
  const keyword = params.get("q")?.trim().toLowerCase() ?? ""
  const sellerFilter = params.get("seller")?.trim() ?? ""
  const flowerFilter = params.get("flower")?.trim() ?? ""
  const modeFilter = params.get("mode")?.trim() ?? ""
  const sort = params.get("sort") ?? "latest"
  let query = supabaseAdmin.from("Review")
    .select("id, rating, content, images, previewImageUrl, tags, orderMode, composition, derivedOrderCount, createdAt, user:User(id, name, image), product:Product(id, name, seller:Seller(id, marketName)), orderItem:OrderItem(price, seller:Seller(id, marketName))")
    .eq("isHidden", false).not("orderItemId", "is", null)
  if (id) query = query.eq("id", id)
  const { data, error } = await query.order("createdAt", { ascending: false }).limit(id ? 1 : 200)
  if (error) return NextResponse.json({ error: "리뷰를 불러오지 못했어요" }, { status: 500 })
  if (id) return NextResponse.json({ reviews: data ?? [] })
  const relation = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] ?? null : value
  const flowerIds = (composition: unknown) => {
    const value = (composition ?? {}) as { flowers?: { id: string }[]; mainFlowerId?: string; additionalFlowerIds?: string[] }
    return Array.isArray(value.flowers) ? value.flowers.map((flower) => flower.id) : [value.mainFlowerId, ...(value.additionalFlowerIds ?? [])].filter((flower): flower is string => Boolean(flower))
  }
  const all = (data ?? []).map((review) => {
    const product = relation(review.product), item = relation(review.orderItem)
    const seller = relation(product?.seller ?? null) ?? relation(item?.seller ?? null)
    return { ...review, searchSeller: seller?.marketName ?? "", searchProduct: product?.name ?? "", flowerIds: flowerIds(review.composition), price: item?.price ?? 0 }
  })
  const sellers = [...new Set(all.map((review) => review.searchSeller).filter(Boolean))].sort()
  const usedFlowerIds = [...new Set(all.flatMap((review) => review.flowerIds))]
  const flowers = FLOWERS.filter((flower) => usedFlowerIds.includes(flower.id)).map((flower) => ({ id: flower.id, name: flower.name })).sort((a, b) => a.name.localeCompare(b.name, "ko"))
  let filtered = all.filter((review) => {
    if (keyword && !`${review.content} ${review.searchProduct} ${review.searchSeller} ${review.tags.join(" ")} ${review.flowerIds.map((flowerId) => FLOWERS.find((flower) => flower.id === flowerId)?.name ?? flowerId).join(" ")}`.toLowerCase().includes(keyword)) return false
    if (sellerFilter && review.searchSeller !== sellerFilter) return false
    if (flowerFilter && !review.flowerIds.some((flowerId) => flowerId === flowerFilter || (FLOWERS.find((flower) => flower.id === flowerId)?.name ?? "").toLowerCase().includes(flowerFilter.toLowerCase()))) return false
    if (modeFilter && review.orderMode !== modeFilter) return false
    return true
  })
  filtered = filtered.sort((a, b) => sort === "rating" ? b.rating - a.rating || +new Date(b.createdAt) - +new Date(a.createdAt) : sort === "price_asc" ? a.price - b.price : sort === "price_desc" ? b.price - a.price : sort === "popular" ? b.derivedOrderCount - a.derivedOrderCount : +new Date(b.createdAt) - +new Date(a.createdAt))
  return NextResponse.json({ reviews: filtered.slice(0, limit), total: filtered.length, facets: { sellers, flowers } })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })
  const form = await req.formData()
  const orderItemId = String(form.get("orderItemId") ?? "")
  const rating = Number(form.get("rating"))
  const content = String(form.get("content") ?? "").trim()
  const tags = String(form.get("tags") ?? "").split(",").filter((tag) => ALLOWED_TAGS.has(tag)).slice(0, 5)
  const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0)
  if (!orderItemId || rating < 1 || rating > 5 || content.length < 5) return NextResponse.json({ error: "별점과 5자 이상의 후기를 입력해주세요" }, { status: 400 })
  if (files.length < 1 || files.length > 8 || files.some((file) => file.size > 10 * 1024 * 1024 || !file.type.startsWith("image/"))) return NextResponse.json({ error: "실제 꽃다발 사진을 1~8장, 장당 10MB 이하로 올려주세요" }, { status: 400 })
  const { data: item } = await supabaseAdmin.from("OrderItem")
    .select("id, productId, confirmedAt, previewImageUrl, bouquetMode, composition, product:Product(images), order:Order!inner(userId)")
    .eq("id", orderItemId).eq("order.userId", session.user.id).maybeSingle()
  if (!item?.confirmedAt) return NextResponse.json({ error: "구매확정한 상품만 리뷰를 작성할 수 있어요" }, { status: 403 })
  const uploaded = await Promise.all(files.map((file, index) => put(`bouquet-reviews/${session.user.id}/${nanoid()}-${index}.jpg`, file, { access: "public", contentType: file.type })))
  const product = Array.isArray(item.product) ? item.product[0] : item.product
  const reviewId = nanoid()
  const { data, error } = await supabaseAdmin.from("Review").insert({
    id: reviewId, userId: session.user.id, productId: item.productId, orderItemId, rating, content,
    images: uploaded.map((blob) => blob.url), previewImageUrl: item.previewImageUrl ?? product?.images?.[0] ?? null,
    tags, orderMode: item.bouquetMode, composition: item.composition,
  }).select("id").single()
  if (error || !data) return NextResponse.json({ error: error?.code === "23505" ? "이미 리뷰를 작성한 상품이에요" : "리뷰 저장에 실패했어요" }, { status: 500 })
  const pointsGranted = await grantPointsOnce({ userId: session.user.id, amount: POINT_POLICY.REVIEW, reason: "REVIEW", referenceType: "Review", referenceId: reviewId })
  return NextResponse.json({ id: reviewId, pointsGranted: pointsGranted ? POINT_POLICY.REVIEW : 0 }, { status: 201 })
}

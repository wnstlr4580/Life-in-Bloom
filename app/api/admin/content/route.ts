import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { writeAdminAudit } from "@/lib/adminAudit"

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase()
  const visibility = req.nextUrl.searchParams.get("visibility")
  const [{ data: reviews }, { data: posts }] = await Promise.all([
    supabaseAdmin.from("Review").select("id, rating, content, isHidden, moderationReason, createdAt, User(id, email, name), Product(id, name, seller:Seller(id, marketName))").order("createdAt", { ascending: false }).limit(200),
    supabaseAdmin.from("BouquetPost").select("id, userId, authorName, content, imageUrl, isHidden, moderationReason, createdAt").order("createdAt", { ascending: false }).limit(200),
  ])
  const match = (item: Record<string, unknown>) => {
    if (visibility === "VISIBLE" && item.isHidden) return false
    if (visibility === "HIDDEN" && !item.isHidden) return false
    if (!q) return true
    return JSON.stringify(item).toLowerCase().includes(q)
  }
  const normalizedReviews = (reviews ?? []).map((review) => {
    const user = Array.isArray(review.User) ? review.User[0] ?? null : review.User
    const productRelation = Array.isArray(review.Product) ? review.Product[0] ?? null : review.Product
    const product = productRelation ? {
      ...productRelation,
      seller: Array.isArray(productRelation.seller) ? productRelation.seller[0] ?? null : productRelation.seller,
    } : null
    return { ...review, User: user, Product: product }
  })
  return NextResponse.json({ reviews: normalizedReviews.filter((item) => match(item)), posts: (posts ?? []).filter((item) => match(item)) })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const { type, id, hidden, reason } = await req.json()
  if (!["REVIEW", "BOUQUET_POST"].includes(type) || !id) return NextResponse.json({ error: "대상을 확인해주세요" }, { status: 400 })
  if (hidden && !String(reason ?? "").trim()) return NextResponse.json({ error: "숨김 사유를 입력해주세요" }, { status: 400 })
  const table = type === "REVIEW" ? "Review" : "BouquetPost"
  const { data: before } = await supabaseAdmin.from(table).select("*").eq("id", id).maybeSingle()
  if (!before) return NextResponse.json({ error: "게시물을 찾을 수 없어요" }, { status: 404 })
  const update = { isHidden: Boolean(hidden), moderationReason: hidden ? String(reason).trim() : null, moderatedAt: new Date().toISOString() }
  const { error } = await supabaseAdmin.from(table).update(update).eq("id", id)
  if (error) return NextResponse.json({ error: "처리에 실패했어요" }, { status: 500 })
  await writeAdminAudit({ actorId: admin.id, action: hidden ? "HIDE" : "RESTORE", targetType: type, targetId: id, reason, before, after: update })
  return NextResponse.json({ ok: true })
}

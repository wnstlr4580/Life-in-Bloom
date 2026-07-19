import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { writeAdminAudit } from "@/lib/adminAudit"
import { sendEmail } from "@/lib/email"

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const q = req.nextUrl.searchParams.get("q")?.trim()
  const category = req.nextUrl.searchParams.get("category")
  const use = req.nextUrl.searchParams.get("use")
  const visibility = req.nextUrl.searchParams.get("visibility")
  const stock = req.nextUrl.searchParams.get("stock")
  const seller = req.nextUrl.searchParams.get("seller")?.trim()
  const sort = req.nextUrl.searchParams.get("sort") ?? "newest"
  let query = supabaseAdmin.from("Product")
    .select("id, name, price, stock, category, images, useTags, colorTags, seasonTags, saleStatus, isActive, createdAt, seller:Seller(id, marketName, status)")
    .limit(300)
  if (category && category !== "ALL") query = query.eq("category", category)
  if (use && use !== "ALL") query = query.contains("useTags", [use])
  if (visibility === "ACTIVE") query = query.eq("isActive", true)
  if (visibility === "HIDDEN") query = query.eq("isActive", false)
  if (stock === "SOLD_OUT") query = query.lte("stock", 0)
  if (stock === "AVAILABLE") query = query.gt("stock", 0)
  if (sort === "priceAsc") query = query.order("price", { ascending: true })
  else if (sort === "priceDesc") query = query.order("price", { ascending: false })
  else if (sort === "stockAsc") query = query.order("stock", { ascending: true })
  else query = query.order("createdAt", { ascending: false })
  const { data, error } = await query
  if (error) return NextResponse.json({ error: "상품 현황을 불러오지 못했어요" }, { status: 500 })
  const products = (data ?? []).map((product) => ({
    ...product,
    seller: Array.isArray(product.seller) ? product.seller[0] ?? null : product.seller,
  })).filter((product) => {
    const keywordMatch = !q || JSON.stringify({
      name: product.name,
      category: product.category,
      useTags: product.useTags,
      colorTags: product.colorTags,
      seasonTags: product.seasonTags,
    }).toLowerCase().includes(q.toLowerCase())
    const sellerMatch = !seller || product.seller?.marketName?.toLowerCase().includes(seller.toLowerCase())
    return keywordMatch && sellerMatch
  })
  return NextResponse.json({ products })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const { id, isActive, reason } = await req.json()
  if (!id || typeof isActive !== "boolean" || (!isActive && !String(reason ?? "").trim())) return NextResponse.json({ error: "노출 중지 사유를 입력해주세요" }, { status: 400 })
  const { data: before } = await supabaseAdmin.from("Product").select("id, name, isActive, sellerId").eq("id", id).maybeSingle()
  if (!before) return NextResponse.json({ error: "상품을 찾을 수 없어요" }, { status: 404 })
  const { error } = await supabaseAdmin.from("Product").update({ isActive }).eq("id", id)
  if (error) return NextResponse.json({ error: "상품 노출 상태를 변경하지 못했어요" }, { status: 500 })
  await writeAdminAudit({ actorId: admin.id, action: isActive ? "RESTORE_PRODUCT" : "HIDE_PRODUCT", targetType: "PRODUCT", targetId: id, reason, before, after: { isActive } })
  const { data: seller } = await supabaseAdmin.from("Seller").select("marketName, User(email)").eq("id", before.sellerId).maybeSingle()
  const user = Array.isArray(seller?.User) ? seller.User[0] : seller?.User
  if (user?.email) await sendEmail({
    to: user.email,
    subject: `[인생내꽃] 상품 ${isActive ? "노출 복구" : "노출 중지"} 안내`,
    html: `<h2>${before.name}</h2><p>${isActive ? "상품 노출이 복구되었습니다." : "관리자 검토로 상품 노출이 중지되었습니다."}</p>${reason ? `<p><b>처리 사유</b> ${String(reason)}</p>` : ""}<p>판매자센터에서 상품 상태를 확인해주세요.</p>`,
  }).catch((error) => console.error("[mail] product visibility", error))
  return NextResponse.json({ ok: true })
}

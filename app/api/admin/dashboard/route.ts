import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const [
    users, sellers, pendingSellers, products, soldOut, orders, monthOrders,
    reviews, hiddenReviews, posts, hiddenPosts,
  ] = await Promise.all([
    supabaseAdmin.from("User").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("Seller").select("id", { count: "exact", head: true }).eq("status", "APPROVED"),
    supabaseAdmin.from("Seller").select("id", { count: "exact", head: true }).in("status", ["PENDING", "UNDER_REVIEW"]),
    supabaseAdmin.from("Product").select("id", { count: "exact", head: true }).eq("isActive", true),
    supabaseAdmin.from("Product").select("id", { count: "exact", head: true }).eq("isActive", true).lte("stock", 0),
    supabaseAdmin.from("Order").select("id, totalAmount, status"),
    supabaseAdmin.from("Order").select("id, totalAmount, status").gte("createdAt", monthStart.toISOString()),
    supabaseAdmin.from("Review").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("Review").select("id", { count: "exact", head: true }).eq("isHidden", true),
    supabaseAdmin.from("BouquetPost").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("BouquetPost").select("id", { count: "exact", head: true }).eq("isHidden", true),
  ])
  const orderRows = orders.data ?? []
  const monthRows = monthOrders.data ?? []
  return NextResponse.json({
    users: users.count ?? 0, activeSellers: sellers.count ?? 0, pendingSellers: pendingSellers.count ?? 0,
    activeProducts: products.count ?? 0, soldOutProducts: soldOut.count ?? 0,
    totalOrders: orderRows.length, totalRevenue: orderRows.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + o.totalAmount, 0),
    monthOrders: monthRows.length, monthRevenue: monthRows.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + o.totalAmount, 0),
    reviews: (reviews.count ?? 0) + (posts.count ?? 0), hiddenContent: (hiddenReviews.count ?? 0) + (hiddenPosts.count ?? 0),
  })
}

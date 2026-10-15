import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { withDocumentUrls } from "@/lib/sellerDocuments"

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const { id } = await context.params

  const [{ data: seller, error }, { data: reviews }] = await Promise.all([
    supabaseAdmin.from("Seller").select("*, User(email, name)").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("SellerReview")
      .select("id, fromStatus, toStatus, reason, snapshot, createdAt, User(email, name)")
      .eq("sellerId", id)
      .order("createdAt", { ascending: false }),
  ])

  if (error || !seller) return NextResponse.json({ error: "판매처 신청을 찾을 수 없어요" }, { status: 404 })

  const { settlementAccount, ...rest } = seller
  return NextResponse.json({
    seller: { ...await withDocumentUrls(rest), settlementAccount },
    reviews: reviews ?? [],
  })
}

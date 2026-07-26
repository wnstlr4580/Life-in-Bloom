import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"
import { grantPointsOnce, POINT_POLICY } from "@/lib/points"

async function getEmail(req: NextRequest): Promise<string | null> {
  const token = await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "__Secure-authjs.session-token",
  }).catch(() => null)
    ?? await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token",
  }).catch(() => null)
  return (token?.email as string | undefined) ?? null
}

export async function POST(req: NextRequest) {
  const email = await getEmail(req)
  if (!email) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })

  const { productId, rating, content } = await req.json()
  if (!productId || !rating || rating < 1 || rating > 5 || !content?.trim()) {
    return NextResponse.json({ error: "별점과 내용을 입력해주세요" }, { status: 400 })
  }

  const { data: user } = await supabaseAdmin
    .from("User")
    .select("id, isAdmin")
    .eq("email", email)
    .maybeSingle()
  if (!user) return NextResponse.json({ error: "사용자 정보를 찾을 수 없어요" }, { status: 401 })

  // 구매 이력 확인 — 이 상품을 주문(취소 제외)한 사람만 후기 작성 가능 (관리자는 예외)
  if (user.isAdmin !== true) {
    const { data: purchased } = await supabaseAdmin
      .from("OrderItem")
      .select("id, order:Order!inner(userId, status)")
      .eq("productId", productId)
      .eq("order.userId", user.id)
      .neq("order.status", "CANCELLED")
      .limit(1)

    if (!purchased?.length) {
      return NextResponse.json({ error: "이 상품을 구매하신 분만 후기를 남길 수 있어요" }, { status: 403 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from("Review")
    .insert({ id: nanoid(), userId: user.id, productId, rating, content: content.trim() })
    .select("id, rating, content, createdAt")
    .single()

  if (error) return NextResponse.json({ error: "리뷰 저장에 실패했어요" }, { status: 500 })
  const pointsGranted = await grantPointsOnce({ userId: user.id, amount: POINT_POLICY.REVIEW, reason: "REVIEW", referenceType: "Review", referenceId: data.id })
  return NextResponse.json({ ...data, pointsGranted: pointsGranted ? POINT_POLICY.REVIEW : 0 }, { status: 201 })
}

import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { supabaseAdmin } from "@/lib/supabase"

// 요청자 확인 — 본인 글이거나 관리자면 수정/삭제 가능
async function getActor(req: NextRequest): Promise<{ id: string; isAdmin: boolean } | null> {
  const token = await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "__Secure-authjs.session-token",
  }).catch(() => null)
    ?? await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token",
  }).catch(() => null)

  const email = token?.email as string | undefined
  if (!email) return null
  const { data } = await supabaseAdmin
    .from("User")
    .select("id, isAdmin")
    .eq("email", email)
    .maybeSingle()
  if (!data) return null
  return { id: data.id, isAdmin: data.isAdmin === true }
}

async function canTouch(req: NextRequest, reviewId: string) {
  const actor = await getActor(req)
  if (!actor) return { ok: false as const, status: 401, error: "로그인이 필요해요" }

  const { data: review } = await supabaseAdmin
    .from("Review")
    .select("id, userId")
    .eq("id", reviewId)
    .maybeSingle()
  if (!review) return { ok: false as const, status: 404, error: "후기를 찾을 수 없어요" }

  if (review.userId !== actor.id && !actor.isAdmin) {
    return { ok: false as const, status: 403, error: "내가 쓴 후기만 고칠 수 있어요" }
  }
  return { ok: true as const }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const check = await canTouch(req, id)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { rating, content } = await req.json()
  if (!rating || rating < 1 || rating > 5 || !content?.trim()) {
    return NextResponse.json({ error: "별점과 내용을 입력해주세요" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("Review")
    .update({ rating, content: content.trim() })
    .eq("id", id)

  if (error) return NextResponse.json({ error: "수정에 실패했어요" }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const check = await canTouch(req, id)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { error } = await supabaseAdmin.from("Review").delete().eq("id", id)
  if (error) return NextResponse.json({ error: "삭제에 실패했어요" }, { status: 500 })
  return NextResponse.json({ ok: true })
}

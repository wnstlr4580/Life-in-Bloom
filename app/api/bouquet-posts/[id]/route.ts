import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { supabaseAdmin } from "@/lib/supabase"

// 후기 단건 조회 — /custom?post=ID 에서 조합을 불러올 때 사용
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data } = await supabaseAdmin
    .from("BouquetPost")
    .select("id, authorName, imageUrl, composition, content, derivedOrderCount")
    .eq("id", id)
    .eq("isHidden", false)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: "후기를 찾을 수 없어요" }, { status: 404 })
  return NextResponse.json(data)
}

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

async function canTouch(req: NextRequest, postId: string) {
  const actor = await getActor(req)
  if (!actor) return { ok: false as const, status: 401, error: "로그인이 필요해요" }

  const { data: post } = await supabaseAdmin
    .from("BouquetPost")
    .select("id, userId")
    .eq("id", postId)
    .maybeSingle()
  if (!post) return { ok: false as const, status: 404, error: "후기를 찾을 수 없어요" }

  if (post.userId !== actor.id && !actor.isAdmin) {
    return { ok: false as const, status: 403, error: "내가 올린 후기만 고칠 수 있어요" }
  }
  return { ok: true as const }
}

// 후기 수정 — 한마디와 꽃 조합 모두 고칠 수 있다
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const check = await canTouch(req, id)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { content, composition } = await req.json()

  const update: Record<string, unknown> = {}
  if (content !== undefined) update.content = String(content ?? "").trim() || null
  if (composition !== undefined) {
    if (!composition || typeof composition !== "object" || !composition.sizeId) {
      return NextResponse.json({ error: "꽃 조합 정보가 올바르지 않아요" }, { status: 400 })
    }
    update.composition = composition
  }

  const { error } = await supabaseAdmin
    .from("BouquetPost")
    .update(update)
    .eq("id", id)

  if (error) return NextResponse.json({ error: "수정에 실패했어요" }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 후기 삭제
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const check = await canTouch(req, id)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { error } = await supabaseAdmin.from("BouquetPost").delete().eq("id", id)
  if (error) return NextResponse.json({ error: "삭제에 실패했어요" }, { status: 500 })
  return NextResponse.json({ ok: true })
}

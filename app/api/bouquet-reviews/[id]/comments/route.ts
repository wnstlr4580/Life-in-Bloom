import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin.from("ReviewComment")
    .select("id, content, parentId, createdAt, user:User(id, name, image)")
    .eq("reviewId", id).order("createdAt", { ascending: true })
  if (error) return NextResponse.json({ error: "댓글을 불러오지 못했어요" }, { status: 500 })
  return NextResponse.json({ comments: data ?? [] })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const content = String(body.content ?? "").trim()
  const parentId = body.parentId ? String(body.parentId) : null
  if (content.length < 1 || content.length > 500) return NextResponse.json({ error: "댓글은 1~500자로 입력해주세요" }, { status: 400 })
  if (parentId) {
    const { data: parent } = await supabaseAdmin.from("ReviewComment").select("id").eq("id", parentId).eq("reviewId", id).maybeSingle()
    if (!parent) return NextResponse.json({ error: "답글을 남길 댓글을 찾지 못했어요" }, { status: 404 })
  }
  const { data, error } = await supabaseAdmin.from("ReviewComment").insert({ id: nanoid(), reviewId: id, userId: session.user.id, content, parentId }).select("id").single()
  if (error) return NextResponse.json({ error: "댓글을 저장하지 못했어요" }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })
  const { id } = await params; const body = await req.json(); const content = String(body.content ?? "").trim(); const commentId = String(body.commentId ?? "")
  if (!commentId || content.length < 1 || content.length > 500) return NextResponse.json({ error: "댓글 내용을 확인해주세요" }, { status: 400 })
  const { data, error } = await supabaseAdmin.from("ReviewComment").update({ content }).eq("id", commentId).eq("reviewId", id).eq("userId", session.user.id).select("id").maybeSingle()
  if (error || !data) return NextResponse.json({ error: "내 댓글만 수정할 수 있어요" }, { status: 403 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })
  const { id } = await params; const commentId = new URL(req.url).searchParams.get("commentId")
  const { data, error } = await supabaseAdmin.from("ReviewComment").delete().eq("id", commentId ?? "").eq("reviewId", id).eq("userId", session.user.id).select("id").maybeSingle()
  if (error || !data) return NextResponse.json({ error: "내 댓글만 삭제할 수 있어요" }, { status: 403 })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"

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
    .select("id")
    .eq("email", email)
    .maybeSingle()
  if (!user) return NextResponse.json({ error: "사용자 정보를 찾을 수 없어요" }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from("Review")
    .insert({ id: nanoid(), userId: user.id, productId, rating, content: content.trim() })
    .select("id, rating, content, createdAt")
    .single()

  if (error) return NextResponse.json({ error: "리뷰 저장에 실패했어요" }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

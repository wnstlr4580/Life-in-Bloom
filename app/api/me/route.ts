import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
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

// 내 계정 요약 (닉네임, 포인트)
export async function GET(req: NextRequest) {
  const email = await getEmail(req)
  if (!email) return NextResponse.json(null)

  const { data } = await supabaseAdmin
    .from("User")
    .select("id, name, points")
    .eq("email", email)
    .maybeSingle()

  const { data: pointTransactions } = await supabaseAdmin.from("PointTransaction")
    .select("id, amount, reason, referenceType, createdAt").eq("userId", data?.id ?? "")
    .order("createdAt", { ascending: false }).limit(20)
  return NextResponse.json({ name: data?.name ?? null, points: data?.points ?? 0, pointTransactions: pointTransactions ?? [] })
}

// 닉네임 변경 — 중복 불가
export async function PATCH(req: NextRequest) {
  const email = await getEmail(req)
  if (!email) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })

  const { name } = await req.json()
  const nickname = String(name ?? "").trim()
  if (nickname.length < 2 || nickname.length > 12) {
    return NextResponse.json({ error: "닉네임은 2~12자로 입력해주세요" }, { status: 400 })
  }

  const { data: me } = await supabaseAdmin
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle()
  if (!me) return NextResponse.json({ error: "사용자 정보를 찾을 수 없어요" }, { status: 401 })

  // 다른 사람이 이미 쓰는 닉네임인지 확인
  const { data: taken } = await supabaseAdmin
    .from("User")
    .select("id")
    .eq("name", nickname)
    .neq("id", me.id)
    .maybeSingle()

  if (taken) return NextResponse.json({ error: "이미 사용 중인 닉네임이에요" }, { status: 409 })

  const { error } = await supabaseAdmin
    .from("User")
    .update({ name: nickname })
    .eq("id", me.id)

  if (error) return NextResponse.json({ error: "닉네임 변경에 실패했어요" }, { status: 500 })
  return NextResponse.json({ ok: true, name: nickname })
}

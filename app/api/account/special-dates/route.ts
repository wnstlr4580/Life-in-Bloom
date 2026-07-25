import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"

async function getUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName: "__Secure-authjs.session-token" }).catch(() => null)
    ?? await getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName: "authjs.session-token" }).catch(() => null)
  if (!token?.email) return null
  const { data } = await supabaseAdmin.from("User").select("id").eq("email", token.email).maybeSingle()
  return data
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ dates: [] })
  const { data, error } = await supabaseAdmin.from("UserSpecialDate").select("id, type, label, monthDay").eq("userId", user.id).order("monthDay")
  if (error) return NextResponse.json({ dates: [], setupRequired: true })
  return NextResponse.json({ dates: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 })
  const body = await req.json().catch(() => null)
  const type = body?.type === "birthday" ? "birthday" : "anniversary"
  const label = String(body?.label ?? "").trim().slice(0, 30)
  const monthDay = String(body?.monthDay ?? "")
  if (!label || !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(monthDay)) return NextResponse.json({ error: "이름과 월·일을 확인해 주세요." }, { status: 400 })
  const { data, error } = await supabaseAdmin.from("UserSpecialDate").insert({ id: nanoid(), userId: user.id, type, label, monthDay }).select("id, type, label, monthDay").single()
  if (error) return NextResponse.json({ error: "일정 저장 테이블 준비가 필요해요." }, { status: 503 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "삭제할 일정을 확인해 주세요." }, { status: 400 })
  await supabaseAdmin.from("UserSpecialDate").delete().eq("id", id).eq("userId", user.id)
  return NextResponse.json({ ok: true })
}

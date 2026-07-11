import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"

async function getEmail(req: NextRequest): Promise<string | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "__Secure-authjs.session-token",
  }).catch(() => null)
    ?? await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token",
  }).catch(() => null)

  return (token?.email as string | undefined) ?? null
}

export async function GET(req: NextRequest) {
  const email = await getEmail(req)
  if (!email) return NextResponse.json(null)

  const { data } = await supabaseAdmin
    .from("User")
    .select("sajuName, gender, birthDate, calendarType, birthHour, city, name, ohaengType, lackingOhaengType")
    .eq("email", email)
    .maybeSingle()

  if (!data?.birthDate) return NextResponse.json(null)

  const birthDate = typeof data.birthDate === "string"
    ? data.birthDate.slice(0, 10)
    : new Date(data.birthDate).toISOString().slice(0, 10)

  return NextResponse.json({
    name: data.sajuName ?? data.name ?? "",
    gender: data.gender ?? "female",
    birthDate,
    calendarType: data.calendarType ?? "solar",
    birthHour: data.birthHour ?? "unknown",
    city: data.city ?? "",
    ohaengType: data.ohaengType ?? null,
    lackingOhaengType: data.lackingOhaengType ?? null,
  })
}

export async function POST(req: NextRequest) {
  const email = await getEmail(req)
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, gender, birthDate, calendarType, birthHour, city, ohaengType, lackingOhaengType } = await req.json()

  // 기존 사용자의 실제 id(회원가입 시 생성된 값)를 그대로 유지 — 새로 지어내면 안 된다
  const { data: existing } = await supabaseAdmin
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  const upsertData: Record<string, unknown> = { id: existing?.id ?? nanoid(), email, sajuName: name, gender, birthDate, calendarType, birthHour, city }
  if (ohaengType !== undefined) upsertData.ohaengType = ohaengType
  if (lackingOhaengType !== undefined) upsertData.lackingOhaengType = lackingOhaengType

  const { error } = await supabaseAdmin
    .from("User")
    .upsert(upsertData, { onConflict: "email" })

  if (error) return NextResponse.json({ error: "저장에 실패했어요" }, { status: 500 })
  return NextResponse.json({ ok: true })
}

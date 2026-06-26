import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
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
    .select("sajuName, gender, birthDate, calendarType, birthHour, city, name")
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
  })
}

export async function POST(req: NextRequest) {
  const email = await getEmail(req)
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, gender, birthDate, calendarType, birthHour, city } = await req.json()

  await supabaseAdmin
    .from("User")
    .upsert(
      { id: email, email, sajuName: name, gender, birthDate, calendarType, birthHour, city },
      { onConflict: "email" }
    )

  return NextResponse.json({ ok: true })
}

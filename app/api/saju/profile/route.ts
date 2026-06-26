import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export const GET = auth(async function GET(req) {
  const session = req.auth
  const email = session?.user?.email
  if (!email) return NextResponse.json(null)

  const { data } = await supabaseAdmin
    .from("User")
    .select("sajuName, gender, birthDate, calendarType, birthHour, city")
    .eq("email", email)
    .maybeSingle()

  if (!data?.birthDate) return NextResponse.json(null)

  const birthDate = typeof data.birthDate === "string"
    ? data.birthDate.slice(0, 10)
    : new Date(data.birthDate).toISOString().slice(0, 10)

  return NextResponse.json({
    name: data.sajuName ?? session?.user?.name ?? "",
    gender: data.gender ?? "female",
    birthDate,
    calendarType: data.calendarType ?? "solar",
    birthHour: data.birthHour ?? "unknown",
    city: data.city ?? "",
  })
})

export const POST = auth(async function POST(req) {
  const session = req.auth
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, gender, birthDate, calendarType, birthHour, city } = await req.json()

  // upsert: User 레코드가 없으면 새로 생성, 있으면 업데이트
  await supabaseAdmin
    .from("User")
    .upsert(
      {
        id: session.user?.id ?? email,
        email,
        name: session.user?.name,
        image: session.user?.image,
        sajuName: name,
        gender,
        birthDate,
        calendarType,
        birthHour,
        city,
      },
      { onConflict: "email" }
    )

  return NextResponse.json({ ok: true })
})

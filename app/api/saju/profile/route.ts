import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export const GET = auth(async function GET(req) {
  const session = req.auth
  if (!session?.user?.email) return NextResponse.json(null)

  const { data } = await supabaseAdmin
    .from("User")
    .select("sajuName, gender, birthDate, calendarType, birthHour, city")
    .eq("email", session.user.email)
    .single()

  if (!data?.birthDate) return NextResponse.json(null)

  return NextResponse.json({
    name: data.sajuName ?? session.user.name ?? "",
    gender: data.gender ?? "female",
    birthDate: typeof data.birthDate === "string"
      ? data.birthDate.slice(0, 10)
      : new Date(data.birthDate).toISOString().slice(0, 10),
    calendarType: data.calendarType ?? "solar",
    birthHour: data.birthHour ?? "unknown",
    city: data.city ?? "",
  })
})

export const POST = auth(async function POST(req) {
  const session = req.auth
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, gender, birthDate, calendarType, birthHour, city } = await req.json()

  await supabaseAdmin
    .from("User")
    .update({ sajuName: name, gender, birthDate, calendarType, birthHour, city })
    .eq("email", session.user.email)

  return NextResponse.json({ ok: true })
})

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const session = await auth()
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
    birthDate: data.birthDate?.slice(0, 10) ?? "",
    calendarType: data.calendarType ?? "solar",
    birthHour: data.birthHour ?? "unknown",
    city: data.city ?? "",
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, gender, birthDate, calendarType, birthHour, city } = await req.json()

  await supabaseAdmin
    .from("User")
    .update({ sajuName: name, gender, birthDate, calendarType, birthHour, city })
    .eq("email", session.user.email)

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("KioskPhoto")
    .select("id, ohaeng, imageUrl, expiresAt")
    .eq("id", id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "사진을 찾을 수 없어요." }, { status: 404 })
  }

  if (new Date(data.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "보관 기간이 지난 사진이에요." }, { status: 404 })
  }

  return NextResponse.json(data)
}

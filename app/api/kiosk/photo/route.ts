import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"
import type { Ohaeng } from "@/lib/saju"
import { KIOSK_PHOTO_TTL_HOURS } from "@/lib/kiosk/constants"

const VALID_OHAENG: Ohaeng[] = ["목", "화", "토", "금", "수"]

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get("file")
  const ohaeng = form.get("ohaeng")

  if (!(file instanceof Blob) || typeof ohaeng !== "string" || !VALID_OHAENG.includes(ohaeng as Ohaeng)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }

  try {
    const blob = await put(`kiosk/${nanoid()}.jpg`, file, {
      access: "public",
      contentType: "image/jpeg",
    })

    const expiresAt = new Date(Date.now() + KIOSK_PHOTO_TTL_HOURS * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabaseAdmin
      .from("KioskPhoto")
      .insert({ ohaeng, imageUrl: blob.url, expiresAt })
      .select("id")
      .single()

    if (error || !data) throw error ?? new Error("insert failed")

    return NextResponse.json({ id: data.id, url: blob.url })
  } catch {
    return NextResponse.json({ error: "사진 저장에 실패했어요." }, { status: 500 })
  }
}

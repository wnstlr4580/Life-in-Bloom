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

    // Prisma의 @default(cuid())는 Prisma Client가 생성할 때만 적용되는 값이라,
    // Supabase 클라이언트로 직접 insert할 때는 id를 직접 만들어 넣어야 한다.
    const { data, error } = await supabaseAdmin
      .from("KioskPhoto")
      .insert({ id: nanoid(), ohaeng, imageUrl: blob.url, expiresAt })
      .select("id")
      .single()

    if (error || !data) throw error ?? new Error("insert failed")

    return NextResponse.json({ id: data.id, url: blob.url })
  } catch (error) {
    // 원인 진단용 — 터미널에서 실제 에러를 확인하기 위해 남겨둔다.
    console.error("[kiosk/photo] upload failed:", error)
    return NextResponse.json({ error: "사진 저장에 실패했어요." }, { status: 500 })
  }
}

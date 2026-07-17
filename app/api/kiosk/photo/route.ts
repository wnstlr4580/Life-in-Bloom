import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"
import { KIOSK_PHOTO_TTL_HOURS } from "@/lib/kiosk/constants"

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get("file")
  // 포토부스 개편으로 오행 대신 꽃 이름을 받는다 (예: "핑크 백합").
  // DB 컬럼명은 아직 ohaeng — 과거 사주 시절 이름이라 KioskPhoto.flower로 리네임 마이그레이션 예정.
  const flower = form.get("flower")

  if (!(file instanceof Blob) || typeof flower !== "string" || !flower.trim() || flower.length > 30) {
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
      .insert({ id: nanoid(), ohaeng: flower.trim(), imageUrl: blob.url, expiresAt })
      .select("id")
      .single()

    if (error || !data) throw error ?? new Error("insert failed")

    return NextResponse.json({ id: data.id, url: blob.url })
  } catch (error) {
    // 원인 진단용 — Vercel 로그 접근 권한이 없어도 브라우저 Network 탭에서
    // 바로 원인을 확인할 수 있도록 실제 에러 메시지를 응답에 그대로 담는다.
    console.error("[kiosk/photo] upload failed:", error)
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "사진 저장에 실패했어요.", detail }, { status: 500 })
  }
}

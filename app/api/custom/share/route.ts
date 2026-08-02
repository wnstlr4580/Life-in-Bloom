import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { putPublicObject } from "@/lib/object-storage"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"

async function getOptionalUser(req: NextRequest) {
  const token = await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "__Secure-authjs.session-token",
  }).catch(() => null)
    ?? await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token",
  }).catch(() => null)

  const email = token?.email as string | undefined
  if (!email) return null
  const { data } = await supabaseAdmin
    .from("User")
    .select("id, name")
    .eq("email", email)
    .maybeSingle()
  return data
}

// AI 생성 꽃다발 이미지를 공유 링크로 저장
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get("file")
  const compositionRaw = form.get("composition")

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "이미지 파일이 없어요" }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "이미지가 너무 커요" }, { status: 400 })
  }

  let composition: unknown
  try {
    composition = JSON.parse(String(compositionRaw))
  } catch {
    return NextResponse.json({ error: "꽃 조합 정보가 올바르지 않아요" }, { status: 400 })
  }

  const user = await getOptionalUser(req)

  try {
    const blob = await putPublicObject(`bouquet-shared/${nanoid()}.jpg`, file, file.type || "image/jpeg")

    const { data, error } = await supabaseAdmin
      .from("BouquetPost")
      .insert({
        id: nanoid(),
        userId: user?.id ?? null,
        authorName: user?.name ?? "익명",
        imageUrl: blob.url,
        composition,
        content: null,
      })
      .select("id")
      .single()

    if (error || !data) throw error ?? new Error("insert failed")
    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "공유 링크 생성에 실패했어요" }, { status: 500 })
  }
}

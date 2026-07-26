import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { nanoid } from "nanoid"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })
  const form = await req.formData(); const file = form.get("file")
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "AI 미리보기 이미지가 올바르지 않아요" }, { status: 400 })
  const blob = await put(`bouquet-previews/${session.user.id}/${nanoid()}.jpg`, file, { access: "public", contentType: file.type })
  return NextResponse.json({ url: blob.url })
}

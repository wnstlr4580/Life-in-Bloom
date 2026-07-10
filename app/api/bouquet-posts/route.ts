import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { put } from "@vercel/blob"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"

async function getUser(req: NextRequest) {
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
    .select("id, name, isAdmin")
    .eq("email", email)
    .maybeSingle()
  return data
}

// 최신 후기 목록
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("BouquetPost")
    .select("id, userId, authorName, imageUrl, composition, content, derivedOrderCount, createdAt")
    .order("createdAt", { ascending: false })
    .limit(8)

  if (error) return NextResponse.json({ posts: [] })
  return NextResponse.json({ posts: data ?? [] })
}

// 후기 작성 (사진 + 조합 + 한마디)
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })

  // 커스텀 꽃다발을 구매한 사람만 후기 작성 가능 (관리자는 예외)
  if (user.isAdmin !== true) {
    const { data: purchased } = await supabaseAdmin
      .from("OrderItem")
      .select("id, order:Order!inner(userId, status)")
      .like("productId", "custom_%")
      .eq("order.userId", user.id)
      .neq("order.status", "CANCELLED")
      .limit(1)

    if (!purchased?.length) {
      return NextResponse.json({ error: "커스텀 꽃다발을 구매하신 분만 후기를 올릴 수 있어요" }, { status: 403 })
    }
  }

  const form = await req.formData()
  const file = form.get("file")
  const content = form.get("content")
  const compositionRaw = form.get("composition")

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "꽃다발 사진을 올려주세요" }, { status: 400 })
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "사진은 8MB 이하로 올려주세요" }, { status: 400 })
  }

  let composition: unknown
  try {
    composition = JSON.parse(String(compositionRaw))
  } catch {
    return NextResponse.json({ error: "꽃 조합 정보가 올바르지 않아요" }, { status: 400 })
  }

  try {
    const blob = await put(`bouquet-posts/${nanoid()}.jpg`, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
    })

    const { data, error } = await supabaseAdmin
      .from("BouquetPost")
      .insert({
        id: nanoid(),
        userId: user.id,
        authorName: user.name ?? "꽃 애호가",
        imageUrl: blob.url,
        composition,
        content: String(content ?? "").trim() || null,
      })
      .select("id")
      .single()

    if (error || !data) throw error ?? new Error("insert failed")
    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "후기 올리기에 실패했어요" }, { status: 500 })
  }
}

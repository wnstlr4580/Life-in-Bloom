import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { putPublicObject } from "@/lib/object-storage"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"
import { grantPointsOnce, POINT_POLICY } from "@/lib/points"

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

// 최신 후기 목록 (limit, page 파라미터 지원)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "8", 10), 50)
  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1)
  const offset = (page - 1) * limit

  const { data, error } = await supabaseAdmin
    .from("BouquetPost")
    .select("id, userId, authorName, imageUrl, composition, content, derivedOrderCount, sourceType, createdAt")
    .eq("isHidden", false)
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ posts: [] })
  return NextResponse.json({ posts: data ?? [] })
}

// 후기 작성 (사진 + 조합 + 한마디)
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })

  const form = await req.formData()
  const isGalleryShare = form.get("isGalleryShare") === "true"

  // 갤러리 공유(isGalleryShare=true)는 로그인만 필요, 후기 올리기는 구매자만 가능
  if (!isGalleryShare && user.isAdmin !== true) {
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

  const file = form.get("file")
  const content = form.get("content")
  const compositionRaw = form.get("composition")

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: isGalleryShare ? "꽃다발 이미지를 올려주세요" : "꽃다발 사진을 올려주세요" }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "사진은 10MB 이하로 올려주세요" }, { status: 400 })
  }

  let composition: unknown
  try {
    composition = JSON.parse(String(compositionRaw))
  } catch {
    return NextResponse.json({ error: "꽃 조합 정보가 올바르지 않아요" }, { status: 400 })
  }

  let blobUrl: string | undefined
  try {
    const folder = isGalleryShare ? "bouquet-gallery" : "bouquet-posts"
    const blob = await putPublicObject(`${folder}/${nanoid()}.jpg`, file, file.type || "image/jpeg")
    blobUrl = blob.url
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Vercel Blob upload error:", err)
    return NextResponse.json({ error: `이미지 업로드 실패: ${msg}` }, { status: 500 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("BouquetPost")
      .insert({
        id: nanoid(),
        userId: user.id,
        authorName: user.name ?? "꽃 애호가",
        imageUrl: blobUrl,
        composition,
        content: String(content ?? "").trim() || null,
        sourceType: isGalleryShare ? "AI_COMPOSITE" : "BUYER_REVIEW",
      })
      .select("id")
      .single()

    if (error || !data) {
      console.error("Supabase insert error:", error)
      const msg = error?.message ?? "insert failed"
      return NextResponse.json({ error: `DB 저장 실패: ${msg}` }, { status: 500 })
    }
    const pointsGranted = !isGalleryShare && await grantPointsOnce({ userId: user.id, amount: POINT_POLICY.REVIEW, reason: "REVIEW", referenceType: "BouquetPost", referenceId: data.id })
    return NextResponse.json({ id: data.id, pointsGranted: pointsGranted ? POINT_POLICY.REVIEW : 0 }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("BouquetPost DB insert error:", err)
    return NextResponse.json({ error: `후기 올리기 실패: ${msg}` }, { status: 500 })
  }
}

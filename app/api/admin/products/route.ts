import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"
import { isAdmin } from "@/lib/adminAuth"

const FIELDS = "id, name, description, price, stock, category, images, flowerMeaning, ohaengTags, seasonTags, colorTags, useTags, isActive, createdAt"

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "권한이 없어요" }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from("Product")
    .select(FIELDS)
    .order("createdAt", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "권한이 없어요" }, { status: 403 })

  const body = await req.json()
  if (!body.name?.trim() || !body.price || !body.category) {
    return NextResponse.json({ error: "이름, 가격, 카테고리는 필수예요" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("Product")
    .insert({
      id: `prod_${nanoid(10)}`,
      name: body.name.trim(),
      description: body.description ?? "",
      price: Number(body.price),
      stock: Number(body.stock ?? 0),
      category: body.category,
      images: body.images ?? [],
      flowerMeaning: body.flowerMeaning || null,
      ohaengTags: body.ohaengTags ?? [],
      seasonTags: body.seasonTags ?? [],
      colorTags: body.colorTags ?? [],
      useTags: body.useTags ?? [],
      isActive: body.isActive ?? true,
    })
    .select(FIELDS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "권한이 없어요" }, { status: 403 })

  const { id, ...body } = await req.json()
  if (!id) return NextResponse.json({ error: "상품 id가 필요해요" }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = String(body.name).trim()
  if (body.description !== undefined) update.description = body.description
  if (body.price !== undefined) update.price = Number(body.price)
  if (body.stock !== undefined) update.stock = Number(body.stock)
  if (body.category !== undefined) update.category = body.category
  if (body.images !== undefined) update.images = body.images
  if (body.flowerMeaning !== undefined) update.flowerMeaning = body.flowerMeaning || null
  if (body.ohaengTags !== undefined) update.ohaengTags = body.ohaengTags
  if (body.seasonTags !== undefined) update.seasonTags = body.seasonTags
  if (body.colorTags !== undefined) update.colorTags = body.colorTags
  if (body.useTags !== undefined) update.useTags = body.useTags
  if (body.isActive !== undefined) update.isActive = body.isActive

  const { data, error } = await supabaseAdmin
    .from("Product")
    .update(update)
    .eq("id", id)
    .select(FIELDS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

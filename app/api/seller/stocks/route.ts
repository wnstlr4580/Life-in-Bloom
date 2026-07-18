import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { FLOWERS_BY_OHAENG } from "@/lib/flowers"

const suggestions = Object.entries(FLOWERS_BY_OHAENG).flatMap(([ohaeng, flowers]) =>
  flowers.map((flower) => ({ name: flower.name, meaning: flower.meaning, color: flower.color, ohaeng }))
)
const UNITS = new Set(["STEM", "BUNCH", "BOX"])

export async function GET() {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const { data: seller } = await supabaseAdmin.from("Seller").select("offersDiyFlowers").eq("id", actor.seller.id).single()
  if (!seller?.offersDiyFlowers) return NextResponse.json({ error: "개별 꽃·소재 판매 서비스를 먼저 활성화해주세요" }, { status: 403 })
  const { data, error } = await supabaseAdmin.from("SellerStock").select("*").eq("sellerId", actor.seller.id).order("updatedAt", { ascending: false })
  if (error) return NextResponse.json({ error: "개별 꽃 재고를 불러오지 못했어요" }, { status: 500 })
  return NextResponse.json({ stocks: data ?? [], suggestions })
}

export async function POST(req: Request) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const body = await req.json()
  const flowerName = String(body.flowerName ?? "").trim()
  const color = String(body.color ?? "").trim()
  const grade = String(body.grade ?? "").trim()
  const flowerMeaning = String(body.flowerMeaning ?? "").trim()
  const unit = String(body.unit ?? "STEM")
  const quantity = Number(body.quantity)
  const unitPrice = Number(body.unitPrice)
  if (!flowerName || flowerName.length > 50) return NextResponse.json({ error: "꽃명을 1~50자로 입력해주세요" }, { status: 400 })
  if (!UNITS.has(unit) || !Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(unitPrice) || unitPrice < 0) return NextResponse.json({ error: "단위, 재고 수량과 단가를 확인해주세요" }, { status: 400 })
  if (flowerMeaning.length > 200) return NextResponse.json({ error: "꽃말은 200자 이하로 입력해주세요" }, { status: 400 })
  const flowerCode = `${flowerName}-${color || "기본"}-${grade || "기본"}`.toLowerCase().replace(/\s+/g, "-").slice(0, 100)
  const { data: duplicate } = await supabaseAdmin.from("SellerStock").select("id").eq("sellerId", actor.seller.id).eq("flowerCode", flowerCode).maybeSingle()
  if (duplicate) return NextResponse.json({ error: "같은 꽃·색상·등급 재고가 이미 등록돼 있어요" }, { status: 409 })
  const { data, error } = await supabaseAdmin.from("SellerStock").insert({
    id: nanoid(), sellerId: actor.seller.id, flowerCode, flowerName, flowerMeaning: flowerMeaning || null,
    color: color || null, grade: grade || null, unit, quantity, unitPrice, isActive: body.isActive !== false,
  }).select("*").single()
  if (error) return NextResponse.json({ error: "개별 꽃 재고를 등록하지 못했어요" }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: "재고 항목을 찾을 수 없어요" }, { status: 400 })
  const update: Record<string, unknown> = {}
  if (body.quantity !== undefined) {
    const quantity = Number(body.quantity)
    if (!Number.isInteger(quantity) || quantity < 0) return NextResponse.json({ error: "재고는 0 이상의 정수여야 해요" }, { status: 400 })
    update.quantity = quantity
  }
  if (body.unitPrice !== undefined) {
    const unitPrice = Number(body.unitPrice)
    if (!Number.isInteger(unitPrice) || unitPrice < 0) return NextResponse.json({ error: "단가는 0 이상의 정수여야 해요" }, { status: 400 })
    update.unitPrice = unitPrice
  }
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive)
  const { data, error } = await supabaseAdmin.from("SellerStock").update(update).eq("id", body.id).eq("sellerId", actor.seller.id).select("*").maybeSingle()
  if (error || !data) return NextResponse.json({ error: "재고를 수정하지 못했어요" }, { status: 400 })
  return NextResponse.json(data)
}

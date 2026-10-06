import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { FLOWERS_BY_OHAENG } from "@/lib/flowers"
import { normalizeBarcode } from "@/lib/barcode"

const suggestions = Object.entries(FLOWERS_BY_OHAENG).flatMap(([ohaeng, flowers]) =>
  flowers.map((flower) => ({ name: flower.name, meaning: flower.meaning, color: flower.color, ohaeng }))
)
const UNITS = new Set(["STEM", "BUNCH", "BOX"])

// 같은 판매처 안에서는 바코드가 겹치면 안 된다 (포토부스·매장 스캔이 하나의 재고를 찾아야 함)
async function barcodeTaken(sellerId: string, barcode: string, exceptId?: string) {
  let query = supabaseAdmin.from("SellerStock").select("id").eq("sellerId", sellerId).eq("barcode", barcode)
  if (exceptId) query = query.neq("id", exceptId)
  const { data } = await query.limit(1)
  return Boolean(data?.length)
}

export async function GET() {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const { data: seller } = await supabaseAdmin.from("Seller").select("offersDiyFlowers, offersCustomBouquet").eq("id", actor.seller.id).single()
  if (!seller?.offersDiyFlowers && !seller?.offersCustomBouquet) return NextResponse.json({ error: "개별 꽃을 사용하는 서비스를 먼저 활성화해주세요" }, { status: 403 })
  const { data, error } = await supabaseAdmin.from("SellerStock").select("*").eq("sellerId", actor.seller.id).order("updatedAt", { ascending: false })
  if (error) return NextResponse.json({ error: "개별 꽃 재고를 불러오지 못했어요" }, { status: 500 })
  return NextResponse.json({ stocks: data ?? [], suggestions })
}

export async function POST(req: Request) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const form = await req.formData()
  const flowerName = String(form.get("flowerName") ?? "").trim()
  const color = String(form.get("color") ?? "").trim()
  const grade = String(form.get("grade") ?? "").trim()
  const flowerMeaning = String(form.get("flowerMeaning") ?? "").trim()
  const unit = String(form.get("unit") ?? "STEM")
  const quantity = Number(form.get("quantity"))
  const unitPrice = Number(form.get("unitPrice"))
  const displayStartAt = String(form.get("displayStartAt") ?? "").trim()
  const displayEndAt = String(form.get("displayEndAt") ?? "").trim()
  if (!flowerName || flowerName.length > 50) return NextResponse.json({ error: "꽃명을 1~50자로 입력해주세요" }, { status: 400 })
  if (!UNITS.has(unit) || !Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(unitPrice) || unitPrice < 0) return NextResponse.json({ error: "등급, 단위, 재고 수량과 단가를 확인해주세요" }, { status: 400 })
  if (flowerMeaning.length > 200) return NextResponse.json({ error: "꽃말은 200자 이하로 입력해주세요" }, { status: 400 })
  if (displayStartAt && displayEndAt && new Date(displayStartAt) >= new Date(displayEndAt)) return NextResponse.json({ error: "노출 종료일은 시작일보다 뒤여야 해요" }, { status: 400 })
  const { barcode, error: barcodeError } = normalizeBarcode(form.get("barcode"))
  if (barcodeError) return NextResponse.json({ error: barcodeError }, { status: 400 })
  if (barcode && await barcodeTaken(actor.seller.id, barcode)) return NextResponse.json({ error: "이미 다른 재고에 등록된 바코드예요" }, { status: 409 })
  const availableForCustom = form.get("availableForCustom") === "true"
  const availableForDiy = form.get("availableForDiy") === "true"
  if (!availableForCustom && !availableForDiy) return NextResponse.json({ error: "사용처를 한 개 이상 선택해주세요" }, { status: 400 })

  const flowerCode = `${flowerName}-${color || "기본"}-${grade || "기본"}`.toLowerCase().replace(/\s+/g, "-").slice(0, 100)
  const { data: duplicate } = await supabaseAdmin.from("SellerStock").select("id").eq("sellerId", actor.seller.id).eq("flowerCode", flowerCode).maybeSingle()
  if (duplicate) return NextResponse.json({ error: "같은 꽃·색상·등급 재고가 이미 등록돼 있어요" }, { status: 409 })

  const image = form.get("image")
  let imageUrl: string | null = null
  if (image instanceof File && image.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size > 5 * 1024 * 1024) return NextResponse.json({ error: "사진은 5MB 이하 JPG, PNG, WEBP만 가능해요" }, { status: 400 })
    const path = `${actor.seller.id}/stocks/${nanoid()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    const { error: uploadError } = await supabaseAdmin.storage.from("seller-product-images").upload(path, image, { contentType: image.type })
    if (uploadError) return NextResponse.json({ error: "꽃 사진을 업로드하지 못했어요" }, { status: 500 })
    imageUrl = supabaseAdmin.storage.from("seller-product-images").getPublicUrl(path).data.publicUrl
  }
  const isVisible = form.get("isVisible") !== "false"
  if (isVisible && !imageUrl) {
    return NextResponse.json({ error: "고객에게 노출하려면 대표 사진을 등록해 주세요." }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from("SellerStock").insert({
    id: nanoid(), sellerId: actor.seller.id, flowerCode, flowerName, flowerMeaning: flowerMeaning || null,
    color: color || null, grade: grade || null, unit, quantity, unitPrice, imageUrl, barcode,
    availableForCustom, availableForDiy, isVisible,
    displayStartAt: displayStartAt ? new Date(displayStartAt).toISOString() : null,
    displayEndAt: displayEndAt ? new Date(displayEndAt).toISOString() : null, isActive: true,
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
  for (const field of ["quantity", "unitPrice"]) {
    if (body[field] !== undefined) {
      const value = Number(body[field])
      if (!Number.isInteger(value) || value < 0) return NextResponse.json({ error: "재고와 단가는 0 이상의 정수여야 해요" }, { status: 400 })
      update[field] = value
    }
  }
  for (const field of ["isActive", "isVisible", "availableForCustom", "availableForDiy"]) {
    if (body[field] !== undefined) update[field] = Boolean(body[field])
  }
  if (body.grade !== undefined) update.grade = String(body.grade).trim() || null
  if (body.flowerName !== undefined) {
    const flowerName = String(body.flowerName).trim()
    if (!flowerName || flowerName.length > 50) return NextResponse.json({ error: "꽃명을 1~50자로 입력해주세요" }, { status: 400 })
    update.flowerName = flowerName
  }
  if (body.flowerMeaning !== undefined) {
    const flowerMeaning = String(body.flowerMeaning).trim()
    if (flowerMeaning.length > 200) return NextResponse.json({ error: "꽃말은 200자 이하로 입력해주세요" }, { status: 400 })
    update.flowerMeaning = flowerMeaning || null
  }
  if (body.color !== undefined) update.color = String(body.color).trim() || null
  if (body.barcode !== undefined) {
    const { barcode, error } = normalizeBarcode(body.barcode)
    if (error) return NextResponse.json({ error }, { status: 400 })
    if (barcode && await barcodeTaken(actor.seller.id, barcode, body.id)) return NextResponse.json({ error: "이미 다른 재고에 등록된 바코드예요" }, { status: 409 })
    update.barcode = barcode
  }
  if (body.unit !== undefined) {
    if (!UNITS.has(String(body.unit))) return NextResponse.json({ error: "판매 단위를 확인해주세요" }, { status: 400 })
    update.unit = String(body.unit)
  }
  for (const field of ["displayStartAt", "displayEndAt"]) {
    if (body[field] !== undefined) {
      const value = String(body[field] ?? "").trim()
      if (value && Number.isNaN(Date.parse(value))) return NextResponse.json({ error: "노출 일시를 확인해주세요" }, { status: 400 })
      update[field] = value ? new Date(value).toISOString() : null
    }
  }
  const start = update.displayStartAt ?? body.displayStartAt
  const end = update.displayEndAt ?? body.displayEndAt
  if (start && end && new Date(String(start)) >= new Date(String(end))) {
    return NextResponse.json({ error: "노출 종료일은 시작일보다 뒤여야 해요" }, { status: 400 })
  }
  if (body.isVisible === true) {
    const { data: stock } = await supabaseAdmin
      .from("SellerStock")
      .select("imageUrl")
      .eq("id", body.id)
      .eq("sellerId", actor.seller.id)
      .maybeSingle()
    if (!stock?.imageUrl) {
      return NextResponse.json({ error: "대표 사진을 등록한 뒤 노출할 수 있습니다." }, { status: 400 })
    }
  }
  const { data, error } = await supabaseAdmin.from("SellerStock").update(update).eq("id", body.id).eq("sellerId", actor.seller.id).select("*").maybeSingle()
  if (error || !data) return NextResponse.json({ error: "재고를 수정하지 못했어요" }, { status: 400 })
  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const form = await req.formData()
  const id = String(form.get("id") ?? "")
  const image = form.get("image")
  if (!id || !(image instanceof File) || image.size === 0) return NextResponse.json({ error: "변경할 꽃 사진을 선택해주세요" }, { status: 400 })
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size > 5 * 1024 * 1024) return NextResponse.json({ error: "사진은 5MB 이하 JPG, PNG, WEBP만 가능해요" }, { status: 400 })
  const { data: stock } = await supabaseAdmin.from("SellerStock").select("id").eq("id", id).eq("sellerId", actor.seller.id).maybeSingle()
  if (!stock) return NextResponse.json({ error: "재고 항목을 찾을 수 없어요" }, { status: 404 })
  const path = `${actor.seller.id}/stocks/${nanoid()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
  const { error: uploadError } = await supabaseAdmin.storage.from("seller-product-images").upload(path, image, { contentType: image.type })
  if (uploadError) return NextResponse.json({ error: "꽃 사진을 업로드하지 못했어요" }, { status: 500 })
  const imageUrl = supabaseAdmin.storage.from("seller-product-images").getPublicUrl(path).data.publicUrl
  const { error } = await supabaseAdmin.from("SellerStock").update({ imageUrl }).eq("id", id).eq("sellerId", actor.seller.id)
  if (error) return NextResponse.json({ error: "꽃 사진을 저장하지 못했어요" }, { status: 500 })
  return NextResponse.json({ imageUrl })
}

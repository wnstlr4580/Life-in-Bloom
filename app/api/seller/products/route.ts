import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { classifyProductOhaeng } from "@/lib/product-ohaeng"

const FIELDS = "id, sellerId, name, description, price, stock, category, images, flowerMeaning, ohaengTags, seasonTags, colorTags, useTags, deliveryDays, deliveryStartTime, deliveryEndTime, displayStartAt, displayEndAt, saleStatus, isActive, createdAt"
const CATEGORIES = new Set(["bouquet", "plant", "wreath", "flower-box", "gift-set", "dried"])
const DAYS = new Set(["월", "화", "수", "목", "금", "토", "일"])
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const validDate = (value: string | null) => !value || (!Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value))

function jsonArray(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"))
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export async function GET() {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const { data, error } = await supabaseAdmin
    .from("Product").select(FIELDS).eq("sellerId", actor.seller.id).neq("category", "custom").order("createdAt", { ascending: false })
  if (error) return NextResponse.json({ error: "상품을 불러오지 못했어요" }, { status: 500 })
  return NextResponse.json({ products: data ?? [] })
}

export async function POST(req: NextRequest) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 상품을 등록할 수 있어요" }, { status: 403 })
  const form = await req.formData()
  const name = String(form.get("name") ?? "").trim()
  const description = String(form.get("description") ?? "").trim()
  const category = String(form.get("category") ?? "")
  const price = Number(form.get("price"))
  const stock = Number(form.get("stock"))
  const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0)

  if (!name || !description || !CATEGORIES.has(category) || !Number.isInteger(price) || price < 100 || !Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: "상품명, 설명, 카테고리, 가격과 재고를 확인해주세요" }, { status: 400 })
  }
  if (name.length > 100 || description.length > 10000) return NextResponse.json({ error: "상품명은 100자, 설명은 10,000자 이하로 입력해주세요" }, { status: 400 })
  if (files.length === 0 || files.length > 5) return NextResponse.json({ error: "상품 이미지는 1~5장 등록해주세요" }, { status: 400 })

  const productId = `prod_${nanoid(12)}`
  const uploaded: string[] = []
  for (const [index, file] of files.entries()) {
    if (file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      if (uploaded.length) await supabaseAdmin.storage.from("seller-product-images").remove(uploaded)
      return NextResponse.json({ error: "이미지는 JPG, PNG, WEBP 형식의 10MB 이하 파일만 가능해요" }, { status: 400 })
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `${actor.seller.id}/${productId}/${index}-${nanoid(6)}.${extension}`
    const { error } = await supabaseAdmin.storage.from("seller-product-images").upload(path, file, { contentType: file.type })
    if (error) {
      if (uploaded.length) await supabaseAdmin.storage.from("seller-product-images").remove(uploaded)
      return NextResponse.json({ error: "상품 이미지 업로드에 실패했어요" }, { status: 500 })
    }
    uploaded.push(path)
  }
  const images = uploaded.map((path) => supabaseAdmin.storage.from("seller-product-images").getPublicUrl(path).data.publicUrl)
  const colorTags = jsonArray(form.get("colorTags"))
  const displayStartAt = String(form.get("displayStartAt") ?? "") || null
  const displayEndAt = String(form.get("displayEndAt") ?? "") || null
  const deliveryDays = jsonArray(form.get("deliveryDays"))
  const deliveryStartTime = String(form.get("deliveryStartTime") ?? "") || null
  const deliveryEndTime = String(form.get("deliveryEndTime") ?? "") || null
  if (!deliveryDays.length || deliveryDays.some((day) => !DAYS.has(day))) {
    return NextResponse.json({ error: "배송 가능 요일을 한 개 이상 정확히 선택해주세요" }, { status: 400 })
  }
  if (!deliveryStartTime || !deliveryEndTime || !TIME.test(deliveryStartTime) || !TIME.test(deliveryEndTime) || deliveryStartTime >= deliveryEndTime) {
    return NextResponse.json({ error: "배송 시작·종료 시간을 확인해주세요" }, { status: 400 })
  }
  if (!validDate(displayStartAt) || !validDate(displayEndAt)) {
    return NextResponse.json({ error: "상품 노출 일시 형식을 확인해주세요" }, { status: 400 })
  }
  if (displayStartAt && displayEndAt && new Date(displayStartAt) >= new Date(displayEndAt)) {
    return NextResponse.json({ error: "노출 종료일은 시작일보다 뒤여야 해요" }, { status: 400 })
  }
  const payload = {
    id: productId, sellerId: actor.seller.id, name, description, category, price, stock, images,
    flowerMeaning: null,
    ohaengTags: classifyProductOhaeng({ name, description, category, colorTags }),
    seasonTags: jsonArray(form.get("seasonTags")), colorTags, useTags: jsonArray(form.get("useTags")),
    deliveryDays, deliveryStartTime, deliveryEndTime,
    displayStartAt, displayEndAt, saleStatus: "ON_SALE", isActive: true,
  }
  const { data, error } = await supabaseAdmin.from("Product").insert(payload).select(FIELDS).single()
  if (error) {
    await supabaseAdmin.storage.from("seller-product-images").remove(uploaded)
    return NextResponse.json({ error: "상품을 저장하지 못했어요" }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const { id, ...body } = await req.json()
  if (!id) return NextResponse.json({ error: "상품을 찾을 수 없어요" }, { status: 400 })
  const allowed = ["name", "description", "price", "stock", "category", "flowerMeaning", "seasonTags", "colorTags", "useTags", "deliveryDays", "deliveryStartTime", "deliveryEndTime", "displayStartAt", "displayEndAt", "saleStatus", "isActive"]
  const update = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)))
  if (update.price !== undefined && (!Number.isInteger(update.price) || Number(update.price) < 100)) return NextResponse.json({ error: "판매가는 100원 이상의 정수여야 해요" }, { status: 400 })
  if (update.stock !== undefined && (!Number.isInteger(update.stock) || Number(update.stock) < 0)) return NextResponse.json({ error: "재고는 0 이상의 정수여야 해요" }, { status: 400 })
  if (update.category !== undefined && !CATEGORIES.has(String(update.category))) return NextResponse.json({ error: "올바른 카테고리를 선택해주세요" }, { status: 400 })
  if (update.saleStatus !== undefined && !["ON_SALE", "PAUSED", "HIDDEN"].includes(String(update.saleStatus))) return NextResponse.json({ error: "올바른 판매 상태를 선택해주세요" }, { status: 400 })
  if (update.saleStatus !== undefined) update.isActive = update.saleStatus === "ON_SALE"
  if (update.deliveryDays !== undefined && (!Array.isArray(update.deliveryDays) || update.deliveryDays.length === 0 || update.deliveryDays.some((day) => !DAYS.has(String(day))))) return NextResponse.json({ error: "배송 가능 요일을 확인해주세요" }, { status: 400 })
  if (update.deliveryStartTime && !TIME.test(String(update.deliveryStartTime))) return NextResponse.json({ error: "배송 시작 시간 형식이 올바르지 않아요" }, { status: 400 })
  if (update.deliveryEndTime && !TIME.test(String(update.deliveryEndTime))) return NextResponse.json({ error: "배송 종료 시간 형식이 올바르지 않아요" }, { status: 400 })
  if (!validDate(update.displayStartAt ? String(update.displayStartAt) : null) || !validDate(update.displayEndAt ? String(update.displayEndAt) : null)) return NextResponse.json({ error: "상품 노출 일시 형식이 올바르지 않아요" }, { status: 400 })
  if (body.name || body.description || body.category || body.flowerMeaning || body.colorTags) {
    update.ohaengTags = classifyProductOhaeng(body)
  }
  const { data, error } = await supabaseAdmin
    .from("Product").update(update).eq("id", id).eq("sellerId", actor.seller.id).select(FIELDS).maybeSingle()
  if (error || !data) return NextResponse.json({ error: "상품을 수정하지 못했어요" }, { status: 400 })
  return NextResponse.json(data)
}

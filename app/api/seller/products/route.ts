import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { classifyProductOhaeng } from "@/lib/product-ohaeng"

const FIELDS = "id, sellerId, name, description, composition, sizeGuide, substitutionNotice, originInfo, deliveryArea, sameDayCutoff, orderNotice, careInstructions, price, stock, category, images, detailImages, noticeImages, flowerMeaning, ohaengTags, seasonTags, colorTags, useTags, deliveryDays, deliveryStartTime, deliveryEndTime, displayStartAt, displayEndAt, saleStatus, isActive, createdAt"
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

async function uploadImages(files: File[], prefix: string, max: number) {
  if (files.length > max) throw new Error(`이미지는 최대 ${max}장까지 등록할 수 있어요`)
  const paths: string[] = []
  for (const [index, file] of files.entries()) {
    if (file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      if (paths.length) await supabaseAdmin.storage.from("seller-product-images").remove(paths)
      throw new Error("이미지는 JPG, PNG, WEBP 형식의 10MB 이하 파일만 가능해요")
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `${prefix}/${index}-${nanoid(6)}.${extension}`
    const { error } = await supabaseAdmin.storage.from("seller-product-images").upload(path, file, { contentType: file.type })
    if (error) {
      if (paths.length) await supabaseAdmin.storage.from("seller-product-images").remove(paths)
      throw new Error("상품 이미지 업로드에 실패했어요")
    }
    paths.push(path)
  }
  return {
    paths,
    urls: paths.map((path) => supabaseAdmin.storage.from("seller-product-images").getPublicUrl(path).data.publicUrl),
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
  const composition = String(form.get("composition") ?? "").trim()
  const sizeGuide = String(form.get("sizeGuide") ?? "").trim()
  const substitutionNotice = String(form.get("substitutionNotice") ?? "").trim()
  const originInfo = String(form.get("originInfo") ?? "").trim()
  const deliveryArea = String(form.get("deliveryArea") ?? "").trim()
  const sameDayCutoff = String(form.get("sameDayCutoff") ?? "").trim()
  const orderNotice = String(form.get("orderNotice") ?? "").trim()
  const careInstructions = String(form.get("careInstructions") ?? "").trim()
  const category = String(form.get("category") ?? "")
  const price = Number(form.get("price"))
  const stock = Number(form.get("stock"))
  const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0)
  const detailFiles = form.getAll("detailImages").filter((value): value is File => value instanceof File && value.size > 0)
  const noticeFiles = form.getAll("noticeImages").filter((value): value is File => value instanceof File && value.size > 0)

  if (!name || !description || !composition || !sizeGuide || !substitutionNotice || !originInfo || !deliveryArea || !sameDayCutoff || !orderNotice || !careInstructions || !CATEGORIES.has(category) || !Number.isInteger(price) || price < 100 || !Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: "상품 기본정보, 구성·크기·배송·주문 안내, 가격과 재고를 모두 입력해주세요" }, { status: 400 })
  }
  if (name.length > 100 || description.length > 10000) return NextResponse.json({ error: "상품명은 100자, 설명은 10,000자 이하로 입력해주세요" }, { status: 400 })
  if (files.length < 3 || files.length > 5) return NextResponse.json({ error: "대표·갤러리 이미지는 3~5장 등록해주세요" }, { status: 400 })
  if (detailFiles.length < 1 || detailFiles.length > 20) return NextResponse.json({ error: "상품 상세 이미지는 1~20장 등록해주세요" }, { status: 400 })

  const productId = `prod_${nanoid(12)}`
  let uploaded: string[] = []
  let images: string[] = []
  let detailImages: string[] = []
  let noticeImages: string[] = []
  try {
    const gallery = await uploadImages(files, `${actor.seller.id}/${productId}/gallery`, 5)
    const detail = await uploadImages(detailFiles, `${actor.seller.id}/${productId}/detail`, 20)
    const notice = await uploadImages(noticeFiles, `${actor.seller.id}/${productId}/notice`, 10)
    uploaded = [...gallery.paths, ...detail.paths, ...notice.paths]
    images = gallery.urls
    detailImages = detail.urls
    noticeImages = notice.urls
  } catch (error) {
    if (uploaded.length) await supabaseAdmin.storage.from("seller-product-images").remove(uploaded)
    return NextResponse.json({ error: error instanceof Error ? error.message : "이미지 업로드에 실패했어요" }, { status: 400 })
  }
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
    id: productId, sellerId: actor.seller.id, name, description, composition, sizeGuide, substitutionNotice, originInfo,
    deliveryArea, sameDayCutoff, orderNotice, careInstructions, category, price, stock, images, detailImages, noticeImages,
    flowerMeaning: null,
    ohaengTags: classifyProductOhaeng({ name, description, category, colorTags }),
    seasonTags: jsonArray(form.get("seasonTags")), colorTags, useTags: jsonArray(form.get("useTags")),
    deliveryDays, deliveryStartTime, deliveryEndTime,
    displayStartAt, displayEndAt, saleStatus: stock === 0 ? "SOLD_OUT" : "ON_SALE", isActive: true,
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
  const allowed = ["name", "description", "composition", "sizeGuide", "substitutionNotice", "originInfo", "deliveryArea", "sameDayCutoff", "orderNotice", "careInstructions", "price", "stock", "category", "flowerMeaning", "seasonTags", "colorTags", "useTags", "deliveryDays", "deliveryStartTime", "deliveryEndTime", "displayStartAt", "displayEndAt", "saleStatus", "isActive"]
  const update = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)))
  if (update.name !== undefined && (!String(update.name).trim() || String(update.name).trim().length > 100)) return NextResponse.json({ error: "상품명은 1~100자로 입력해주세요" }, { status: 400 })
  if (update.description !== undefined && (!String(update.description).trim() || String(update.description).trim().length > 10000)) return NextResponse.json({ error: "상세 설명은 1~10,000자로 입력해주세요" }, { status: 400 })
  for (const field of ["composition", "sizeGuide", "substitutionNotice", "originInfo", "deliveryArea", "sameDayCutoff", "orderNotice", "careInstructions"]) {
    if (update[field] !== undefined && !String(update[field]).trim()) return NextResponse.json({ error: "상품 구성·크기·배송·주문 안내는 비워둘 수 없어요" }, { status: 400 })
  }
  if (update.price !== undefined && (!Number.isInteger(update.price) || Number(update.price) < 100)) return NextResponse.json({ error: "판매가는 100원 이상의 정수여야 해요" }, { status: 400 })
  if (update.stock !== undefined && (!Number.isInteger(update.stock) || Number(update.stock) < 0)) return NextResponse.json({ error: "재고는 0 이상의 정수여야 해요" }, { status: 400 })
  if (update.category !== undefined && !CATEGORIES.has(String(update.category))) return NextResponse.json({ error: "올바른 카테고리를 선택해주세요" }, { status: 400 })
  if (update.saleStatus !== undefined && !["ON_SALE", "SOLD_OUT", "PAUSED", "HIDDEN"].includes(String(update.saleStatus))) return NextResponse.json({ error: "올바른 판매 상태를 선택해주세요" }, { status: 400 })
  const { data: currentProduct } = await supabaseAdmin
    .from("Product").select("stock, saleStatus").eq("id", id).eq("sellerId", actor.seller.id).maybeSingle()
  if (!currentProduct) return NextResponse.json({ error: "상품을 찾을 수 없어요" }, { status: 404 })
  const nextStock = update.stock === undefined ? Number(currentProduct.stock) : Number(update.stock)
  const requestedStatus = String(update.saleStatus ?? currentProduct.saleStatus)
  if (nextStock === 0 && ["ON_SALE", "SOLD_OUT"].includes(requestedStatus)) update.saleStatus = "SOLD_OUT"
  if (nextStock > 0 && requestedStatus === "SOLD_OUT") update.saleStatus = "ON_SALE"
  if (update.saleStatus !== undefined) update.isActive = ["ON_SALE", "SOLD_OUT"].includes(String(update.saleStatus))
  if (update.deliveryDays !== undefined && (!Array.isArray(update.deliveryDays) || update.deliveryDays.length === 0 || update.deliveryDays.some((day) => !DAYS.has(String(day))))) return NextResponse.json({ error: "배송 가능 요일을 확인해주세요" }, { status: 400 })
  if (update.deliveryStartTime && !TIME.test(String(update.deliveryStartTime))) return NextResponse.json({ error: "배송 시작 시간 형식이 올바르지 않아요" }, { status: 400 })
  if (update.deliveryEndTime && !TIME.test(String(update.deliveryEndTime))) return NextResponse.json({ error: "배송 종료 시간 형식이 올바르지 않아요" }, { status: 400 })
  if (update.deliveryStartTime && update.deliveryEndTime && String(update.deliveryStartTime) >= String(update.deliveryEndTime)) return NextResponse.json({ error: "배송 종료 시간은 시작 시간보다 뒤여야 해요" }, { status: 400 })
  if (!validDate(update.displayStartAt ? String(update.displayStartAt) : null) || !validDate(update.displayEndAt ? String(update.displayEndAt) : null)) return NextResponse.json({ error: "상품 노출 일시 형식이 올바르지 않아요" }, { status: 400 })
  if (update.displayStartAt && update.displayEndAt && new Date(String(update.displayStartAt)) >= new Date(String(update.displayEndAt))) return NextResponse.json({ error: "노출 종료일은 시작일보다 뒤여야 해요" }, { status: 400 })
  if (body.name || body.description || body.category || body.flowerMeaning || body.colorTags) {
    update.ohaengTags = classifyProductOhaeng(body)
  }
  const { data, error } = await supabaseAdmin
    .from("Product").update(update).eq("id", id).eq("sellerId", actor.seller.id).select(FIELDS).maybeSingle()
  if (error || !data) return NextResponse.json({ error: "상품을 수정하지 못했어요" }, { status: 400 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const form = await req.formData()
  const id = String(form.get("id") ?? "")
  if (!id) return NextResponse.json({ error: "상품을 찾을 수 없어요" }, { status: 400 })
  const { data: product } = await supabaseAdmin.from("Product").select("id").eq("id", id).eq("sellerId", actor.seller.id).maybeSingle()
  if (!product) return NextResponse.json({ error: "상품을 찾을 수 없어요" }, { status: 404 })

  const existingImages = jsonArray(form.get("existingImages"))
  const existingDetailImages = jsonArray(form.get("existingDetailImages"))
  const existingNoticeImages = jsonArray(form.get("existingNoticeImages"))
  const galleryFiles = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0)
  const detailFiles = form.getAll("detailImages").filter((value): value is File => value instanceof File && value.size > 0)
  const noticeFiles = form.getAll("noticeImages").filter((value): value is File => value instanceof File && value.size > 0)
  if (existingImages.length + galleryFiles.length < 3 || existingImages.length + galleryFiles.length > 5) {
    return NextResponse.json({ error: "대표·갤러리 이미지는 3~5장 유지해주세요" }, { status: 400 })
  }
  if (existingDetailImages.length + detailFiles.length < 1 || existingDetailImages.length + detailFiles.length > 20 || existingNoticeImages.length + noticeFiles.length > 10) {
    return NextResponse.json({ error: "상세 이미지는 최대 20장, 주문 전 안내는 최대 10장입니다" }, { status: 400 })
  }
  let uploaded: string[] = []
  try {
    const gallery = await uploadImages(galleryFiles, `${actor.seller.id}/${id}/gallery`, 5)
    const detail = await uploadImages(detailFiles, `${actor.seller.id}/${id}/detail`, 20)
    const notice = await uploadImages(noticeFiles, `${actor.seller.id}/${id}/notice`, 10)
    uploaded = [...gallery.paths, ...detail.paths, ...notice.paths]
    const { data, error } = await supabaseAdmin.from("Product").update({
      images: [...existingImages, ...gallery.urls],
      detailImages: [...existingDetailImages, ...detail.urls],
      noticeImages: [...existingNoticeImages, ...notice.urls],
    }).eq("id", id).eq("sellerId", actor.seller.id).select(FIELDS).maybeSingle()
    if (error || !data) throw new Error("상품 이미지를 저장하지 못했어요")
    return NextResponse.json(data)
  } catch (error) {
    if (uploaded.length) await supabaseAdmin.storage.from("seller-product-images").remove(uploaded)
    return NextResponse.json({ error: error instanceof Error ? error.message : "상품 이미지 수정에 실패했어요" }, { status: 400 })
  }
}

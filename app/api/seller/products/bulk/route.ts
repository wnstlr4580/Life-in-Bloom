import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { nanoid } from "nanoid"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { classifyProductOhaeng } from "@/lib/product-ohaeng"

const HEADERS: Record<string, string> = {
  상품명: "name", 카테고리: "category", 판매가: "price", 재고: "stock", 상품설명: "description",
  색상태그: "colorTags", 계절태그: "seasonTags", 용도태그: "useTags",
  대표이미지URL: "image1", 추가이미지URL1: "image2", 추가이미지URL2: "image3",
  배송가능요일: "deliveryDays", 배송시작시간: "deliveryStartTime", 배송종료시간: "deliveryEndTime",
  노출시작일시: "displayStartAt", 노출종료일시: "displayEndAt",
}
const CATEGORIES = new Set(["bouquet", "plant", "wreath", "flower-box", "gift-set", "dried"])
const DAYS = new Set(["월", "화", "수", "목", "금", "토", "일"])
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const split = (value: unknown) => String(value ?? "").split(",").map((v) => v.trim()).filter(Boolean)
const value = (cell: ExcelJS.Cell) => typeof cell.value === "object" && cell.value && "text" in cell.value ? String(cell.value.text) : String(cell.value ?? "").trim()

export async function POST(req: NextRequest) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const file = (await req.formData()).get("file")
  if (!(file instanceof File) || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "5MB 이하 엑셀 파일을 선택해주세요" }, { status: 400 })

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as never)
  const sheet = workbook.worksheets[0]
  if (!sheet) return NextResponse.json({ error: "첫 번째 시트를 찾지 못했어요" }, { status: 400 })
  const columns = new Map<number, string>()
  sheet.getRow(1).eachCell((cell, col) => { const key = HEADERS[value(cell)]; if (key) columns.set(col, key) })
  const rows: Record<string, string>[] = []
  const errors: { row: number; message: string }[] = []
  for (const required of ["name", "category", "price", "stock", "description", "image1", "deliveryDays", "deliveryStartTime", "deliveryEndTime"]) {
    if (![...columns.values()].includes(required)) return NextResponse.json({ error: "필수 열이 빠진 파일입니다. 최신 양식을 다시 내려받아주세요" }, { status: 400 })
  }

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const item: Record<string, string> = {}
    columns.forEach((key, col) => { item[key] = value(row.getCell(col)) })
    if (!item.name) return
    const price = Number(item.price), stock = Number(item.stock)
    if (!CATEGORIES.has(item.category)) errors.push({ row: rowNumber, message: "카테고리 코드를 확인해주세요" })
    else if (!Number.isInteger(price) || price < 100) errors.push({ row: rowNumber, message: "판매가는 100원 이상의 정수여야 해요" })
    else if (!Number.isInteger(stock) || stock < 0) errors.push({ row: rowNumber, message: "재고는 0 이상의 정수여야 해요" })
    else if (!item.description || !item.image1?.startsWith("https://")) errors.push({ row: rowNumber, message: "상품설명과 https 대표이미지URL은 필수예요" })
    else if ([item.image2, item.image3].filter(Boolean).some((url) => !url.startsWith("https://"))) errors.push({ row: rowNumber, message: "추가 이미지도 https URL만 입력할 수 있어요" })
    else if (!split(item.deliveryDays).length || split(item.deliveryDays).some((day) => !DAYS.has(day))) errors.push({ row: rowNumber, message: "배송가능요일은 월~일을 쉼표로 구분해주세요" })
    else if (!TIME.test(item.deliveryStartTime) || !TIME.test(item.deliveryEndTime) || item.deliveryStartTime >= item.deliveryEndTime) errors.push({ row: rowNumber, message: "배송 시간은 HH:mm 형식이며 종료가 시작보다 뒤여야 해요" })
    else if ((item.displayStartAt && Number.isNaN(Date.parse(item.displayStartAt))) || (item.displayEndAt && Number.isNaN(Date.parse(item.displayEndAt)))) errors.push({ row: rowNumber, message: "노출 일시는 YYYY-MM-DD HH:mm 형식으로 입력해주세요" })
    else if (item.displayStartAt && item.displayEndAt && new Date(item.displayStartAt) >= new Date(item.displayEndAt)) errors.push({ row: rowNumber, message: "노출 종료일은 시작일보다 뒤여야 해요" })
    else rows.push(item)
  })
  if (errors.length) return NextResponse.json({ error: "수정이 필요한 행이 있어요", errors }, { status: 400 })
  if (!rows.length || rows.length > 500) return NextResponse.json({ error: "상품은 한 번에 1~500개 등록할 수 있어요" }, { status: 400 })

  const payload = rows.map((item) => {
    const colorTags = split(item.colorTags)
    return {
      id: `prod_${nanoid(12)}`, sellerId: actor.seller!.id, name: item.name, category: item.category,
      price: Number(item.price), stock: Number(item.stock), description: item.description,
      flowerMeaning: null, colorTags, seasonTags: split(item.seasonTags),
      useTags: split(item.useTags), images: [item.image1, item.image2, item.image3].filter(Boolean),
      ohaengTags: classifyProductOhaeng({ ...item, colorTags }),
      deliveryDays: split(item.deliveryDays), deliveryStartTime: item.deliveryStartTime || null,
      deliveryEndTime: item.deliveryEndTime || null, displayStartAt: item.displayStartAt || null,
      displayEndAt: item.displayEndAt || null, saleStatus: Number(item.stock) === 0 ? "SOLD_OUT" : "ON_SALE", isActive: true,
    }
  })
  const { error } = await supabaseAdmin.from("Product").insert(payload)
  if (error) return NextResponse.json({ error: `등록에 실패했어요: ${error.message}` }, { status: 500 })
  return NextResponse.json({ count: payload.length })
}

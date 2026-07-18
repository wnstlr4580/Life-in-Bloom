import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { nanoid } from "nanoid"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { FLOWERS_BY_OHAENG } from "@/lib/flowers"

const HEADER = ["꽃명", "색상", "등급", "판매단위", "재고수량", "단가", "꽃말", "판매여부"]
const UNIT: Record<string, string> = { 송이: "STEM", 단: "BUNCH", 박스: "BOX", STEM: "STEM", BUNCH: "BUNCH", BOX: "BOX" }
const flowerMeanings = Object.values(FLOWERS_BY_OHAENG).flat().map((f) => ({ name: f.name.trim(), meaning: f.meaning }))

function cellText(value: ExcelJS.CellValue) {
  if (value == null) return ""
  if (typeof value === "object") {
    if ("text" in value) return String(value.text)
    if ("result" in value) return String(value.result ?? "")
    if ("richText" in value) return value.richText.map((item) => item.text).join("")
  }
  return String(value).trim()
}

export async function POST(req: Request) {
  const actor = await requireSeller(true)
  if (!actor?.seller) return NextResponse.json({ error: "승인된 판매자만 이용할 수 있어요" }, { status: 403 })
  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "엑셀 파일을 선택해주세요" }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "파일은 5MB 이하만 등록할 수 있어요" }, { status: 400 })
  if (!/\.xlsx$/i.test(file.name)) return NextResponse.json({ error: ".xlsx 파일만 등록할 수 있어요" }, { status: 400 })

  const workbook = new ExcelJS.Workbook()
  const buffer = Buffer.from(await file.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0]
  try { await workbook.xlsx.load(buffer) }
  catch { return NextResponse.json({ error: "엑셀 파일을 읽을 수 없어요. 제공된 양식을 사용해주세요" }, { status: 400 }) }
  const sheet = workbook.getWorksheet("개별 꽃 재고") ?? workbook.worksheets[0]
  if (!sheet) return NextResponse.json({ error: "등록할 시트를 찾을 수 없어요" }, { status: 400 })
  const headers = HEADER.map((_, index) => cellText(sheet.getCell(1, index + 1).value))
  if (HEADER.some((name, index) => headers[index] !== name)) return NextResponse.json({ error: `첫 행의 열 이름을 바꾸지 마세요: ${HEADER.join(", ")}` }, { status: 400 })
  if (sheet.rowCount - 1 > 500) return NextResponse.json({ error: "한 번에 최대 500행까지 등록할 수 있어요" }, { status: 400 })

  const rows: Record<string, unknown>[] = []
  const errors: { row: number; message: string }[] = []
  const seen = new Set<string>()
  for (let rowNo = 2; rowNo <= sheet.rowCount; rowNo++) {
    const values = HEADER.map((_, index) => cellText(sheet.getCell(rowNo, index + 1).value))
    if (values.every((value) => !value)) continue
    const [flowerName, color, grade, unitText, quantityText, priceText, suppliedMeaning, activeText] = values
    const quantity = Number(quantityText.replace(/,/g, ""))
    const unitPrice = Number(priceText.replace(/,/g, ""))
    const unit = UNIT[unitText]
    if (!flowerName || flowerName.length > 50) errors.push({ row: rowNo, message: "꽃명은 1~50자로 입력해주세요" })
    if (!unit) errors.push({ row: rowNo, message: "판매단위는 송이, 단, 박스 중 하나여야 해요" })
    if (!Number.isInteger(quantity) || quantity < 0) errors.push({ row: rowNo, message: "재고수량은 0 이상의 정수여야 해요" })
    if (!Number.isInteger(unitPrice) || unitPrice < 0) errors.push({ row: rowNo, message: "단가는 0 이상의 정수여야 해요" })
    if (suppliedMeaning.length > 200) errors.push({ row: rowNo, message: "꽃말은 200자 이하로 입력해주세요" })
    const flowerCode = `${flowerName}-${color || "기본"}-${grade || "기본"}`.toLowerCase().replace(/\s+/g, "-").slice(0, 100)
    if (seen.has(flowerCode)) errors.push({ row: rowNo, message: "파일 안에 같은 꽃·색상·등급이 중복됐어요" })
    seen.add(flowerCode)
    const recommended = flowerMeanings.find((flower) => flower.name === flowerName || flowerName.includes(flower.name))
    rows.push({
      id: nanoid(), sellerId: actor.seller.id, flowerCode, flowerName,
      flowerMeaning: suppliedMeaning || recommended?.meaning || null, color: color || null, grade: grade || null,
      unit: unit || "STEM", quantity, unitPrice, isActive: !["아니오", "N", "NO", "FALSE", "0"].includes(activeText.toUpperCase()),
    })
  }
  if (rows.length === 0) return NextResponse.json({ error: "등록할 데이터가 없어요" }, { status: 400 })
  if (errors.length) return NextResponse.json({ error: "입력값을 확인해주세요", errors: errors.slice(0, 100) }, { status: 400 })

  const codes = rows.map((row) => String(row.flowerCode))
  const { data: duplicates } = await supabaseAdmin.from("SellerStock").select("flowerCode").eq("sellerId", actor.seller.id).in("flowerCode", codes)
  if (duplicates?.length) return NextResponse.json({ error: `이미 등록된 재고가 ${duplicates.length}건 있어요. 기존 재고는 목록에서 수정해주세요`, duplicateCodes: duplicates.map((item) => item.flowerCode) }, { status: 409 })
  const { error } = await supabaseAdmin.from("SellerStock").insert(rows)
  if (error) return NextResponse.json({ error: "엑셀 재고를 등록하지 못했어요" }, { status: 500 })
  return NextResponse.json({ inserted: rows.length })
}

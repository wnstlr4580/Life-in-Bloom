import fs from "node:fs/promises"
import { SpreadsheetFile, Workbook } from "file:///C:/Users/ra188/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs"

const outputDir = "public/templates"
await fs.mkdir(outputDir, { recursive: true })
const workbook = Workbook.create()
const sheet = workbook.worksheets.add("상품등록")
sheet.showGridLines = false
const headers = ["상품명","카테고리","판매가","재고","상품설명","색상태그","계절태그","용도태그","대표이미지URL","추가이미지URL1","추가이미지URL2","배송가능요일","배송시작시간","배송종료시간","노출시작일시","노출종료일시"]
const example = ["봄날 장미 꽃다발","bouquet",49000,20,"분홍 장미와 유칼립투스로 만든 꽃다발","핑크,초록","spring","생일,기념일","https://example.com/main.jpg","","","월,화,수,목,금","09:00","18:00","2026-07-18 09:00","2026-12-31 23:59"]
sheet.getRange("A1:P2").values = [headers, example]
sheet.getRange("A1:P1").format = { fill: "#07885F", font: { bold: true, color: "#FFFFFF" }, wrapText: true }
sheet.getRange("A2:P2").format = { fill: "#F1FBF6", font: { color: "#3F4A44" }, wrapText: true }
sheet.getRange("A1:P2").format.borders = { preset: "inside", style: "thin", color: "#D8E5DE" }
sheet.getRange("A1:P2").format.rowHeight = 34
sheet.getRange("A:A").format.columnWidth = 24
sheet.getRange("B:D").format.columnWidth = 14
sheet.getRange("E:E").format.columnWidth = 36
sheet.getRange("F:H").format.columnWidth = 18
sheet.getRange("I:K").format.columnWidth = 32
sheet.getRange("L:P").format.columnWidth = 20
sheet.freezePanes.freezeRows(1)
sheet.getRange("B2:B501").dataValidation = { rule: { type: "list", values: ["bouquet","plant","wreath","flower-box","gift-set","dried"] } }
const guide = workbook.worksheets.add("작성안내")
guide.showGridLines = false
guide.getRange("A1:B8").values = [
  ["인생내꽃 상품 대량등록 안내",""],
  ["필수 항목","상품명, 카테고리, 판매가, 재고, 상품설명, 대표이미지URL"],
  ["카테고리 코드","bouquet / plant / wreath / flower-box / gift-set / dried"],
  ["여러 값 입력","색상·계절·용도·배송요일은 쉼표(,)로 구분"],
  ["이미지","외부에서 접근 가능한 https URL만 입력"],
  ["일시 형식","YYYY-MM-DD HH:mm (노출 종료는 시작보다 뒤)"],
  ["오행 태그","입력하지 않습니다. 인생내꽃 알고리즘이 자동 분류합니다."],
  ["등록 한도","파일당 최대 500개 상품"],
]
guide.getRange("A1:B1").format = { fill: "#07885F", font: { bold: true, color: "#FFFFFF", size: 14 } }
guide.getRange("A2:A8").format = { fill: "#E8F7F0", font: { bold: true, color: "#067353" } }
guide.getRange("A1:B8").format.wrapText = true
guide.getRange("A:A").format.columnWidth = 20
guide.getRange("B:B").format.columnWidth = 70
const preview = await workbook.render({ sheetName: "상품등록", autoCrop: "all", scale: 1, format: "png" })
await fs.writeFile("public/templates/product-template-preview.png", new Uint8Array(await preview.arrayBuffer()))
const xlsx = await SpreadsheetFile.exportXlsx(workbook)
await xlsx.save(`${outputDir}/life-in-bloom-product-template.xlsx`)
console.log((await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 2000 })).ndjson)

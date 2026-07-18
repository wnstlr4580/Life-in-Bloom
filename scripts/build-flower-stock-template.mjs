import fs from "node:fs/promises"
import { SpreadsheetFile, Workbook } from "file:///C:/Users/ra188/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs"

const outputDir = "public/templates"
const artifactDir = "outputs/flower-stock-excel"
await fs.mkdir(outputDir, { recursive: true })
await fs.mkdir(artifactDir, { recursive: true })
const workbook = Workbook.create()
const sheet = workbook.worksheets.add("개별 꽃 재고")
sheet.showGridLines = false
const headers = ["꽃명", "색상", "등급", "판매단위", "재고수량", "단가", "꽃말", "판매여부"]
const examples = [
  ["장미", "빨강", "특", "송이", 120, 2500, "", "예"],
  ["유칼립투스", "초록", "상", "단", 30, 9000, "", "예"],
]
sheet.getRange("A1:H3").values = [headers, ...examples]
sheet.getRange("A1:H1").format = { fill: "#087A59", font: { bold: true, color: "#FFFFFF" }, wrapText: true, horizontalAlignment: "center" }
sheet.getRange("A2:H3").format = { fill: "#F2FBF7", font: { color: "#35453D" }, wrapText: true }
sheet.getRange("A1:H3").format.borders = { preset: "inside", style: "thin", color: "#CFE6DB" }
sheet.getRange("A1:H3").format.rowHeight = 32
sheet.getRange("A:C").format.columnWidth = 18
sheet.getRange("D:F").format.columnWidth = 15
sheet.getRange("G:G").format.columnWidth = 34
sheet.getRange("H:H").format.columnWidth = 14
sheet.freezePanes.freezeRows(1)
sheet.getRange("D2:D501").dataValidation = { rule: { type: "list", values: ["송이", "단", "박스"] } }
sheet.getRange("H2:H501").dataValidation = { rule: { type: "list", values: ["예", "아니오"] } }

const guide = workbook.worksheets.add("작성안내")
guide.showGridLines = false
guide.getRange("A1:B9").values = [
  ["인생내꽃 개별 꽃 재고 일괄등록", ""],
  ["필수 항목", "꽃명, 판매단위, 재고수량, 단가"],
  ["판매단위", "송이 / 단 / 박스 중 하나를 선택합니다."],
  ["재고·단가", "0 이상의 정수로 입력합니다."],
  ["꽃말", "비워두면 꽃명에 맞춰 인생내꽃 자체 DB의 추천 꽃말을 적용합니다."],
  ["판매여부", "예 / 아니오. 비워두면 예로 등록됩니다."],
  ["중복 기준", "같은 꽃명·색상·등급 조합은 한 번만 등록할 수 있습니다."],
  ["파일 형식", "열 이름과 순서를 바꾸지 않은 .xlsx 파일만 등록합니다."],
  ["등록 한도", "파일당 최대 500행, 5MB 이하"],
]
guide.getRange("A1:B1").format = { fill: "#087A59", font: { bold: true, color: "#FFFFFF", size: 14 } }
guide.getRange("A2:A9").format = { fill: "#E5F6EE", font: { bold: true, color: "#076A4E" } }
guide.getRange("A1:B9").format.wrapText = true
guide.getRange("A:A").format.columnWidth = 20
guide.getRange("B:B").format.columnWidth = 70
const preview = await workbook.render({ sheetName: "개별 꽃 재고", autoCrop: "all", scale: 1.3, format: "png" })
await fs.writeFile(`${outputDir}/flower-stock-template-preview.png`, new Uint8Array(await preview.arrayBuffer()))
const xlsx = await SpreadsheetFile.exportXlsx(workbook)
await xlsx.save(`${outputDir}/life-in-bloom-flower-stock-template.xlsx`)
await xlsx.save(`${artifactDir}/life-in-bloom-flower-stock-template.xlsx`)
console.log((await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 2000 })).ndjson)

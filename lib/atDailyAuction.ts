import * as XLSX from "@e965/xlsx"
import { AT_AUCTION_MARKETS, type AtAuctionMarket } from "@/lib/atAuctionMarkets"

const AT_BASE_URL = "https://flower.at.or.kr"
const LIST_URL = `${AT_BASE_URL}/hab09/hab09.do`
const DOWNLOAD_URL = `${AT_BASE_URL}/excel/excelDownLoad.do`

type AuctionPriceRow = {
  marketId: string
  marketName: string
  companyCode: string
  tradeDate: string
  itemName: string
  quantity: number
  minPrice: number
  maxPrice: number
  averagePrice: number
  sourceUrl: string
  fetchedAt: string
}
const isoDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date)
const daysAgo = (days: number) => isoDate(new Date(Date.now() - days * 86_400_000))
const number = (value: unknown) => {
  const parsed = Number(String(value ?? "").replaceAll(",", ""))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

async function findRecentFiles(market: AtAuctionMarket) {
  const body = new URLSearchParams({ currentPageNo: "1", searchStrDate: daysAgo(7), searchEndDate: daysAgo(0), mobCmpCd: market.companyCode })
  const response = await fetch(LIST_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Life-in-Bloom/1.0" }, body, cache: "no-store", signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`aT 목록 HTTP ${response.status}`)
  const html = await response.text()
  const matches = [...html.matchAll(/excelExport\('([0-9-]{10})',\s*'([0-9]{10})'\)/g)]
    .filter((match) => match[2] === market.companyCode)
    .map((match) => ({ tradeDate: match[1], companyCode: match[2] }))
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate))
  return matches.slice(0, 7)
}

export async function downloadAndParse(market: AtAuctionMarket, tradeDate: string): Promise<AuctionPriceRow[]> {
  const url = new URL(DOWNLOAD_URL)
  url.searchParams.set("excelNm", "일자별 경매동향")
  url.searchParams.set("saleDate", tradeDate)
  url.searchParams.set("cmpCd", market.companyCode)
  const response = await fetch(url, { headers: { "User-Agent": "Life-in-Bloom/1.0" }, cache: "no-store", signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`aT 엑셀 HTTP ${response.status}`)
  const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: "buffer" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null })
  return parseAtDailyRows(rows, market, tradeDate)
}

/** Require a declared cut-flower category or bundle unit; column offsets alone are unsafe. */
export function parseAtDailyRows(rows: unknown[][], market: AtAuctionMarket, tradeDate: string): AuctionPriceRow[] {
  const normalize = (value: unknown) => String(value ?? "").replace(/\s/g, "")
  const headerIndex = rows.findIndex(row => row.some(cell => /^(품목|품목명|품명)$/.test(normalize(cell))) && row.some(cell => /평균/.test(normalize(cell))))
  if (headerIndex < 0) throw new Error("공식 엑셀의 가격 열을 확인하지 못했습니다")
  const headers = rows[headerIndex].map(normalize)
  const column = (pattern: RegExp) => headers.findIndex(value => pattern.test(value))
  const itemColumn = column(/^(품목|품목명|품명)$/), quantityColumn = column(/^(속수량|수량|거래량|물량|총수량|거래수량)(\(.*\))?$/)
  const minColumn = column(/최저/), maxColumn = column(/최고/), averageColumn = column(/평균/)
  const categoryColumn = column(/^(부류|화훼부류|구분|부류명)$/), unitColumn = column(/^단위$/)
  const explicitBundleQuantity = quantityColumn >= 0 && (/\((속|단)\)/.test(headers[quantityColumn]) || headers[quantityColumn] === "속수량")
  if ([itemColumn, quantityColumn, minColumn, maxColumn, averageColumn].some(index => index < 0)) throw new Error("공식 엑셀의 필수 열이 변경되었습니다")
  if (categoryColumn < 0 && unitColumn < 0 && !explicitBundleQuantity) throw new Error("절화·분화 또는 속 단위를 검증할 수 없어 가격 수집을 보류했습니다")
  const grouped = new Map<string, { quantity: number; weighted: number; min: number; max: number }>()
  for (const row of rows.slice(headerIndex + 1)) {
    const category = categoryColumn >= 0 ? normalize(row[categoryColumn]) : ""
    const unit = unitColumn >= 0 ? normalize(row[unitColumn]) : ""
    if (categoryColumn >= 0 && category !== "절화") continue
    if (unit && !["속", "단"].includes(unit)) continue
    if (category !== "절화" && !["속", "단"].includes(unit) && !explicitBundleQuantity) continue
    const itemName = String(row[itemColumn] ?? "").trim()
    const quantity = number(row[quantityColumn]), min = number(row[minColumn]), max = number(row[maxColumn]), average = number(row[averageColumn])
    if (!itemName || /합계|소계|총계/.test(itemName) || !quantity || !average || !min || !max || min > average || average > max) continue
    const current = grouped.get(itemName) ?? { quantity: 0, weighted: 0, min: Infinity, max: 0 }
    current.quantity += quantity; current.weighted += average * quantity
    current.min = Math.min(current.min, min); current.max = Math.max(current.max, max)
    grouped.set(itemName, current)
  }
  const fetchedAt = new Date().toISOString()
  return [...grouped].map(([itemName, value]) => ({
    marketId: market.id, marketName: market.name, companyCode: market.companyCode, tradeDate, itemName,
    quantity: Math.round(value.quantity), minPrice: Math.round(value.min), maxPrice: Math.round(value.max),
    averagePrice: Math.round(value.weighted / value.quantity),
    sourceUrl: `${DOWNLOAD_URL}?${new URLSearchParams({ excelNm: "일자별 경매동향", saleDate: tradeDate, cmpCd: market.companyCode, flowerGubn: "1", unit: "BUNDLE", parser: "2" })}`, fetchedAt,
  }))
}

export async function fetchLatestAtDailyAuctions() {
  return Promise.all(AT_AUCTION_MARKETS.map(async (market) => {
    try {
      const files = await findRecentFiles(market)
      if (!files.length) return { market, status: "NO_FILE" as const, rows: [] as AuctionPriceRow[] }
      const fetched = await Promise.allSettled(files.map(file => downloadAndParse(market, file.tradeDate)))
      const rows = fetched.flatMap(result => result.status === "fulfilled" ? result.value : [])
      if (!rows.length) return { market, status: "ERROR" as const, error: "최근 원파일에서 사용 가능한 가격 행을 읽지 못했습니다", rows }
      return { market, status: "OK" as const, tradeDate: files[0].tradeDate, rows }

    } catch (error) {
      return { market, status: "ERROR" as const, error: error instanceof Error ? error.message : "수집 실패", rows: [] as AuctionPriceRow[] }
    }
  }))
}

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

async function findLatestFile(market: AtAuctionMarket) {
  const body = new URLSearchParams({ currentPageNo: "1", searchStrDate: daysAgo(7), searchEndDate: daysAgo(0), mobCmpCd: market.companyCode })
  const response = await fetch(LIST_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Life-in-Bloom/1.0" }, body, cache: "no-store", signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`aT 목록 HTTP ${response.status}`)
  const html = await response.text()
  const matches = [...html.matchAll(/excelExport\('([0-9-]{10})',\s*'([0-9]{10})'\)/g)]
    .filter((match) => match[2] === market.companyCode)
    .map((match) => ({ tradeDate: match[1], companyCode: match[2] }))
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate))
  return matches[0] ?? null
}

async function downloadAndParse(market: AtAuctionMarket, tradeDate: string): Promise<AuctionPriceRow[]> {
  const url = new URL(DOWNLOAD_URL)
  url.searchParams.set("excelNm", "일자별 경매동향")
  url.searchParams.set("saleDate", tradeDate)
  url.searchParams.set("cmpCd", market.companyCode)
  const response = await fetch(url, { headers: { "User-Agent": "Life-in-Bloom/1.0" }, cache: "no-store", signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`aT 엑셀 HTTP ${response.status}`)
  const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: "buffer" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null })
  const grouped = new Map<string, { quantity: number; weighted: number; min: number; max: number }>()
  for (const row of rows.slice(1)) {
    const itemName = String(row[0] ?? "").trim()
    const quantity = number(row[3]), min = number(row[4]), max = number(row[5]), average = number(row[6])
    if (!itemName || !quantity || !average) continue
    const current = grouped.get(itemName) ?? { quantity: 0, weighted: 0, min: Number.MAX_SAFE_INTEGER, max: 0 }
    current.quantity += quantity
    current.weighted += average * quantity
    current.min = Math.min(current.min, min || average)
    current.max = Math.max(current.max, max || average)
    grouped.set(itemName, current)
  }
  const fetchedAt = new Date().toISOString()
  return [...grouped].map(([itemName, value]) => ({
    marketId: market.id, marketName: market.name, companyCode: market.companyCode, tradeDate, itemName,
    quantity: Math.round(value.quantity), minPrice: Math.round(value.min), maxPrice: Math.round(value.max),
    averagePrice: Math.round(value.weighted / value.quantity), sourceUrl: `${LIST_URL}?market=${market.companyCode}`, fetchedAt,
  }))
}

export async function fetchLatestAtDailyAuctions() {
  return Promise.all(AT_AUCTION_MARKETS.map(async (market) => {
    try {
      const latest = await findLatestFile(market)
      if (!latest) return { market, status: "NO_FILE" as const, rows: [] as AuctionPriceRow[] }
      return { market, status: "OK" as const, tradeDate: latest.tradeDate, rows: await downloadAndParse(market, latest.tradeDate) }
    } catch (error) {
      return { market, status: "ERROR" as const, error: error instanceof Error ? error.message : "수집 실패", rows: [] as AuctionPriceRow[] }
    }
  }))
}

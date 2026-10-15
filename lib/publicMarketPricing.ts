import { matchesFlowerGroup } from "./atAuctionMarkets"

export type AuctionObservation = {
  marketId: string; tradeDate: string; itemName: string; quantity: number
  minPrice: number; maxPrice: number; averagePrice: number
  sourceUrl: string; fetchedAt: string
}

export const APPROX_STEMS_PER_BUNDLE: Record<string, number> = {
  장미: 10, 백합: 10, 국화: 10, 카네이션: 10, 튤립: 10, 거베라: 10,
  프리지아: 10, 칼라: 10, 아이리스: 10, 글라디올러스: 10,
  리시안사스: 10, 금어초: 10, 알스트로메리아: 10,
  수국: 5, 작약: 5, 해바라기: 5,
}

// Old imports discarded the category/unit. Never silently treat those as cut-flower prices.
export function isVerifiedCutFlower(row: AuctionObservation) {
  try {
    const url = new URL(row.sourceUrl)
    return url.hostname === "flower.at.or.kr" && url.searchParams.get("flowerGubn") === "1"
      && url.searchParams.get("unit") === "BUNDLE" && url.searchParams.get("parser") === "2"
  } catch { return false }
}

export function auctionReference(rows: AuctionObservation[], marketId: string, group: string, today: string) {
  const all = rows.filter(row => row.marketId === marketId && matchesFlowerGroup(row.itemName, group))
  const valid = all.filter(row => isVerifiedCutFlower(row) && Number.isFinite(row.averagePrice) && row.averagePrice > 0
    // aT explicitly excludes Tue/Thu/Sat online trades from representative cut-flower prices.
    && (marketId !== "at-yangjae" || [1, 3, 5].includes(new Date(`${row.tradeDate}T00:00:00Z`).getUTCDay()))
    && !["kflower-eumseong", "kflower-gwacheon", "kflower-goyang"].includes(marketId)
    && Number.isFinite(row.quantity) && row.quantity > 0 && row.tradeDate <= today
    && Date.parse(today) - Date.parse(row.tradeDate) <= 7 * 86400000)
  const days = [...new Set(valid.map(row => row.tradeDate))].sort().reverse()
  const daily = days.map(date => {
    const items = valid.filter(row => row.tradeDate === date)
    const quantity = items.reduce((sum, row) => sum + row.quantity, 0)
    return { date, quantity, average: items.reduce((sum, row) => sum + row.averagePrice * row.quantity, 0) / quantity, items }
  })
  // A tiny late auction must not replace a normal trading day (e.g. 12 versus 14,414 bundles).
  const sortedVolumes = daily.map(day => day.quantity).sort((a, b) => a - b)
  const medianVolume = sortedVolumes[Math.floor(sortedVolumes.length / 2)] ?? 0
  const usable = daily.filter(day => day.quantity >= Math.max(30, medianVolume * 0.1)).slice(0, 3)
  if (!usable.length) return { status: all.length ? "UNVERIFIED_OR_SPARSE" as const : "NO_DATA" as const, average: null, low: null, high: null, dates: [] as string[], volume: 0, sources: [] as { date: string; url: string; fetchedAt: string }[], excludedDays: daily.length }
  const volume = usable.reduce((sum, day) => sum + day.quantity, 0)
  return {
    status: "AUCTION_REFERENCE" as const,
    average: Math.round(usable.reduce((sum, day) => sum + day.average * day.quantity, 0) / volume),
    // These are observed daily averages, NOT a prediction interval or retail range.
    low: Math.round(Math.min(...usable.map(day => day.average))),
    high: Math.round(Math.max(...usable.map(day => day.average))),
    dates: usable.map(day => day.date), volume,
    sources: usable.flatMap(day => day.items.map(row => ({ date: day.date, url: row.sourceUrl, fetchedAt: row.fetchedAt }))),
    excludedDays: daily.length - usable.length,
  }
}

export function purchaseLine(quantity: number, stemsPerBundle: number | null, quotePerBundle: number | null) {
  const valid = Number.isInteger(quantity) && quantity > 0 && stemsPerBundle !== null && Number.isInteger(stemsPerBundle) && stemsPerBundle > 0
  if (!valid) return { bundles: null, spareStems: null, total: null }
  const bundles = Math.ceil(quantity / stemsPerBundle!)
  return { bundles, spareStems: bundles * stemsPerBundle! - quantity, total: quotePerBundle !== null && Number.isFinite(quotePerBundle) && quotePerBundle > 0 ? Math.round(bundles * quotePerBundle) : null }
}

// 꽃시장(공판장 주변 도소매 매장) 1단 구매가 ÷ 같은 시기 aT 경락가로 산정한 매장 가산율.
// 근거와 계산: docs/market-purchase-analysis.md (관측 약 1.1~1.45배, 중심 약 1.25배)
export const RETAIL_PLANNING = { lowMultiplier: 1.1, midpointMultiplier: 1.25, highMultiplier: 1.45, version: "auction-budget-v2" } as const
export function estimatedMarketPurchase(flowers: { quantity: number; stemsPerBundle: number | null; reference?: { average: number | null; low: number | null; high: number | null } }[], wrappingPrice = 0) {
  if (!flowers.length || !Number.isFinite(wrappingPrice) || wrappingPrice < 0) return null
  const lines = flowers.map(flower => {
    const plan = purchaseLine(flower.quantity, flower.stemsPerBundle, flower.reference?.average ?? null)
    if (plan.total === null || !flower.reference?.low || !flower.reference.high) return null
    return { ...plan, purchased: plan.bundles! * flower.stemsPerBundle!,
      low: plan.bundles! * flower.reference.low * RETAIL_PLANNING.lowMultiplier,
      high: plan.bundles! * flower.reference.high * RETAIL_PLANNING.highMultiplier }
  })
  if (lines.some(line => !line)) return null
  const valid = lines.map(line => line!)
  const round = (value: number) => Math.round(value / 500) * 500
  return { estimate: round(valid.reduce((sum, line) => sum + line.total! * RETAIL_PLANNING.midpointMultiplier, 0) + wrappingPrice),
    low: Math.floor((valid.reduce((sum, line) => sum + line.low, 0) + wrappingPrice) / 500) * 500,
    high: Math.ceil((valid.reduce((sum, line) => sum + line.high, 0) + wrappingPrice) / 500) * 500,
    purchased: valid.reduce((sum, line) => sum + line.purchased, 0), spare: valid.reduce((sum, line) => sum + line.spareStems!, 0),
    wrappingPrice, modelVersion: RETAIL_PLANNING.version }
}

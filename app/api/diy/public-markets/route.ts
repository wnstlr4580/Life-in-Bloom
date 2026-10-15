import { NextResponse } from "next/server"
import { FLOWERS } from "@/lib/customFlowers"
import { publicMarketDirectory } from "@/lib/publicMarketDirectory"
import { APPROX_STEMS_PER_BUNDLE, auctionReference, purchaseLine, type AuctionObservation, SOLD_BY_STEM } from "@/lib/publicMarketPricing"
import { supabaseAdmin } from "@/lib/supabase"

export const maxDuration = 25
const isoDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date)
const rad = (n: number) => n * Math.PI / 180
function distance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
}

// Directory availability must never depend on an external price service.
export async function GET() {
  return NextResponse.json({ markets: publicMarketDirectory() })
}

async function liveDayRows(group: string, today: string): Promise<AuctionObservation[]> {
  if (!process.env.AT_FLOWER_API_KEY) return []
  const params = new URLSearchParams({ kind: "f001", serviceKey: process.env.AT_FLOWER_API_KEY, baseDate: today, flowerGubn: "1", dataType: "json", countPerPage: "999", currentPage: "1", pumName: group })
  try {
    const response = await fetch(`https://flower.at.or.kr/api/returnData.api?${params}`, { cache: "no-store", signal: AbortSignal.timeout(8000) })
    if (!response.ok) return []
    const json = await response.json()
    if (json.response?.resultCd !== "0" || !Array.isArray(json.response.items) || json.response.items.length >= 999) return []
    const rows = (json.response.items as { saleDate: string; flowerGubn: string; pumName: string; avgAmt: string; minAmt: string; maxAmt: string; totQty: string }[])
      .filter(row => row.saleDate === today && row.flowerGubn === "절화" && row.pumName === group && Number(row.avgAmt) > 0 && Number(row.totQty) > 0)
    const quantity = rows.reduce((sum, row) => sum + Number(row.totQty), 0)
    if (!quantity) return []
    return [{ marketId: "at-yangjae", tradeDate: today, itemName: group, quantity,
      averagePrice: Math.round(rows.reduce((sum, row) => sum + Number(row.avgAmt) * Number(row.totQty), 0) / quantity),
      minPrice: Math.min(...rows.map(row => Number(row.minAmt) || Number(row.avgAmt))),
      maxPrice: Math.max(...rows.map(row => Number(row.maxAmt) || Number(row.avgAmt))),
      sourceUrl: `https://flower.at.or.kr/api/returnData.api?kind=f001&baseDate=${today}&flowerGubn=1&unit=BUNDLE&parser=2`, fetchedAt: new Date().toISOString() }]
  } catch { return [] }
}

// No auction today does not mean no price: holidays and non-auction weekdays need recent trading days.
async function liveRows(group: string, today: string): Promise<AuctionObservation[]> {
  const days = Array.from({ length: 8 }, (_, offset) => new Date(Date.parse(`${today}T00:00:00Z`) - offset * 86400000).toISOString().slice(0, 10))
  return (await Promise.all(days.map(day => liveDayRows(group, day)))).flat()
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const requested = new Map<string, number>()
  for (const item of Array.isArray(body?.flowers) ? body.flowers : []) {
    if (!item || typeof item.id !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 200) continue
    if (FLOWERS.some(flower => flower.id === item.id)) requested.set(item.id, Math.min(200, (requested.get(item.id) ?? 0) + item.quantity))
  }
  const flowers = [...requested].map(([id, quantity]) => ({ ...FLOWERS.find(flower => flower.id === id)!, quantity }))
  if (!flowers.length) return NextResponse.json({ error: "꽃과 송이 수를 선택해주세요." }, { status: 400 })
  const today = isoDate(new Date())
  const since = isoDate(new Date(Date.now() - 7 * 86400000))
  const { latitude, longitude } = body
  const hasLocation = typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
  const cacheRequest = supabaseAdmin.from("PublicMarketAuctionPrice")
    .select("marketId,tradeDate,itemName,quantity,minPrice,maxPrice,averagePrice,sourceUrl,fetchedAt")
    .gte("tradeDate", since).lte("tradeDate", today).order("tradeDate", { ascending: false }).limit(5000)
    .abortSignal(AbortSignal.timeout(8000))
  const [cacheResult, liveResult] = await Promise.allSettled([cacheRequest, Promise.all([...new Set(flowers.map(flower => flower.group))].map(group => liveRows(group, today)))])
  const cached = cacheResult.status === "fulfilled" ? (cacheResult.value.data ?? []) as AuctionObservation[] : []
  const live = liveResult.status === "fulfilled" ? liveResult.value.flat() : []
  // Do not double count a day already present in the cache.
  const rows = [...cached.filter(row => !live.some(current => current.marketId === row.marketId && current.tradeDate === row.tradeDate && current.itemName === row.itemName)), ...live]
  const markets = publicMarketDirectory().map(market => {
    const pricedFlowers = flowers.map(flower => {
      const reference = auctionReference(rows, market.id, flower.group, today)
      const stemsPerBundle = APPROX_STEMS_PER_BUNDLE[flower.group] ?? null
      const purchase = purchaseLine(flower.quantity, stemsPerBundle, reference.average, SOLD_BY_STEM.has(flower.group))
      return { id: flower.id, name: flower.name, group: flower.group, quantity: flower.quantity,
        stemsPerBundle, bundleCount: purchase.bundles, spareStems: purchase.spareStems,
        averageBundlePrice: reference.average, referenceTotal: purchase.total, reference }
    })
    const complete = pricedFlowers.every(flower => flower.referenceTotal !== null)
    const total = complete ? pricedFlowers.reduce((sum, flower) => sum + flower.referenceTotal!, 0) : null
    const dates = [...new Set(pricedFlowers.flatMap(flower => flower.reference.dates))].sort()
    return { ...market,
      distanceKm: hasLocation ? distance(latitude, longitude, market.latitude, market.longitude) : null,
      flowers: pricedFlowers, auctionReferenceTotal: total,
      demoQuote: null,
      // No retail prediction until paired, verified consumer purchase data can calibrate it.
      consumerEstimate: null, consumerEstimateStatus: "NEEDS_SHOP_QUOTE",
      basisDate: dates.at(-1) ?? null, oldestBasisDate: dates[0] ?? null,
      checkedAt: new Date().toISOString(), dataStatus: complete ? "AUCTION_REFERENCE" : pricedFlowers.some(flower => flower.reference.status === "UNVERIFIED_OR_SPARSE") ? "UNVERIFIED_OR_SPARSE" : "NO_DATA",
      marketInfoUrl: `https://map.naver.com/p/search/${encodeURIComponent(`${market.marketName} ${market.roadAddress}`)}`,
      auctionInfoUrl: `/api/diy/public-markets/${market.id}/at`,
    }
  }).sort((a, b) => hasLocation ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) : a.marketName.localeCompare(b.marketName, "ko"))
  return NextResponse.json({ markets, connected: live.length > 0, priceServiceAvailable: cacheResult.status === "fulfilled" && !cacheResult.value.error,
    source: "AT_CUT_FLOWER_VERIFIED_V2", directorySourceUrl: "https://flower.at.or.kr/real/real2.do", directoryCriteria: "aT 공판장 목록 8곳", coordinatesManagedManually: true }, { headers: { "Cache-Control": "no-store" } })
}

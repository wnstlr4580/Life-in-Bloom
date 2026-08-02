import { NextResponse } from "next/server"
import { FLOWERS } from "@/lib/customFlowers"
import { matchesFlowerGroup } from "@/lib/atAuctionMarkets"
import { supabaseAdmin } from "@/lib/supabase"

type MarketDirectory = {
  id: string
  marketName: string
  marketType: "공공 화훼공판장" | "농협 화훼공판장" | "꽃 도매상가"
  roadAddress: string
  publicPhone: string
  latitude: number
  longitude: number
  sourceUrl: string
  supportsRealtime: boolean
  isNonghyup: boolean
}

const AT_REALTIME_URL = "https://flower.at.or.kr/real/real2.do"
const AT_OPEN_API_URL = "https://flower.at.or.kr/api/returnData.api"
const MARKET_DIRECTORY_CRITERIA = "aT 화훼유통정보시스템 ‘실시간 경매실적’의 공판장 선택 목록 8곳"

type AuctionRow = {
  saleDate?: string
  pumName?: string
  goodName?: string
  avgAmt?: string
  minAmt?: string
  maxAmt?: string
  totQty?: string
}
type SelectedFlower = { id: string; name: string; group: string; quantity: number }

// 절화의 '속'은 고정된 송이 단위가 아닙니다. 아래 값은 소비자에게 필요한
// 구매 묶음 수를 안내하기 위한 품목별 관행 포장 참고치이며 경매 규격보다 우선하지 않습니다.
const APPROX_STEMS_PER_BUNDLE: Record<string, number> = {
  장미: 10, 백합: 10, 국화: 10, 카네이션: 10, 튤립: 10, 거베라: 10,
  프리지아: 10, 칼라: 10, 아이리스: 10, 글라디올러스: 10,
  리시안사스: 10, 금어초: 10, 알스트로메리아: 10,
  수국: 5, 작약: 5, 해바라기: 5,
}
const MARKETS: MarketDirectory[] = [
  { id: "at-yangjae", marketName: "aT 화훼공판장", marketType: "공공 화훼공판장", roadAddress: "서울 서초구 강남대로 27 (양재동)", publicPhone: "02-579-8100", latitude: 37.4680, longitude: 127.0390, sourceUrl: AT_REALTIME_URL, supportsRealtime: true, isNonghyup: false },
  { id: "busan-eomgung", marketName: "부산화훼공판장", marketType: "농협 화훼공판장", roadAddress: "부산 사상구 엄궁동", publicPhone: "", latitude: 35.1284, longitude: 128.9562, sourceUrl: AT_REALTIME_URL, supportsRealtime: true, isNonghyup: true },
  { id: "busan-gangdong", marketName: "부산경남화훼농협", marketType: "농협 화훼공판장", roadAddress: "부산 강서구 강동동", publicPhone: "", latitude: 35.2112, longitude: 128.9354, sourceUrl: AT_REALTIME_URL, supportsRealtime: false, isNonghyup: true },
  { id: "gwangju-pungam", marketName: "광주원예농협", marketType: "농협 화훼공판장", roadAddress: "광주 서구 풍암동", publicPhone: "", latitude: 35.1264, longitude: 126.8730, sourceUrl: AT_REALTIME_URL, supportsRealtime: true, isNonghyup: true },
  { id: "kflower-eumseong", marketName: "한국화훼농협 음성공판장", marketType: "농협 화훼공판장", roadAddress: "충북 음성군", publicPhone: "", latitude: 36.9403, longitude: 127.6905, sourceUrl: AT_REALTIME_URL, supportsRealtime: true, isNonghyup: true },
  { id: "kflower-gwacheon", marketName: "한국화훼농협 과천공판장", marketType: "농협 화훼공판장", roadAddress: "경기 과천시", publicPhone: "", latitude: 37.4292, longitude: 126.9876, sourceUrl: AT_REALTIME_URL, supportsRealtime: false, isNonghyup: true },
  { id: "kflower-goyang", marketName: "한국화훼농협 고양공판장", marketType: "농협 화훼공판장", roadAddress: "경기 고양시", publicPhone: "", latitude: 37.6584, longitude: 126.8320, sourceUrl: AT_REALTIME_URL, supportsRealtime: false, isNonghyup: true },
  { id: "yeongnam-gimhae", marketName: "영남화훼농협 김해공판장", marketType: "농협 화훼공판장", roadAddress: "경남 김해시", publicPhone: "", latitude: 35.2285, longitude: 128.8894, sourceUrl: AT_REALTIME_URL, supportsRealtime: false, isNonghyup: true },
]

const rad = (value: number) => value * Math.PI / 180
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
}

const amount = (value: string | undefined) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function getTodayAuction(group: string, today: string) {
  const serviceKey = process.env.AT_FLOWER_API_KEY
  if (!serviceKey) return { rows: [] as AuctionRow[], error: "API_KEY_MISSING" }
  const params = new URLSearchParams({
    kind: "f001", serviceKey, baseDate: today, flowerGubn: "1",
    dataType: "json", countPerPage: "999", currentPage: "1", pumName: group,
  })
  try {
    const response = await fetch(`${AT_OPEN_API_URL}?${params}`, { cache: "no-store" })
    if (!response.ok) return { rows: [] as AuctionRow[], error: `HTTP_${response.status}` }
    const json = await response.json() as { response?: { resultCd?: string; items?: AuctionRow[] } }
    if (json.response?.resultCd !== "0") return { rows: [] as AuctionRow[], error: "API_ERROR" }
    const rows = (json.response.items ?? []).filter((row) => row.saleDate === today && row.pumName === group && amount(row.avgAmt) !== null)
    return { rows, error: null }
  } catch {
    return { rows: [] as AuctionRow[], error: "FETCH_ERROR" }
  }
}

function summarize(rows: AuctionRow[]) {
  const valid = rows.flatMap((row) => {
    const avg = amount(row.avgAmt)
    if (avg === null) return []
    return [{ avg, min: amount(row.minAmt) ?? avg, max: amount(row.maxAmt) ?? avg, qty: amount(row.totQty) ?? 1 }]
  })
  if (!valid.length) return null
  const totalQty = valid.reduce((sum, row) => sum + row.qty, 0)
  return {
    average: Math.round(valid.reduce((sum, row) => sum + row.avg * row.qty, 0) / totalQty),
    min: Math.min(...valid.map((row) => row.min)),
    max: Math.max(...valid.map((row) => row.max)),
    count: valid.length,
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const requested = (Array.isArray(body?.flowers) ? body.flowers : [])
    .map((item: { id?: unknown; quantity?: unknown }) => ({ id: String(item.id ?? ""), quantity: Math.max(0, Number(item.quantity) || 0) }))
    .filter((item: { id: string; quantity: number }) => item.id && item.quantity)
  const flowers: SelectedFlower[] = requested.flatMap((item: { id: string; quantity: number }): SelectedFlower[] => {
    const flower = FLOWERS.find((candidate) => candidate.id === item.id)
    return flower ? [{ id: flower.id, name: flower.name, group: flower.group, quantity: item.quantity }] : []
  })
  if (!flowers.length) return NextResponse.json({ markets: [] })

  const latitude = Number(body?.latitude), longitude = Number(body?.longitude)
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude)
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date())
  const cacheStart = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(Date.now() - 7 * 86_400_000))
  const groups = [...new Set(flowers.map((flower) => flower.group))]
  const auctionResults = await Promise.all(groups.map(async (group) => [group, await getTodayAuction(group, today)] as const))
  const auctionByGroup = new Map(auctionResults.map(([group, result]) => [group, { ...result, summary: summarize(result.rows) }]))
  const pricedFlowers = flowers.map((flower) => {
    const auction = auctionByGroup.get(flower.group)
    const stemsPerBundle = APPROX_STEMS_PER_BUNDLE[flower.group] ?? null
    const bundleCount = stemsPerBundle ? Math.ceil(flower.quantity / stemsPerBundle) : 1
    return {
      ...flower,
      stemsPerBundle,
      bundleCount,
      unitNote: stemsPerBundle ? `1속 약 ${stemsPerBundle}본 참고` : "본수 규격이 일정하지 않아 최소 1속 참고",
      averageBundlePrice: auction?.summary?.average ?? null,
      minBundlePrice: auction?.summary?.min ?? null,
      maxBundlePrice: auction?.summary?.max ?? null,
      tradeCount: auction?.summary?.count ?? 0,
      latestDate: auction?.summary ? today : null,
    }
  })
  const completeTodayPrice = pricedFlowers.every((flower) => flower.averageBundlePrice !== null)
  const todayTradeCount = pricedFlowers.reduce((sum, flower) => sum + flower.tradeCount, 0)
  const expectedPrice = completeTodayPrice
    ? pricedFlowers.reduce((sum, flower) => sum + flower.bundleCount * (flower.averageBundlePrice ?? 0), 0)
    : null
  const minPrice = completeTodayPrice
    ? pricedFlowers.reduce((sum, flower) => sum + flower.bundleCount * (flower.minBundlePrice ?? flower.averageBundlePrice ?? 0), 0)
    : null
  const maxPrice = completeTodayPrice
    ? pricedFlowers.reduce((sum, flower) => sum + flower.bundleCount * (flower.maxBundlePrice ?? flower.averageBundlePrice ?? 0), 0)
    : null
  const apiConnected = auctionResults.every(([, result]) => result.error === null)
  type CachedRow = { marketId: string; tradeDate: string; itemName: string; quantity: number; minPrice: number; maxPrice: number; averagePrice: number }
  const { data: cachedData } = await supabaseAdmin.from("PublicMarketAuctionPrice")
    .select("marketId, tradeDate, itemName, quantity, minPrice, maxPrice, averagePrice")
    .gte("tradeDate", cacheStart).order("tradeDate", { ascending: false }).limit(5000)
  const cachedRows = (cachedData ?? []) as CachedRow[]
  const cachedFlower = (marketId: string, flower: SelectedFlower) => {
    const matching = cachedRows.filter((row) => row.marketId === marketId && matchesFlowerGroup(row.itemName, flower.group))
    const tradeDate = matching[0]?.tradeDate
    const latest = matching.filter((row) => row.tradeDate === tradeDate)
    if (!tradeDate || !latest.length) return null
    const totalQuantity = latest.reduce((sum, row) => sum + row.quantity, 0)
    return {
      tradeDate,
      average: Math.round(latest.reduce((sum, row) => sum + row.averagePrice * row.quantity, 0) / totalQuantity),
      min: Math.min(...latest.map((row) => row.minPrice)), max: Math.max(...latest.map((row) => row.maxPrice)),
      count: latest.length,
    }
  }
  const allMarkets = MARKETS.map((market) => ({
    ...market,
    sellerId: `public-${market.id}`,
    distanceKm: hasLocation ? distanceKm(latitude, longitude, market.latitude, market.longitude) : null,
    diyComplete: false,
    customComplete: false,
    sourceName: "aT 화훼유통정보시스템 공판장 선택 목록 · 위치 좌표는 서비스 운영자료",
    flowers: flowers.map((flower) => {
      const cached = cachedFlower(market.id, flower)
      const live = market.id === "at-yangjae" ? pricedFlowers.find((item) => item.id === flower.id) : null
      const selected = live?.averageBundlePrice != null ? { tradeDate: today, average: live.averageBundlePrice, min: live.minBundlePrice ?? live.averageBundlePrice, max: live.maxBundlePrice ?? live.averageBundlePrice, count: live.tradeCount } : cached
      const stemsPerBundle = APPROX_STEMS_PER_BUNDLE[flower.group] ?? null
      return { ...flower, stemsPerBundle, bundleCount: Math.ceil(flower.quantity / (stemsPerBundle ?? flower.quantity)), unitNote: stemsPerBundle ? `1속 약 ${stemsPerBundle}본 참고` : "본수 규격이 일정하지 않아 최소 1속 참고", averageBundlePrice: selected?.average ?? null, minBundlePrice: selected?.min ?? null, maxBundlePrice: selected?.max ?? null, tradeCount: selected?.count ?? 0, latestDate: selected?.tradeDate ?? null }
    }),
    checkedAt: new Date().toISOString(),
    liveTradeCount: market.id === "at-yangjae" ? todayTradeCount : 0,
    expectedPrice: market.id === "at-yangjae" && completeTodayPrice ? expectedPrice : (() => { const values = flowers.map((flower) => ({ flower, price: cachedFlower(market.id, flower) })); return values.every(({ price }) => price) ? values.reduce((sum, { flower, price }) => sum + Math.ceil(flower.quantity / (APPROX_STEMS_PER_BUNDLE[flower.group] ?? flower.quantity)) * (price?.average ?? 0), 0) : null })(),
    minPrice: market.id === "at-yangjae" && completeTodayPrice ? minPrice : (() => { const values = flowers.map((flower) => ({ flower, price: cachedFlower(market.id, flower) })); return values.every(({ price }) => price) ? values.reduce((sum, { flower, price }) => sum + Math.ceil(flower.quantity / (APPROX_STEMS_PER_BUNDLE[flower.group] ?? flower.quantity)) * (price?.min ?? 0), 0) : null })(),
    maxPrice: market.id === "at-yangjae" && completeTodayPrice ? maxPrice : (() => { const values = flowers.map((flower) => ({ flower, price: cachedFlower(market.id, flower) })); return values.every(({ price }) => price) ? values.reduce((sum, { flower, price }) => sum + Math.ceil(flower.quantity / (APPROX_STEMS_PER_BUNDLE[flower.group] ?? flower.quantity)) * (price?.max ?? 0), 0) : null })(),
    basisDate: market.id === "at-yangjae" && completeTodayPrice ? today : flowers.map((flower) => cachedFlower(market.id, flower)?.tradeDate).filter(Boolean).sort().at(-1) ?? null,
    priceScope: "TODAY_ONLY" as const,
    todayDataAvailable: market.id === "at-yangjae" && completeTodayPrice,
    priceFreshness: market.id === "at-yangjae" && completeTodayPrice ? "LIVE_TODAY" as const : cachedFlower(market.id, flowers[0]) ? "LATEST_CONFIRMED" as const : "UNAVAILABLE" as const,
    pricingScope: "ITEM_ALL_VARIETIES_AND_GRADES" as const,
    priceAvailability: cachedRows.some((row) => row.marketId === market.id)
      ? "NO_SELECTED_FLOWER_TRADE" as const
      : "NO_RECENT_MARKET_FILE" as const,
    priceBasis: market.id === "at-yangjae"
      ? completeTodayPrice
        ? `aT 공식 API의 ${today} 양재 절화 경매자료에서 ${flowers.map((flower) => flower.group).join("·")} 전체 품종·등급을 거래수량 가중평균한 속당 참고가입니다. 선택한 색상만의 가격은 아닙니다`
        : cachedFlower(market.id, flowers[0])
          ? `aT 공식 일자별 경매결과에서 확인한 ${cachedFlower(market.id, flowers[0])?.tradeDate} ${flowers.map((flower) => flower.group).join("·")} 전체 품종·등급의 최근 확정 경매가를 거래수량 가중평균한 속당 참고가입니다. 선택한 색상만의 가격은 아닙니다`
        : apiConnected
          ? `${today} 선택 품목의 양재 절화 경매 거래가 모두 존재하지 않아 합계 가격을 표시하지 않습니다`
          : `${today} aT 공식 API 연결 또는 인증을 확인하지 못해 가격을 표시하지 않습니다`
      : cachedFlower(market.id, flowers[0])
        ? `aT 공식 일자별 경매결과에서 확인한 ${cachedFlower(market.id, flowers[0])?.tradeDate} ${flowers.map((flower) => flower.group).join("·")} 전체 품종·등급의 최근 확정 경매가를 거래수량 가중평균한 속당 참고가입니다. 선택한 색상만의 가격은 아닙니다`
        : market.supportsRealtime
        ? `${market.marketName}은 aT 통합 화면에서 실시간 자료를 제공하지만, 공개 API F001에는 공판장 선택 변수가 없어 자동 가격을 계산하지 않습니다`
        : `${market.marketName}은 aT 안내 기준 실시간 경매정보 미제공 공판장입니다`,
    dailyDataUrl: market.marketType === "꽃 도매상가" ? null : "https://flower.at.or.kr/hab09/hab09.do",
    marketInfoUrl: `https://map.naver.com/p/search/${encodeURIComponent(`${market.marketName} ${market.roadAddress}`)}`,
    auctionInfoUrl: `/api/diy/public-markets/${market.id}/at`,
  })).filter((market) => market.expectedPrice !== null).sort((a, b) => hasLocation
    ? (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER) || Number(b.isNonghyup) - Number(a.isNonghyup)
    : Number(b.isNonghyup) - Number(a.isNonghyup) || a.marketName.localeCompare(b.marketName, "ko"))

  // 지도는 현재 위치 가까운 곳을 우선하되, 공식 공판장 전체는 응답하여 사용자가 지역을 바꿔 탐색할 수 있게 한다.
  return NextResponse.json({ markets: allMarkets, connected: apiConnected, source: "AT_FLOWER_OPEN_API_F001_AND_DAILY_XLS", directorySourceUrl: AT_REALTIME_URL, directoryCriteria: MARKET_DIRECTORY_CRITERIA, coordinatesManagedManually: true, todayOnly: false }, { headers: { "Cache-Control": "no-store" } })
}

import { afterEach, describe, expect, it, vi } from "vitest"
const cache = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }))
vi.mock("@/lib/supabase", () => {
  const query = { select: () => query, gte: () => query, lte: () => query, order: () => query, limit: () => query,
    abortSignal: async () => ({ data: cache.rows, error: null }) }
  return { supabaseAdmin: { from: () => query } }
})
import { POST, GET } from "@/app/api/diy/public-markets/route"
afterEach(() => { cache.rows = []; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers() })
const request = (extra = {}) => new Request("http://test/api/diy/public-markets", { method: "POST", body: JSON.stringify({ flowers: [{ id: "rose-red", quantity: 12 }], ...extra }) })
describe("공판장 위치와 검증 가격", () => {
  it("검증된 실가격이 있으면 시연값을 사용하지 않는다", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-13T03:00:00Z")); vi.stubEnv("AT_FLOWER_API_KEY", "")
    cache.rows = [{ marketId: "at-yangjae", tradeDate: "2026-10-12", itemName: "장미", quantity: 500, minPrice: 9000, maxPrice: 15000, averagePrice: 10000, sourceUrl: "https://flower.at.or.kr/api/returnData.api?flowerGubn=1&unit=BUNDLE&parser=2", fetchedAt: "2026-10-12T03:00:00Z" }]
    const json = await (await POST(request())).json()
    const market = json.markets.find((m: { id: string }) => m.id === "at-yangjae")
    expect(market.auctionReferenceTotal).toBe(20000)
    expect(market.demoQuote).toBeNull()
    expect(market.consumerEstimate).toBeNull()
  })
  it("가격 서비스 없이 전체 공판장 위치를 제공한다", async () => {
    const json = await (await GET()).json()
    expect(json.markets).toHaveLength(8)
    expect(json.markets.find((m: { id: string }) => m.id === "busan-eomgung").isNonghyup).toBe(true)
  })
  it("외부 요청을 중단해도 가격 없는 공판장을 모두 반환한다", async () => {
    vi.useFakeTimers(); vi.stubEnv("AT_FLOWER_API_KEY", "test-key")
    vi.spyOn(AbortSignal, "timeout").mockImplementation(ms => { const controller = new AbortController(); setTimeout(() => controller.abort(), ms); return controller.signal })
    vi.stubGlobal("fetch", vi.fn((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("timeout"))))))
    const response = POST(request())
    await vi.advanceTimersByTimeAsync(8000)
    const json = await (await response).json()
    expect(json.markets).toHaveLength(8)
    expect(json.markets.every((market: { consumerEstimate: unknown }) => market.consumerEstimate === null)).toBe(true)
    expect(json.markets.every((market: { demoQuote: { source: string; total: number } }) => market.demoQuote.source === "DEMO_FIXTURE" && market.demoQuote.total === 24000)).toBe(true)
  })
  it.each([null, 999])("좌표 %s를 현재 위치로 계산하지 않는다", async latitude => {
    vi.stubEnv("AT_FLOWER_API_KEY", "")
    const json = await (await POST(request({ latitude, longitude: null }))).json()
    expect(json.markets.every((m: { distanceKm: unknown }) => m.distanceKm === null)).toBe(true)
  })
  it("최신 2,100원 미검증 집계를 소비자 구매가격으로 제시하지 않는다", async () => {
    vi.stubEnv("AT_FLOWER_API_KEY", "")
    cache.rows = [{ marketId: "at-yangjae", tradeDate: "2026-10-10", itemName: "장미", quantity: 12, minPrice: 2100, maxPrice: 2100, averagePrice: 2100, sourceUrl: "https://flower.at.or.kr/hab09/hab09.do" }]
    const json = await (await POST(request({ latitude: 37.617, longitude: 126.925 }))).json()
    const market = json.markets.find((m: { id: string }) => m.id === "at-yangjae")
    expect(market.auctionReferenceTotal).toBeNull()
    expect(market.consumerEstimate).toBeNull()
    expect(market.demoQuote.total).toBe(24000)
    expect(market.dataStatus).toBe("UNVERIFIED_OR_SPARSE")
    expect(json.markets[0].distanceKm).toBeLessThan(json.markets.at(-1).distanceKm)
  })
})

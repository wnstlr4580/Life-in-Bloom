import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import { RECOMMENDABLE_CATALOG } from "../flowerCatalog"
import { isPeakSeason } from "../ohaengProfile"
import type { AnalyzeResult, SajuFlower } from "@/types/saju"

// 추천 후보가 꽃 카탈로그로 바뀌어 라우트가 DB에 의존하지 않는다. 남은 상품 조회는 "사러가기"
// 목적지 판정용 상품명뿐이므로, 그것만 고정하면 응답이 결정적이 된다.
const PRODUCT_NAMES = [
  { name: "순백의 백합 부케", useTags: [] },
  { name: "종로구 봄꽃상점 흰 백합 데일리 꽃다발", useTags: [] },
  { name: "열정의 장미 다발", useTags: [] },
  { name: "생일 꽃다발 — 핑크 장미", useTags: [] },
  { name: "봄날의 튤립 다발", useTags: [] },
  { name: "근조화환 3단 — 흰 국화", useTags: ["추모"] }, // 추모는 집계에서 빠진다
]

vi.mock("@/lib/supabase", () => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => Promise.resolve({ data: PRODUCT_NAMES, error: null }),
  }
  return { supabaseAdmin: { from: () => builder }, supabase: null }
})

const { POST } = await import("@/app/api/saju/analyze/route")

const analyze = async (body: Record<string, unknown>) => {
  const res = await POST(
    new Request("http://test/api/saju/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  )
  return { status: res.status, json: (await res.json()) as AnalyzeResult }
}

const BIRTH = { birthDate: "1990-05-15", birthHour: "12", calendarType: "solar", gender: "female", name: "테스트" }
const LISTS = ["recommendedFlowers", "wealthFlowers", "loveFlowers", "seasonalFlowers"] as const

// 계절 의존 리스트가 가장 얇은 겨울에도 채워지는지 보려면 시간을 고정해야 한다.
beforeAll(() => vi.setSystemTime(new Date("2026-01-15T03:00:00Z")))
afterAll(() => vi.useRealTimers())

describe("POST /api/saju/analyze — 꽃 단위 응답 계약", () => {
  it("네 리스트가 모두 4개씩 채워진다", async () => {
    const { status, json } = await analyze(BIRTH)
    expect(status).toBe(200)
    for (const key of LISTS) expect(json[key], key).toHaveLength(4)
  })

  it("꽃 카드 필드가 계약과 정확히 일치한다 — 잉여 필드 누출 가드", async () => {
    // 예전엔 상품 객체를 스프레드해서 useTags·stock·description까지 응답으로 새어나갔다.
    const { json } = await analyze(BIRTH)
    const core = ["id", "name", "species", "emoji", "img", "searchQuery", "productCount",
      "flowerMeaning", "score", "reasons"]
    for (const f of json.wealthFlowers) {
      expect(Object.keys(f).sort(), f.name).toEqual([...core].sort())
    }
    for (const f of json.recommendedFlowers) {
      expect(Object.keys(f).sort(), f.name).toEqual([...core, "balanceBefore", "balanceAfter", "pctAfter", "story"].sort())
    }
  })

  it("주 추천만 균형 변화·스토리를 갖고, 균형은 나빠지지 않는다", async () => {
    const { json } = await analyze(BIRTH)
    for (const f of json.recommendedFlowers) {
      expect(f.balanceAfter, f.name).toBeGreaterThanOrEqual(f.balanceBefore!)
      expect(f.story!.length, f.name).toBeGreaterThan(0)
      expect(f.pctAfter, f.name).toBeDefined()
    }
    for (const f of json.wealthFlowers) expect(f.balanceAfter, f.name).toBeUndefined()
  })

  it("모든 카드가 카탈로그 항목과 정합한다", async () => {
    const byId = new Map(RECOMMENDABLE_CATALOG.map((f) => [f.id, f]))
    const { json } = await analyze(BIRTH)
    for (const key of LISTS) {
      for (const card of json[key] as SajuFlower[]) {
        const source = byId.get(card.id)
        expect(source, `${key}/${card.id}`).toBeDefined()
        expect(card.name).toBe(source!.name)
        expect(card.species).toBe(source!.species)
        expect(card.img).toBe(source!.img)
      }
    }
  })

  it("근거 카드에 구매 가능(🛒)이 없다 — 재고가 점수식에서 빠졌다", async () => {
    const { json } = await analyze(BIRTH)
    for (const key of LISTS) {
      for (const card of json[key] as SajuFlower[]) {
        expect(card.reasons.some((r) => r.icon === "🛒"), card.name).toBe(false)
        expect(card.reasons.length, card.name).toBeGreaterThan(0)
      }
    }
  })

  it("주 추천에 나온 꽃은 다른 리스트에 없다", async () => {
    const { json } = await analyze(BIRTH)
    const main = new Set(json.recommendedFlowers.map((f) => f.id))
    for (const key of ["wealthFlowers", "loveFlowers", "seasonalFlowers"] as const) {
      for (const card of json[key]) expect(main.has(card.id), `${key}/${card.name}`).toBe(false)
    }
  })

  it("제철 리스트는 전부 지금 계절의 주개화 꽃이다", async () => {
    const { json } = await analyze(BIRTH)
    expect(json.seasonalFlowers.length).toBeGreaterThan(0)
    for (const card of json.seasonalFlowers) {
      expect(isPeakSeason(card.name, "winter"), card.name).toBe(true)
    }
  })

  it("흰 국화는 어느 리스트에도 나오지 않는다 (추모 연상 제외)", async () => {
    const { json } = await analyze(BIRTH)
    for (const key of LISTS) {
      for (const card of json[key] as SajuFlower[]) expect(card.id, key).not.toBe("mum-white")
    }
  })

  it("사러가기 재료가 상품명 집계와 맞는다", async () => {
    const { json } = await analyze(BIRTH)
    const all = LISTS.flatMap((k) => json[k] as SajuFlower[])
    for (const card of all) {
      expect(card.searchQuery.length, card.name).toBeGreaterThan(0)
      expect(card.productCount, card.name).toBeGreaterThanOrEqual(0)
    }
    // 픽스처에 백합 2건·장미 2건·튤립 1건이 있고, 추모 국화는 집계에서 빠진다
    const counts = new Map(all.map((c) => [c.species, c.productCount]))
    if (counts.has("백합")) expect(counts.get("백합")).toBe(2)
    if (counts.has("장미")) expect(counts.get("장미")).toBe(2)
    if (counts.has("국화")) expect(counts.get("국화")).toBe(0)
  })

  it("음력 입력과 시간 미상도 200을 낸다", async () => {
    expect((await analyze({ ...BIRTH, calendarType: "lunar" })).status).toBe(200)
    expect((await analyze({ ...BIRTH, birthHour: "" })).status).toBe(200)
  })

  it("생년월일이 없으면 400", async () => {
    expect((await analyze({ name: "테스트" })).status).toBe(400)
  })
})

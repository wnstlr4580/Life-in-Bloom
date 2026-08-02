import { describe, it, expect } from "vitest"
import {
  ohaengBalance, balanceDelta, idealBalanceDelta, ohaengFit, NEUTRAL_FIT, ohaengPctAfter,
  isRecommendable, personalPreferenceDetail, personalScore, buildReasons,
  stockScore, personalPreferenceScore, blendScore,
  wealthOhaeng, loveOhaeng, birthColorOhaeng,
  MONTH_TO_OHAENG, OBANGSAEK_OHAENG, topByOhaeng, OHAENG_RELEVANCE_MIN, pickDiverse,
} from "../recommendation"
import { flowerOhaengProfile, flowerSpeciesKey } from "../ohaengProfile"
import type { Ohaeng } from "../saju"

const zero: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }

const counts = (목: number, 화: number, 토: number, 금: number, 수: number) => ({ 목, 화, 토, 금, 수 })

describe("ohaengBalance", () => {
  it("완전 균형이 100, 한 오행에 다 몰리면 0", () => {
    expect(ohaengBalance(counts(2, 2, 2, 2, 2))).toBeCloseTo(100)
    expect(ohaengBalance(counts(8, 0, 0, 0, 0))).toBeCloseTo(0)
  })

  it("글자 수가 6·8이라 완전 균형은 구조적으로 도달 불가능하다", () => {
    // 비둘기집 원리로 max n ≥ ⌈N/5⌉ = 2. 실제 최선값을 고정한다.
    expect(ohaengBalance(counts(2, 2, 2, 1, 1))).toBeCloseTo(84.7, 1) // 8자 최선
    expect(ohaengBalance(counts(2, 1, 1, 1, 1))).toBeCloseTo(83.3, 1) // 6자 최선
  })

  it("치우칠수록 낮다", () => {
    expect(ohaengBalance(counts(1, 3, 2, 0, 2))).toBeGreaterThan(ohaengBalance(counts(1, 1, 5, 1, 0)))
  })

  it("반올림한 퍼센트가 아니라 글자 수를 입력해야 한다", () => {
    // [1,1,2,2,2] → pct [13,13,25,25,25] 는 합이 101이라 균형도가 어긋난다
    const fromCounts = ohaengBalance(counts(1, 1, 2, 2, 2))
    const fromRoundedPct = ohaengBalance(counts(13, 13, 25, 25, 25))
    expect(fromCounts).not.toBeCloseTo(fromRoundedPct, 5)
  })
})

describe("balanceDelta", () => {
  it("부족한 오행을 채우는 꽃은 양수, 과잉을 키우는 꽃은 음수", () => {
    const me = counts(1, 3, 2, 0, 2) // 화 과다·금 결핍
    expect(balanceDelta(me, { ...zero, 금: 80 })).toBeGreaterThan(0)
    expect(balanceDelta(me, { ...zero, 화: 80 })).toBeLessThan(0)
  })

  it("과잉 감점에 상수가 필요 없다 — 수식에서 그대로 나온다", () => {
    const me = counts(1, 4, 1, 0, 2)
    const rose = flowerOhaengProfile({ name: "빨간 장미", colorTags: ["레드"] })
    const lily = flowerOhaengProfile({ name: "백합", colorTags: ["화이트"] })
    expect(balanceDelta(me, rose)).toBeLessThan(balanceDelta(me, lily))
  })

  it("실제 프로필: 목 부족 사주에 유칼립투스(목)가 해바라기(화·토)보다 높다", () => {
    const me = counts(0, 2, 2, 2, 2)
    const euca = flowerOhaengProfile({ name: "유칼립투스", colorTags: ["그린"], seasonTags: ["spring"] })
    const sun = flowerOhaengProfile({ name: "해바라기", colorTags: ["옐로"], seasonTags: ["summer"] })
    expect(balanceDelta(me, euca)).toBeGreaterThan(balanceDelta(me, sun))
  })

  it("오행 신호가 전혀 없는 꽃은 균형을 바꾸지 않는다", () => {
    expect(balanceDelta(counts(1, 3, 2, 0, 2), zero)).toBe(0)
  })
})

describe("idealBalanceDelta · ohaengFit", () => {
  // 8자·6자로 가능한 모든 오행 분포
  const allCounts: ReturnType<typeof counts>[] = []
  for (const total of [6, 8]) {
    for (let a = 0; a <= total; a++)
      for (let b = 0; a + b <= total; b++)
        for (let c = 0; a + b + c <= total; c++)
          for (let d = 0; a + b + c + d <= total; d++)
            allCounts.push(counts(a, b, c, d, total - a - b - c - d))
  }

  it("모든 사주에서 Δ* > 0 (완전 균형이 불가능하므로 개선 여지가 항상 있다)", () => {
    for (const c of allCounts) expect(idealBalanceDelta(c)).toBeGreaterThan(0)
  })

  it("어떤 꽃도 Δ*를 넘지 못한다 — 비율 ≤ 1 보장", () => {
    const profiles = [
      zero, { ...zero, 목: 80 }, { ...zero, 화: 80 }, { ...zero, 토: 80 },
      { ...zero, 금: 80 }, { ...zero, 수: 80 },
      { 목: 40, 화: 30, 토: 20, 금: 10, 수: 5 }, { 목: 14, 화: 40, 토: 2, 금: 79, 수: 2 },
    ]
    for (const c of allCounts) {
      const ideal = idealBalanceDelta(c)
      for (const p of profiles) {
        expect(balanceDelta(c, p)).toBeLessThanOrEqual(ideal + 1e-9)
      }
    }
  })

  it("ohaengFit: 영향 없으면 NEUTRAL_FIT, 항상 0~1", () => {
    const me = counts(1, 3, 2, 0, 2)
    const ideal = idealBalanceDelta(me)
    expect(ohaengFit(me, zero, ideal)).toBeCloseTo(NEUTRAL_FIT)
    for (const p of [zero, { ...zero, 금: 80 }, { ...zero, 화: 100 }]) {
      const fit = ohaengFit(me, p, ideal)
      expect(fit).toBeGreaterThanOrEqual(0)
      expect(fit).toBeLessThanOrEqual(1)
    }
  })

  it("점수가 실제로 퍼진다 — 좋은 꽃과 나쁜 꽃의 궁합 차이가 뚜렷하다", () => {
    const me = counts(1, 3, 2, 0, 2) // 금 결핍
    const ideal = idealBalanceDelta(me)
    const good = Math.round(100 * ohaengFit(me, flowerOhaengProfile({ name: "백합", colorTags: ["화이트"] }), ideal))
    const bad = Math.round(100 * ohaengFit(me, flowerOhaengProfile({ name: "해바라기", colorTags: ["옐로"] }), ideal))
    expect(good).toBeGreaterThan(70)
    expect(bad).toBeLessThan(50)
  })
})

describe("stockScore", () => {
  it("품절=0, 재고 늘수록 증가, 1 이하", () => {
    expect(stockScore(0)).toBe(0)
    expect(stockScore(1)).toBeGreaterThan(0)
    expect(stockScore(1)).toBeLessThan(stockScore(10))
    expect(stockScore(10)).toBeLessThan(stockScore(50))
    expect(stockScore(1000)).toBeLessThanOrEqual(1)
  })

  it("동일 balance/개인화에서 품절이 재고 아이템보다 하위", () => {
    const inStock = blendScore(0.5, 20, 0)
    const outOfStock = blendScore(0.5, 0, 0)
    expect(inStock).toBeGreaterThan(outOfStock)
  })
})

describe("blendScore", () => {
  it("비율 0.85/0.10/0.05 합산", () => {
    expect(blendScore(1, 1000, 1)).toBeCloseTo(0.85 + 0.10 + 0.05)
    expect(blendScore(1, 0, 0)).toBeCloseTo(0.85)
  })
})

describe("탄생컬러(오방색)", () => {
  it("MONTH_TO_OHAENG는 1~12월 모두 커버", () => {
    for (let m = 1; m <= 12; m++) expect(MONTH_TO_OHAENG[m]).toBeDefined()
  })
  it("OBANGSAEK_OHAENG는 5오행 모두 색태그를 가짐", () => {
    for (const o of ["목", "화", "토", "금", "수"] as Ohaeng[]) {
      expect(OBANGSAEK_OHAENG[o].colorTags.length).toBeGreaterThan(0)
    }
  })
  it("birthColorOhaeng: 생월 우선, 없으면 일간", () => {
    expect(birthColorOhaeng({ monthDay: null, month: 6, mainOhaeng: "수" })).toBe("화") // 6월=화
    expect(birthColorOhaeng({ monthDay: null, month: null, mainOhaeng: "수" })).toBe("수")
  })
})

describe("personalPreferenceScore", () => {
  it("탄생컬러 색 일치만 있어도 0.3", () => {
    // 6월=화=적(레드/핑크). 레드 상품
    const s = personalPreferenceScore(
      { id: "x", name: "무명 꽃", colorTags: ["레드"] },
      { monthDay: null, month: 6, mainOhaeng: "화" },
    )
    expect(s).toBeCloseTo(0.3)
  })
  it("색도 안 맞으면 0", () => {
    const s = personalPreferenceScore(
      { id: "x", name: "무명 꽃", colorTags: ["그린"] },
      { monthDay: null, month: 6, mainOhaeng: "화" },
    )
    expect(s).toBe(0)
  })
  it("합은 항상 1 이하", () => {
    const s = personalPreferenceScore(
      { id: "x", name: "장미", colorTags: ["레드"] },
      { monthDay: "01-01", month: 6, mainOhaeng: "화" },
    )
    expect(s).toBeLessThanOrEqual(1)
  })
})

describe("운세별 오행", () => {
  it("재물운=일간이 극하는 오행 (목→토, 화→금, 토→수, 금→목, 수→화)", () => {
    expect(wealthOhaeng("목")).toBe("토")
    expect(wealthOhaeng("화")).toBe("금")
    expect(wealthOhaeng("토")).toBe("수")
    expect(wealthOhaeng("금")).toBe("목")
    expect(wealthOhaeng("수")).toBe("화")
  })
  it("연애운=일간이 생하는 오행 (목→화, 화→토, 토→금, 금→수, 수→목)", () => {
    expect(loveOhaeng("목")).toBe("화")
    expect(loveOhaeng("화")).toBe("토")
    expect(loveOhaeng("토")).toBe("금")
    expect(loveOhaeng("금")).toBe("수")
    expect(loveOhaeng("수")).toBe("목")
  })
})

describe("topByOhaeng", () => {
  // 프로필·재고·개인화만 갖는 최소 후보
  const cand = (id: string, profile: Partial<Record<Ohaeng, number>>, stock = 10, personal = 0) =>
    ({ id, name: id, profile: { ...zero, ...profile }, stock, personal })

  it("프로필이 임계 미만인 상품은 그 오행 리스트에 들어가지 않는다", () => {
    const items = [
      cand("무관", { 토: 0 }, 999, 1), // 재고·개인화 만점이어도 토가 0
      cand("관련", { 토: 60 }, 1),
    ]
    expect(topByOhaeng(items, "토", 3).map((s) => s.id)).toEqual(["관련"])
  })

  it("임계(20) 경계는 포함한다", () => {
    expect(topByOhaeng([cand("경계", { 금: OHAENG_RELEVANCE_MIN })], "금", 3)).toHaveLength(1)
    expect(topByOhaeng([cand("미달", { 금: OHAENG_RELEVANCE_MIN - 1 })], "금", 3)).toHaveLength(0)
  })

  it("관련 상품이 부족하면 limit보다 적게 반환한다 (상생 폴백이 돌 수 있게)", () => {
    const items = [cand("a", { 수: 50 }), cand("b", { 화: 50 }), cand("c", { 화: 50 })]
    expect(topByOhaeng(items, "수", 3)).toHaveLength(1)
  })

  it("품절과 exclude는 제외한다", () => {
    const items = [cand("품절", { 목: 90 }, 0), cand("제외", { 목: 80 }), cand("남음", { 목: 70 })]
    const got = topByOhaeng(items, "목", 3, new Set(["제외"]))
    expect(got.map((s) => s.id)).toEqual(["남음"])
  })

  it("점수는 절대값이다 — 후보군이 빈약하면 1위도 낮은 점수를 받는다", () => {
    // 상대 정규화였다면 두 경우 모두 1위가 만점을 받았을 것이다
    const weak = topByOhaeng([cand("약함", { 목: 40 }, 50, 0)], "목", 1)[0]
    const strong = topByOhaeng([cand("강함", { 목: 90 }, 50, 0)], "목", 1)[0]
    expect(weak.score).toBeLessThan(strong.score)
    expect(weak.score).toBeCloseTo(blendScore(0.4, 50, 0))
  })

  it("계산된 점수를 그대로 실어 보낸다", () => {
    const [top] = topByOhaeng([cand("a", { 수: 60 }, 20, 0.5)], "수", 1)
    expect(top.score).toBeCloseTo(blendScore(0.6, 20, 0.5))
  })
})

describe("isRecommendable (추모 제외)", () => {
  it("추모 태그가 있으면 사주 추천 대상에서 뺀다", () => {
    expect(isRecommendable({ useTags: ["추모"] })).toBe(false)
    expect(isRecommendable({ useTags: ["축하", "추모"] })).toBe(false)
  })
  it("그 외 용도는 통과하고, 태그가 없거나 null이어도 통과한다", () => {
    expect(isRecommendable({ useTags: ["생일", "감사"] })).toBe(true)
    expect(isRecommendable({ useTags: [] })).toBe(true)
    expect(isRecommendable({})).toBe(true)
    expect(isRecommendable({ useTags: null })).toBe(true)
  })
})

describe("personalPreferenceDetail", () => {
  const user = { monthDay: null, month: 6, mainOhaeng: "화" as const } // 6월=화=적(레드/핑크)

  it("점수 함수는 내역 함수의 합성과 정확히 같다 (기존 동작 보존)", () => {
    const p = { id: "x", name: "빨간 장미", colorTags: ["레드"] }
    expect(personalPreferenceScore(p, user)).toBeCloseTo(personalScore(personalPreferenceDetail(p, user)))
  })

  it("무엇이 걸렸는지 내역으로 알 수 있다", () => {
    const d = personalPreferenceDetail({ id: "x", name: "무명 꽃", colorTags: ["레드"] }, user)
    expect(d.color).toBe(1)
    expect(d.birthColorName).toBe("적(赤)")
  })

  it("아무것도 안 걸리면 전부 0", () => {
    const d = personalPreferenceDetail({ id: "x", name: "무명 꽃", colorTags: ["그린"] }, user)
    expect(d.color).toBe(0)
    expect(d.flower).toBe(0)
    expect(personalScore(d)).toBe(0)
  })
})

describe("buildReasons", () => {
  const base = {
    product: { name: "백합", colorTags: ["화이트"] },
    target: "금" as const,
    profile: flowerOhaengProfile({ name: "백합", colorTags: ["화이트"] }),
    stock: 20,
    personal: { flower: 0, color: 0, birthFlowerName: null, birthColorName: "적(赤)" },
  }

  it("점수에 기여한 근거만 만든다 — 기여 없는 항목은 카드도 없다", () => {
    const reasons = buildReasons(base)
    expect(reasons.some((r) => r.icon === "🎨")).toBe(false) // 탄생색 미일치
    expect(reasons.some((r) => r.icon === "🌸")).toBe(false) // 탄생화 무관
    expect(reasons.some((r) => r.icon === "🛒")).toBe(true) // 재고 20
  })

  it("품절이면 구매 가능 근거가 없다", () => {
    expect(buildReasons({ ...base, stock: 0 }).some((r) => r.icon === "🛒")).toBe(false)
  })

  it("오행 근거는 그 오행에 실제 기여가 있을 때만", () => {
    expect(buildReasons(base).some((r) => r.title.includes("금(金)"))).toBe(true)
    // 백합은 토에 거의 기여가 없다
    expect(buildReasons({ ...base, target: "토" }).some((r) => r.title.includes("토(土)"))).toBe(false)
  })

  it("탄생화·탄생색이 걸리면 근거가 붙는다", () => {
    const reasons = buildReasons({
      ...base,
      personal: { flower: 0.7, color: 1, birthFlowerName: "백합", birthColorName: "백(白)" },
    })
    expect(reasons.some((r) => r.icon === "🎨")).toBe(true)
    expect(reasons.find((r) => r.icon === "🌸")?.detail).toContain("백합")
  })

  it("과잉 회피 근거는 그 오행 점수가 실제로 낮을 때만", () => {
    // 백합 프로필은 { 목14, 화40, 토2, 금79, 수2 }
    expect(buildReasons({ ...base, excessOhaeng: "토" }).some((r) => r.icon === "⚖️")).toBe(true)
    // 금(79)·화(40)가 과잉이라면 백합은 그 기운을 오히려 키우므로 근거가 되면 안 된다
    expect(buildReasons({ ...base, excessOhaeng: "금" }).some((r) => r.icon === "⚖️")).toBe(false)
    expect(buildReasons({ ...base, excessOhaeng: "화" }).some((r) => r.icon === "⚖️")).toBe(false)
  })

  it("모든 근거는 아이콘·제목·설명을 갖는다", () => {
    for (const r of buildReasons({ ...base, excessOhaeng: "화", seasonal: true })) {
      expect(r.icon.length).toBeGreaterThan(0)
      expect(r.title.length).toBeGreaterThan(0)
      expect(r.detail.length).toBeGreaterThan(0)
    }
  })
})

describe("pickDiverse (추천 다양성)", () => {
  const item = (id: string, name: string) => ({ id, name })

  it("같은 종이 상위를 독식하면 다음 종으로 대체한다", () => {
    const ranked = [item("1", "빨간 장미"), item("2", "핑크 장미"), item("3", "흰 백합")]
    expect(pickDiverse(ranked, 2).map((i) => i.name)).toEqual(["빨간 장미", "흰 백합"])
  })

  it("후보가 전부 같은 종이면 점수순으로 채워 limit를 지킨다", () => {
    const ranked = [item("1", "빨간 장미"), item("2", "핑크 장미"), item("3", "노란 장미")]
    const got = pickDiverse(ranked, 2)
    expect(got).toHaveLength(2)
    expect(got.map((i) => i.id)).toEqual(["1", "2"]) // 점수순 유지
  })

  it("종 큐레이션에 없는 상품끼리는 중복으로 보지 않는다", () => {
    const ranked = [item("1", "파스텔 혼합 꽃다발"), item("2", "로맨틱 가든 부케")]
    expect(pickDiverse(ranked, 2)).toHaveLength(2)
  })

  it("후보가 limit보다 적으면 있는 만큼만 반환한다", () => {
    expect(pickDiverse([item("1", "장미")], 4)).toHaveLength(1)
  })

  it("flowerSpeciesKey: 수식어가 붙어도 종을 찾고, 없으면 null", () => {
    expect(flowerSpeciesKey("열정의 빨간 장미 다발")).toBe("장미")
    expect(flowerSpeciesKey("해바라기 미니 화분")).toBe("해바라기")
    expect(flowerSpeciesKey("파스텔 혼합 꽃다발")).toBeNull()
  })
})

describe("ohaengPctAfter (차트 before/after)", () => {
  const c = (목: number, 화: number, 토: number, 금: number, 수: number) => ({ 목, 화, 토, 금, 수 })

  it("글자 하나 추가 모델 — 순수 금 꽃을 8자 사주에 더하면 금이 1/9", () => {
    expect(ohaengPctAfter(c(1, 3, 2, 0, 2), { ...zero, 금: 100 }))
      .toEqual({ 목: 11, 화: 33, 토: 22, 금: 11, 수: 22 })
  })

  it("모든 값은 0~100 정수이고 합은 반올림 오차 범위 안", () => {
    const p = ohaengPctAfter(c(1, 3, 2, 0, 2), flowerOhaengProfile({ name: "백합", colorTags: ["화이트"] }))
    const values = Object.values(p)
    for (const v of values) {
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
    const sum = values.reduce((a, b) => a + b, 0)
    expect(sum).toBeGreaterThanOrEqual(97)
    expect(sum).toBeLessThanOrEqual(103)
  })

  it("오행 신호가 없는 꽃은 분포를 바꾸지 않는다 (balanceAfter 폴백과 일치)", () => {
    const me = c(1, 3, 2, 0, 2)
    expect(ohaengPctAfter(me, zero)).toEqual({ 목: 13, 화: 38, 토: 25, 금: 0, 수: 25 })
    expect(balanceDelta(me, zero)).toBe(0)
  })

  it("어떤 꽃도 한 오행을 12%p 넘게 움직이지 못한다 (과장 배율 금지 회귀 가드)", () => {
    // 글자 하나 추가 모델의 이론 상한은 100/(N+1) = 11.1%p
    const profiles = [
      { ...zero, 목: 100 }, { ...zero, 화: 100 }, { ...zero, 토: 100 },
      { ...zero, 금: 100 }, { ...zero, 수: 100 },
      { 목: 14, 화: 40, 토: 2, 금: 79, 수: 2 }, { 목: 40, 화: 30, 토: 20, 금: 10, 수: 5 },
    ]
    for (let a = 0; a <= 8; a++)
      for (let b = 0; a + b <= 8; b++)
        for (let d = 0; a + b + d <= 8; d++) {
          const me = c(a, b, d, 8 - a - b - d, 0)
          const before = ohaengPctAfter(me, zero)
          for (const p of profiles) {
            const after = ohaengPctAfter(me, p)
            for (const o of ["목", "화", "토", "금", "수"] as const) {
              expect(Math.abs(after[o] - before[o])).toBeLessThanOrEqual(12)
            }
          }
        }
  })

  it("부족한 오행을 채우는 꽃은 그 오행이 가장 많이 늘어난다 (차트와 근거 문구의 정합)", () => {
    // 각 꽃마다 그 오행이 0인 사주를 쓴다
    for (const [name, tags, target, me] of [
      ["백합", ["화이트"], "금", c(1, 3, 2, 0, 2)],
      ["빨간 장미", ["레드"], "화", c(2, 0, 2, 2, 2)],
      ["유칼립투스", ["그린"], "목", c(0, 2, 2, 2, 2)],
    ] as const) {
      const before = ohaengPctAfter(me, zero)
      const after = ohaengPctAfter(me, flowerOhaengProfile({ name, colorTags: [...tags] }))
      const grew = (["목", "화", "토", "금", "수"] as const)
        .reduce((x, y) => (after[y] - before[y] > after[x] - before[x] ? y : x))
      expect(grew, name).toBe(target)
    }
  })

  it("이미 과잉인 오행은 그 기운의 꽃을 더해도 거의 안 는다", () => {
    // 분포는 합이 100이라 Δ(o) ∝ (N·share_o − count_o) — 이미 많은 오행은 늘기 어렵다.
    // 화 과잉 사주에 빨간 장미를 더하면 화는 +1%p인데 비어 있는 금이 훨씬 크게 는다.
    const me = c(1, 3, 2, 0, 2) // 화 38% · 금 0%
    const before = ohaengPctAfter(me, zero)
    const after = ohaengPctAfter(me, flowerOhaengProfile({ name: "빨간 장미", colorTags: ["레드"] }))
    expect(after.화 - before.화).toBeLessThan(after.금 - before.금)
  })
})

import { describe, it, expect } from "vitest"
import {
  ohaengBalance, balanceDelta, idealBalanceDelta, ohaengFit, NEUTRAL_FIT, ohaengPctAfter,
  personalPreferenceDetail, personalScore, buildReasons,
  personalPreferenceScore, blendScore,
  wealthOhaeng, loveOhaeng, birthColorOhaeng,
  MONTH_TO_OHAENG, OBANGSAEK_OHAENG, topByOhaeng, OHAENG_RELEVANCE_MIN, pickDiverse,
  generates, whoGenerates,
} from "../recommendation"
import { flowerOhaengProfile, flowerSpeciesKey, normalizeColorTag } from "../ohaengProfile"
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

describe("blendScore", () => {
  it("비율 0.95/0.05 합산 — 재고 항은 없다", () => {
    expect(blendScore(1, 1)).toBeCloseTo(1)
    expect(blendScore(1, 0)).toBeCloseTo(0.95)
    expect(blendScore(0, 1)).toBeCloseTo(0.05)
  })

  it("개인화만으로는 궁합을 뒤집지 못한다 — 개인화는 동점 조정용이다", () => {
    // 재고 10%를 궁합에 넘겼으므로 궁합:개인화가 17:1에서 19:1로 벌어졌다.
    // 개인화 만점(0.05)이 궁합 5%p 차이도 못 메운다는 성질이 유지되는지가 실제 관심사다.
    expect(blendScore(0.5, 1)).toBeLessThan(blendScore(0.6, 0))
    expect(blendScore(1, 0) / blendScore(0, 1)).toBeCloseTo(19)
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
  // 프로필·개인화만 갖는 최소 후보 (재고는 점수에서 빠졌다)
  const cand = (id: string, profile: Partial<Record<Ohaeng, number>>, personal = 0) =>
    ({ id, name: id, profile: { ...zero, ...profile }, personal })

  it("프로필이 임계 미만인 상품은 그 오행 리스트에 들어가지 않는다", () => {
    const items = [
      cand("무관", { 토: 0 }, 1), // 개인화 만점이어도 토가 0
      cand("관련", { 토: 60 }),
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

  it("exclude는 제외한다 — 주 추천에 이미 나온 꽃을 다른 리스트에서 뺄 때 쓴다", () => {
    const items = [cand("제외", { 목: 80 }), cand("남음", { 목: 70 })]
    const got = topByOhaeng(items, "목", 3, new Set(["제외"]))
    expect(got.map((s) => s.id)).toEqual(["남음"])
  })

  it("점수는 절대값이다 — 후보군이 빈약하면 1위도 낮은 점수를 받는다", () => {
    // 상대 정규화였다면 두 경우 모두 1위가 만점을 받았을 것이다
    const weak = topByOhaeng([cand("약함", { 목: 40 })], "목", 1)[0]
    const strong = topByOhaeng([cand("강함", { 목: 90 })], "목", 1)[0]
    expect(weak.score).toBeLessThan(strong.score)
    expect(weak.score).toBeCloseTo(blendScore(0.4, 0))
  })

  it("계산된 점수를 그대로 실어 보낸다", () => {
    const [top] = topByOhaeng([cand("a", { 수: 60 }, 0.5)], "수", 1)
    expect(top.score).toBeCloseTo(blendScore(0.6, 0.5))
  })
})

describe("topByOhaeng — 상생(相生) 폴백", () => {
  const cand = (id: string, profile: Partial<Record<Ohaeng, number>>, personal = 0) =>
    ({ id, name: id, profile: { ...zero, ...profile }, personal })

  it("후보가 충분하면(3개 이상) 폴백이 발동하지 않는다 — matchedOhaeng은 전부 target", () => {
    const items = [cand("a", { 금: 60 }), cand("b", { 금: 50 }), cand("c", { 금: 40 })]
    const got = topByOhaeng(items, "금", 4)
    expect(got.map((s) => s.id)).toEqual(["a", "b", "c"])
    expect(got.every((s) => s.matchedOhaeng === "금")).toBe(true)
  })

  it("후보가 3개 미만이면 target을 낳는 오행(whoGenerates)에서 채운다", () => {
    // whoGenerates("금") === "토" (토생금)
    const items = [cand("금후보", { 금: 60 }), cand("토후보1", { 토: 50 }), cand("토후보2", { 토: 40 })]
    const got = topByOhaeng(items, "금", 4)
    expect(got.map((s) => s.id)).toEqual(["금후보", "토후보1", "토후보2"])
    expect(got.find((s) => s.id === "금후보")?.matchedOhaeng).toBe("금")
    expect(got.find((s) => s.id === "토후보1")?.matchedOhaeng).toBe("토")
    expect(got.find((s) => s.id === "토후보2")?.matchedOhaeng).toBe("토")
  })

  it("폴백은 limit을 넘지 않는다", () => {
    const items = [cand("금후보", { 금: 60 }), cand("토1", { 토: 50 }), cand("토2", { 토: 40 }), cand("토3", { 토: 30 })]
    const got = topByOhaeng(items, "금", 2)
    expect(got).toHaveLength(2)
  })

  it("생성 오행 후보도 없으면 있는 만큼만 반환한다 (2단계까지 거슬러 올라가지 않는다)", () => {
    const items = [cand("금후보", { 금: 60 }), cand("무관", { 화: 50 })]
    const got = topByOhaeng(items, "금", 4)
    expect(got.map((s) => s.id)).toEqual(["금후보"])
  })

  it("exclude·종 다양성은 폴백 후보에도 그대로 적용된다", () => {
    const items = [
      cand("금후보", { 금: 60 }),
      { id: "토장미1", name: "빨간 장미", profile: { ...zero, 토: 50 }, personal: 0 },
      { id: "토장미2", name: "핑크 장미", profile: { ...zero, 토: 45 }, personal: 0 },
      { id: "토백합", name: "흰 백합", profile: { ...zero, 토: 40 }, personal: 0 },
    ]
    const got = topByOhaeng(items, "금", 3)
    expect(got.map((s) => s.id)).toEqual(["금후보", "토장미1", "토백합"]) // 장미는 하나만
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
    personal: { flower: 0, color: 0, birthFlowerName: null, birthColorName: "적(赤)" },
  }

  it("점수에 기여한 근거만 만든다 — 기여 없는 항목은 카드도 없다", () => {
    const reasons = buildReasons(base)
    expect(reasons.some((r) => r.icon === "🎨")).toBe(false) // 탄생색 미일치
    expect(reasons.some((r) => r.icon === "🌸")).toBe(false) // 탄생화 무관
  })

  it("구매 가능 근거는 만들지 않는다 — 재고가 점수식에서 빠졌다", () => {
    // 근거는 점수에 실제로 기여한 항의 투영이다. 구매 가능성은 점수 근거가 아니라 카드 배지가 맡는다.
    expect(buildReasons(base).some((r) => r.icon === "🛒")).toBe(false)
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

  it("상생 폴백 근거는 generatedFor가 target과 다를 때만 붙는다", () => {
    // target이 이미 matchedOhaeng(토)로 대체됐고, generatedFor(금)는 원래 부족했던 오행
    const reasons = buildReasons({ ...base, target: "토", generatedFor: "금" })
    const fallback = reasons.find((r) => r.icon === "🔄")
    expect(fallback?.title).toContain("금(金)")
    expect(fallback?.detail).toContain("토(土)")
  })

  it("폴백이 아니면(generatedFor === target) 상생 근거를 만들지 않는다", () => {
    expect(buildReasons({ ...base, generatedFor: "금" }).some((r) => r.icon === "🔄")).toBe(false)
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

describe("개인화 매칭 — 색 표기·종 기준 (버그 회귀 가드)", () => {
  const june = { monthDay: null, month: 6, mainOhaeng: "화" as const } // 6월=화=적(레드/핑크)

  it("영어 색태그 상품에서도 탄생색상이 걸린다", () => {
    // 시드·SQL 상품은 colorTags가 영어라, 정규화 없이는 오방색 비교가 구조적으로 0이었다
    const ko = personalPreferenceDetail({ id: "a", name: "무명 꽃", colorTags: ["레드"] }, june)
    const en = personalPreferenceDetail({ id: "b", name: "무명 꽃", colorTags: ["red"] }, june)
    expect(en.color).toBe(1)
    expect(en.color).toBe(ko.color)
  })

  it("영어·한글 표기가 같은 색으로 모인다", () => {
    for (const [a, b] of [["pink", "핑크"], ["white", "화이트"], ["yellow", "옐로"], ["purple", "보라"]]) {
      expect(normalizeColorTag(a), `${a}/${b}`).toBe(normalizeColorTag(b))
    }
    expect(normalizeColorTag("orange")).toBe(normalizeColorTag("오렌지"))
    expect(normalizeColorTag("주황")).toBe(normalizeColorTag("orange"))
    expect(normalizeColorTag("파스텔")).toBeNull()
  })

  it("짧은 탄생화명이 매장 이름과 오탐하지 않는다", () => {
    // 10-20 탄생화는 "마"(마과 식물). 예전엔 "꽃담마켓"·"플라워마켓"이 전부 종 일치로 잡혔다
    const d = personalPreferenceDetail(
      { id: "x", name: "중구 꽃담마켓 데일리 꽃다발", colorTags: [] },
      { monthDay: "10-20", month: null, mainOhaeng: "목" },
    )
    expect(d.flower).toBe(0)
  })

  it("종 일치는 큐레이션된 꽃 이름으로만 성립한다", () => {
    // 01-07 탄생화는 "핑크 튤립"(pink) — 종(튤립)이 같으면 0.7 이상
    const jan7 = { monthDay: "01-07", month: null, mainOhaeng: "목" as const }
    const tulip = personalPreferenceDetail(
      { id: "x", name: "관악구 봄꽃상점 흰 튤립 데일리 꽃다발", colorTags: ["화이트"] }, jan7,
    )
    expect(tulip.flower).toBeGreaterThanOrEqual(0.7)
    // 종도 색도 다르면 0
    const lily = personalPreferenceDetail(
      { id: "y", name: "강남구 흰 백합 데일리 꽃다발", colorTags: ["화이트"] }, jan7,
    )
    expect(lily.flower).toBe(0)
  })

  it("종과 색이 모두 맞으면 최고 등급 1.0 — 도달 가능해야 한다", () => {
    // 예전엔 상품 id로 비교해 교집합이 공집합이라 1.0이 영원히 안 나왔다
    const d = personalPreferenceDetail(
      { id: "x", name: "핑크 튤립 다발", colorTags: ["pink"] },
      { monthDay: "01-07", month: null, mainOhaeng: "목" },
    )
    expect(d.flower).toBe(1)
  })

  it("판매하지 않는 야생화 탄생화는 종 일치가 안 된다 (정상)", () => {
    // 05-13 산사나무처럼 366일 중 295일은 큐레이션 종이 아니다 — 색만 맞을 수 있다
    const d = personalPreferenceDetail(
      { id: "x", name: "흰 백합 다발", colorTags: ["화이트"] },
      { monthDay: "05-13", month: null, mainOhaeng: "목" },
    )
    expect(d.flower).toBe(0.4) // 산사나무는 white → 색만 일치
  })
})

describe("상생(相生) 관계", () => {
  it("목생화·화생토·토생금·금생수·수목 5순환이 닫힌다 — 각 오행은 정확히 하나를 낳고 하나에서 나온다", () => {
    const all: Ohaeng[] = ["목", "화", "토", "금", "수"]
    for (const a of all) {
      expect(all.filter((b) => generates(a, b)), `${a}가 낳는 오행`).toHaveLength(1)
      expect(all.filter((b) => generates(b, a)), `${a}를 낳는 오행`).toHaveLength(1)
      expect(generates(a, a), `${a}는 스스로를 낳지 않는다`).toBe(false)
      expect(generates(whoGenerates(a), a), `whoGenerates(${a})`).toBe(true)
    }
    expect(generates("목", "화")).toBe(true)
    expect(generates("수", "목")).toBe(true)
    expect(generates("화", "목")).toBe(false) // 방향이 있다
  })
})

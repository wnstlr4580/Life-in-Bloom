import { describe, it, expect } from "vitest"
import {
  needVector, balanceGain, normalizeGains,
  stockScore, personalPreferenceScore, blendScore,
  wealthOhaeng, loveOhaeng, birthColorOhaeng,
  MONTH_TO_OHAENG, OBANGSAEK_OHAENG, topByOhaeng, OHAENG_RELEVANCE_MIN,
} from "../recommendation"
import { flowerOhaengProfile } from "../ohaengProfile"
import type { Ohaeng } from "../saju"

const zero: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }

describe("needVector", () => {
  it("20% 미만인 오행만 양수, 충분/과잉은 0", () => {
    const need = needVector({ 목: 5, 화: 40, 토: 20, 금: 15, 수: 20 })
    expect(need.목).toBe(15) // 20-5
    expect(need.금).toBe(5) // 20-15
    expect(need.화).toBe(0) // 과잉
    expect(need.토).toBe(0) // 딱 20
    expect(need.수).toBe(0)
  })
})

describe("balanceGain", () => {
  it("부족 오행에 강한 프로필이 더 높은 gain", () => {
    const need = needVector({ 목: 0, 화: 40, 토: 30, 금: 20, 수: 10 }) // 목 부족(20), 수 부족(10)
    const mokFlower = { ...zero, 목: 80 } // 목에 강함
    const hwaFlower = { ...zero, 화: 80 } // 이미 과잉인 화에 강함
    expect(balanceGain(mokFlower, need)).toBeGreaterThan(balanceGain(hwaFlower, need))
    expect(balanceGain(hwaFlower, need)).toBe(0) // 화 need=0
  })

  it("실제 프로필과 연동: 목 부족 사주에 유칼립투스(목)가 해바라기(화·토)보다 높다", () => {
    const need = needVector({ 목: 0, 화: 30, 토: 30, 금: 20, 수: 20 })
    const euca = flowerOhaengProfile({ name: "유칼립투스", colorTags: ["그린"], seasonTags: ["spring"] })
    const sun = flowerOhaengProfile({ name: "해바라기", colorTags: ["옐로"], seasonTags: ["summer"] })
    expect(balanceGain(euca, need)).toBeGreaterThan(balanceGain(sun, need))
  })
})

describe("normalizeGains", () => {
  it("최댓값이 1, 나머지는 비율", () => {
    expect(normalizeGains([0, 5, 10])).toEqual([0, 0.5, 1])
  })
  it("전부 0이면 전부 0", () => {
    expect(normalizeGains([0, 0])).toEqual([0, 0])
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
    ({ id, profile: { ...zero, ...profile }, stock, personal })

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

  it("사주 항이 후보 최댓값 기준으로 정규화되어 85:10:5가 지켜진다", () => {
    // 1위는 프로필이 만점이 아니어도 balance 항 0.85를 온전히 받아야 한다
    const items = [cand("top", { 목: 40 }, 50, 1), cand("low", { 목: 20 }, 50, 1)]
    const [first] = topByOhaeng(items, "목", 1)
    expect(first.id).toBe("top")
    // 정규화 전이라면 0.85*0.40 = 0.34 였을 항이 0.85*1 = 0.85 가 된다
    expect(blendScore(1, 50, 1)).toBeCloseTo(0.85 + 0.10 + 0.05)
  })
})

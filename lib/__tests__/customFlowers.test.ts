import { describe, it, expect } from "vitest"
import { FLOWERS } from "../customFlowers"
import { flowerOhaengProfile, flowerSpeciesKey, normalizeColorTag, OHAENG_RELEVANCE_MIN } from "../ohaengProfile"
import { lookupFlowerMeaning } from "../flowerStory"
import type { Ohaeng } from "../saju"

const OHAENG_ALL: Ohaeng[] = ["목", "화", "토", "금", "수"]

describe("주문 가능 꽃 목록 (FLOWERS)", () => {
  it("id가 유니크하다 — /custom?flowers= 화이트리스트와 재고 조인이 id에 걸려 있다", () => {
    expect(new Set(FLOWERS.map((f) => f.id)).size).toBe(FLOWERS.length)
  })

  it("이름에서 뽑은 종이 group과 일치한다 — 형태·계절축 55%가 이 매칭에 달려 있다", () => {
    for (const f of FLOWERS) {
      expect(flowerSpeciesKey(f.name), f.name).toBe(f.group)
    }
  })

  it("색이 전부 인식된다 — 미인식이면 색상축 45%가 통째로 0이 된다", () => {
    for (const f of FLOWERS) {
      expect(normalizeColorTag(f.color), `${f.name}/${f.color}`).not.toBeNull()
    }
  })

  it("전 항목에 꽃말이 붙는다", () => {
    for (const f of FLOWERS) {
      expect(lookupFlowerMeaning(f.name, f.color), f.name).not.toBeNull()
    }
  })
})

describe("오행은 프로필에서 파생된다 (하드코딩 폐기)", () => {
  it("대표 오행이 프로필 최고점과 일치한다", () => {
    for (const f of FLOWERS) {
      const best = Math.max(...OHAENG_ALL.map((o) => f.profile[o]))
      expect(f.profile[f.ohaeng], f.name).toBe(best)
    }
  })

  it("파생 프로필이 flowerOhaengProfile 결과와 같다 — 계산이 두 벌이 아니다", () => {
    for (const f of FLOWERS) {
      expect(f.profile, f.name).toEqual(flowerOhaengProfile({ name: f.name, colorTags: [f.color] }))
    }
  })

  it("전 항목의 대표 오행 점수가 관련성 임계 이상이다", () => {
    // 미달 항목이 생기면 카드 배지·필터가 근거 없는 오행을 주장한다
    for (const f of FLOWERS) {
      expect(f.profile[f.ohaeng], f.name).toBeGreaterThanOrEqual(OHAENG_RELEVANCE_MIN)
    }
  })

  it("오행 칩 5개가 모두 비지 않고, 분포가 고정돼 있다", () => {
    // argmax 단일 라벨을 유지하는지 감시한다. 임계 이상을 전부 인정하는 방식으로 바꾸면
    // 목 35·화 39가 걸려(카네이션·거베라는 5개 전부) 칩이 필터 기능을 잃는다.
    const dist = Object.fromEntries(OHAENG_ALL.map((o) => [o, FLOWERS.filter((f) => f.ohaeng === o).length]))
    // 확충 41종(2026-09) 편입 이후 값 — 47종 스냅샷(목3·화19·토6·금15·수4)에서 갱신됨
    expect(dist).toEqual({ 목: 4, 화: 31, 토: 11, 금: 29, 수: 13 })
    for (const o of OHAENG_ALL) expect(dist[o], o).toBeGreaterThan(0)
  })
})

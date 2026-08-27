import { describe, it, expect } from "vitest"
import { FLOWER_CATALOG, RECOMMENDABLE_CATALOG, catalogProfile, catalogProfileInput } from "../flowerCatalog"
import { FLOWERS } from "../customFlowers"
import {
  FLOWER_FORM, FLOWER_SEASON, flowerOhaengProfile, flowerSpeciesKey, normalizeColorTag, isPeakSeason,
  OHAENG_RELEVANCE_MIN,
} from "../ohaengProfile"
import { lookupFlowerMeaning } from "../flowerStory"
import type { Ohaeng } from "../saju"

const OHAENG_ALL: Ohaeng[] = ["목", "화", "토", "금", "수"]
const SEASONS = ["spring", "summer", "autumn", "winter"] as const

describe("꽃 카탈로그 무결성", () => {
  it("id가 유니크하다", () => {
    expect(new Set(FLOWER_CATALOG.map((f) => f.id)).size).toBe(FLOWER_CATALOG.length)
  })

  it("species가 FLOWER_FORM·FLOWER_SEASON 양쪽 키다 — 한쪽만이면 그 축이 통째로 0", () => {
    for (const f of FLOWER_CATALOG) {
      expect(f.species in FLOWER_FORM, `${f.name} form`).toBe(true)
      expect(f.species in FLOWER_SEASON, `${f.name} season`).toBe(true)
    }
  })

  it("이름에서 뽑은 종이 species와 일치한다 (substring 충돌 가드)", () => {
    // 어긋나면 형태·계절축 55%가 남의 꽃 값을 상속한다
    for (const f of FLOWER_CATALOG) {
      expect(flowerSpeciesKey(f.name), f.name).toBe(f.species)
    }
  })

  it("색이 인식되고 색상축에 실제로 기여한다", () => {
    for (const f of FLOWER_CATALOG) {
      expect(normalizeColorTag(f.color), `${f.name}/${f.color}`).not.toBeNull()
      // 종·형태·계절을 배제하고 색만 남긴 프로필이 0이 아니어야 한다 — 그래야 색상축 45%가 산다.
      // (해바라기처럼 이름에 색 수식어가 없는 단색 꽃도 colorTags로 같은 색을 받는다)
      const colorOnly = flowerOhaengProfile({ name: "무명 꽃", colorTags: [f.color] })
      expect(Math.max(...OHAENG_ALL.map((o) => colorOnly[o])), `${f.name}/${f.color}`).toBeGreaterThan(0)
    }
  })

  it("전 항목에 꽃말이 붙는다", () => {
    for (const f of FLOWER_CATALOG) {
      expect(lookupFlowerMeaning(f.name, f.color), f.name).not.toBeNull()
    }
  })

  it("모든 항목이 최소 한 오행에서 관련성 임계 이상을 받는다", () => {
    for (const f of FLOWER_CATALOG) {
      const profile = catalogProfile(f)
      expect(Math.max(...OHAENG_ALL.map((o) => profile[o])), f.name).toBeGreaterThanOrEqual(OHAENG_RELEVANCE_MIN)
    }
  })

  it("확충 항목 표식이 일관된다 — 사진이 없으면 주문도 불가", () => {
    for (const f of FLOWER_CATALOG) {
      expect(f.img === null, f.name).toBe(f.customFlowerId === null)
    }
  })

  it("customFlowerId는 주문 가능 목록의 id다", () => {
    const orderable = new Set(FLOWERS.map((f) => f.id))
    for (const f of FLOWER_CATALOG) {
      if (f.customFlowerId) expect(orderable.has(f.customFlowerId), f.name).toBe(true)
    }
  })

  it("주문 가능 47항목이 전부 카탈로그에 있다", () => {
    const ids = new Set(FLOWER_CATALOG.map((f) => f.id))
    for (const f of FLOWERS) expect(ids.has(f.id), f.name).toBe(true)
  })

  it("프로필 입력이 종·색·이름을 모두 싣는다 — 세 축이 같은 입력을 본다", () => {
    const input = catalogProfileInput(FLOWER_CATALOG[0])
    expect(input.name).toBe(FLOWER_CATALOG[0].name)
    expect(input.category).toBe(FLOWER_CATALOG[0].species)
    expect(input.colorTags).toEqual([FLOWER_CATALOG[0].color])
  })
})

describe("추천 후보 (RECOMMENDABLE_CATALOG)", () => {
  it("추모 연상 항목만 빠진다 — 흰 국화", () => {
    expect(FLOWER_CATALOG.some((f) => f.id === "mum-white")).toBe(true)
    expect(RECOMMENDABLE_CATALOG.some((f) => f.id === "mum-white")).toBe(false)
    // 같은 종의 다른 색은 추천에 남는다
    expect(RECOMMENDABLE_CATALOG.some((f) => f.id === "mum-pink")).toBe(true)
    expect(RECOMMENDABLE_CATALOG.length).toBe(FLOWER_CATALOG.length - 1)
  })

  it("오행 5개 각각 임계 이상 후보가 12항목·8종 이상 있다 — 추천이 비지 않는다", () => {
    // 스냅샷이 아니라 하한 가드다. 확충·삭제로 실측값이 움직여도 헛경보가 나지 않아야 한다.
    for (const o of OHAENG_ALL) {
      const hit = RECOMMENDABLE_CATALOG.filter((f) => catalogProfile(f)[o] >= OHAENG_RELEVANCE_MIN)
      expect(hit.length, `${o} 항목`).toBeGreaterThanOrEqual(12)
      expect(new Set(hit.map((f) => f.species)).size, `${o} 종`).toBeGreaterThanOrEqual(8)
    }
  })

  it("네 계절 각각 주개화 종이 4개 이상 있다 — 제철 추천이 종 다양성으로 채워진다", () => {
    for (const s of SEASONS) {
      const hit = RECOMMENDABLE_CATALOG.filter((f) => isPeakSeason(f.name, s))
      expect(new Set(hit.map((f) => f.species)).size, s).toBeGreaterThanOrEqual(4)
    }
  })
})

import { describe, it, expect } from "vitest"
import { classifyProductOhaeng, suggestBouquetNames } from "../product-ohaeng"
import { flowerOhaengProfile, OHAENG_RELEVANCE_MIN, type OhaengProfileInput } from "../ohaengProfile"
import type { Ohaeng } from "../saju"

const OHAENG_ALL: Ohaeng[] = ["목", "화", "토", "금", "수"]

// 실제 카탈로그·시드에서 뽑은 상품 형태들
const SAMPLES: OhaengProfileInput[] = [
  { name: "봄날의 튤립 다발", colorTags: ["pink", "red", "yellow"], seasonTags: ["spring"] },
  { name: "청초한 수국 화분", colorTags: ["blue", "purple", "white"], seasonTags: ["summer", "spring"] },
  { name: "순백의 백합 부케", colorTags: ["white"], seasonTags: ["spring", "summer"] },
  { name: "열정의 장미 다발", colorTags: ["red"], seasonTags: ["spring", "summer", "autumn"] },
  { name: "가을빛 국화 화환", colorTags: ["yellow", "beige"], seasonTags: ["autumn"] },
  { name: "해바라기 미니 화분", colorTags: ["yellow"], seasonTags: ["summer"] },
  { name: "축하화환 3단 — 핑크 거베라", colorTags: ["pink"], seasonTags: ["all"] },
  { name: "집들이 화분 — 유칼립투스", colorTags: ["green"], seasonTags: ["all"] },
  { name: "무명 꽃다발", colorTags: [], seasonTags: [] },
]

describe("classifyProductOhaeng — 추천과 같은 프로필이 유일한 근거", () => {
  it("태그는 항상 프로필 상위 오행이고, 임계 미달은 붙지 않고, 2개를 넘지 않는다", () => {
    for (const input of SAMPLES) {
      const profile = flowerOhaengProfile(input)
      const tags = classifyProductOhaeng(input)
      const label = `${input.name} ${JSON.stringify(profile)} → ${JSON.stringify(tags)}`

      expect(tags.length, label).toBeLessThanOrEqual(2)
      for (const o of tags) expect(profile[o], label).toBeGreaterThanOrEqual(OHAENG_RELEVANCE_MIN)

      const best = Math.max(...OHAENG_ALL.map((o) => profile[o]))
      if (best >= OHAENG_RELEVANCE_MIN) expect(profile[tags[0]], label).toBe(best)
      else expect(tags, label).toEqual([])
    }
  })

  it("프로필 최고 오행을 그대로 태깅한다 (백합=금, 해바라기 화분=토)", () => {
    expect(classifyProductOhaeng({ name: "순백의 백합 부케", colorTags: ["white"] })).toEqual(["금"])
    expect(classifyProductOhaeng({ name: "해바라기 미니 화분", colorTags: ["yellow"], seasonTags: ["summer"] })).toEqual(["토"])
  })

  it("점수가 근소하게 갈리면 공동 1위 2개를 준다", () => {
    // 튤립 다발: 화 52 · 토 47 (격차 5)
    expect(classifyProductOhaeng({
      name: "봄날의 튤립 다발", colorTags: ["pink", "red", "yellow"], seasonTags: ["spring"],
    })).toEqual(["화", "토"])
  })

  it("신호가 하나도 없는 상품에는 태그를 붙이지 않는다", () => {
    // 예전 규칙은 축마다 균등 폴백(0.2)을 줘서 이런 상품에 자동으로 목·화를 붙였다.
    // 그 결과 /products?ohaeng=목 목록에 목과 무관한 상품이 구조적으로 섞였다.
    expect(classifyProductOhaeng({ name: "무명 꽃다발" })).toEqual([])
    expect(classifyProductOhaeng({ name: "축하화환 3단", colorTags: [], seasonTags: [] })).toEqual([])
    expect(classifyProductOhaeng({})).toEqual([])
  })

  it("대응 오행이 없는 색태그만 있으면 임계에 못 닿아 태그가 없다", () => {
    expect(classifyProductOhaeng({ name: "무명 꽃", colorTags: ["beige"] })).toEqual([])
  })

  it("상품명·카테고리도 근거로 쓴다 (예전 규칙은 이 둘을 무시했다)", () => {
    expect(classifyProductOhaeng({ name: "백합" }).length).toBeGreaterThan(0)
    expect(classifyProductOhaeng({})).toEqual([])
  })

  it("꽃말은 태깅 근거가 아니다 — 상세설명 카피로 오행이 바뀌지 않는다", () => {
    // Product.flowerMeaning은 프로덕션 모든 쓰기 경로에서 null이라, 예전 꽃말 축(33%)은
    // 사실상 마케팅 문구가 굴리고 있었다.
    const base = { name: "무명 꽃다발", colorTags: [], seasonTags: [] }
    expect(classifyProductOhaeng({ ...base, description: "열정과 사랑을 담은 뜨거운 고백" })).toEqual([])
    expect(classifyProductOhaeng({ ...base, description: "순수하고 깨끗한 결실의 완성" })).toEqual([])
  })
})

describe("suggestBouquetNames", () => {
  it("태그가 없는 상품에서도 이름 3개를 반환한다", () => {
    // classifyProductOhaeng이 빈 배열을 주는 경로가 정상이 됐으므로 구조분해가 undefined를 받는다
    expect(suggestBouquetNames({ name: "무명 꽃다발" })).toHaveLength(3)
    expect(suggestBouquetNames({})).toHaveLength(3)
  })

  it("계절 태그가 있으면 마지막 이름에 반영한다", () => {
    const names = suggestBouquetNames({ name: "백합 부케", colorTags: ["white"], seasonTags: ["spring"] })
    expect(names[2]).toContain("spring")
  })
})

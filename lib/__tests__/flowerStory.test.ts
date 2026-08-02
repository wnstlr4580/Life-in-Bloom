import { describe, it, expect } from "vitest"
import { flowerStory, lookupFlowerMeaning } from "../flowerStory"
import { FORM_TRAIT_LABEL, FORM_TRAITS, FLOWER_FORM, flowerSpeciesKey } from "../ohaengProfile"

describe("lookupFlowerMeaning", () => {
  it("한글 종명으로 영문 사전을 조회한다 (브리지가 데이터에서 유도된다)", () => {
    expect(lookupFlowerMeaning("라벤더", "퍼플")).toBe("기다림, 침묵의 사랑")
    expect(lookupFlowerMeaning("장미", "레드")).toBe("열정적인 사랑")
  })

  it("같은 종이라도 색마다 꽃말이 다르다", () => {
    expect(lookupFlowerMeaning("장미", "레드")).not.toBe(lookupFlowerMeaning("장미", "핑크"))
  })

  it("색이 사전에 없으면 그 종의 다른 색으로 폴백한다", () => {
    expect(lookupFlowerMeaning("라벤더", "그린")).toBeTruthy()
  })

  it("모르는 종은 null", () => {
    expect(lookupFlowerMeaning("정체불명꽃", "레드")).toBeNull()
    expect(lookupFlowerMeaning(null, "레드")).toBeNull()
  })
})

describe("flowerStory", () => {
  it("색·형태·오행·꽃말이 모두 문장에 들어간다", () => {
    const s = flowerStory({ name: "라벤더", colorTags: ["퍼플"] }, "수", { lacking: "수", excess: "화" })
    expect(s).toHaveLength(3)
    expect(s[0]).toContain("연보라빛")
    expect(s[0]).toContain("부드러운 곡선")
    expect(s[0]).toContain("수(水)")
    expect(s[1]).toContain("기다림, 침묵의 사랑")
    expect(s[2]).toContain("부족한 수(水)")
    expect(s[2]).toContain("넉넉한 화(火)")
  })

  it("인용격 조사가 꽃말 끝 받침을 따른다 (비문 방지)", () => {
    // '사랑'(받침) → 이라는 · '바라봐요'(모음) → 라는
    const rose = flowerStory({ name: "빨간 장미", colorTags: ["red"] }, "화", {})
    expect(rose[1]).toContain("'열정적인 사랑'이라는 꽃말")
    const sun = flowerStory({ name: "해바라기", colorTags: ["yellow"] }, "토", {})
    expect(sun[1]).toContain("'당신만 바라봐요'라는 꽃말")
    expect(sun[1]).not.toContain("바라봐요'이라는")
  })

  it("오행 키워드에도 받침 규칙이 적용된다", () => {
    const euca = flowerStory({ name: "유칼립투스", colorTags: ["그린"] }, "목", {})
    expect(euca[1]).toContain("생명력이라는") // 력=받침
    const lavender = flowerStory({ name: "라벤더", colorTags: ["퍼플"] }, "수", {})
    expect(lavender[1]).toContain("깊이라는") // 이=모음
  })

  it("주어 조사도 받침을 따른다", () => {
    expect(flowerStory({ name: "백합", colorTags: ["화이트"] }, "금", {})[0]).toMatch(/^백합은 /)
    expect(flowerStory({ name: "라벤더", colorTags: ["퍼플"] }, "수", {})[0]).toMatch(/^라벤더는 /)
  })

  it("재료가 없으면 그 문장을 통째로 건너뛴다 — 빈칸이 보이는 문장은 안 만든다", () => {
    const s = flowerStory({ name: "파스텔 혼합 꽃다발", colorTags: ["믹스"] }, "금", { lacking: "금" })
    expect(s.every((line) => !line.includes("undefined") && !line.includes("null"))).toBe(true)
    expect(s.some((line) => line.includes("꽃말"))).toBe(false) // 꽃말을 못 찾으면 그 문장 없음
  })

  it("부족 오행만 있으면 2~3문장, 이름조차 없으면 빈 배열", () => {
    expect(flowerStory({ name: "흰 국화", colorTags: ["화이트"] }, "금", { lacking: "금" })).toHaveLength(3)
    expect(flowerStory({ name: "" }, "금", {})).toEqual([])
  })

  it("DB 꽃말이 있으면 사전보다 우선한다", () => {
    const s = flowerStory(
      { name: "라벤더", colorTags: ["퍼플"], flowerMeaning: "판매자가 쓴 문구" }, "수", {},
    )
    expect(s[1]).toContain("판매자가 쓴 문구")
    expect(s[1]).not.toContain("기다림")
  })
})

describe("FORM_TRAIT_LABEL", () => {
  it("모든 형태 특성에 자연어 라벨이 있다", () => {
    for (const trait of Object.keys(FORM_TRAITS) as (keyof typeof FORM_TRAITS)[]) {
      expect(FORM_TRAIT_LABEL[trait], trait).toBeTruthy()
    }
  })

  it("라벨은 붙여쓰기가 아니라 문장에 넣을 수 있는 형태다", () => {
    // 원문 키("습지물연관")를 그대로 쓰면 비문이 되므로 라벨은 달라야 한다
    const same = Object.entries(FORM_TRAIT_LABEL).filter(([k, v]) => k === v)
    expect(same).toEqual([])
  })

  it("큐레이션된 꽃은 대부분 스토리에 쓸 형태 근거를 갖는다", () => {
    const withTrait = Object.keys(FLOWER_FORM).filter((f) => flowerSpeciesKey(f) !== null)
    expect(withTrait.length).toBeGreaterThan(40)
  })
})

describe("lookupFlowerMeaning — 이름·색 표기 관용성", () => {
  it("종 키가 아니라 이름 전체를 넘겨도 해석한다", () => {
    expect(lookupFlowerMeaning("노란 튤립", "yellow")).toBeTruthy()
    expect(lookupFlowerMeaning("강서구 봄꽃상점 라벤더 다발", "퍼플")).toBe("기다림, 침묵의 사랑")
  })

  it("색은 한글·영어 표기를 모두 받는다", () => {
    expect(lookupFlowerMeaning("튤립", "yellow")).toBe(lookupFlowerMeaning("튤립", "옐로"))
    expect(lookupFlowerMeaning("장미", "red")).toBe(lookupFlowerMeaning("장미", "레드"))
  })
})

describe("스토리 문구 다듬기", () => {
  it("판매하지 않는 야생화 탄생화도 꽃말을 찾는다", () => {
    // 366일 중 대부분이 큐레이션 종이 아니지만, 탄생화 표시에는 꽃말이 필요하다
    expect(lookupFlowerMeaning("브리오니아", null)).toBeTruthy()
    expect(lookupFlowerMeaning("보리", null)).toBeTruthy()
  })

  it("색을 이미 말했으면 같은 뜻의 형태를 반복하지 않는다", () => {
    // "흰빛과 새하얀 꽃빛을 가진" 같은 중복 방지
    const s = flowerStory({ name: "흰 안개꽃", colorTags: ["화이트"] }, "금", {})
    expect(s[0]).toContain("흰빛")
    expect(s[0]).not.toContain("새하얀 꽃빛")
  })
})

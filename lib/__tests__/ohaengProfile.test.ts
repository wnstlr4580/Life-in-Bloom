import { describe, it, expect } from "vitest"
import { flowerOhaengProfile, FORM_TRAITS, FORM_OHAENG_MAX, FLOWER_SEASON, PROFILE_WEIGHT } from "../ohaengProfile"
import { scoreOhaengMatch, classifyOhaeng } from "../ohaengMatching"

describe("flowerOhaengProfile", () => {
  it("백합: 색·형태=금, 개화기=여름(화)+봄보조(목) → 금 최고 (꽃말 미반영)", () => {
    const p = flowerOhaengProfile({
      name: "백합",
      colorTags: ["화이트"],   // 금
      seasonTags: ["autumn"],  // (개화기 큐레이션이 우선 → 무시됨)
    })
    // 금 = 색(0.45) + 형태(0.35*0.5) + 계절(가을 비수기) = 65
    expect(p).toEqual({ 목: 14, 화: 34, 토: 0, 금: 65, 수: 2 })
    expect(p.금).toBeGreaterThan(p.화)
  })

  it("해바라기: 색=토(45%)+형태 토, 형태·개화기=화 → 색상 비중↑로 토 최고, 화 2위", () => {
    const p = flowerOhaengProfile({
      name: "해바라기",
      colorTags: ["옐로"],       // 토
      seasonTags: ["summer"],
    })
    // 토 = 색(0.45) + 형태(0.35*0.2) = 52, 화 = 계절(0.20) + 형태(0.35*0.7) = 44
    expect(p).toEqual({ 목: 2, 화: 44, 토: 52, 금: 2, 수: 2 })
    expect(p.토).toBeGreaterThan(p.화)
  })

  it("수국: 색=수(퍼플 수0.6), 형태=수+토, 개화기=여름(화)+봄보조(목) → 수 최고", () => {
    const p = flowerOhaengProfile({
      name: "수국",
      colorTags: ["블루", "퍼플"], // 블루=수1, 퍼플=수0.6·화0.4 → 수 캡1, 화0.4
      seasonTags: ["summer"],
    })
    // 수 = 색(0.45) + 형태(0.35*0.3) + 계절(겨울 비수기) = 58
    expect(p).toEqual({ 목: 14, 화: 38, 토: 7, 금: 2, 수: 58 })
    expect(p.수).toBeGreaterThan(p.화)
  })

  it("보라 계열: 퍼플은 수 0.6 : 화 0.4로 배점", () => {
    const p = flowerOhaengProfile({ name: "무명 꽃", colorTags: ["퍼플"] })
    // 퍼플 → 수0.6·화0.4, 색상 가중 0.45 → 수27·화18
    expect(p.수).toBe(27)
    expect(p.화).toBe(18)
    expect(p.수).toBeGreaterThan(p.화)
  })

  it("복합색 캡: 블루+퍼플이면 수는 1로 캡(45), 화는 퍼플의 0.4분(18)", () => {
    const p = flowerOhaengProfile({ name: "무명 꽃", colorTags: ["블루", "퍼플"] })
    // 수 = min(1, 1[블루]+0.6[퍼플]) → 0.45*1 = 45, 화 = 0.4*0.45 = 18
    expect(p.수).toBe(45)
    expect(p.화).toBe(18)
  })

  it("이름 색상 우선: '진핑크 장미'는 colorTags(화이트)보다 이름의 진핑크(화0.8)를 씀 → 화 최고", () => {
    const p = flowerOhaengProfile({ name: "진핑크 장미", colorTags: ["화이트"] })
    // 진핑크 → 화0.8·금0.2 (화이트 무시). 화 = 색(0.45*0.8) + 형태 장미 화 + 개화기
    expect(p.화).toBeGreaterThan(p.금)
    expect(p.화).toBeGreaterThan(50)
  })

  it("세부 색상: '연보라'는 수 0.7로 기본 보라보다 수에 더 실림 → 수 최고", () => {
    const p = flowerOhaengProfile({ name: "연보라 리시안셔스", colorTags: ["퍼플"] })
    // 연보라 → 수0.7·화0.3 (기본 퍼플 수0.6 대신)
    expect(p.수).toBeGreaterThan(p.화)
  })

  it("꽃별 세부색 지정(FLOWER_SHADE): 라벤더(퍼플)는 연보라로 처리 → 수 > 화", () => {
    const p = flowerOhaengProfile({ name: "라벤더", colorTags: ["퍼플"] })
    // colorTags는 퍼플뿐이지만 FLOWER_SHADE로 연보라(수0.7) 적용
    expect(p.수).toBeGreaterThan(p.화)
  })

  it("이름의 세부색이 FLOWER_SHADE 지정보다 우선", () => {
    const p = flowerOhaengProfile({ name: "진보라 라벤더", colorTags: ["퍼플"] })
    // 이름 '진보라'(화0.6) 우선 → 화 > 수
    expect(p.화).toBeGreaterThan(p.수)
  })

  it("멀티 오행: 색=화, 형태=목, 잎식물 개화=4계절 균등 → 화·목 동시 양수", () => {
    const p = flowerOhaengProfile({
      name: "유칼립투스",   // 목(형태) + 잎식물(4계절 보조)
      colorTags: ["레드"],  // 화(색)
    })
    // 화 = 색(0.45) + 계절(잎식물 보조 0.14) = 59, 목 = 계절(0.14) + 형태(0.35*0.5) = 31
    expect(p.화).toBe(59)
    expect(p.목).toBe(31)
    expect(p.화).toBeGreaterThan(0)
    expect(p.목).toBeGreaterThan(0)
  })

  it("형태 특성 누적: 이름만 준 해바라기도 형태로 화·토 둘 다 양수", () => {
    const p = flowerOhaengProfile({ name: "해바라기" }) // 이름만 → 형태+개화기(여름), 색 없음
    expect(p.화).toBeGreaterThan(0) // 큰꽃송이·태양·위로 + 여름 개화
    expect(p.토).toBeGreaterThan(0) // 둥근형태
    expect(p.화).toBeGreaterThan(p.금)
  })

  it("가중치 합은 1 (색상·형태·계절 3축, 꽃말 없음)", () => {
    const sum = PROFILE_WEIGHT.color + PROFILE_WEIGHT.form + PROFILE_WEIGHT.season
    expect(sum).toBeCloseTo(1)
    expect(PROFILE_WEIGHT).not.toHaveProperty("meaning")
  })

  it("FORM_OHAENG_MAX는 특성 점수 총합 (목120·화100·토100·금100·수100)", () => {
    expect(FORM_OHAENG_MAX).toEqual({ 목: 120, 화: 100, 토: 100, 금: 100, 수: 100 })
  })

  it("FORM_TRAITS 각 특성은 유효한 오행과 양수 점수를 가진다", () => {
    for (const { ohaeng, points } of Object.values(FORM_TRAITS)) {
      expect(["목", "화", "토", "금", "수"]).toContain(ohaeng)
      expect(points).toBeGreaterThan(0)
    }
  })
})

describe("계절 축 (개화 적합도)", () => {
  it("잎식물(대나무): 4계절 오행 균등(보조 0.7×0.20→14), 토 보너스 없음", () => {
    const p = flowerOhaengProfile({ name: "대나무" }) // 형태(목)+잎식물
    expect(p.화).toBe(14) // 여름=보조
    expect(p.금).toBe(14) // 가을=보조
    expect(p.수).toBe(14) // 겨울=보조
    expect(p.토).toBe(0)  // 잎식물은 토 보너스 없음
  })

  it("사계절 꽃(거베라)은 토에 보너스(+10→약 2점)", () => {
    const p = flowerOhaengProfile({ name: "거베라" })
    expect(p.토).toBe(2)
    expect(p.토).toBeGreaterThan(0)
  })

  it("미큐레이션 꽃은 상품 seasonTags로 폴백 (winter→수 주개화 0.20→20)", () => {
    const p = flowerOhaengProfile({ name: "정체불명꽃", seasonTags: ["winter"] })
    expect(p.수).toBe(20) // 겨울 주개화 100 → 0.20
    expect(p.목).toBe(0)
    expect(p.화).toBe(0)
    expect(p.금).toBe(0)
  })

  it("FLOWER_SEASON 각 항목은 유효 계절 키만 사용", () => {
    const valid = new Set(["spring", "summer", "autumn", "winter"])
    for (const spec of Object.values(FLOWER_SEASON)) {
      for (const s of [...(spec.main ?? []), ...(spec.sub ?? []), ...(spec.never ?? [])]) {
        expect(valid.has(s)).toBe(true)
      }
    }
  })
})

describe("회귀: scoreOhaengMatch/classifyOhaeng 불변", () => {
  it("scoreOhaengMatch는 여전히 합≈1 분포를 반환", () => {
    const s = scoreOhaengMatch({ colorTags: ["화이트"], seasonTags: ["autumn"], flowerMeaning: "순수" })
    const sum = Object.values(s).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
    expect(s.금).toBeGreaterThan(s.목)
  })

  it("classifyOhaeng은 백합류를 금으로 분류", () => {
    const tags = classifyOhaeng({ colorTags: ["화이트"], seasonTags: ["autumn"], flowerMeaning: "순수, 깨끗" })
    expect(tags).toContain("금")
  })
})

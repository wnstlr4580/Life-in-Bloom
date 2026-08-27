import { describe, it, expect } from "vitest"
import {
  flowerOhaengProfile, FORM_TRAITS, FORM_OHAENG_MAX, FLOWER_SEASON, FLOWER_FORM, PROFILE_WEIGHT, explainOhaeng,
  SEASON_MAIN_COUNT, SEASON_OHAENG_REACH, isPeakSeason,
} from "../ohaengProfile"

describe("flowerOhaengProfile", () => {
  it("백합: 색·형태=금, 개화기=여름(화)+봄보조(목) → 금 최고 (꽃말 미반영)", () => {
    const p = flowerOhaengProfile({
      name: "백합",
      colorTags: ["화이트"],   // 금
      seasonTags: ["autumn"],  // (개화기 큐레이션이 우선 → 무시됨)
    })
    // 금 = 색(0.45) + 형태(0.35*30/55) + 계절(가을 비수기) = 79
    // 토 = 상시성(가장 약한 계절이 비수기 10) → 2
    expect(p).toEqual({ 목: 14, 화: 40, 토: 2, 금: 79, 수: 2 })
    expect(p.금).toBeGreaterThan(p.화)
  })

  it("해바라기: 색=토(45%)+형태 토, 형태·개화기=화 → 색상 비중↑로 토 최고, 화 2위", () => {
    const p = flowerOhaengProfile({
      name: "해바라기",
      colorTags: ["옐로"],       // 토
      seasonTags: ["summer"],
    })
    // 토 = 색(0.45) + 형태(0.35*20/60) + 상시성(0.20*0.1) = 59, 화 = 계절(0.20) + 형태(0.35*70/70) = 55
    expect(p).toEqual({ 목: 2, 화: 55, 토: 59, 금: 2, 수: 2 })
    expect(p.토).toBeGreaterThan(p.화)
  })

  it("수국: 색=수(퍼플 수0.6), 형태=수+토, 개화기=여름(화)+봄보조(목) → 수 최고", () => {
    const p = flowerOhaengProfile({
      name: "수국",
      colorTags: ["블루", "퍼플"], // 블루=수1, 퍼플=수0.6·화0.4 → 수 캡1, 화0.4
      seasonTags: ["summer"],
    })
    // 수 = 색(0.45) + 형태(0.35*30/55) + 계절(겨울 비수기) = 66
    // 토 = 형태(둥근형태 20/60) + 상시성(0.20*0.1) = 14
    expect(p).toEqual({ 목: 14, 화: 38, 토: 14, 금: 2, 수: 66 })
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
    // 화 = 색(0.45) + 계절(잎식물 보조 0.14) = 59, 목 = 계절(0.14) + 형태(0.35*60/80) = 40
    expect(p.화).toBe(59)
    expect(p.목).toBe(40)
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

  it("FORM_OHAENG_MAX는 큐레이션된 꽃이 실제로 도달 가능한 최고점", () => {
    expect(FORM_OHAENG_MAX).toEqual({ 목: 80, 화: 70, 토: 60, 금: 55, 수: 55 })
  })

  it("분모는 특성 총합이 아니다 — 어떤 오행도 도달 불가능한 분모를 갖지 않는다", () => {
    const total = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<string, number>
    for (const { ohaeng, points } of Object.values(FORM_TRAITS)) total[ohaeng] += points
    for (const o of Object.keys(total)) {
      // 총합을 분모로 쓰면 어떤 꽃도 1.0에 못 닿는다. 달성 가능한 값이어야 한다.
      expect(FORM_OHAENG_MAX[o as keyof typeof FORM_OHAENG_MAX], o).toBeLessThan(total[o])
      expect(FORM_OHAENG_MAX[o as keyof typeof FORM_OHAENG_MAX], o).toBeGreaterThan(0)
    }
  })

  it("FORM_TRAITS 각 특성은 유효한 오행과 양수 점수를 가진다", () => {
    for (const { ohaeng, points } of Object.values(FORM_TRAITS)) {
      expect(["목", "화", "토", "금", "수"]).toContain(ohaeng)
      expect(points).toBeGreaterThan(0)
    }
  })
})

describe("계절 축 (개화 적합도)", () => {
  it("잎식물(대나무): 4계절 오행 균등(보조 0.7×0.20→14), 상록이라 토도 최대치", () => {
    const p = flowerOhaengProfile({ name: "대나무" }) // 형태(목)+잎식물
    expect(p.화).toBe(14) // 여름=보조
    expect(p.금).toBe(14) // 가을=보조
    expect(p.수).toBe(14) // 겨울=보조
    expect(p.토).toBe(14) // 사계절 내내 유지 → 상시성 최대
  })

  it("사계절 개화 꽃(거베라)은 4계절 주개화라 토 상한(20)을 채운다", () => {
    const p = flowerOhaengProfile({ name: "거베라" })
    expect(p.토).toBe(20)
  })

  it("토는 상시성 — 사계절 개화 > 잎식물 > 두 계절 꽃 > 단일 계절 꽃 순", () => {
    const allSeason = flowerOhaengProfile({ name: "거베라" })   // 4계절 주개화
    const foliage = flowerOhaengProfile({ name: "대나무" })     // 4계절 보조(상록)
    const twoSeason = flowerOhaengProfile({ name: "장미" })     // 봄·가을 주 + 여름·겨울 보조
    const oneSeason = flowerOhaengProfile({ name: "튤립" })     // 봄만, 나머지 비수기
    expect(allSeason.토).toBeGreaterThan(foliage.토)            // 예전엔 14 == 14 동률이라 검증되지 않았다
    expect(foliage.토).toBeGreaterThanOrEqual(twoSeason.토)
    expect(twoSeason.토).toBeGreaterThan(oneSeason.토)
  })

  it("미큐레이션 꽃은 상품 seasonTags로 폴백 (winter→수 주개화 0.20→20)", () => {
    const p = flowerOhaengProfile({ name: "정체불명꽃", seasonTags: ["winter"] })
    expect(p.수).toBe(20) // 겨울 주개화 100 → 0.20
    // 나머지 계절은 큐레이션 경로와 같은 비수기(10) — 예전엔 폴백만 0이라 미큐레이션 상품의
    // 토 상시성이 구조적으로 0이었다.
    expect(p.목).toBe(2)
    expect(p.화).toBe(2)
    expect(p.금).toBe(2)
    expect(p.토).toBe(2)
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

const OHAENG_ALL = ["목", "화", "토", "금", "수"] as const

describe("계절축 구조적 균등성 (편향 재발 가드)", () => {
  it("오행 5개의 계절축 상한이 모두 1.0 — 어떤 오행도 계절축에서 구조적으로 불리하지 않다", () => {
    // 토는 4계절 등급의 최솟값이라, 4계절 주개화 꽃이 큐레이션에 없으면 0.7에 캡됐었다.
    // 정규화 분모를 새로 두는 대신 실제로 1.0을 채우는 꽃이 존재하게 유지한다.
    for (const o of OHAENG_ALL) expect(SEASON_OHAENG_REACH[o], o).toBe(1)
  })

  it("계절축 만점 기여는 오행마다 같은 20점이다 (가중치 0.20 × 상한 1.0)", () => {
    for (const o of OHAENG_ALL) {
      expect(Math.round(100 * SEASON_OHAENG_REACH[o] * PROFILE_WEIGHT.season), o).toBe(20)
    }
  })

  it("토 상한은 실제 카탈로그 상품이 채운다 — 사전 속 종만으로 여는 상한이 아니다", () => {
    // 거베라·카네이션은 kioskFlowers의 martFlower이고 scripts/add-use-tags-and-products.sql에 등록돼 있다
    expect(flowerOhaengProfile({ name: "핑크 거베라 축하화환", colorTags: ["pink"] }).토).toBe(20)
    expect(flowerOhaengProfile({ name: "감사 꽃다발 — 카네이션", colorTags: ["red"] }).토).toBe(20)
  })

  it("주개화 분포가 특정 계절에 3.2배 넘게 쏠리지 않는다", () => {
    // 봄에만 쏠리면 계절축이 "봄이냐 아니냐"로 붕괴해 금·수는 색상축에만 의존하게 된다.
    // 수치는 코드에서 센다 — 손으로 세던 시절 문서에 "봄26"으로 잘못 적혀 있었다.
    // 임계 3.2의 근거: 봄을 강등하지 않고(자연 개화기 원칙) 가을·겨울을 10까지 올린 30/10 = 3.0.
    const counts = Object.values(SEASON_MAIN_COUNT)
    const label = JSON.stringify(SEASON_MAIN_COUNT)
    expect(Math.min(...counts), label).toBeGreaterThanOrEqual(8)
    expect(Math.max(...counts) / Math.min(...counts), label).toBeLessThanOrEqual(3.2)
  })

  it("계절 큐레이션과 형태 큐레이션의 종 집합이 같다 — 한쪽만 있으면 그 축이 통째로 0이 된다", () => {
    // 유채꽃이 FLOWER_SEASON에만 있어 형태축 35%가 0이던 적이 있다
    expect(Object.keys(FLOWER_SEASON).sort()).toEqual(Object.keys(FLOWER_FORM).sort())
  })

  it("폴백 경로도 큐레이션 경로와 같은 비수기 floor를 쓴다 (경로 비대칭 금지)", () => {
    const fallback = flowerOhaengProfile({ name: "정체불명꽃", seasonTags: ["winter"] })
    const curated = flowerOhaengProfile({ name: "포인세티아" }) // main: winter
    expect(fallback.수).toBe(20)
    expect(fallback.토).toBe(2) // 미큐레이션 상품의 상시성이 구조적으로 0이던 결함
    expect(fallback.토).toBe(curated.토) // 같은 개화기면 경로가 달라도 상시성이 같다
  })

  it("계절 정보가 아예 없으면 계절축은 0 — 없는 정보로 점수를 만들지 않는다", () => {
    const p = flowerOhaengProfile({ name: "정체불명꽃" })
    expect(Object.values(p).every((v) => v === 0)).toBe(true)
  })

  it("계절 태그는 한글·영어·fall을 같게 읽고, fall을 사계절(all)로 오인하지 않는다", () => {
    const en = flowerOhaengProfile({ name: "정체불명꽃", seasonTags: ["spring"] })
    expect(flowerOhaengProfile({ name: "정체불명꽃", seasonTags: ["봄"] })).toEqual(en)

    const autumn = flowerOhaengProfile({ name: "정체불명꽃", seasonTags: ["autumn"] })
    const fall = flowerOhaengProfile({ name: "정체불명꽃", seasonTags: ["fall"] })
    expect(fall).toEqual(autumn)
    expect(flowerOhaengProfile({ name: "정체불명꽃", seasonTags: ["가을"] })).toEqual(autumn)
    // "fall"은 "all"을 포함한다 — 부분일치로 읽으면 사계절이 되어 토가 올라간다
    expect(fall.토).toBe(2)
    expect(fall.토).toBeLessThan(flowerOhaengProfile({ name: "정체불명꽃", seasonTags: ["all"] }).토)
  })
})

describe("색태그 언어 (한글/영어 혼용)", () => {
  it("영어 색태그는 같은 뜻의 한글 색태그와 동일한 프로필을 낸다", () => {
    const ko = flowerOhaengProfile({ name: "해바라기", colorTags: ["옐로"], seasonTags: ["summer"] })
    const en = flowerOhaengProfile({ name: "해바라기", colorTags: ["yellow"], seasonTags: ["summer"] })
    expect(en).toEqual(ko)
  })

  it("영어 단색 8종이 모두 색상축에 잡힌다", () => {
    // 형태·계절 큐레이션이 없는 이름을 써서 색상축만 남긴다
    const cases: [string, string][] = [
      ["red", "화"], ["yellow", "토"], ["green", "목"], ["blue", "수"],
      ["white", "금"], ["orange", "토"], ["purple", "수"], ["pink", "화"],
    ]
    for (const [tag, ohaeng] of cases) {
      const p = flowerOhaengProfile({ name: "무명 꽃", colorTags: [tag] })
      expect(p[ohaeng as keyof typeof p], `${tag} → ${ohaeng}`).toBeGreaterThan(0)
    }
  })

  it("대응 오행이 없는 색태그(beige/cream/파스텔/믹스)는 색상축 0을 유지한다", () => {
    for (const tag of ["beige", "cream", "파스텔", "믹스"]) {
      const p = flowerOhaengProfile({ name: "무명 꽃", colorTags: [tag] })
      expect(Object.values(p).every((v) => v === 0), tag).toBe(true)
    }
  })
})

describe("꽃 이름 이표기 · 누락 특성", () => {
  it("칼라/카모마일 이표기도 카라/캐모마일과 동일하게 매칭된다", () => {
    expect(flowerOhaengProfile({ name: "흰 칼라" })).toEqual(flowerOhaengProfile({ name: "흰 카라" }))
    expect(flowerOhaengProfile({ name: "카모마일" })).toEqual(flowerOhaengProfile({ name: "캐모마일" }))
  })

  it("이표기 꽃도 형태·계절축에서 점수를 받는다 (색상축만으로 결정되지 않는다)", () => {
    const p = flowerOhaengProfile({ name: "카모마일" }) // 색 정보 없음
    expect(Object.values(p).some((v) => v > 0)).toBe(true)
  })

  it("튤립은 외대 직립 구근꽃이라 목(수직성장) 점수를 갖는다", () => {
    // flowers.ts·customFlowers.ts가 튤립을 목으로 분류하는 것과 방향이 일치해야 한다
    const p = flowerOhaengProfile({ name: "튤립" })
    expect(p.목).toBeGreaterThan(0)
  })
})

describe("explainOhaeng (추천 이유 문구)", () => {
  it("기여한 축을 큰 순서로 최대 2개까지 보여준다", () => {
    const s = explainOhaeng({ name: "해바라기", colorTags: ["옐로"], seasonTags: ["summer"] }, "토")
    expect(s).toBe("노란 색감 · 둥근형태") // 색(45%) > 형태 > 상시성
  })

  it("오행마다 근거가 달라진다 — 같은 꽃도 화(火) 관점에서는 다른 이유", () => {
    const input = { name: "해바라기", colorTags: ["옐로"], seasonTags: ["summer"] }
    expect(explainOhaeng(input, "화")).not.toBe(explainOhaeng(input, "토"))
  })

  it("계절 근거는 오행에 맞는 표현을 쓴다 (토는 계절이 아니라 상시성)", () => {
    expect(explainOhaeng({ name: "거베라" }, "토")).toContain("연중 상시성")
    expect(explainOhaeng({ name: "튤립" }, "목")).toContain("봄 개화")
  })

  it("기여가 전혀 없는 오행은 빈 문자열", () => {
    expect(explainOhaeng({ name: "무명 꽃" }, "금")).toBe("")
  })

  it("설명이 붙으면 그 오행 점수는 반드시 0이 아니다 (근거 없는 설명 금지)", () => {
    for (const input of [
      { name: "백합", colorTags: ["화이트"] },
      { name: "해바라기 미니 화분", colorTags: ["yellow"] },
      { name: "파스텔 혼합 꽃다발", colorTags: ["믹스"] },
    ]) {
      const p = flowerOhaengProfile(input)
      for (const o of ["목", "화", "토", "금", "수"] as const) {
        if (explainOhaeng(input, o) !== "") expect(p[o], `${input.name}/${o}`).toBeGreaterThan(0)
      }
    }
  })

  it("비수기 수준의 미미한 기여는 '개화'라고 설명하지 않는다", () => {
    // 해바라기는 여름 개화 — 봄은 비수기(10)라 목에 2점만 준다
    const input = { name: "해바라기" }
    expect(flowerOhaengProfile(input).목).toBeGreaterThan(0) // 점수는 남아 있지만
    expect(explainOhaeng(input, "목")).toBe("") // "봄 개화"라고 하지 않는다
    expect(explainOhaeng(input, "화")).toContain("여름 개화") // 진짜 주개화기는 설명한다
  })
})

describe("isPeakSeason (제철 판정)", () => {
  it("주개화기만 제철이다 — 보조 개화기는 아니다", () => {
    expect(isPeakSeason("포인세티아", "winter")).toBe(true)   // main: winter
    expect(isPeakSeason("동백", "winter")).toBe(true)         // main: winter
    expect(isPeakSeason("동백", "spring")).toBe(false)        // sub: spring — 제철이라 부르지 않는다
    expect(isPeakSeason("튤립", "spring")).toBe(true)
    expect(isPeakSeason("튤립", "autumn")).toBe(false)
  })

  it("사계절 개화 꽃은 네 계절 모두 제철이다", () => {
    for (const s of ["spring", "summer", "autumn", "winter"] as const) {
      expect(isPeakSeason("거베라", s), s).toBe(true)
    }
  })

  it("잎식물은 어느 계절도 제철이 아니다 — 4계절 보조(70)라 개화가 아니다", () => {
    for (const s of ["spring", "summer", "autumn", "winter"] as const) {
      expect(isPeakSeason("유칼립투스", s), s).toBe(false)
    }
  })

  it("큐레이션에 없는 이름은 false — 없는 정보로 제철이라 하지 않는다", () => {
    expect(isPeakSeason("정체불명꽃", "spring")).toBe(false)
  })

  it("계절 축과 같은 lookup을 쓴다 — 제철이면 그 오행 계절 점수도 만점이다", () => {
    // 어긋나면 "제철 리스트엔 있는데 계절 점수는 0"인 꽃이 생긴다
    const SEASON_TO_OHAENG = { spring: "목", summer: "화", autumn: "금", winter: "수" } as const
    for (const name of ["튤립", "해바라기", "국화", "포인세티아", "거베라"]) {
      for (const s of ["spring", "summer", "autumn", "winter"] as const) {
        if (!isPeakSeason(name, s)) continue
        const contribution = Math.round(100 * PROFILE_WEIGHT.season)
        expect(flowerOhaengProfile({ name })[SEASON_TO_OHAENG[s]], `${name}/${s}`).toBeGreaterThanOrEqual(contribution)
      }
    }
  })
})

// 상품 ↔ 오행 매칭 공용 기준 — 상품 등록 시 자동 태깅과 사주 추천 정렬이 동일한 기준을 쓴다.
//
// 3축 가중 평균 점수제:
//   색상(1) : 계절(3) : 꽃말(2)  — 계절이 오행 이론의 원형(봄=목·여름=화·환절기=토·가을=금·겨울=수)이라 가장 강하게,
//   색상은 관례적 상징이라 가장 약하게 반영한다.
// 각 축은 오행 5개에 합이 1이 되도록 점수를 분배한다. 그 축에서 아무 것도 안 걸리면
// 5개 오행에 0.2씩 균등 배분(평균치)해서, 정보가 없다고 특정 오행이 불리해지지 않게 한다.
import type { Ohaeng } from "./saju"

const OHAENG_ORDER: Ohaeng[] = ["목", "화", "토", "금", "수"]
const AXIS_WEIGHT = { color: 1, season: 3, meaning: 2 }
const TOTAL_WEIGHT = AXIS_WEIGHT.color + AXIS_WEIGHT.season + AXIS_WEIGHT.meaning

// 색상 — 실제 판매자가 고르는 색상 태그(화이트/핑크/레드/옐로/퍼플/블루/그린/파스텔/믹스) 기준.
// 파스텔·믹스는 특정 오행으로 단정할 수 없어 의도적으로 제외 → 평균치로 처리된다.
// 보라/퍼플은 목·화 계열이 아니라 수(水)로 통일한다 — lib/flowers.ts 꽃 사전에서
// 라벤더·아이리스·팬지·무스카리·리시안셔스·스타티스 등 보라 계열 다수가 이미 수(水)로 분류돼 있다.
const COLOR_RULES: Record<Ohaeng, string[]> = {
  목: ["그린"],
  화: ["레드", "핑크"],
  토: ["옐로"],
  금: ["화이트"],
  수: ["블루", "퍼플"],
}

// 계절 — 실제 판매자가 고르는 계절 태그(spring/summer/autumn/winter/all) 기준.
// 토(土)는 원래 환절기를 상징하는데 그런 태그가 없어, 사계절(all)을 대리 신호로 쓴다.
const SEASON_RULES: Record<Ohaeng, string[]> = {
  목: ["spring", "봄"],
  화: ["summer", "여름"],
  토: ["all", "사계절"],
  금: ["autumn", "fall", "가을"],
  수: ["winter", "겨울"],
}

// 꽃말(성질) — 색과 무관한 상징적 의미. lib/saju.ts의 OHAENG_PROFILE.keywords를 씨앗으로
// 같은 주제의 동의어를 넓힌 것이라, 색상축과 겹치지 않는 독립된 신호다.
const MEANING_RULES: Record<Ohaeng, string[]> = {
  목: ["새로운 시작", "성장", "생명력", "도전", "희망", "다시 시작"],
  화: ["열정", "사랑", "고백", "뜨거운", "활력", "정열", "화려"],
  토: ["안정", "풍요", "포용", "편안", "든든", "신뢰", "감사"],
  금: ["순수", "결실", "완성", "순결", "존경", "맑음", "깨끗"],
  수: ["지혜", "깊이", "신비", "유연", "기다림", "침묵", "진심"],
}

function axisScores(text: string, rules: Record<Ohaeng, string[]>): Record<Ohaeng, number> {
  const lower = text.toLowerCase()
  const matched = OHAENG_ORDER.filter((o) => rules[o].some((word) => lower.includes(word.toLowerCase())))
  if (matched.length === 0) {
    return Object.fromEntries(OHAENG_ORDER.map((o) => [o, 1 / OHAENG_ORDER.length])) as Record<Ohaeng, number>
  }
  const per = 1 / matched.length
  return Object.fromEntries(OHAENG_ORDER.map((o) => [o, matched.includes(o) ? per : 0])) as Record<Ohaeng, number>
}

export interface OhaengMatchInput {
  colorTags?: string[]
  seasonTags?: string[]
  flowerMeaning?: string | null
  description?: string | null
}

/** 오행별 0~1 사이 최종 점수 (5개 합계는 항상 1) */
export function scoreOhaengMatch(input: OhaengMatchInput): Record<Ohaeng, number> {
  const colorScore = axisScores((input.colorTags ?? []).join(" "), COLOR_RULES)
  const seasonScore = axisScores((input.seasonTags ?? []).join(" "), SEASON_RULES)
  const meaningScore = axisScores([input.flowerMeaning, input.description].filter(Boolean).join(" "), MEANING_RULES)

  const result = {} as Record<Ohaeng, number>
  for (const o of OHAENG_ORDER) {
    result[o] = (
      colorScore[o] * AXIS_WEIGHT.color +
      seasonScore[o] * AXIS_WEIGHT.season +
      meaningScore[o] * AXIS_WEIGHT.meaning
    ) / TOTAL_WEIGHT
  }
  return result
}

/** 등록 시 자동 태깅용 — 1위, 근소 차이(0.05 이내)면 공동 1위 2개까지 반환 */
export function classifyOhaeng(input: OhaengMatchInput): Ohaeng[] {
  const scores = scoreOhaengMatch(input)
  const sorted = OHAENG_ORDER.slice().sort((a, b) => scores[b] - scores[a])
  const [first, second] = sorted
  return second && scores[second] >= scores[first] - 0.05 ? [first, second] : [first]
}

const OHAENG_IDX: Record<Ohaeng, number> = { 목: 0, 화: 1, 토: 2, 금: 3, 수: 4 }
/** a가 b를 낳는(상생) 관계인가 — 목생화, 화생토, 토생금, 금생수, 수생목 */
export function generates(a: Ohaeng, b: Ohaeng): boolean {
  return (OHAENG_IDX[a] + 1) % 5 === OHAENG_IDX[b]
}
/** target을 낳아주는 오행 (부족한 기운을 보완하는 상생 오행) */
export function whoGenerates(target: Ohaeng): Ohaeng {
  return OHAENG_ORDER.find((o) => generates(o, target))!
}

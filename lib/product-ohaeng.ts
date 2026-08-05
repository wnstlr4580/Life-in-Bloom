import { flowerOhaengProfile, OHAENG_RELEVANCE_MIN, type OhaengProfileInput } from "./ohaengProfile"
import type { Ohaeng } from "./saju"

const OHAENG_ORDER: Ohaeng[] = ["목", "화", "토", "금", "수"]

// 공동 1위로 볼 점수 차 — 프로필 0~100 스케일에서 형태 특성 하나(약 12점) 수준이라
// "실질 동급"의 자연스러운 단위다. 큐레이션 꽃 × 색 조합 실측에서 1·2위 격차 중앙값은 18,
// 하위 25%가 9였다 — 10이면 격차가 하위 25%인 경우만 태그가 2개가 된다.
const TAG_TIE_MARGIN = 10

/** 판매자는 결과를 직접 고르지 않는다 — 사주 추천과 똑같은 오행 프로필(색상·형태·계절)로
 *  인생내꽃이 자동 분류한다. 프로필 최고점이 관련성 임계 미만이면 태그를 붙이지 않는다:
 *  근거가 없는데 "그 오행 꽃"이라 부르면 오행 목록에 무관한 상품이 섞인다. */
export function classifyProductOhaeng(input: OhaengProfileInput): Ohaeng[] {
  const profile = flowerOhaengProfile(input)
  const [first, second] = OHAENG_ORDER.slice().sort((a, b) => profile[b] - profile[a])
  if (profile[first] < OHAENG_RELEVANCE_MIN) return []
  return profile[second] >= OHAENG_RELEVANCE_MIN && profile[second] >= profile[first] - TAG_TIE_MARGIN
    ? [first, second]
    : [first]
}

const NAME_PREFIX: Record<string, string[]> = {
  목: ["푸른 숨결", "새봄의 정원"], 화: ["설레는 온기", "붉은 햇살"], 토: ["포근한 오후", "황금빛 정원"],
  금: ["맑은 약속", "은빛 여백"], 수: ["고요한 물결", "새벽의 이슬"],
}

export function suggestBouquetNames(input: OhaengProfileInput) {
  // 태그가 없는 상품(신호 부족)도 이름 추천은 받아야 한다 — 그때는 목 계열로 폴백한다.
  const [ohaeng] = classifyProductOhaeng(input)
  const flower = input.name?.trim().split(/\s+/)[0] || "꽃"
  const season = input.seasonTags?.[0]
  return [...(NAME_PREFIX[ohaeng ?? ""] ?? NAME_PREFIX.목).map((prefix) => `${prefix} ${flower}`), season ? `${season}을 담은 ${flower}` : `오늘의 ${flower} 정원`]
}

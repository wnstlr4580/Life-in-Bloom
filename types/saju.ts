// /api/saju/analyze 응답 스키마 — 라우트와 화면이 공유한다.
// 이 파일이 없던 시절 page.tsx와 컴포넌트가 각자 타입을 중복 선언해, 응답을 바꿔도 tsc가
// 아무 경고를 못 했다. 라우트에서 `satisfies AnalyzeResult`로 드리프트를 잡는다.
import type { Ohaeng, OhaengProfile, PillarInfo } from "@/lib/saju"
import type { RecommendReason } from "@/lib/recommendation"

export type { RecommendReason }

export interface SajuProduct {
  id: string
  name: string
  price: number
  images: string[]
  flowerMeaning: string | null
  category: string
  /** 추천 총점 0~100 = 오행 궁합 85% + 재고 10% + 개인화 5% */
  score: number
  reasons: RecommendReason[]
  /** 주 추천 한정 — 이 꽃을 더했을 때의 오행 균형 변화 */
  balanceBefore?: number
  balanceAfter?: number
}

export interface LackingEntry {
  ohaeng: Ohaeng
  products: SajuProduct[]
}

export interface AnalyzeResult {
  ohaeng: Ohaeng
  profile: OhaengProfile
  pillars: PillarInfo[]
  hasHour: boolean
  name?: string
  /** 현재 오행 균형도 0~100 */
  balance: number
  lackingProducts: LackingEntry[]
  fortune: unknown
  recommendedFlowers: SajuProduct[]
  wealthFlowers: SajuProduct[]
  loveFlowers: SajuProduct[]
  seasonalFlowers: SajuProduct[]
}

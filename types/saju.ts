// /api/saju/analyze 응답 스키마 — 라우트와 화면이 공유한다.
// 이 파일이 없던 시절 page.tsx와 컴포넌트가 각자 타입을 중복 선언해, 응답을 바꿔도 tsc가
// 아무 경고를 못 했다. 라우트에서 `satisfies AnalyzeResult`로 드리프트를 잡는다.
import type { Ohaeng, OhaengProfile, PillarInfo } from "@/lib/saju"
import type { RecommendReason } from "@/lib/recommendation"

export type { RecommendReason }

/** 추천 단위 = "ㅇㅇ색 ㅇㅇ꽃". 보유 상품이 아니라 보편적인 꽃이다.
 *  그래서 price·images·category가 없고, 대신 사러가기 목적지를 만들 재료가 있다. */
export interface SajuFlower {
  /** 꽃 카탈로그 id(색 단위). 주문 가능 항목은 customFlowers id와 같다 —
   *  재고 배지가 SellerStock.flowerCode로 조인하고 /custom?flowers=가 이 id로 검증한다. */
  id: string
  /** "빨간 장미" — 색은 이름에만 담는다(색 칩을 따로 두지 않는다) */
  name: string
  /** 종(種) — "장미". 같은 종 다른 색을 묶는 키이자 CTA 라벨에 쓴다 */
  species: string
  emoji: string
  /** 확충 항목은 사진이 없다 → 화면이 emoji로 폴백한다 */
  img: string | null
  /** /products?q= 에 넣을 검색어 = 색 없는 종명(이표기 정규화됨) */
  searchQuery: string
  /** 이름에 그 종이 든 추천 가능 상품 수. 0이면 카드 CTA가 나만의 꽃다발로 분기한다 */
  productCount: number
  flowerMeaning: string | null
  /** 추천 총점 0~100 = 오행 궁합 95% + 개인화 5% */
  score: number
  reasons: RecommendReason[]
  /** 주 추천 한정 — 이 꽃을 더했을 때의 오행 균형 변화 */
  balanceBefore?: number
  balanceAfter?: number
  /** 주 추천 한정 — 이 꽃을 더했을 때의 오행 분포(%). 차트 before/after 비교용 */
  pctAfter?: Record<Ohaeng, number>
  /** 주 추천 한정 — 꽃말 기반 추천 스토리 2~3문장 */
  story?: string[]
}

export interface AnalyzeResult {
  ohaeng: Ohaeng
  profile: OhaengProfile
  pillars: PillarInfo[]
  hasHour: boolean
  // 입력 되돌려주기 — 화면은 캐시된 입력을 쓰지만 응답이 자기 완결적이도록 함께 실어 보낸다.
  // satisfies를 좁히면서 드러난 필드들이다(예전엔 Record<string, unknown> 교집합에 숨어 있었다).
  name?: string
  gender?: string
  birthDate?: string
  birthHour?: string
  city?: string
  calendarType?: string
  /** 현재 오행 균형도 0~100 */
  balance: number
  /** 현재 오행 분포(%) — 오행마다 반올림돼 합이 100이 아닐 수 있다(표시 전용) */
  ohaengPct: Record<Ohaeng, number>
  /** 가장 부족한 오행(항상 0~1개). 상품이 아니라 값 자체가 필요하다 —
   *  User.lackingOhaengType 저장(custom·diy "보충" 뱃지)과 FlowerGuide가 읽는다. */
  lackingOhaeng: Ohaeng[]
  /** 생년월일에서 나온 탄생화 (사전에 꽃말이 없으면 meaning은 null) */
  birthFlower: { name: string; color: string | null; meaning: string | null } | null
  /** 생월 기반 오방색 탄생색 */
  birthColor: { name: string; ohaeng: Ohaeng }
  fortune: unknown
  recommendedFlowers: SajuFlower[]
  wealthFlowers: SajuFlower[]
  loveFlowers: SajuFlower[]
  seasonalFlowers: SajuFlower[]
}

// 사주 추천의 후보군 — 단위는 보유 상품이 아니라 "ㅇㅇ색 ㅇㅇ꽃"이다.
//
// 주문 가능 목록(customFlowers.FLOWERS 88항목)을 그대로 감싼 것이다 — 사주 추천은 이 중
// 일부(품절·비인기 등)만 노출하는 게 아니라 주문 가능한 전 종을 후보로 본다.
// 예전에는 사진·가격이 없는 "확충 전용(주문 불가)" 항목을 여기서만 별도로 붙였으나,
// AI 초안 사진·가격을 갖추면서 FLOWERS로 편입했다(2026-09) — 그래야 사주 카드의
// "이 꽃 사러가기" → `/custom?flowers=` 딥링크가 실제로 그 꽃을 선택해준다.
import { FLOWERS } from "./customFlowers"
import { flowerOhaengProfile, type OhaengProfileInput } from "./ohaengProfile"

export interface CatalogFlower {
  /** customFlowers id와 같다(= SellerStock.flowerCode) */
  id: string
  /** 종(種). FLOWER_FORM·FLOWER_SEASON 키와 문자 그대로 같아야 한다 — 형태 35% + 계절 20%가 여기 달렸다 */
  species: string
  /** "흰 백합". colorAxis가 이름의 색을 colorTags보다 우선하므로 이 조립 규칙이 곧 색상축 45%다 */
  name: string
  /** customFlowers와 같은 영어 8색 표기 */
  color: string
  emoji: string
  img: string
  /** DIY·커스텀으로 담을 수 있는 id(= SellerStock.flowerCode). customFlowers id와 항상 같다 */
  customFlowerId: string
  /** 추천 후보에서 제외한다. 흰 국화는 오행 점수만 보면 상위권인데 장례식 꽃이라
   *  사주 결과 첫 카드로 내보내지 않는다. /diy에서는 여전히 직접 고를 수 있다. */
  mourning?: true
}

/** 추천 대상 후보 전체 — 주문 가능 88항목 그대로 */
export const FLOWER_CATALOG: CatalogFlower[] = FLOWERS.map((f) => ({
  id: f.id,
  species: f.group,
  name: f.name,
  color: f.color,
  emoji: f.emoji,
  img: f.img,
  customFlowerId: f.id,
  ...(f.id === "mum-white" ? { mourning: true as const } : {}),
}))

/** 사주 추천이 실제로 랭킹하는 후보 — 추모 연상 항목 제외 */
export const RECOMMENDABLE_CATALOG: CatalogFlower[] = FLOWER_CATALOG.filter((f) => !f.mourning)

/** 오행 프로필 입력 — 추천·근거·스토리가 모두 이 하나를 쓴다. 그래야 "근거는 있는데 점수가 0"이
 *  생기지 않는다. engDesc는 영어라 형태축에 안 걸리므로 description으로 주지 않는다. */
export function catalogProfileInput(f: CatalogFlower): OhaengProfileInput {
  return { name: f.name, category: f.species, colorTags: [f.color] }
}

export function catalogProfile(f: CatalogFlower) {
  return flowerOhaengProfile(catalogProfileInput(f))
}

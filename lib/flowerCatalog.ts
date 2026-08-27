// 사주 추천의 후보군 — 단위는 보유 상품이 아니라 "ㅇㅇ색 ㅇㅇ꽃"이다.
//
// 주문 가능 목록(customFlowers.FLOWERS 47항목)을 그대로 포함하고, 추천 폭을 넓히는 확충 항목을 덧붙인다.
// FLOWERS에 직접 넣지 않는 이유: 그러면 이미지·가격이 없는 꽃이 /diy·/custom의 담기 버튼과 함께
// 노출되고 SellerStock.flowerCode 공간이 오염된다. 확충 항목은 customFlowerId가 null인 것이 그 표시다.
//
// 확충 선정 기준(4개 모두 통과):
//   1. 종이 이미 FLOWER_FORM ∩ FLOWER_SEASON에 있다 — 사전을 건드리지 않으므로 FORM_OHAENG_MAX·
//      SEASON_MAIN_COUNT·SEASON_OHAENG_REACH 스냅샷과 불변식이 한 줄도 움직이지 않는다
//   2. 꽃말이 붙는다 — 전 항목 100% 커버리지를 유지한다(불변식 테스트가 강제)
//   3. 측정된 빈 구멍을 메운다 — 확충 전 가을 주개화 4종·겨울 2종뿐이었다
//   4. 꽃말 내용이 추천 카드에 실려도 된다 — 메리골드("가엾은 애정")를 이 기준으로 제외했다
import { FLOWERS } from "./customFlowers"
import { flowerOhaengProfile, type OhaengProfileInput } from "./ohaengProfile"

export interface CatalogFlower {
  /** 색 단위 고유키. 기존 47항목은 customFlowers id를 그대로 쓴다 */
  id: string
  /** 종(種). FLOWER_FORM·FLOWER_SEASON 키와 문자 그대로 같아야 한다 — 형태 35% + 계절 20%가 여기 달렸다 */
  species: string
  /** "흰 백합". colorAxis가 이름의 색을 colorTags보다 우선하므로 이 조립 규칙이 곧 색상축 45%다 */
  name: string
  /** customFlowers와 같은 영어 8색 표기 */
  color: string
  emoji: string
  /** 확충 항목은 사진이 없다 → UI가 emoji로 폴백한다 */
  img: string | null
  /** DIY·커스텀으로 담을 수 있는 항목만 id(= SellerStock.flowerCode). 확충 전용은 null */
  customFlowerId: string | null
  /** 추천 후보에서 제외한다. 흰 국화는 오행 점수만 보면 상위권인데 장례식 꽃이라
   *  사주 결과 첫 카드로 내보내지 않는다. /diy에서는 여전히 직접 고를 수 있다. */
  mourning?: true
}

/** 색 → 이름 수식어. 기존 47항목이 쓰는 표기와 같아야 colorAxis가 같은 값을 낸다 */
const COLOR_WORD: Record<string, string> = {
  red: "빨간", pink: "핑크", white: "흰", yellow: "노란",
  purple: "보라", blue: "파란", orange: "주황", green: "초록",
}
const COLOR_EMOJI: Record<string, string> = {
  red: "🌹", pink: "🌸", white: "🤍", yellow: "💛",
  purple: "💜", blue: "💙", orange: "🧡", green: "🌿",
}

/** [종, id 어간, 유통되는 색들] — 색 변형은 kioskFlowers의 color를 쓰지 않는다.
 *  그 필드는 317행 중 270행이 white 기본값이라 "유통 색"이 아니라 "탄생화 이미지 1장의 색"에 가깝다.
 *  국내 절화에서 흔한 색을 골랐고, 검증은 "색이 인식되고 색상축이 0이 아닌가"를 테스트가 강제한다. */
const EXTRA_SPECIES: [species: string, stem: string, colors: string[]][] = [
  // 가을 보강
  ["달리아", "dahlia", ["red", "pink", "white", "yellow"]],
  ["백일홍", "zinnia", ["red", "pink", "yellow"]],
  ["과꽃", "aster", ["purple", "pink", "white"]],
  ["용담", "gentian", ["blue", "purple"]],
  ["목화", "cotton", ["white"]],
  ["에린지움", "eryngium", ["blue"]],
  // 겨울 보강
  ["동백", "camellia", ["red", "pink", "white"]],
  ["시클라멘", "cyclamen", ["red", "pink", "white"]],
  ["크리스마스로즈", "hellebore", ["white", "purple"]],
  ["매화", "plum", ["white", "pink"]],
  ["수선화", "narcissus", ["yellow", "white"]],
  // 색 다양성 보강
  ["아이리스", "iris", ["purple", "blue", "white"]],
  ["히아신스", "hyacinth", ["purple", "pink", "white"]],
  ["라일락", "lilac", ["purple", "white"]],
  ["미모사", "mimosa", ["yellow"]],
  ["글라디올러스", "gladiolus", ["red", "pink", "white"]],
  ["금어초", "snapdragon", ["yellow", "pink", "white"]],
]

const EXTRA: CatalogFlower[] = EXTRA_SPECIES.flatMap(([species, stem, colors]) =>
  colors.map((color) => ({
    id: `${stem}-${color}`,
    species,
    name: `${COLOR_WORD[color]} ${species}`,
    color,
    emoji: COLOR_EMOJI[color],
    img: null,
    customFlowerId: null,
  })),
)

/** 추천 대상 후보 전체 — 주문 가능 47 + 확충 41 */
export const FLOWER_CATALOG: CatalogFlower[] = [
  ...FLOWERS.map((f) => ({
    id: f.id,
    species: f.group,
    name: f.name,
    color: f.color,
    emoji: f.emoji,
    img: f.img as string | null,
    customFlowerId: f.id,
    ...(f.id === "mum-white" ? { mourning: true as const } : {}),
  })),
  ...EXTRA,
]

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

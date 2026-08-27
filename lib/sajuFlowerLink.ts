// 사주 추천 카드의 "이 꽃 사러가기" 목적지 계산.
//
// 서버(상품 수 집계)와 클라이언트(링크 생성)가 같은 별칭 표를 봐야 하므로 lib에 둔다.
// 컴포넌트 테스트가 없는 저장소라, 틀리면 사용자가 엉뚱한 화면으로 가는 판단을 전부 여기 순수 함수로
// 모아 노드 환경에서 검증한다.

/** 카탈로그 종명과 상품명 표기가 다른 종. 상품 쪽 표기를 마지막에 둔다(검색어로 그걸 쓴다).
 *  실측: 상품명에 "칼라"는 0건, "카라"는 1건("웨딩 부케 — 화이트 카라").
 *  ohaengProfile의 FLOWER_FORM에도 같은 이표기쌍이 등록돼 있다. */
const SPECIES_ALIAS: Record<string, string[]> = {
  칼라: ["칼라", "카라"],
  카모마일: ["카모마일", "캐모마일"],
}

/** 상품 검색어 — 색을 넣지 않는다.
 *  /api/products의 q는 상품명 부분일치라, "흰 백합"으로 검색하면 "순백의 백합 부케"를 놓친다
 *  (실측: "백합" 6건 vs "흰 백합" 5건). 색은 &color=로도 넣지 않는다 — 활성 상품 178건 중 101건이
 *  케이플라워라 colorTags가 비어 있어 색을 걸면 그 101건이 전멸한다. */
export function speciesSearchQuery(species: string): string {
  const alias = SPECIES_ALIAS[species]
  return alias ? alias[alias.length - 1] : species
}

/** 상품명 목록에서 그 종을 이름에 담은 상품 수.
 *  설명·구성은 보지 않는다 — 국화는 이름 일치 0건인데 설명 일치 92건이고 전부 화환이다(실측).
 *  설명까지 보면 사용자를 근조화환 벽으로 보낸다. */
export function countSpeciesProducts(productNames: string[], species: string): number {
  const keys = SPECIES_ALIAS[species] ?? [species]
  return productNames.filter((name) => keys.some((key) => (name ?? "").includes(key))).length
}

/** 카드 CTA 목적지. 상품이 있으면 상품 검색, 없으면 나만의 꽃다발.
 *  상품 검색에도 꽃 id를 실어 보낸다 — 빈 결과 화면이 정확한 폴백 CTA를 만들 수 있다. */
export function flowerBuyHref(flower: { id: string; searchQuery: string; productCount: number }): string {
  if (flower.productCount > 0) {
    return `/products?q=${encodeURIComponent(flower.searchQuery)}&flower=${encodeURIComponent(flower.id)}`
  }
  return `/custom?flowers=${encodeURIComponent(flower.id)}`
}

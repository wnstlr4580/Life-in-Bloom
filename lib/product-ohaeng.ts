type ProductTagInput = {
  name?: string
  description?: string
  category?: string
  flowerMeaning?: string | null
  colorTags?: string[]
  seasonTags?: string[]
  useTags?: string[]
}

const COLOR_RULES: Record<string, string[]> = {
  목: ["초록", "그린", "청록", "green"],
  화: ["빨강", "레드", "분홍", "핑크", "자주", "보라", "red", "pink", "purple"],
  토: ["노랑", "옐로", "주황", "오렌지", "갈색", "yellow", "orange", "brown"],
  금: ["하양", "흰색", "화이트", "아이보리", "white", "ivory", "gold"],
  수: ["파랑", "블루", "검정", "남색", "blue", "black", "navy"],
}

const FLOWER_RULES: Record<string, string[]> = {
  목: ["잎", "식물", "화분", "유칼립투스", "몬스테라", "나무", "새싹"],
  화: ["장미", "튤립", "카네이션", "작약", "거베라"],
  토: ["해바라기", "국화", "프리지아", "데이지"],
  금: ["백합", "안개꽃", "카라", "목화"],
  수: ["수국", "라벤더", "아이리스", "델피늄"],
}

const SEASON_RULES: Record<string, string[]> = {
  목: ["봄", "spring"],
  화: ["여름", "summer"],
  토: ["환절기", "늦여름"],
  금: ["가을", "autumn", "fall"],
  수: ["겨울", "winter"],
}

/** 색상만 보지 않고 꽃 품종과 계절을 함께 점수화한다. 판매자는 결과를 직접 고르지 않는다. */
export function classifyProductOhaeng(input: ProductTagInput) {
  const general = [input.name, input.description, input.category, input.flowerMeaning, ...(input.useTags ?? [])]
    .filter(Boolean).join(" ").toLowerCase()
  const colors = (input.colorTags ?? []).join(" ").toLowerCase()
  const seasons = (input.seasonTags ?? []).join(" ").toLowerCase()
  const tags = Object.keys(COLOR_RULES)
  const scored = tags.map((tag) => ({
    tag,
    score:
      COLOR_RULES[tag].reduce((n, word) => n + (colors.includes(word) ? 3 : 0), 0) +
      FLOWER_RULES[tag].reduce((n, word) => n + (general.includes(word) ? 2 : 0), 0) +
      SEASON_RULES[tag].reduce((n, word) => n + (seasons.includes(word) ? 2 : 0), 0),
  })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score)
  return scored.length ? scored.slice(0, scored[1]?.score === scored[0].score ? 2 : 1).map(({ tag }) => tag) : ["목"]
}

const NAME_PREFIX: Record<string, string[]> = {
  목: ["푸른 숨결", "새봄의 정원"], 화: ["설레는 온기", "붉은 햇살"], 토: ["포근한 오후", "황금빛 정원"],
  금: ["맑은 약속", "은빛 여백"], 수: ["고요한 물결", "새벽의 이슬"],
}

export function suggestBouquetNames(input: ProductTagInput) {
  const [ohaeng] = classifyProductOhaeng(input)
  const flower = input.name?.trim().split(/\s+/)[0] || "꽃"
  const season = input.seasonTags?.[0]
  return [...(NAME_PREFIX[ohaeng] ?? NAME_PREFIX.목).map((prefix) => `${prefix} ${flower}`), season ? `${season}을 담은 ${flower}` : `오늘의 ${flower} 정원`]
}

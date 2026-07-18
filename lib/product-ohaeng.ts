const RULES: Record<string, string[]> = {
  목: ["초록", "그린", "잎", "식물", "화분", "유칼립투스", "몬스테라", "green"],
  화: ["빨강", "레드", "분홍", "핑크", "자주", "보라", "장미", "튤립", "red", "pink", "purple"],
  토: ["노랑", "옐로", "주황", "오렌지", "갈색", "해바라기", "yellow", "orange", "brown"],
  금: ["하양", "화이트", "아이보리", "백합", "안개꽃", "white", "ivory", "gold"],
  수: ["파랑", "블루", "검정", "라벤더", "수국", "blue", "black", "navy"],
}

export function classifyProductOhaeng(input: {
  name?: string; description?: string; category?: string; flowerMeaning?: string | null; colorTags?: string[]
}) {
  const text = [input.name, input.description, input.category, input.flowerMeaning, ...(input.colorTags ?? [])]
    .filter(Boolean).join(" ").toLowerCase()
  const scored = Object.entries(RULES)
    .map(([tag, words]) => ({ tag, score: words.reduce((n, word) => n + (text.includes(word) ? 1 : 0), 0) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.length ? scored.slice(0, 2).map(({ tag }) => tag) : ["목"]
}

import { classifyOhaeng, type OhaengMatchInput } from "./ohaengMatching"

type ProductTagInput = OhaengMatchInput & {
  name?: string
  category?: string
  useTags?: string[]
}

/** 판매자는 결과를 직접 고르지 않는다 — 색상·계절·꽃말 3축을 종합해 인생내꽃이 자동 분류한다. */
export function classifyProductOhaeng(input: ProductTagInput) {
  return classifyOhaeng(input)
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

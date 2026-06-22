// 연도 끝자리 → 천간 → 오행 매핑
const YEAR_OHAENG: Record<number, string> = {
  4: "목", 5: "목",
  6: "화", 7: "화",
  8: "토", 9: "토",
  0: "금", 1: "금",
  2: "수", 3: "수",
}

export type Ohaeng = "목" | "화" | "토" | "금" | "수"

export interface OhaengProfile {
  colors: string[]
  keywords: string[]
  season: string
  description: string
  flowerKeywords: string[]
}

export const OHAENG_PROFILE: Record<Ohaeng, OhaengProfile> = {
  목: {
    colors: ["green", "blue"],
    keywords: ["성장", "생명력", "새로운 시작"],
    season: "spring",
    description: "목(木)의 기운은 봄처럼 새로운 시작과 생명력을 상징합니다. 푸르고 싱그러운 꽃이 잘 어울립니다.",
    flowerKeywords: ["튤립", "수선화", "히아신스"],
  },
  화: {
    colors: ["red", "orange", "pink"],
    keywords: ["열정", "활력", "표현력"],
    season: "summer",
    description: "화(火)의 기운은 여름처럼 뜨거운 열정과 활력을 상징합니다. 선명하고 화려한 꽃이 잘 어울립니다.",
    flowerKeywords: ["장미", "해바라기", "거베라"],
  },
  토: {
    colors: ["yellow", "beige", "brown"],
    keywords: ["안정", "풍요", "포용"],
    season: "all",
    description: "토(土)의 기운은 대지처럼 안정과 풍요를 상징합니다. 따뜻하고 포근한 느낌의 꽃이 잘 어울립니다.",
    flowerKeywords: ["국화", "해바라기", "프리지아"],
  },
  금: {
    colors: ["white", "silver", "cream"],
    keywords: ["순수", "결실", "완성"],
    season: "autumn",
    description: "금(金)의 기운은 가을처럼 결실과 순수함을 상징합니다. 깔끔하고 우아한 꽃이 잘 어울립니다.",
    flowerKeywords: ["백합", "카네이션", "안개꽃"],
  },
  수: {
    colors: ["black", "purple", "deep-blue"],
    keywords: ["지혜", "깊이", "유연함"],
    season: "winter",
    description: "수(水)의 기운은 겨울처럼 깊은 지혜와 유연함을 상징합니다. 신비롭고 우아한 꽃이 잘 어울립니다.",
    flowerKeywords: ["수국", "라벤더", "아이리스"],
  },
}

export function analyzeOhaeng(birthDate: Date): Ohaeng {
  const year = birthDate.getFullYear()
  return YEAR_OHAENG[year % 10] as Ohaeng
}

export function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return "spring"
  if (month >= 6 && month <= 8) return "summer"
  if (month >= 9 && month <= 11) return "autumn"
  return "winter"
}

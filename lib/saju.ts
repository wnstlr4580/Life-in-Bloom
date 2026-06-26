export type Ohaeng = "목" | "화" | "토" | "금" | "수"

// 천간 (10 Heavenly Stems)
const CHEONGAN = [
  { name: "갑", char: "甲", ohaeng: "목" as Ohaeng },
  { name: "을", char: "乙", ohaeng: "목" as Ohaeng },
  { name: "병", char: "丙", ohaeng: "화" as Ohaeng },
  { name: "정", char: "丁", ohaeng: "화" as Ohaeng },
  { name: "무", char: "戊", ohaeng: "토" as Ohaeng },
  { name: "기", char: "己", ohaeng: "토" as Ohaeng },
  { name: "경", char: "庚", ohaeng: "금" as Ohaeng },
  { name: "신", char: "辛", ohaeng: "금" as Ohaeng },
  { name: "임", char: "壬", ohaeng: "수" as Ohaeng },
  { name: "계", char: "癸", ohaeng: "수" as Ohaeng },
]

// 지지 (12 Earthly Branches)
const JIJI = [
  { name: "자", char: "子", ohaeng: "수" as Ohaeng },
  { name: "축", char: "丑", ohaeng: "토" as Ohaeng },
  { name: "인", char: "寅", ohaeng: "목" as Ohaeng },
  { name: "묘", char: "卯", ohaeng: "목" as Ohaeng },
  { name: "진", char: "辰", ohaeng: "토" as Ohaeng },
  { name: "사", char: "巳", ohaeng: "화" as Ohaeng },
  { name: "오", char: "午", ohaeng: "화" as Ohaeng },
  { name: "미", char: "未", ohaeng: "토" as Ohaeng },
  { name: "신", char: "申", ohaeng: "금" as Ohaeng },
  { name: "유", char: "酉", ohaeng: "금" as Ohaeng },
  { name: "술", char: "戌", ohaeng: "토" as Ohaeng },
  { name: "해", char: "亥", ohaeng: "수" as Ohaeng },
]

export interface PillarInfo {
  pillar: "연주" | "월주" | "일주" | "시주"
  metaphor: string
  metaphorEmoji: string
  lifeStage: string
  stemName: string
  stemChar: string
  branchName: string
  branchChar: string
  stemOhaeng: Ohaeng
  branchOhaeng: Ohaeng
  description: string
  flower: string
  flowerDesc: string
}

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
    description: "목(木)의 기운은 봄처럼 새로운 시작과 생명력을 상징합니다.",
    flowerKeywords: ["튤립", "수선화", "히아신스"],
  },
  화: {
    colors: ["red", "orange", "pink"],
    keywords: ["열정", "활력", "표현력"],
    season: "summer",
    description: "화(火)의 기운은 여름처럼 뜨거운 열정과 활력을 상징합니다.",
    flowerKeywords: ["장미", "해바라기", "거베라"],
  },
  토: {
    colors: ["yellow", "beige", "brown"],
    keywords: ["안정", "풍요", "포용"],
    season: "all",
    description: "토(土)의 기운은 대지처럼 안정과 풍요를 상징합니다.",
    flowerKeywords: ["국화", "프리지아", "해바라기"],
  },
  금: {
    colors: ["white", "silver", "cream"],
    keywords: ["순수", "결실", "완성"],
    season: "autumn",
    description: "금(金)의 기운은 가을처럼 결실과 순수함을 상징합니다.",
    flowerKeywords: ["백합", "카네이션", "안개꽃"],
  },
  수: {
    colors: ["black", "purple", "deep-blue"],
    keywords: ["지혜", "깊이", "유연함"],
    season: "winter",
    description: "수(水)의 기운은 겨울처럼 깊은 지혜와 유연함을 상징합니다.",
    flowerKeywords: ["수국", "라벤더", "아이리스"],
  },
}

// 오행별 꽃 설명 (단계별)
const FLOWER_BY_STAGE: Record<"연주" | "월주" | "일주" | "시주", Record<Ohaeng, { flower: string; desc: string }>> = {
  연주: {
    목: { flower: "튤립", desc: "봄의 첫 새싹처럼 당신의 뿌리는 생명력으로 가득합니다" },
    화: { flower: "빨간 장미", desc: "열정의 씨앗이 뿌리 깊이 박혀 있습니다" },
    토: { flower: "국화", desc: "대지처럼 든든한 뿌리가 당신을 지탱합니다" },
    금: { flower: "백합", desc: "순백의 씨앗처럼 맑고 순수한 시작이었습니다" },
    수: { flower: "수국", desc: "깊은 물처럼 신비로운 기운이 뿌리에 흐릅니다" },
  },
  월주: {
    목: { flower: "수선화", desc: "싱그럽게 자라는 줄기처럼 성장이 눈부셨습니다" },
    화: { flower: "해바라기", desc: "태양을 향해 뻗는 줄기처럼 열정이 넘쳤습니다" },
    토: { flower: "프리지아", desc: "단단히 뿌리내리며 향기롭게 성장했습니다" },
    금: { flower: "카네이션", desc: "원칙 있게 자란 줄기처럼 단단한 청년기였습니다" },
    수: { flower: "라벤더", desc: "물처럼 유연하게 흐르며 깊이를 더해갔습니다" },
  },
  일주: {
    목: { flower: "튤립", desc: "당신은 봄처럼 끊임없이 새롭게 피어나는 사람입니다" },
    화: { flower: "장미", desc: "당신은 활짝 핀 꽃처럼 열정으로 주변을 물들입니다" },
    토: { flower: "국화", desc: "당신은 사계절 변함없는 국화처럼 포용력이 깊습니다" },
    금: { flower: "백합", desc: "당신은 순결한 백합처럼 진실되고 완성을 향합니다" },
    수: { flower: "수국", desc: "당신은 신비로운 수국처럼 깊은 내면을 품었습니다" },
  },
  시주: {
    목: { flower: "씨앗 꽃다발", desc: "당신의 열매는 다음 세대의 씨앗이 됩니다" },
    화: { flower: "해바라기", desc: "당신의 따뜻한 빛이 후대를 환히 비춥니다" },
    토: { flower: "풍성한 꽃다발", desc: "풍요로운 열매가 주변을 가득 채웁니다" },
    금: { flower: "카네이션", desc: "빛나는 결실이 아름다운 유산이 됩니다" },
    수: { flower: "라벤더", desc: "깊은 지혜가 후대에게 등불이 됩니다" },
  },
}

// 단계별 설명 (오행 × 기둥)
const STAGE_DESC: Record<"연주" | "월주" | "일주" | "시주", Record<Ohaeng, string>> = {
  연주: {
    목: "어린 시절 봄 새싹처럼 생명력이 넘쳤습니다. 가문의 기운이 성장과 도전의 씨앗을 심어주었습니다.",
    화: "어린 시절 여름 불꽃처럼 뜨거운 열정을 품었습니다. 가문의 기운이 활발하고 표현력 넘치는 기질을 물려주었습니다.",
    토: "어린 시절 대지처럼 든든한 에너지가 있었습니다. 가문의 기운이 안정과 풍요로운 토대를 마련해주었습니다.",
    금: "어린 시절 가을 하늘처럼 맑고 순수한 기운이었습니다. 가문의 기운이 원칙과 결실의 씨앗을 심어주었습니다.",
    수: "어린 시절 겨울 물처럼 깊은 지혜를 품었습니다. 가문의 기운이 통찰과 유연함을 뿌리에 새겼습니다.",
  },
  월주: {
    목: "청년기, 줄기가 하늘로 뻗듯 활발한 성장이 있었습니다. 주변 환경이 새로운 도전과 배움을 끊임없이 자극했습니다.",
    화: "청년기, 열정의 불꽃이 활활 타올랐습니다. 주변 환경이 표현력과 창의력을 마음껏 발휘하도록 이끌었습니다.",
    토: "청년기, 뿌리를 내리며 안정적으로 성장했습니다. 주변 환경이 든든한 울타리가 되어 성숙할 수 있었습니다.",
    금: "청년기, 단단하게 다져지는 시간이었습니다. 주변 환경이 원칙과 성실함을 갈고 닦도록 이끌었습니다.",
    수: "청년기, 물처럼 유연하게 흘러가며 성장했습니다. 주변 환경이 깊이 생각하고 통찰하는 능력을 키워주었습니다.",
  },
  일주: {
    목: "당신 자신은 봄의 나무처럼 끊임없이 성장하는 사람입니다. 생명력과 도전 정신이 당신의 본질이며, 새로운 시작을 두려워하지 않습니다.",
    화: "당신 자신은 여름의 불꽃처럼 열정적인 사람입니다. 화려하고 표현력 넘치는 에너지가 당신의 본질이며, 어디서나 빛을 발합니다.",
    토: "당신 자신은 대지처럼 포용력 있는 사람입니다. 안정과 풍요의 에너지가 당신의 본질이며, 주변을 따뜻하게 품어줍니다.",
    금: "당신 자신은 가을 열매처럼 결실을 이루는 사람입니다. 순수함과 원칙의 에너지가 당신의 본질이며, 완성을 향해 나아갑니다.",
    수: "당신 자신은 겨울 물처럼 깊고 지혜로운 사람입니다. 통찰과 유연함의 에너지가 당신의 본질이며, 삶의 깊이를 추구합니다.",
  },
  시주: {
    목: "노년과 후대, 새로운 씨앗을 남기는 시간입니다. 당신이 심은 성장의 씨앗이 다음 세대에서 푸른 숲이 될 것입니다.",
    화: "노년과 후대, 따뜻한 빛을 나누는 시간입니다. 당신의 열정이 주변을 밝히고, 그 온기가 오래도록 이어질 것입니다.",
    토: "노년과 후대, 풍요로운 열매를 나누는 시간입니다. 당신이 쌓은 안정과 포용이 가족과 후대에 든든한 토대가 됩니다.",
    금: "노년과 후대, 순수한 결실을 맺는 시간입니다. 당신이 추구한 원칙과 성실함이 빛나는 유산으로 남을 것입니다.",
    수: "노년과 후대, 깊은 지혜를 나누는 시간입니다. 당신이 쌓은 통찰이 다음 세대에게 길을 비추는 등불이 됩니다.",
  },
}

// 연주 계산
function yearPillar(year: number): { stem: number; branch: number } {
  const stem = ((year - 4) % 10 + 10) % 10
  const branch = ((year - 4) % 12 + 12) % 12
  return { stem, branch }
}

// 월주 계산 (절기 무시, 양력 월 기준)
function monthPillar(year: number, month: number): { stem: number; branch: number } {
  const yearStem = ((year - 4) % 10 + 10) % 10
  // 인월(2월)부터 시작하는 천간 index
  const month1Stem = ((yearStem % 5) * 2 + 2) % 10
  // 1월=축(1), 2월=인(2), ... 12월=자(0)에서의 인월 offset
  const MONTH_BRANCH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]
  const branch = MONTH_BRANCH[month - 1]
  // 인월(index 0)에서 몇 번째 월인지
  const monthOffset = (branch - 2 + 12) % 12
  const stem = (month1Stem + monthOffset) % 10
  return { stem, branch }
}

// 일주 계산 (기준: 2024-01-01 = 丁卯, stem=3, branch=3)
function dayPillar(date: Date): { stem: number; branch: number } {
  const REF = new Date(2024, 0, 1).getTime()
  const days = Math.floor((date.getTime() - REF) / 86400000)
  const stem = ((3 + days) % 10 + 10) % 10
  const branch = ((3 + days) % 12 + 12) % 12
  return { stem, branch }
}

// 시주 계산
function hourPillar(daySystem: { stem: number; branch: number }, birthHour: string): { stem: number; branch: number } | null {
  if (birthHour === "unknown") return null
  const [hStr] = birthHour.split(":")
  const hour = parseInt(hStr, 10)
  if (isNaN(hour)) return null
  const branch = hour === 23 ? 0 : Math.floor((hour + 1) / 2)
  const hourStartStem = (daySystem.stem % 5) * 2
  const stem = (hourStartStem + branch) % 10
  return { stem, branch }
}

function buildPillar(
  type: "연주" | "월주" | "일주" | "시주",
  system: { stem: number; branch: number },
  metaphor: string,
  metaphorEmoji: string,
  lifeStage: string
): PillarInfo {
  const s = CHEONGAN[system.stem]
  const b = JIJI[system.branch]
  const flowerInfo = FLOWER_BY_STAGE[type][s.ohaeng]
  return {
    pillar: type,
    metaphor,
    metaphorEmoji,
    lifeStage,
    stemName: s.name,
    stemChar: s.char,
    branchName: b.name,
    branchChar: b.char,
    stemOhaeng: s.ohaeng,
    branchOhaeng: b.ohaeng,
    description: STAGE_DESC[type][s.ohaeng],
    flower: flowerInfo.flower,
    flowerDesc: flowerInfo.desc,
  }
}

export interface SajuResult {
  pillars: PillarInfo[]
  mainOhaeng: Ohaeng  // 일간 기준
  profile: OhaengProfile
  hasHour: boolean
}

export function calculateSaju(birthDate: Date, birthHour: string): SajuResult {
  const y = birthDate.getFullYear()
  const m = birthDate.getMonth() + 1

  const yearSys = yearPillar(y)
  const monthSys = monthPillar(y, m)
  const daySys = dayPillar(birthDate)
  const hourSys = hourPillar(daySys, birthHour)

  const pillars: PillarInfo[] = [
    buildPillar("연주", yearSys, "뿌리", "🌱", "어린 시절 · 가문"),
    buildPillar("월주", monthSys, "줄기", "🌿", "청년기 · 성장"),
    buildPillar("일주", daySys, "꽃", "🌸", "나 자신 · 중년"),
  ]

  if (hourSys) {
    pillars.push(buildPillar("시주", hourSys, "열매", "🍎", "노년 · 후대"))
  }

  const mainOhaeng = CHEONGAN[daySys.stem].ohaeng

  return {
    pillars,
    mainOhaeng,
    profile: OHAENG_PROFILE[mainOhaeng],
    hasHour: !!hourSys,
  }
}

// 기존 호환
export function analyzeOhaeng(birthDate: Date): Ohaeng {
  const daySys = dayPillar(birthDate)
  return CHEONGAN[daySys.stem].ohaeng
}

export function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return "spring"
  if (month >= 6 && month <= 8) return "summer"
  if (month >= 9 && month <= 11) return "autumn"
  return "winter"
}

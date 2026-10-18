import type { Ohaeng } from "@/lib/saju"

/**
 * 지역별 오행 브랜딩 — "이 땅의 기운을 담은 꽃"
 * 로컬 조합원 농가(판매처) 주소의 시·도로 산지 오행을 붙인다.
 * 기준: 농심화심 신청서의 산지 예시(제주 水, 함안·진주 土, 평창 金, 고흥·해남 火)를
 * 시·도 단위로 넓힌 브랜딩용 분류이며, 추천 점수에는 쓰지 않는다.
 */
export type RegionOhaeng = { region: string; ohaeng: Ohaeng; story: string; pattern: RegExp }

export const OHAENG_HANJA: Record<Ohaeng, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" }

export const REGION_OHAENG: RegionOhaeng[] = [
  { region: "제주", ohaeng: "수", story: "바다와 화산섬이 품은 물의 기운", pattern: /^제주/ },
  { region: "전남·광주", ohaeng: "화", story: "햇볕 따뜻한 남해안의 불 기운", pattern: /^(전남|전라남도|광주)/ },
  { region: "경북·대구", ohaeng: "화", story: "햇볕 뜨거운 분지의 불 기운", pattern: /^(경북|경상북도|대구)/ },
  { region: "경남·부산·울산", ohaeng: "토", story: "기름진 남부 평야의 흙 기운", pattern: /^(경남|경상남도|부산|울산)/ },
  { region: "전북", ohaeng: "토", story: "너른 호남평야의 흙 기운", pattern: /^(전북|전라북도)/ },
  { region: "충청·대전·세종", ohaeng: "토", story: "국토 한가운데의 흙 기운", pattern: /^(충북|충남|충청|대전|세종)/ },
  { region: "강원", ohaeng: "금", story: "서늘한 고랭지의 맑은 쇠 기운", pattern: /^강원/ },
  { region: "경기·서울·인천", ohaeng: "목", story: "꽃 산업의 중심, 자라나는 나무 기운", pattern: /^(경기|서울|인천)/ },
]

/** 주소 → 산지 오행 (찾지 못하면 null) */
export function regionOhaengOf(address?: string | null): RegionOhaeng | null {
  const a = (address ?? "").trim()
  if (!a) return null
  return REGION_OHAENG.find((r) => r.pattern.test(a)) ?? null
}

/** 오행 → 그 기운을 가진 산지 목록 */
export function regionsOfOhaeng(ohaeng: Ohaeng): RegionOhaeng[] {
  return REGION_OHAENG.filter((r) => r.ohaeng === ohaeng)
}

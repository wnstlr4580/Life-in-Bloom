// 최종 추천 랭킹 — 꽃 오행 프로필(lib/ohaengProfile)을 사용해
//   1) 균형 최적화(사주 오행 분포의 빈 곳을 얼마나 채워주는가)
//   2) 구매 가능성(재고)
//   3) 개인화(탄생화·탄생컬러)
// 를 블렌딩한다. 사용자 확정 비율: 사주(균형) 85% · 재고 10% · 개인화 5%.
import type { Ohaeng } from "./saju"
import { birthFlowerSelection, isBirthFlower } from "./diyFlowerTags"

const OHAENG_ORDER: Ohaeng[] = ["목", "화", "토", "금", "수"]
const OHAENG_IDX: Record<Ohaeng, number> = { 목: 0, 화: 1, 토: 2, 금: 3, 수: 4 }
const EVEN_SHARE = 100 / OHAENG_ORDER.length // 균형 기준선 = 20%

/** 사주 오행 분포(%)에서 부족분 벡터 — 5등분(20%) 대비 모자란 만큼만 양수. 부족할수록 큰 가중. */
export function needVector(pct: Record<Ohaeng, number>): Record<Ohaeng, number> {
  return Object.fromEntries(
    OHAENG_ORDER.map((o) => [o, Math.max(0, EVEN_SHARE - (pct[o] ?? 0))]),
  ) as Record<Ohaeng, number>
}

/** 균형 gain = 프로필·부족벡터 내적. 내가 부족한 오행에 강한 꽃일수록 높다. */
export function balanceGain(profile: Record<Ohaeng, number>, need: Record<Ohaeng, number>): number {
  return OHAENG_ORDER.reduce((sum, o) => sum + profile[o] * need[o], 0)
}

/** 후보군 gain들을 0~1로 정규화 (최댓값 기준). 모두 0이면 전부 0. */
export function normalizeGains(gains: number[]): number[] {
  const max = Math.max(0, ...gains)
  return gains.map((g) => (max > 0 ? g / max : 0))
}

// ── 재고(구매 가능성) ─────────────────────────────────────────
/** 재고 점수 0~1 — 품절(0)은 0, 재고가 늘수록 체감 증가(포화 로그, 50개 이상 ≈ 1). */
export function stockScore(stock: number): number {
  if (stock <= 0) return 0
  return Math.min(1, Math.log10(stock + 1) / Math.log10(51)) // 1→~0.18, 10→~0.56, 50→~1.0
}

// ── 개인화(탄생화·탄생컬러) ───────────────────────────────────
export interface UserPersonalization {
  monthDay: string | null // "MM-DD" — 탄생화 매칭
  month: number | null // 1~12 — 탄생컬러(오방색) 매칭
  mainOhaeng: Ohaeng // 오방색 폴백(월 정보 없을 때)
}

// 한국 오방색(五方色) → 오행. 청(靑)=목, 적(赤)=화, 황(黃)=토, 백(白)=금, 흑/현(玄)=수.
// 상품 색태그엔 흑이 없어 수(水)는 블루/퍼플로 대리한다.
export const OBANGSAEK_OHAENG: Record<Ohaeng, { name: string; colorTags: string[] }> = {
  목: { name: "청(靑)", colorTags: ["그린", "블루"] },
  화: { name: "적(赤)", colorTags: ["레드", "핑크"] },
  토: { name: "황(黃)", colorTags: ["옐로"] },
  금: { name: "백(白)", colorTags: ["화이트"] },
  수: { name: "흑(玄)", colorTags: ["블루", "퍼플"] },
}

// 생월 → 오행 (기존 계절 원형과 일치: 봄=목, 여름=화, 환절기달=토, 가을=금, 겨울=수).
export const MONTH_TO_OHAENG: Record<number, Ohaeng> = {
  2: "목", 3: "목",
  5: "화", 6: "화",
  1: "토", 4: "토", 7: "토", 10: "토",
  8: "금", 9: "금",
  11: "수", 12: "수",
}

/** 탄생컬러의 기준 오행 — 생월 우선, 없으면 일간(mainOhaeng). */
export function birthColorOhaeng(user: UserPersonalization): Ohaeng {
  return (user.month != null && MONTH_TO_OHAENG[user.month]) || user.mainOhaeng
}

// 탄생화 프리셋의 영문 색상 → 상품 한글 색태그
const KIOSK_COLOR_TO_TAG: Record<string, string> = {
  white: "화이트", yellow: "옐로", pink: "핑크", purple: "퍼플", red: "레드", blue: "블루", green: "그린", orange: "주황",
}

interface PersonalizableProduct {
  id: string
  name: string
  colorTags: string[]
}

/** 사용자 생일 기반 개인화 점수 0~1 — 탄생화(0.7) + 탄생컬러(0.3). */
export function personalPreferenceScore(product: PersonalizableProduct, user: UserPersonalization): number {
  let flower = 0
  if (user.monthDay) {
    const sel = birthFlowerSelection(user.monthDay)
    if (sel) {
      if (isBirthFlower(product.id, user.monthDay)) flower = 1
      else if (matchesSpecies(product.name, sel.name)) flower = 0.7
      else if (matchesColor(product.colorTags, sel.color)) flower = 0.4
    }
  }
  const target = OBANGSAEK_OHAENG[birthColorOhaeng(user)]
  const color = product.colorTags.some((t) => target.colorTags.includes(t)) ? 1 : 0

  return 0.7 * flower + 0.3 * color
}

function matchesSpecies(productName: string, birthFlowerName: string): boolean {
  if (!productName || !birthFlowerName) return false
  return productName.includes(birthFlowerName) || birthFlowerName.includes(productName)
}

function matchesColor(colorTags: string[], kioskColor: string): boolean {
  const tag = KIOSK_COLOR_TO_TAG[kioskColor]
  return tag != null && colorTags.includes(tag)
}

// ── 최종 블렌딩 ───────────────────────────────────────────────
/** 사주(균형) 85% + 재고 10% + 개인화 5%. balanceScore·personal은 0~1 정규화값을 받는다. */
export function blendScore(balanceScore: number, stock: number, personal: number): number {
  return 0.85 * balanceScore + 0.10 * stockScore(stock) + 0.05 * personal
}

// ── 특정 오행을 채우는 상품 랭킹 ──────────────────────────────
/** 이 값 미만이면 "그 오행 꽃"이라고 부르지 않는다.
 *  색상 한 축만 잡혀도 최소 22.5점, 계절 태그 하나만 있어도 20점이므로 "신호 있음"의 경계. */
export const OHAENG_RELEVANCE_MIN = 20

export interface RankCandidate {
  id: string
  profile: Record<Ohaeng, number>
  stock: number
  personal: number
}

/** 특정 오행을 채우는 상위 상품 — 품절·무관(임계 미만) 상품은 제외한다.
 *  사주 항은 후보 최댓값 기준으로 정규화해 주 추천과 동일하게 85:10:5가 지켜지게 한다. */
export function topByOhaeng<T extends RankCandidate>(
  items: T[],
  target: Ohaeng,
  limit: number,
  exclude: Set<string> = new Set(),
): T[] {
  const eligible = items.filter(
    (s) => s.stock > 0 && !exclude.has(s.id) && s.profile[target] >= OHAENG_RELEVANCE_MIN,
  )
  const norm = normalizeGains(eligible.map((s) => s.profile[target]))
  return eligible
    .map((s, i) => ({ s, score: blendScore(norm[i], s.stock, s.personal) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s)
}

// ── 운세별 추천 오행 ──────────────────────────────────────────
/** 재물운 = 재성(財星) = 일간이 극(剋)하는 오행. */
export function wealthOhaeng(main: Ohaeng): Ohaeng {
  return OHAENG_ORDER[(OHAENG_IDX[main] + 2) % 5]
}
/** 연애운 = 식상(食傷) = 일간이 생(生)하는 오행 (표현·매력). */
export function loveOhaeng(main: Ohaeng): Ohaeng {
  return OHAENG_ORDER[(OHAENG_IDX[main] + 1) % 5]
}

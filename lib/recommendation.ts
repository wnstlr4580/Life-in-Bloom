// 최종 추천 랭킹 — 꽃 오행 프로필(lib/ohaengProfile)을 사용해
//   1) 오행 궁합(그 꽃을 더했을 때 내 사주 오행이 얼마나 고르게 되는가)
//   2) 구매 가능성(재고)
//   3) 개인화(탄생화·탄생컬러)
// 를 블렌딩한다. 사용자 확정 비율: 사주(궁합) 85% · 재고 10% · 개인화 5%.
import type { Ohaeng } from "./saju"
import { OHAENG_PROFILE } from "./saju"
import { birthFlowerSelection } from "./diyFlowerTags"
import {
  flowerSpeciesKey, explainOhaeng, normalizeColorTag, OHAENG_RELEVANCE_MIN, type OhaengProfileInput,
} from "./ohaengProfile"

const OHAENG_ORDER: Ohaeng[] = ["목", "화", "토", "금", "수"]
const OHAENG_IDX: Record<Ohaeng, number> = { 목: 0, 화: 1, 토: 2, 금: 3, 수: 4 }
const EVEN_SHARE = 100 / OHAENG_ORDER.length // 균형 기준선 = 20%

// ── 오행 균형 ─────────────────────────────────────────────────
// 균형도는 "5등분(20%)에서 얼마나 벗어났는가"(L2 편차)로 잰다.
// L1을 쓰면 기울기가 ±1 상수라 "가장 빈 오행"과 "두 번째로 빈 오행"의 기여가 같아져 동점이 쏟아진다.
/** 한 오행에 100% 몰린 최악의 편차 노름 = ‖(80,-20,-20,-20,-20)‖₂ */
export const MAX_DEVIATION = Math.sqrt(8000)

/** 균형에 아무 영향이 없는 꽃(Δ=0)의 궁합 점수. 유일한 튜닝 상수. */
export const NEUTRAL_FIT = 0.4

/** 오행별 글자 수 — 반올림 전 값이어야 한다.
 *  퍼센트는 오행마다 반올림돼 합이 100이 아닌 경우가 흔하다(예: [1,1,2,2,2] → 101). */
export type OhaengCounts = Record<Ohaeng, number>

/** 오행 분포가 고른 정도 0~100. 완전 균형이 100, 한 오행에 전부 몰리면 0.
 *  글자 수가 6 또는 8이라 완전 균형(100)은 구조적으로 도달 불가능하다(8자 최선 84.7). */
export function ohaengBalance(counts: OhaengCounts): number {
  const total = OHAENG_ORDER.reduce((sum, o) => sum + (counts[o] ?? 0), 0)
  if (total <= 0) return 0
  const squared = OHAENG_ORDER.reduce((sum, o) => {
    const deviation = (100 * (counts[o] ?? 0)) / total - EVEN_SHARE
    return sum + deviation * deviation
  }, 0)
  return 100 * (1 - Math.sqrt(squared) / MAX_DEVIATION)
}

/** 꽃 프로필(0~100 절대점수, 합≠100)을 오행 점유 비율(합 1)로. 신호가 전혀 없으면 null.
 *  크기가 아니라 비율을 쓰는 이유: 프로필 합은 "기운이 세다"가 아니라 "여러 축에 걸쳐 있다"는 뜻이다. */
function flowerShare(profile: Record<Ohaeng, number>): Record<Ohaeng, number> | null {
  const sum = OHAENG_ORDER.reduce((acc, o) => acc + (profile[o] ?? 0), 0)
  if (sum <= 0) return null
  return Object.fromEntries(OHAENG_ORDER.map((o) => [o, profile[o] / sum])) as Record<Ohaeng, number>
}

function addShare(counts: OhaengCounts, share: Record<Ohaeng, number>): OhaengCounts {
  return Object.fromEntries(OHAENG_ORDER.map((o) => [o, (counts[o] ?? 0) + share[o]])) as OhaengCounts
}

/** 그 꽃을 사주에 글자 하나로 더했을 때의 균형도.
 *  혼합 계수를 따로 두지 않는다 — 글자 하나를 더하면 α = 1/(N+1)이 자동으로 유도된다. */
export function balanceAfter(counts: OhaengCounts, profile: Record<Ohaeng, number>): number {
  const share = flowerShare(profile)
  if (!share) return ohaengBalance(counts)
  return ohaengBalance(addShare(counts, share))
}

/** 균형 개선폭. 과잉 기운을 더 키우는 꽃은 음수가 된다(감점 상수 없이 수식에서 나온다). */
export function balanceDelta(counts: OhaengCounts, profile: Record<Ohaeng, number>): number {
  return balanceAfter(counts, profile) - ohaengBalance(counts)
}

/** 그 꽃을 글자 하나로 더했을 때의 오행 분포(%) — 차트 before/after 비교용.
 *  balanceAfter와 같은 모델(글자 하나 추가)을 쓴다 — 스칼라 균형도와 차트가 어긋나면 안 된다.
 *  오행마다 반올림하므로 합이 정확히 100이 아닐 수 있다(표시 전용). */
export function ohaengPctAfter(
  counts: OhaengCounts,
  profile: Record<Ohaeng, number>,
): Record<Ohaeng, number> {
  const share = flowerShare(profile)
  const next = share ? addShare(counts, share) : counts
  const total = OHAENG_ORDER.reduce((sum, o) => sum + next[o], 0)
  return Object.fromEntries(
    OHAENG_ORDER.map((o) => [o, total > 0 ? Math.round((100 * next[o]) / total) : 0]),
  ) as Record<Ohaeng, number>
}

/** 합이 1이고 모든 성분이 0 이상인 심플렉스로의 유클리드 사영. */
function projectOntoSimplex(v: number[]): number[] {
  const sorted = [...v].sort((a, b) => b - a)
  let cumulative = 0
  let theta = 0
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i]
    const candidate = (cumulative - 1) / (i + 1)
    if (sorted[i] - candidate > 0) theta = candidate
  }
  return v.map((x) => Math.max(0, x - theta))
}

/** 이 사주에 "완벽한 꽃"이 낼 수 있는 최대 개선폭 Δ*. 절대 궁합도의 분모.
 *  가장 순수한 단일 오행 꽃을 분모로 쓰면 안 된다 — 최적해가 2~3오행 혼합인 사주가 과반이라
 *  비율이 1을 넘어 상위권이 100점에 뭉친다. 사영을 쓰면 비율 ≤ 1이 보장된다. */
export function idealBalanceDelta(counts: OhaengCounts): number {
  const total = OHAENG_ORDER.reduce((sum, o) => sum + (counts[o] ?? 0), 0)
  // t의 합은 (N+1) - N = 1 이라 심플렉스 합 조건과 정확히 일치한다.
  const t = OHAENG_ORDER.map((o) => (total + 1) / OHAENG_ORDER.length - (counts[o] ?? 0))
  const best = projectOntoSimplex(t)
  const share = Object.fromEntries(OHAENG_ORDER.map((o, i) => [o, best[i]])) as Record<Ohaeng, number>
  return ohaengBalance(addShare(counts, share)) - ohaengBalance(counts)
}

/** 절대 오행 궁합도 0~1 — 달성 가능한 최대 개선폭 대비 이 꽃의 개선폭.
 *  1(완벽 보완) → 1.0, 0(영향 없음) → NEUTRAL_FIT, 균형을 크게 망치면 0. */
export function ohaengFit(
  counts: OhaengCounts,
  profile: Record<Ohaeng, number>,
  idealDelta: number,
): number {
  if (idealDelta <= 0) return NEUTRAL_FIT
  const ratio = balanceDelta(counts, profile) / idealDelta
  return Math.min(1, Math.max(0, NEUTRAL_FIT + (1 - NEUTRAL_FIT) * ratio))
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

/** 상품 색태그 중 표준 대표어 집합. 한글·영어 표기가 섞여 들어오므로 반드시 정규화해서 비교한다. */
function canonColors(colorTags: string[] = []): Set<string> {
  return new Set(colorTags.map((t) => normalizeColorTag(t)).filter((c): c is string => c !== null))
}

interface PersonalizableProduct {
  id: string
  name: string
  colorTags: string[]
}

/** 개인화 점수의 내역 — 근거 카드를 만들려면 무엇이 걸렸는지 알아야 한다. */
export interface PersonalDetail {
  flower: number // 1=탄생화 그 자체 · 0.7=같은 꽃 · 0.4=같은 색 · 0=없음
  color: number // 1=탄생컬러 일치
  birthFlowerName: string | null
  birthColorName: string // 오방색 이름 (예: "적(赤)")
}

/** 사용자 생일 기반 개인화 내역.
 *  탄생화 매칭은 상품 id가 아니라 꽃 종(種)으로 한다 — 탄생화 사전 id(rose-red)와 DB 상품 id(cuid)는
 *  체계가 달라 교집합이 없고, 이름 부분문자열은 1~2자 탄생화명("마")이 매장명과 오탐한다. */
export function personalPreferenceDetail(
  product: PersonalizableProduct,
  user: UserPersonalization,
): PersonalDetail {
  const productColors = canonColors(product.colorTags)
  let flower = 0
  let birthFlowerName: string | null = null

  if (user.monthDay) {
    const sel = birthFlowerSelection(user.monthDay)
    if (sel) {
      birthFlowerName = sel.name
      const sameSpecies =
        flowerSpeciesKey(product.name) !== null &&
        flowerSpeciesKey(product.name) === flowerSpeciesKey(sel.name)
      const selColor = normalizeColorTag(sel.color)
      const sameColor = selColor !== null && productColors.has(selColor)
      flower = sameSpecies && sameColor ? 1 : sameSpecies ? 0.7 : sameColor ? 0.4 : 0
    }
  }

  const target = OBANGSAEK_OHAENG[birthColorOhaeng(user)]
  const color = target.colorTags.some((t) => productColors.has(normalizeColorTag(t) ?? t)) ? 1 : 0

  return { flower, color, birthFlowerName, birthColorName: target.name }
}

/** 개인화 점수 0~1 — 탄생화(0.7) + 탄생컬러(0.3). */
export function personalScore(detail: PersonalDetail): number {
  return 0.7 * detail.flower + 0.3 * detail.color
}

/** 사용자 생일 기반 개인화 점수 0~1 — 탄생화(0.7) + 탄생컬러(0.3). */
export function personalPreferenceScore(product: PersonalizableProduct, user: UserPersonalization): number {
  return personalScore(personalPreferenceDetail(product, user))
}

// ── 최종 블렌딩 ───────────────────────────────────────────────
/** 사주(균형) 95% + 개인화 5%. balanceScore·personal은 0~1 정규화값을 받는다.
 *  개인화 5%는 확정 비율 그대로 두고, 빠진 재고 10%를 궁합이 흡수한다 — 궁합:개인화가 17:1에서
 *  19:1로 벌어지지만 개인화는 원래 동점 조정용이라 역할이 변하지 않는다.
 *  재고를 뺀 이유: 추천 단위가 보유 상품이
 *  아니라 보편적인 꽃이라 "이 꽃의 재고"가 정의되지 않는다. 구매 가능성은 점수가 아니라 카드 배지가
 *  담당한다 — 재고는 휘발성 신호이고, 점수에 섞으면 "당신에게 맞는 꽃"이라는 질문이 오염된다. */
export function blendScore(balanceScore: number, personal: number): number {
  return 0.95 * balanceScore + 0.05 * personal
}

// ── 특정 오행을 채우는 상품 랭킹 ──────────────────────────────
// 관련성 임계는 상품 자동 태깅과 공유하므로 ohaengProfile이 소유한다(재수출).
export { OHAENG_RELEVANCE_MIN } from "./ohaengProfile"

/** a가 b를 낳는(상생) 관계인가 — 목생화, 화생토, 토생금, 금생수, 수생목 */
export function generates(a: Ohaeng, b: Ohaeng): boolean {
  return (OHAENG_IDX[a] + 1) % 5 === OHAENG_IDX[b]
}
/** target을 낳아주는 오행 (부족한 기운을 보완하는 상생 오행) */
export function whoGenerates(target: Ohaeng): Ohaeng {
  return OHAENG_ORDER.find((o) => generates(o, target))!
}

export interface RankCandidate {
  id: string
  name: string
  profile: Record<Ohaeng, number>
  personal: number
}

/** 점수순 목록에서 limit개를 뽑되 같은 꽃 종(種)은 하나만 — 부족하면 점수순으로 마저 채운다.
 *  종 사전은 FLOWER_FORM 키를 그대로 쓰고, 큐레이션에 없는 상품은 각자 고유한 종으로 본다. */
export function pickDiverse<T extends { id: string; name: string }>(ranked: T[], limit: number): T[] {
  const picked: T[] = []
  const seenSpecies = new Set<string>()
  for (const item of ranked) {
    if (picked.length === limit) break
    const key = flowerSpeciesKey(item.name) ?? item.id
    if (seenSpecies.has(key)) continue
    seenSpecies.add(key)
    picked.push(item)
  }
  if (picked.length < limit) {
    const chosen = new Set(picked.map((p) => p.id))
    for (const item of ranked) {
      if (picked.length === limit) break
      if (!chosen.has(item.id)) picked.push(item)
    }
  }
  return picked
}

function rankForOhaeng<T extends RankCandidate>(
  items: T[],
  target: Ohaeng,
  exclude: Set<string>,
): (T & { score: number })[] {
  return items
    .filter((s) => !exclude.has(s.id) && s.profile[target] >= OHAENG_RELEVANCE_MIN)
    .map((s) => ({ ...s, score: blendScore(s.profile[target] / 100, s.personal) }))
    .sort((a, b) => b.score - a.score)
}

/** 관련 후보가 이 개수 미만이면 상생 폴백이 발동한다 — 오행추천개선.md §4. */
const OHAENG_FALLBACK_MIN = 3

/** 특정 오행을 채우는 상위 후보 — 무관(임계 미만)한 것은 제외한다.
 *  프로필은 이미 0~100 절대점수이므로 후보군 정규화를 하지 않는다. 그래야 카탈로그가 빈약할 때
 *  1위도 낮은 점수로 나와 "지금 맞는 꽃이 없다"가 점수에 드러난다.
 *
 *  관련 후보가 `OHAENG_FALLBACK_MIN`개 미만이면 target을 낳는 오행(상생, `whoGenerates`)에서
 *  나머지를 채운다 — 한 단계만 거슬러 올라간다. 근거(buildReasons)는 실제로 기여한 오행
 *  (`matchedOhaeng`) 기준으로 설명해야 하므로, 더 거슬러 올라갈수록 "왜 이 꽃인가"가 흐려진다. */
export function topByOhaeng<T extends RankCandidate>(
  items: T[],
  target: Ohaeng,
  limit: number,
  exclude: Set<string> = new Set(),
): (T & { score: number; matchedOhaeng: Ohaeng })[] {
  const primary = pickDiverse(rankForOhaeng(items, target, exclude), limit).map((s) => ({
    ...s,
    matchedOhaeng: target,
  }))
  if (primary.length >= Math.min(limit, OHAENG_FALLBACK_MIN)) return primary

  const generating = whoGenerates(target)
  const primarySpecies = new Set(primary.map((s) => flowerSpeciesKey(s.name) ?? s.id))
  const exhausted = new Set([...exclude, ...primary.map((s) => s.id)])
  const fallbackCandidates = rankForOhaeng(items, generating, exhausted).filter(
    (s) => !primarySpecies.has(flowerSpeciesKey(s.name) ?? s.id),
  )
  const fallback = pickDiverse(fallbackCandidates, limit - primary.length).map((s) => ({
    ...s,
    matchedOhaeng: generating,
  }))
  return [...primary, ...fallback]
}

// ── 추천 근거 ─────────────────────────────────────────────────
// 규칙: 근거는 점수식에서 실제로 0보다 큰 항에만 대응시킨다. 기여하지 않은 근거는 거짓말이다.
const OHAENG_EMOJI: Record<Ohaeng, string> = { 목: "🌿", 화: "🔥", 토: "🌾", 금: "✨", 수: "💧" }
const OHAENG_HANJA: Record<Ohaeng, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" }

export interface RecommendReason {
  icon: string
  title: string
  detail: string
}

export interface ReasonInput {
  product: OhaengProfileInput
  target: Ohaeng
  profile: Record<Ohaeng, number>
  personal: PersonalDetail
  /** 균형 리스트 한정 — 이 사주에서 가장 과한 오행. 다른 리스트는 need가 점수에 안 들어가므로 넘기지 않는다. */
  excessOhaeng?: Ohaeng | null
  /** 계절 리스트 한정 */
  seasonal?: boolean
  /** 상생 폴백으로 채워진 카드 한정 — 후보가 부족했던 원래 목표 오행(target은 이미 상생 오행으로 대체됨) */
  generatedFor?: Ohaeng
}

/** 추천 근거 목록. 순서는 가중치 순이 아니라 읽는 순서(서사)로 고정한다. */
export function buildReasons(input: ReasonInput): RecommendReason[] {
  const { product, target, profile, personal, excessOhaeng, seasonal, generatedFor } = input
  const reasons: RecommendReason[] = []

  const basis = explainOhaeng(product, target)
  if (basis) {
    const keywords = OHAENG_PROFILE[target].keywords.slice(0, 2).join("·")
    reasons.push({
      icon: OHAENG_EMOJI[target],
      title: `${target}(${OHAENG_HANJA[target]}) 기운 보완`,
      detail: `${basis} — 부족한 ${keywords} 보강`,
    })
  }

  // 상생 폴백 — target은 이미 실제로 기여한 오행(matchedOhaeng)으로 대체돼 있다.
  // generatedFor는 후보가 부족했던 원래 오행이라 target과 다르다.
  if (generatedFor && generatedFor !== target) {
    reasons.push({
      icon: "🔄",
      title: `${generatedFor}(${OHAENG_HANJA[generatedFor]}) 대신 상생 오행으로 보완`,
      detail: `${generatedFor} 기운과 어울리는 꽃이 부족해, ${generatedFor}을 낳는 ${target}(${OHAENG_HANJA[target]}) 기운의 꽃으로 채웠어요`,
    })
  }

  // 과한 기운을 안 키우는 것도 균형 점수에 기여한다 — 단 그 오행 점수가 실제로 낮을 때만.
  if (excessOhaeng && profile[excessOhaeng] < OHAENG_RELEVANCE_MIN) {
    reasons.push({
      icon: "⚖️",
      title: `과한 ${excessOhaeng}(${OHAENG_HANJA[excessOhaeng]}) 기운은 안 키워요`,
      detail: `이미 넘치는 기운을 더하지 않아 균형이 덜 깨져요`,
    })
  }

  if (personal.color === 1) {
    reasons.push({
      icon: "🎨",
      title: "탄생색상과 조화",
      detail: `${personal.birthColorName} — 당신의 기본 색상 에너지와 일치`,
    })
  }

  if (personal.flower > 0) {
    const name = personal.birthFlowerName ?? "탄생화"
    const detail =
      personal.flower === 1 ? `오늘 생일의 탄생화예요`
      : personal.flower === 0.7 ? `탄생화 ${name}와 같은 꽃이에요`
      : `탄생화 ${name}와 같은 색이에요`
    reasons.push({ icon: "🌸", title: "탄생화 연관", detail })
  }

  if (seasonal) {
    reasons.push({ icon: "🍃", title: "지금이 제철", detail: "이 계절에 가장 좋은 상태로 만나요" })
  }

  return reasons
}

/** 사주 추천에 올리지 않을 용도 태그. 상품 목록(/products?use=추모) 탐색은 그대로 둔다. */
// ── 운세별 추천 오행 ──────────────────────────────────────────
/** 재물운 = 재성(財星) = 일간이 극(剋)하는 오행. */
export function wealthOhaeng(main: Ohaeng): Ohaeng {
  return OHAENG_ORDER[(OHAENG_IDX[main] + 2) % 5]
}
/** 연애운 = 식상(食傷) = 일간이 생(生)하는 오행 (표현·매력). */
export function loveOhaeng(main: Ohaeng): Ohaeng {
  return OHAENG_ORDER[(OHAENG_IDX[main] + 1) % 5]
}

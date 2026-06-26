import type { Ohaeng, PillarInfo } from "./saju"

// ─── 기본 상수 ───────────────────────────────────────────────
const OHAENG_IDX: Record<Ohaeng, number> = { 목: 0, 화: 1, 토: 2, 금: 3, 수: 4 }
const OHAENG_ORDER: Ohaeng[] = ["목", "화", "토", "금", "수"]

// 오행 관계
function generates(a: Ohaeng, b: Ohaeng) {
  return (OHAENG_IDX[a] + 1) % 5 === OHAENG_IDX[b]
}
function controls(a: Ohaeng, b: Ohaeng) {
  return (OHAENG_IDX[a] + 2) % 5 === OHAENG_IDX[b]
}

// 천간합 쌍 (indices 0-9)
const STEM_HARMONY_PAIRS: [number, number][] = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]]

// 지지 육합 쌍 (indices 0-11)
const BRANCH_SIX_HARMONY: [number, number][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]

// 지지 삼합 그룹
const BRANCH_THREE_HARMONY: number[][] = [[2, 6, 10], [8, 0, 4], [11, 3, 7], [5, 9, 1]]

// 지지 충: |a - b| === 6
function isBranchClash(a: number, b: number) {
  return Math.abs(a - b) === 6
}

// 음양: 짝수 index = 양
function isYang(stemIdx: number) { return stemIdx % 2 === 0 }

// ─── 십성 ────────────────────────────────────────────────────
export interface Sipseong {
  name: string
  label: string
  score: number
  desc: string
  icon: string
}

function getSipseong(aStemIdx: number, bStemIdx: number): Sipseong {
  const aO = OHAENG_ORDER[Math.floor(aStemIdx / 2)]
  const bO = OHAENG_ORDER[Math.floor(bStemIdx / 2)]
  const sameYang = isYang(aStemIdx) === isYang(bStemIdx)

  if (aO === bO) {
    return sameYang
      ? { name: "비견", label: "비겁 관계", score: 62, desc: "동등한 동반자 관계입니다. 경쟁하면서도 서로를 이해하는 친구 같은 연인이 될 수 있습니다.", icon: "🤝" }
      : { name: "겁재", label: "비겁 관계", score: 50, desc: "라이벌처럼 자극을 주는 관계입니다. 서로를 성장시키지만 주도권 다툼이 생길 수 있습니다.", icon: "⚡" }
  }
  if (generates(aO, bO)) {
    return sameYang
      ? { name: "식신", label: "식상 관계", score: 75, desc: "당신이 상대를 자연스럽게 돌보고 표현합니다. 풍요롭고 창의적인 에너지가 흐르는 관계입니다.", icon: "🌷" }
      : { name: "상관", label: "식상 관계", score: 65, desc: "감성적이고 표현이 풍부한 관계입니다. 때론 예측 못할 감정 기복이 있지만 그만큼 매력적입니다.", icon: "🎭" }
  }
  if (controls(aO, bO)) {
    return sameYang
      ? { name: "편재", label: "재성 관계", score: 70, desc: "당신이 상대를 소유하고 싶어하는 관계입니다. 열정적이고 자극적이지만 집착이 될 수 있습니다.", icon: "💰" }
      : { name: "정재", label: "재성 관계", score: 82, desc: "가장 안정적인 로맨틱 관계입니다. 서로를 소중히 여기며 현실적이고 따뜻한 사랑을 나눕니다.", icon: "💍" }
  }
  if (controls(bO, aO)) {
    return sameYang
      ? { name: "편관", label: "관성 관계", score: 65, desc: "강렬한 카리스마와 긴장감이 있는 관계입니다. 짝사랑이나 운명적인 끌림을 느낄 수 있습니다.", icon: "⚔️" }
      : { name: "정관", label: "관성 관계", score: 82, desc: "서로를 존중하고 책임감 있게 지켜주는 관계입니다. 믿음과 예의가 바탕이 된 품격 있는 사랑입니다.", icon: "👑" }
  }
  // generates(bO, aO)
  return sameYang
    ? { name: "편인", label: "인성 관계", score: 60, desc: "상대가 당신을 색다른 방식으로 지원합니다. 독특한 유대감이 있지만 다소 거리감을 느낄 수 있습니다.", icon: "🌙" }
    : { name: "정인", label: "인성 관계", score: 74, desc: "상대가 당신을 어머니처럼 보살펴주는 관계입니다. 안정감 있고 헌신적인 사랑을 받을 수 있습니다.", icon: "🛡️" }
}

// ─── 메인 궁합 계산 ───────────────────────────────────────────
export interface CompatScore {
  ohaeng: number       // 기질과 온도
  stem: number         // 생각과 가치관
  branch: number       // 생활과 속궁합
  sipseong: Sipseong
  total: number
  stemRelation: "합" | "극" | "중립"
  branchClashCount: number
  branchHarmonyCount: number
  coupleFlower: string
  coupleDesc: string
}

export interface PersonSaju {
  name: string
  pillars: PillarInfo[]
  mainOhaeng: Ohaeng
  dayStemIdx: number
  dayBranchIdx: number
}

function pillarsToStemBranch(pillars: PersonSaju["pillars"]) {
  // stemIdx: 천간 index (0-9), branchIdx: 지지 index (0-11)
  const CHEONGAN = ["갑","을","병","정","무","기","경","신","임","계"]
  const JIJI = ["자","축","인","묘","진","사","오","미","신","유","술","해"]
  return pillars.map(p => ({
    stemIdx: CHEONGAN.indexOf(p.stemName),
    branchIdx: JIJI.indexOf(p.branchName),
    stemOhaeng: p.stemOhaeng,
    branchOhaeng: p.branchOhaeng,
  }))
}

function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)) }

export function calcCompat(a: PersonSaju, b: PersonSaju): CompatScore {
  const aPB = pillarsToStemBranch(a.pillars)
  const bPB = pillarsToStemBranch(b.pillars)

  // ── 1. 오행 점수 ──────────────────────────────────────────
  let ohaengScore = 50
  for (const ap of aPB) {
    for (const bp of bPB) {
      const [ao, bo] = [ap.stemOhaeng, bp.stemOhaeng]
      if (generates(ao, bo) || generates(bo, ao)) ohaengScore += 3
      else if (ao === bo) ohaengScore += 1
      else if (controls(ao, bo) || controls(bo, ao)) ohaengScore -= 2

      const [abr, bbr] = [ap.branchOhaeng, bp.branchOhaeng]
      if (generates(abr, bbr) || generates(bbr, abr)) ohaengScore += 3
      else if (abr === bbr) ohaengScore += 1
      else if (controls(abr, bbr) || controls(bbr, abr)) ohaengScore -= 2
    }
  }

  // ── 2. 천간 점수 ──────────────────────────────────────────
  let stemScore = 50
  let stemHarmonyCount = 0, stemClashCount = 0
  for (const ap of aPB) {
    for (const bp of bPB) {
      const si = ap.stemIdx, sj = bp.stemIdx
      if (si < 0 || sj < 0) continue
      const isHarmony = STEM_HARMONY_PAIRS.some(([x, y]) => (si === x && sj === y) || (si === y && sj === x))
      if (isHarmony) { stemScore += 18; stemHarmonyCount++ }
      else {
        const ao = OHAENG_ORDER[Math.floor(si / 2)]
        const bo = OHAENG_ORDER[Math.floor(sj / 2)]
        if (controls(ao, bo) || controls(bo, ao)) { stemScore -= 10; stemClashCount++ }
      }
    }
  }
  const stemRelation: CompatScore["stemRelation"] = stemHarmonyCount > 0 ? "합" : stemClashCount > 0 ? "극" : "중립"

  // ── 3. 지지 점수 ──────────────────────────────────────────
  let branchScore = 50
  let harmonyCount = 0, clashCount = 0
  for (const ap of aPB) {
    for (const bp of bPB) {
      const bi = ap.branchIdx, bj = bp.branchIdx
      if (bi < 0 || bj < 0) continue
      if (BRANCH_SIX_HARMONY.some(([x, y]) => (bi === x && bj === y) || (bi === y && bj === x))) {
        branchScore += 20; harmonyCount++
      } else if (BRANCH_THREE_HARMONY.some(g => g.includes(bi) && g.includes(bj))) {
        branchScore += 10; harmonyCount++
      } else if (isBranchClash(bi, bj)) {
        branchScore -= 5; clashCount++
      }
    }
  }

  // ── 4. 십성 ───────────────────────────────────────────────
  const sipseong = getSipseong(a.dayStemIdx, b.dayStemIdx)

  // ── 종합 점수 ─────────────────────────────────────────────
  const o = clamp(ohaengScore)
  const s = clamp(stemScore)
  const br = clamp(branchScore)
  const total = Math.round(o * 0.30 + s * 0.20 + br * 0.30 + sipseong.score * 0.20)

  // ── 커플 꽃 추천 ─────────────────────────────────────────
  const { flower, desc } = getCoupleFlower(a.mainOhaeng, b.mainOhaeng)

  return {
    ohaeng: o, stem: s, branch: br, sipseong,
    total, stemRelation,
    branchClashCount: clashCount,
    branchHarmonyCount: harmonyCount,
    coupleFlower: flower,
    coupleDesc: desc,
  }
}

// 커플 꽃 추천 — 두 오행을 잇는 꽃
function getCoupleFlower(a: Ohaeng, b: Ohaeng): { flower: string; desc: string } {
  const key = [a, b].sort().join("-")
  const map: Record<string, { flower: string; desc: string }> = {
    "목-화": { flower: "해바라기 + 튤립", desc: "목이 화를 키우듯, 당신들의 사랑은 서로를 활짝 피게 합니다" },
    "화-토": { flower: "국화 + 장미", desc: "화가 토를 만들듯, 열정이 안정된 사랑의 대지로 쌓입니다" },
    "금-토": { flower: "백합 + 프리지아", desc: "토가 금을 품듯, 포용 속에서 순수한 빛이 납니다" },
    "금-수": { flower: "라벤더 + 카네이션", desc: "금이 수를 만들듯, 고요한 지혜가 사랑을 깊게 합니다" },
    "목-수": { flower: "수국 + 수선화", desc: "수가 목을 키우듯, 지혜로운 사랑이 당신을 성장시킵니다" },
    "목-목": { flower: "튤립 + 수선화", desc: "같은 봄의 기운, 함께 더 높이 자라는 동반자 관계입니다" },
    "화-화": { flower: "빨간 장미 + 거베라", desc: "두 불꽃이 만나 더 크게 타오르는 열정적인 관계입니다" },
    "토-토": { flower: "국화 + 해바라기", desc: "대지와 대지가 만나 풍요롭고 안정된 사랑을 나눕니다" },
    "금-금": { flower: "백합 + 안개꽃", desc: "순백의 결실이 두 배로 빛나는, 우아하고 고귀한 관계입니다" },
    "수-수": { flower: "수국 + 라벤더", desc: "깊은 물이 더 깊어지듯, 지혜롭고 신비로운 유대감이 있습니다" },
    "목-토": { flower: "튤립 + 국화", desc: "목이 토를 깨뜨리려 하지만, 그 속에서 강인함이 생깁니다" },
    "화-금": { flower: "장미 + 카네이션", desc: "화가 금을 녹이듯, 열정이 차가운 마음을 열어주는 관계입니다" },
    "토-수": { flower: "프리지아 + 아이리스", desc: "토가 수를 막으려 하지만, 물은 결국 길을 찾습니다" },
    "수-화": { flower: "수국 + 해바라기", desc: "불과 물의 긴장감, 그 사이에서 뜨거운 끌림이 생깁니다" },
    "금-목": { flower: "백합 + 튤립", desc: "금이 목을 다듬듯, 서로가 서로를 성장시키는 관계입니다" },
  }
  return map[key] ?? { flower: "혼합 꽃다발", desc: "서로 다른 기운이 만나 새로운 아름다움을 만들어냅니다" }
}

// 점수 등급
export function gradeLabel(score: number): { label: string; emoji: string; color: string } {
  if (score >= 85) return { label: "천생연분", emoji: "💕", color: "text-rose-500" }
  if (score >= 70) return { label: "잘 맞는 사이", emoji: "🌸", color: "text-pink-500" }
  if (score >= 55) return { label: "노력하면 좋아요", emoji: "🌿", color: "text-emerald-600" }
  return { label: "도전적인 관계", emoji: "⚡", color: "text-amber-500" }
}

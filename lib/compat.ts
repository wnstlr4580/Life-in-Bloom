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

// 지지 원진 쌍 — 부부 궁합에서 중요하게 보는 흉살 (자미, 축오, 인유, 묘신, 진해, 사술)
const BRANCH_WONJIN: [number, number][] = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]]

// 지지 충: |a - b| === 6
function isBranchClash(a: number, b: number) {
  return Math.abs(a - b) === 6
}

function isPairIn(pairs: [number, number][], a: number, b: number) {
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x))
}

// 삼합: 서로 다른 지지가 같은 삼합 그룹에 속할 때 (같은 지지끼리는 제외)
function isThreeHarmony(a: number, b: number) {
  return a !== b && BRANCH_THREE_HARMONY.some(g => g.includes(a) && g.includes(b))
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
  sipseong: Sipseong           // A에게 B는 (점수는 양방향 평균)
  sipseongReverse: Sipseong    // B에게 A는
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
    isDay: p.pillar === "일주", // 일주(배우자궁)는 궁합에서 가중치를 높게 본다
  }))
}

// 오행 두 기운의 관계 점수 (상생 80 / 동일 60 / 상극 30)
function ohaengRelScore(x: Ohaeng, y: Ohaeng): number {
  if (generates(x, y) || generates(y, x)) return 80
  if (x === y) return 60
  return 30
}

function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)) }

export function calcCompat(a: PersonSaju, b: PersonSaju): CompatScore {
  const aPB = pillarsToStemBranch(a.pillars)
  const bPB = pillarsToStemBranch(b.pillars)

  // 모든 기둥 쌍을 가중 평균으로 계산한다.
  // - 일주(배우자궁) 쌍은 가중치를 높게 (일-일 4배, 일-그외 2배)
  // - 쌍 개수로 나누므로 시간 입력 여부(기둥 3개/4개)와 무관하게 공정한 스케일
  let ohaengSum = 0, stemSum = 0, branchSum = 0, weightSum = 0
  let harmonyCount = 0, clashCount = 0
  let stemHarmonyCount = 0, stemClashCount = 0
  let dayStemHarmony = false, dayStemClash = false
  let dayBranchGood = false, dayBranchBad = false

  for (const ap of aPB) {
    for (const bp of bPB) {
      if (ap.stemIdx < 0 || bp.stemIdx < 0 || ap.branchIdx < 0 || bp.branchIdx < 0) continue
      const w = (ap.isDay ? 2 : 1) * (bp.isDay ? 2 : 1)
      const isDayPair = ap.isDay && bp.isDay

      // 천간 — 합(95) > 상생(70) > 동일(60) > 상극(30)
      const stemHarm = isPairIn(STEM_HARMONY_PAIRS, ap.stemIdx, bp.stemIdx)
      const stemControl = controls(ap.stemOhaeng, bp.stemOhaeng) || controls(bp.stemOhaeng, ap.stemOhaeng)
      let stemPair = 50
      if (stemHarm) {
        stemPair = 95; stemHarmonyCount++
        if (isDayPair) dayStemHarmony = true
      } else if (generates(ap.stemOhaeng, bp.stemOhaeng) || generates(bp.stemOhaeng, ap.stemOhaeng)) {
        stemPair = 70
      } else if (ap.stemOhaeng === bp.stemOhaeng) {
        stemPair = 60
      } else if (stemControl) {
        stemPair = 30; stemClashCount++
        if (isDayPair) dayStemClash = true
      }

      // 지지 — 육합(95) > 삼합(85) > 상생(65) > 동일(60) > 상극(40), 충(15)·원진(20)은 흉
      const sixHarm = isPairIn(BRANCH_SIX_HARMONY, ap.branchIdx, bp.branchIdx)
      const threeHarm = isThreeHarmony(ap.branchIdx, bp.branchIdx)
      let branchPair = 50
      if (sixHarm) {
        branchPair = 95; harmonyCount++
        if (isDayPair) dayBranchGood = true
      } else if (threeHarm) {
        branchPair = 85; harmonyCount++
        if (isDayPair) dayBranchGood = true
      } else if (isBranchClash(ap.branchIdx, bp.branchIdx)) {
        branchPair = 15; clashCount++
        if (isDayPair) dayBranchBad = true
      } else if (isPairIn(BRANCH_WONJIN, ap.branchIdx, bp.branchIdx)) {
        branchPair = 20; clashCount++
        if (isDayPair) dayBranchBad = true
      } else if (generates(ap.branchOhaeng, bp.branchOhaeng) || generates(bp.branchOhaeng, ap.branchOhaeng)) {
        branchPair = 65
      } else if (ap.branchOhaeng === bp.branchOhaeng) {
        branchPair = 60
      } else {
        branchPair = 40
      }

      // 기질(오행) — 합이 성립하면 상극이라도 조화로 본다 (합화 이론)
      const oStem = stemHarm ? 85 : ohaengRelScore(ap.stemOhaeng, bp.stemOhaeng)
      const oBranch = sixHarm || threeHarm ? 85 : ohaengRelScore(ap.branchOhaeng, bp.branchOhaeng)

      ohaengSum += ((oStem + oBranch) / 2) * w
      stemSum += stemPair * w
      branchSum += branchPair * w
      weightSum += w
    }
  }

  const stemRelation: CompatScore["stemRelation"] = stemHarmonyCount > 0 ? "합" : stemClashCount > 0 ? "극" : "중립"

  // 일간합·일지합/충은 전통 궁합의 핵심 지표 — 평균 위에 보정을 더한다
  const o = clamp(Math.round(ohaengSum / weightSum))
  const s = clamp(Math.round(stemSum / weightSum + (dayStemHarmony ? 15 : dayStemClash ? -8 : 0)))
  const br = clamp(Math.round(branchSum / weightSum + (dayBranchGood ? 15 : dayBranchBad ? -12 : 0)))

  // ── 십성: 양방향 계산 후 평균 (A→B만 보면 입력 순서에 따라 결과가 달라진다) ──
  const sipseongAB = getSipseong(a.dayStemIdx, b.dayStemIdx)
  const sipseongBA = getSipseong(b.dayStemIdx, a.dayStemIdx)
  const sipseongScore = Math.round((sipseongAB.score + sipseongBA.score) / 2)
  const sipseong = { ...sipseongAB, score: sipseongScore }

  const total = Math.round(o * 0.30 + s * 0.20 + br * 0.30 + sipseongScore * 0.20)

  // ── 커플 꽃 추천 ─────────────────────────────────────────
  const { flower, desc } = getCoupleFlower(a.mainOhaeng, b.mainOhaeng)

  return {
    ohaeng: o, stem: s, branch: br, sipseong,
    sipseongReverse: sipseongBA,
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

// 오행 조합 → 꽃다발 만들기 페이지 꽃 ID 매핑 (Unicode 정렬 기준 키: 금 < 목 < 수 < 토 < 화)
export const COUPLE_FLOWER_IDS: Record<string, { mainId: string; additionalIds: string[] }> = {
  "금-금": { mainId: "lily-white",       additionalIds: ["babysbreath-white"] },
  "금-목": { mainId: "lily-white",       additionalIds: ["tulip-pink"] },
  "금-수": { mainId: "lavender",         additionalIds: ["carnation-pink"] },
  "금-토": { mainId: "lily-white",       additionalIds: ["freesia"] },
  "금-화": { mainId: "rose-red",         additionalIds: ["carnation-white"] },
  "목-목": { mainId: "tulip-pink",       additionalIds: ["chamomile"] },
  "목-수": { mainId: "hydrangea-blue",   additionalIds: ["daisy"] },
  "목-토": { mainId: "tulip-pink",       additionalIds: ["mum-yellow"] },
  "목-화": { mainId: "sunflower",        additionalIds: ["tulip-pink"] },
  "수-수": { mainId: "hydrangea-blue",   additionalIds: ["lavender"] },
  "수-토": { mainId: "freesia",          additionalIds: ["lavender"] },
  "수-화": { mainId: "hydrangea-blue",   additionalIds: ["sunflower"] },
  "토-토": { mainId: "mum-yellow",       additionalIds: ["sunflower"] },
  "토-화": { mainId: "mum-pink",         additionalIds: ["rose-red"] },
  "화-화": { mainId: "rose-red",         additionalIds: ["gerbera-red"] },
}

// 점수 등급
export function gradeLabel(score: number): { label: string; emoji: string; color: string } {
  if (score >= 85) return { label: "천생연분", emoji: "💕", color: "text-rose-500" }
  if (score >= 70) return { label: "잘 맞는 사이", emoji: "🌸", color: "text-pink-500" }
  if (score >= 55) return { label: "노력하면 좋아요", emoji: "🌿", color: "text-emerald-600" }
  return { label: "도전적인 관계", emoji: "⚡", color: "text-amber-500" }
}

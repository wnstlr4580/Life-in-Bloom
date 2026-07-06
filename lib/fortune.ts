import type { Ohaeng, PillarInfo } from "./saju"
import { dayPillar as dayGanji } from "./saju"

// ── 상수 ─────────────────────────────────────────────────────
const CHEONGAN      = ["갑","을","병","정","무","기","경","신","임","계"]
const CHEONGAN_CHAR = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]
const JIJI          = ["자","축","인","묘","진","사","오","미","신","유","술","해"]
const JIJI_CHAR     = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]
const JIJI_OHAENG: Ohaeng[] = ["수","토","목","목","토","화","화","토","금","금","토","수"]
const CHEONGAN_OHAENG: Ohaeng[] = ["목","목","화","화","토","토","금","금","수","수"]

const OHAENG_IDX: Record<Ohaeng, number> = { 목:0, 화:1, 토:2, 금:3, 수:4 }
function generates(a: Ohaeng, b: Ohaeng) { return (OHAENG_IDX[a]+1)%5 === OHAENG_IDX[b] }
function controls(a: Ohaeng, b: Ohaeng)  { return (OHAENG_IDX[a]+2)%5 === OHAENG_IDX[b] }
function isYang(si: number) { return si % 2 === 0 }

// ── 오늘 날짜 → 일간 index 계산 (한국 시간 기준, saju.ts의 일주 계산 공용) ──
function todayPillar(today: Date) {
  const kst = new Date(today.getTime() + 9 * 3600000)
  const g = dayGanji(kst.getUTCFullYear(), kst.getUTCMonth() + 1, kst.getUTCDate())
  return { stemIdx: g.stem, branchIdx: g.branch }
}

// ── 십이운성 ─────────────────────────────────────────────────
// 각 일간별 '장생'이 시작하는 지지 index
const YANG_START: Record<number,number> = { 0:11, 2:2, 4:2, 6:5, 8:8 }  // 갑/병무/경/임
const YIN_START:  Record<number,number> = { 1:6,  3:9, 5:9, 7:0, 9:3  }  // 을/정기/신/계

const SIBI_NAMES = ["장생","목욕","관대","건록","제왕","쇠","병","사","묘","절","태","양"]

// 각 단계의 활력 점수(base)
const SIBI_VITALITY: Record<string,number> = {
  장생:82, 목욕:58, 관대:72, 건록:84, 제왕:90,
  쇠:55,   병:40,   사:32,   묘:46,   절:26, 태:50, 양:65,
}

// 각 단계가 카테고리에 주는 추가 보너스
const SIBI_BONUS: Record<string, Record<string,number>> = {
  장생: { 애정:10, 건강:12 },
  목욕: { 애정:15, 재물:-5 },
  관대: { 일:8 },
  건록: { 재물:10, 일:12 },
  제왕: { 재물:8,  일:15 },
  쇠:   { 건강:-5 },
  병:   { 건강:-15 },
  사:   { 애정:-10, 재물:-8 },
  묘:   {},
  절:   { 재물:-12, 일:-10 },
  태:   { 애정:5 },
  양:   { 건강:8 },
}

// 단계 이름 → 쉬운 설명
const SIBI_DESC: Record<string,string> = {
  장생: "새로운 기운이 시작되는 날이에요. 뭘 해도 활기가 넘쳐요.",
  목욕: "감수성이 풍부한 날이에요. 감정 기복을 조심하고 휴식을 챙기세요.",
  관대: "조금씩 능력을 키워가는 날이에요. 배우고 익히기에 좋아요.",
  건록: "내 능력이 충분히 발휘되는 날이에요. 자신감을 갖고 움직이세요.",
  제왕: "기운이 가장 강한 날이에요. 중요한 일을 이날 하면 좋아요.",
  쇠:   "기운이 조금 빠지는 날이에요. 무리하지 말고 천천히 움직이세요.",
  병:   "몸과 마음이 약해질 수 있는 날이에요. 건강을 챙기고 쉬세요.",
  사:   "오래된 것을 내려놓고 마무리하는 날이에요. 새 시작을 준비해요.",
  묘:   "혼자 생각이 많아지는 날이에요. 내면을 돌아보기 좋아요.",
  절:   "기운이 가장 낮은 날이에요. 쉬면서 재충전하는 게 최고예요.",
  태:   "씨앗이 심어지는 날이에요. 새 아이디어를 구상하기에 좋아요.",
  양:   "서서히 기운을 회복하는 날이에요. 차분하게 준비해 나가세요.",
}

const SIBI_EMOJI: Record<string,string> = {
  장생:"🌱", 목욕:"🌊", 관대:"📚", 건록:"💪", 제왕:"👑",
  쇠:"🍂",   병:"🤒",   사:"🌙",   묘:"🔮",   절:"❄️", 태:"🥚", 양:"🌤️",
}

function getSibiUnseong(stemIdx: number, branchIdx: number): string {
  if (isYang(stemIdx)) {
    const start = YANG_START[stemIdx] ?? 0
    return SIBI_NAMES[(branchIdx - start + 12) % 12]
  } else {
    const start = YIN_START[stemIdx] ?? 0
    return SIBI_NAMES[(start - branchIdx + 12) % 12]
  }
}

// ── 십성 ─────────────────────────────────────────────────────
const SIPSEONG_SIMPLE: Record<string, { title: string; emoji: string; fortune: string; mods: Record<string,number> }> = {
  정재: { title:"돈과 안정의 기운",    emoji:"💰", fortune:"재물 운이 좋아요. 소비보다 저축에 좋은 날이에요.",              mods:{ 재물:20, 애정:10 } },
  편재: { title:"기회와 활동의 기운",  emoji:"🎲", fortune:"예상치 못한 수익 기회가 생길 수 있어요.",                       mods:{ 재물:15 } },
  정관: { title:"책임과 성과의 기운",  emoji:"🏆", fortune:"일이 순조롭게 풀리는 날이에요. 중요한 업무를 처리하세요.",       mods:{ 일:20, 건강:5 } },
  편관: { title:"도전과 자극의 기운",  emoji:"⚡", fortune:"강한 자극과 긴장감이 있어요. 집중력을 높이는 날이에요.",         mods:{ 일:10, 건강:-8 } },
  식신: { title:"즐거움과 표현의 기운",emoji:"🌸", fortune:"마음이 풍요롭고 사람들이 나를 좋아하는 날이에요.",              mods:{ 애정:18, 건강:10, 재물:5 } },
  상관: { title:"감성과 창의의 기운",  emoji:"🎭", fortune:"감수성이 높아지는 날이에요. 창작 활동이나 대화가 잘 돼요.",     mods:{ 애정:12, 일:-5 } },
  정인: { title:"배움과 도움의 기운",  emoji:"📖", fortune:"누군가의 도움을 받거나 배움의 기회가 생기는 날이에요.",          mods:{ 일:18, 건강:12 } },
  편인: { title:"직관과 영감의 기운",  emoji:"🌙", fortune:"직감이 잘 맞는 날이에요. 조용히 생각을 정리해보세요.",           mods:{ 일:10, 건강:6 } },
  비견: { title:"동료와 경쟁의 기운",  emoji:"🤝", fortune:"비슷한 사람들과 만나는 날이에요. 협력하면 좋은 결과가 나와요.", mods:{ 건강:10, 애정:5 } },
  겁재: { title:"경쟁과 변동의 기운",  emoji:"🌪️", fortune:"돈과 관련해서 조심하는 날이에요. 큰 지출은 피하세요.",          mods:{ 재물:-15, 건강:5 } },
}

function getSipseong(personStemIdx: number, todayStemIdx: number): string {
  const pO = CHEONGAN_OHAENG[personStemIdx]
  const tO = CHEONGAN_OHAENG[todayStemIdx]
  const sameYang = isYang(personStemIdx) === isYang(todayStemIdx)
  if (pO === tO) return sameYang ? "비견" : "겁재"
  if (generates(tO, pO)) return sameYang ? "편인" : "정인"
  if (generates(pO, tO)) return sameYang ? "식신" : "상관"
  if (controls(tO, pO))  return sameYang ? "편관" : "정관"
  // controls(pO, tO)
  return sameYang ? "편재" : "정재"
}

// ── 신살 ─────────────────────────────────────────────────────
export interface SinsalEntry {
  name: string
  emoji: string
  type: "길" | "흉"
  title: string
  desc: string
  scoreMod: Record<string,number>
}

// 천을귀인: 일간별 귀인 지지
const CHEONUL: Record<number, number[]> = {
  0:[1,7], 1:[0,8], 2:[11,9], 3:[11,9], 4:[1,7],
  5:[0,8], 6:[1,7], 7:[6,2],  8:[3,5],  9:[3,5],
}

// 문창귀인: 일간별 문창 지지
const MUNCHANG: Record<number, number> = {
  0:5, 1:6, 2:8, 3:9, 4:8, 5:9, 6:11, 7:0, 8:2, 9:3,
}

// 삼합 그룹별 도화/역마 지지
const SANHAM: [number[], number, number][] = [
  [[2,6,10], 3,  8],   // 인오술 → 도화:묘(3),  역마:신(8)
  [[11,3,7], 0,  5],   // 해묘미 → 도화:자(0),  역마:사(5)
  [[8,0,4],  9,  2],   // 신자진 → 도화:유(9),  역마:인(2)
  [[5,9,1],  6,  11],  // 사유축 → 도화:오(6),  역마:해(11)
]

// 공망: 일진 천간+지지 기반 공망 계산
function kongwang(stemIdx: number, branchIdx: number): [number, number] {
  const xunStart = ((branchIdx - stemIdx) % 12 + 12) % 12
  return [(xunStart + 10) % 12, (xunStart + 11) % 12]
}

function detectSinsal(
  personDayStemIdx: number,
  personYearBranchIdx: number,
  todayBranchIdx: number,
  personDayStemIdx2: number,  // same, for kongwang of person's day pillar
  personDayBranchIdx: number,
): SinsalEntry[] {
  const result: SinsalEntry[] = []

  // 천을귀인
  if ((CHEONUL[personDayStemIdx] ?? []).includes(todayBranchIdx)) {
    result.push({
      name:"천을귀인", emoji:"👼", type:"길",
      title:"귀인이 도와주는 날",
      desc:"좋은 사람이 나타나 도움을 줄 수 있어요. 어려운 일도 술술 풀려요.",
      scoreMod:{ 애정:8, 재물:8, 일:8, 건강:8 }
    })
  }

  // 문창귀인
  if (MUNCHANG[personDayStemIdx] === todayBranchIdx) {
    result.push({
      name:"문창귀인", emoji:"✏️", type:"길",
      title:"머리가 잘 돌아가는 날",
      desc:"공부, 시험, 계획 세우기에 아주 좋은 날이에요. 집중력도 높아져요.",
      scoreMod:{ 일:15 }
    })
  }

  // 도화살 / 역마살
  for (const [group, dohwa, yukma] of SANHAM) {
    if (group.includes(personYearBranchIdx)) {
      if (todayBranchIdx === dohwa) {
        result.push({
          name:"도화살", emoji:"🌸", type:"길",
          title:"매력이 넘치는 날",
          desc:"오늘따라 사람들이 나에게 더 끌려요. 소개팅, 만남에 좋아요.",
          scoreMod:{ 애정:22, 재물:-3 }
        })
      }
      if (todayBranchIdx === yukma) {
        result.push({
          name:"역마살", emoji:"🏇", type:"길",
          title:"움직임과 변화의 날",
          desc:"이동, 여행, 새 시도에 좋은 날이에요. 가만히 있으면 답답해질 수 있어요.",
          scoreMod:{ 일:12, 건강:-5 }
        })
      }
    }
  }

  // 공망
  const [kw1, kw2] = kongwang(personDayStemIdx2, personDayBranchIdx)
  if (todayBranchIdx === kw1 || todayBranchIdx === kw2) {
    result.push({
      name:"공망", emoji:"🕳️", type:"흉",
      title:"노력이 잘 안 쌓이는 날",
      desc:"아무리 열심히 해도 결과가 잘 안 나올 수 있어요. 오늘은 쉬고 내일 다시 도전해요.",
      scoreMod:{ 애정:-10, 재물:-10, 일:-10, 건강:-8 }
    })
  }

  return result
}

// ── 점수 계산 ─────────────────────────────────────────────────
export interface FortuneScores {
  애정: number; 재물: number; 일: number; 건강: number; 총운: number
}

function clamp(v: number) { return Math.max(10, Math.min(99, Math.round(v))) }

function calcScores(
  sibiStage: string,
  sipseongName: string,
  personMainOhaeng: Ohaeng,
  todayOhaeng: Ohaeng,
  todayBranchOhaeng: Ohaeng,
  sinsal: SinsalEntry[],
): FortuneScores {
  const base = SIBI_VITALITY[sibiStage] ?? 55
  const sibiB = SIBI_BONUS[sibiStage] ?? {}
  const sipB = SIPSEONG_SIMPLE[sipseongName]?.mods ?? {}

  let 애정 = base + (sibiB["애정"] ?? 0) + (sipB["애정"] ?? 0)
  let 재물 = base + (sibiB["재물"] ?? 0) + (sipB["재물"] ?? 0)
  let 일   = base + (sibiB["일"]   ?? 0) + (sipB["일"]   ?? 0)
  let 건강 = base + (sibiB["건강"] ?? 0) + (sipB["건강"] ?? 0)

  // 오행 상생/상극
  if (generates(todayOhaeng, personMainOhaeng)) { 건강+=10; 일+=8 }
  else if (generates(personMainOhaeng, todayOhaeng)) { 재물+=10; 애정+=5 }
  else if (todayOhaeng === personMainOhaeng) { 건강+=5; 애정+=5 }
  else if (controls(todayOhaeng, personMainOhaeng)) { 건강-=10; 일-=5; 애정-=5 }
  else if (controls(personMainOhaeng, todayOhaeng)) { 재물+=12; 일+=5 }

  // 지지 오행도 반영
  if (generates(todayBranchOhaeng, personMainOhaeng)) { 건강+=5 }
  else if (controls(todayBranchOhaeng, personMainOhaeng)) { 건강-=5 }

  // 신살
  for (const s of sinsal) {
    애정 += s.scoreMod["애정"] ?? 0
    재물 += s.scoreMod["재물"] ?? 0
    일   += s.scoreMod["일"]   ?? 0
    건강 += s.scoreMod["건강"] ?? 0
  }

  const 총운 = clamp(Math.round((애정 + 재물 + 일 + 건강) / 4))
  return { 애정:clamp(애정), 재물:clamp(재물), 일:clamp(일), 건강:clamp(건강), 총운 }
}

// ── 일진 설명 ─────────────────────────────────────────────────
const ILJIN_DESC: Record<Ohaeng, string> = {
  목: "오늘은 나무 기운이 가득해요. 성장하고 도전하기 좋은 날이에요.",
  화: "오늘은 불꽃 기운이 강해요. 열정적으로 활동하기 좋아요.",
  토: "오늘은 흙 기운이 안정적이에요. 차분하게 계획을 세우는 날이에요.",
  금: "오늘은 금 기운이 맑아요. 결단력 있게 처리하기 좋은 날이에요.",
  수: "오늘은 물 기운이 흘러요. 지혜롭게 판단하고 소통하기 좋아요.",
}

// ── 메인 export ──────────────────────────────────────────────
export interface FortuneResult {
  scores: FortuneScores
  iljin: {
    stemName: string; stemChar: string; branchName: string; branchChar: string
    stemOhaeng: Ohaeng; branchOhaeng: Ohaeng; combined: string; desc: string
  }
  sipseong: {
    name: string; title: string; emoji: string; fortune: string
  }
  sibiUnseong: {
    name: string; emoji: string; vitality: number; desc: string
  }
  sinsal: SinsalEntry[]
  todayDate: string
}

export function calcFortune(pillars: PillarInfo[], mainOhaeng: Ohaeng, today: Date): FortuneResult {
  const t = todayPillar(today)
  const tStemIdx = t.stemIdx
  const tBranchIdx = t.branchIdx

  // 내 일간 index
  const dayPillar = pillars.find(p => p.pillar === "일주")!
  const yearPillar = pillars.find(p => p.pillar === "연주")
  const personDayStemName = dayPillar.stemName
  const personDayStemIdx = CHEONGAN.indexOf(personDayStemName)
  const personDayBranchIdx = JIJI.indexOf(dayPillar.branchName)
  const personYearBranchIdx = yearPillar ? JIJI.indexOf(yearPillar.branchName) : -1

  // 십이운성: 내 일간 vs 오늘 지지
  const sibiStage = getSibiUnseong(personDayStemIdx, tBranchIdx)

  // 십성: 오늘 일간이 나에게 어떤 역할인가
  const sipseongName = getSipseong(personDayStemIdx, tStemIdx)
  const sipseongInfo = SIPSEONG_SIMPLE[sipseongName]!

  // 신살
  const sinsal = detectSinsal(
    personDayStemIdx,
    personYearBranchIdx >= 0 ? personYearBranchIdx : 0,
    tBranchIdx,
    personDayStemIdx,
    personDayBranchIdx,
  )

  // 점수
  const todayOhaeng = CHEONGAN_OHAENG[tStemIdx]
  const todayBranchOhaeng = JIJI_OHAENG[tBranchIdx]
  const scores = calcScores(sibiStage, sipseongName, mainOhaeng, todayOhaeng, todayBranchOhaeng, sinsal)

  const tStemName = CHEONGAN[tStemIdx]
  const tBranchName = JIJI[tBranchIdx]

  return {
    scores,
    iljin: {
      stemName: tStemName, stemChar: CHEONGAN_CHAR[tStemIdx],
      branchName: tBranchName, branchChar: JIJI_CHAR[tBranchIdx],
      stemOhaeng: todayOhaeng, branchOhaeng: todayBranchOhaeng,
      combined: `${tStemName}${tBranchName}일`,
      desc: ILJIN_DESC[todayOhaeng],
    },
    sipseong: {
      name: sipseongName,
      title: sipseongInfo.title,
      emoji: sipseongInfo.emoji,
      fortune: sipseongInfo.fortune,
    },
    sibiUnseong: {
      name: sibiStage,
      emoji: SIBI_EMOJI[sibiStage],
      vitality: SIBI_VITALITY[sibiStage] ?? 55,
      desc: SIBI_DESC[sibiStage],
    },
    sinsal,
    todayDate: today.toLocaleDateString("ko-KR", { month:"long", day:"numeric", weekday:"long", timeZone:"Asia/Seoul" }),
  }
}

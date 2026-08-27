import { NextRequest, NextResponse } from "next/server"
import KoreanLunarCalendar from "korean-lunar-calendar"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateSaju, getCurrentSeason } from "@/lib/saju"
import { birthFlowerSelection } from "@/lib/diyFlowerTags"
import type { Ohaeng } from "@/lib/saju"
import { calcFortune } from "@/lib/fortune"
import type { AnalyzeResult, SajuFlower } from "@/types/saju"
import { flowerOhaengProfile, flowerColorWord, isPeakSeason } from "@/lib/ohaengProfile"
import { RECOMMENDABLE_CATALOG, catalogProfileInput } from "@/lib/flowerCatalog"
import { speciesSearchQuery, countSpeciesProducts } from "@/lib/sajuFlowerLink"
import { flowerStory, lookupFlowerMeaning } from "@/lib/flowerStory"
import {
  ohaengBalance, balanceAfter, ohaengPctAfter, idealBalanceDelta, ohaengFit,
  topByOhaeng, pickDiverse, blendScore, buildReasons,
  personalPreferenceDetail, personalScore, wealthOhaeng, loveOhaeng,
  birthColorOhaeng, OBANGSAEK_OHAENG,
  type UserPersonalization, type OhaengCounts,
} from "@/lib/recommendation"

const OHAENG_ALL: Ohaeng[] = ["목", "화", "토", "금", "수"]
const EVEN_SHARE = 20 // 오행 5등분 기준선(%)

export async function POST(req: NextRequest) {
  const { birthDate, calendarType = "solar", name, gender, birthHour = "unknown", city } = await req.json()

  if (!birthDate) return NextResponse.json({ error: "birthDate is required" }, { status: 400 })

  let date = new Date(birthDate)
  if (isNaN(date.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 })

  // 음력 입력은 양력으로 변환 후 계산 (사주는 절기 = 태양 기준이므로 양력 날짜가 필요)
  if (calendarType === "lunar") {
    const cal = new KoreanLunarCalendar()
    const ok = cal.setLunarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), false)
    if (!ok) return NextResponse.json({ error: "유효하지 않은 음력 날짜입니다" }, { status: 400 })
    const solar = cal.getSolarCalendar()
    date = new Date(Date.UTC(solar.year, solar.month - 1, solar.day))
  }

  const saju = calculateSaju(date, birthHour)
  const currentSeason = getCurrentSeason()

  // 개인화(탄생화·탄생컬러)용 사용자 정보 — 양력 기준 생월·생일
  const bMonth = date.getUTCMonth() + 1
  const bDay = date.getUTCDate()
  const user: UserPersonalization = {
    monthDay: `${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`,
    month: bMonth,
    mainOhaeng: saju.mainOhaeng,
  }
  const fortune = calcFortune(saju.pillars, saju.mainOhaeng, new Date())

  // 오행 분포 — 계산은 반올림 전 글자 수로 한다.
  // 퍼센트는 오행마다 반올림돼 합이 100이 아닌 경우가 흔하므로(예: [1,1,2,2,2] → 101) 표시용으로만 쓴다.
  const counts: OhaengCounts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  saju.pillars.forEach(p => { counts[p.stemOhaeng]++; counts[p.branchOhaeng]++ })
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const pct = Object.fromEntries(
    OHAENG_ALL.map(o => [o, total > 0 ? Math.round((counts[o] / total) * 100) : 0])
  ) as Record<Ohaeng, number>
  // 가장 부족한 기운 하나만 추천에 사용 (20% 미만일 때만 — 균형 잡힌 사주는 없음)
  const weakest = OHAENG_ALL.reduce((a, b) => (counts[b] < counts[a] ? b : a))
  const lackingOhaeng = pct[weakest] < 20 ? [weakest] : []
  const excessOhaeng = OHAENG_ALL.reduce((a, b) => (counts[b] > counts[a] ? b : a))
  const balance = ohaengBalance(counts)
  const idealDelta = idealBalanceDelta(counts)

  // 생년월일에서 나온 개인 정보 — 추천 가점에도 쓰이고 결과 화면에도 명시한다.
  const birthSel = user.monthDay ? birthFlowerSelection(user.monthDay) : null
  const birthFlower = birthSel
    ? {
        name: birthSel.name,
        color: flowerColorWord(birthSel.name, [birthSel.color]),
        meaning: lookupFlowerMeaning(birthSel.name, birthSel.color),
      }
    : null
  const birthColorOh = birthColorOhaeng(user)
  const birthColor = { name: OBANGSAEK_OHAENG[birthColorOh].name, ohaeng: birthColorOh }

  // 추천 후보는 보유 상품이 아니라 꽃 카탈로그다 — 상품이 없는 꽃도 그 사람에게 맞으면 추천한다.
  // 재고·판매상태 필터가 필요 없어졌고, 추모 연상 항목은 카탈로그가 이미 걸러 둔다.
  const scored = RECOMMENDABLE_CATALOG.map((flower) => {
    const input = catalogProfileInput(flower)
    const detail = personalPreferenceDetail({ id: flower.id, name: flower.name, colorTags: [flower.color] }, user)
    return {
      flower,
      input,
      id: flower.id,
      name: flower.name,
      profile: flowerOhaengProfile(input),
      detail,
      personal: personalScore(detail),
    }
  })

  // "이 꽃 사러가기"가 상품 검색으로 갈지 나만의 꽃다발로 갈지 판정할 재료.
  // 이미 메모리에 있는 상품명에서 세므로 추가 I/O가 없다. 조회가 실패하면 전부 0이 되어
  // 모든 카드가 나만의 꽃다발로 향한다 — 추천 자체는 상품과 무관하므로 치명적이지 않다.
  const { data: productRows } = await supabaseAdmin
    .from("Product")
    .select("name, useTags")
    .eq("isActive", true)
    .in("saleStatus", ["ON_SALE", "SOLD_OUT"])
    .limit(1000)
  const productNames = (productRows ?? [])
    .filter((p) => !(p.useTags ?? []).includes("추모"))
    .map((p) => p.name as string)

  // 오행 궁합 — 그 꽃을 더했을 때 사주 분포가 얼마나 고르게 되는가로 주 추천을 뽑는다.
  const rankedMain = scored
    .map((s) => ({ ...s, score: blendScore(ohaengFit(counts, s.profile, idealDelta), s.personal) }))
    .sort((a, b) => b.score - a.score)

  type Scored = (typeof rankedMain)[number]

  /** 그 꽃의 균형 개선을 가장 크게 이끈 오행 — 근거를 이 오행으로 설명해야 어긋나지 않는다. */
  const driverOhaeng = (profile: Record<Ohaeng, number>) =>
    OHAENG_ALL.reduce((a, b) =>
      profile[b] * (EVEN_SHARE - pct[b]) > profile[a] * (EVEN_SHARE - pct[a]) ? b : a,
    )

  // 필드를 명시해 조립한다 — 예전에는 상품 객체를 스프레드해서 useTags·stock·description까지
  // 응답으로 새어나갔다. 명시 조립이라야 아래 satisfies가 드리프트를 실제로 잡는다.
  const toCard = (s: Scored, target: Ohaeng, opts?: { excess?: boolean; seasonal?: boolean }): SajuFlower => ({
    id: s.flower.id,
    name: s.flower.name,
    species: s.flower.species,
    emoji: s.flower.emoji,
    img: s.flower.img,
    searchQuery: speciesSearchQuery(s.flower.species),
    productCount: countSpeciesProducts(productNames, s.flower.species),
    flowerMeaning: lookupFlowerMeaning(s.flower.name, s.flower.color),
    score: Math.round(100 * s.score),
    reasons: buildReasons({
      product: s.input,
      target,
      profile: s.profile,
      personal: s.detail,
      excessOhaeng: opts?.excess ? excessOhaeng : null,
      seasonal: opts?.seasonal,
    }),
  })

  const recommendedFlowers = pickDiverse(rankedMain, 4).map((s) => ({
    ...toCard(s, driverOhaeng(s.profile), { excess: true }),
    balanceBefore: Math.round(balance),
    balanceAfter: Math.round(balanceAfter(counts, s.profile)),
    pctAfter: ohaengPctAfter(counts, s.profile),
    story: flowerStory(s.input, driverOhaeng(s.profile), {
      lacking: lackingOhaeng[0] ?? null,
      excess: excessOhaeng,
    }),
  }))

  // 운세별 추천 — 재물운(재성)·연애운(식상) 오행 프로필이 높은 꽃
  const wealth = wealthOhaeng(saju.mainOhaeng)
  const love = loveOhaeng(saju.mainOhaeng)
  // 주 추천에 이미 나온 꽃은 다른 리스트에서 뺀다 — 후보가 상품 수백 개에서 꽃 87개로 줄어
  // 같은 꽃이 네 리스트에 반복되면 "아까 본 꽃"이라는 인상을 준다.
  const shown = new Set(recommendedFlowers.map((f) => f.id))
  const wealthFlowers = topByOhaeng(scored, wealth, 4, shown).map((s) => toCard(s, wealth))
  const loveFlowers = topByOhaeng(scored, love, 4, shown).map((s) => toCard(s, love))

  // 계절 추천 — 같은 후보군에서 지금이 주개화기인 꽃만. 개화기 큐레이션은 계절 축과 같은 lookup을
  // 쓴다(isPeakSeason) — 그래야 "제철 리스트엔 있는데 계절 점수는 0"인 꽃이 생기지 않는다.
  const seasonalFlowers = pickDiverse(
    rankedMain.filter((s) => !shown.has(s.id) && isPeakSeason(s.name, currentSeason)), 4,
  ).map((s) => toCard(s, driverOhaeng(s.profile), { seasonal: true }))

  return NextResponse.json({
    ohaeng: saju.mainOhaeng,
    profile: saju.profile,
    pillars: saju.pillars,
    hasHour: saju.hasHour,
    name,
    gender,
    birthDate,
    birthHour,
    city,
    calendarType,
    balance: Math.round(balance),
    ohaengPct: pct,
    lackingOhaeng,
    birthFlower,
    birthColor,
    fortune,
    recommendedFlowers,
    wealthFlowers,
    loveFlowers,
    seasonalFlowers,
  } satisfies AnalyzeResult)
}

import { NextRequest, NextResponse } from "next/server"
import KoreanLunarCalendar from "korean-lunar-calendar"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateSaju, getCurrentSeason } from "@/lib/saju"
import type { Ohaeng } from "@/lib/saju"
import { calcFortune } from "@/lib/fortune"
import type { AnalyzeResult } from "@/types/saju"
import { flowerOhaengProfile } from "@/lib/ohaengProfile"
import {
  ohaengBalance, balanceAfter, ohaengPctAfter, idealBalanceDelta, ohaengFit,
  topByOhaeng, pickDiverse, blendScore, buildReasons, isRecommendable,
  personalPreferenceDetail, personalScore, wealthOhaeng, loveOhaeng,
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

  // 활성 상품 후보군을 넓게 가져와 꽃 오행 프로필로 점수화한다.
  const { data: candidates } = await supabaseAdmin
    .from("Product")
    .select("id, name, price, images, flowerMeaning, description, category, colorTags, seasonTags, useTags, stock")
    .eq("isActive", true)
    .order("createdAt", { ascending: false })
    .limit(300)

  // 후보별 프로필·개인화·재고를 미리 계산해둔다. 추모 상품은 사주 추천에 올리지 않는다.
  const scored = (candidates ?? []).filter(isRecommendable).map((p) => {
    const detail = personalPreferenceDetail(p, user)
    return {
      product: p,
      id: p.id,
      name: p.name,
      profile: flowerOhaengProfile(p),
      detail,
      personal: personalScore(detail),
      stock: p.stock ?? 0,
    }
  })

  // 오행 궁합 — 그 꽃을 더했을 때 사주 분포가 얼마나 고르게 되는가로 주 추천을 뽑는다.
  const inStock = scored.filter((s) => s.stock > 0)
  const rankedMain = inStock
    .map((s) => ({ ...s, score: blendScore(ohaengFit(counts, s.profile, idealDelta), s.stock, s.personal) }))
    .sort((a, b) => b.score - a.score)

  type Scored = (typeof rankedMain)[number]

  /** 그 꽃의 균형 개선을 가장 크게 이끈 오행 — 근거를 이 오행으로 설명해야 어긋나지 않는다. */
  const driverOhaeng = (profile: Record<Ohaeng, number>) =>
    OHAENG_ALL.reduce((a, b) =>
      profile[b] * (EVEN_SHARE - pct[b]) > profile[a] * (EVEN_SHARE - pct[a]) ? b : a,
    )

  const toCard = (s: Scored, target: Ohaeng, opts?: { excess?: boolean; seasonal?: boolean }) => ({
    ...s.product,
    score: Math.round(100 * s.score),
    reasons: buildReasons({
      product: s.product,
      target,
      profile: s.profile,
      stock: s.stock,
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
  }))

  // 운세별 추천 — 재물운(재성)·연애운(식상) 오행 프로필이 높은 꽃
  const wealth = wealthOhaeng(saju.mainOhaeng)
  const love = loveOhaeng(saju.mainOhaeng)
  const wealthFlowers = topByOhaeng(scored, wealth, 4).map((s) => toCard(s, wealth))
  const loveFlowers = topByOhaeng(scored, love, 4).map((s) => toCard(s, love))

  // 계절 추천 — 별도 쿼리 대신 같은 후보군에서 뽑는다. 품절 제외·추모 제외·점수·근거가 그대로 따라온다.
  const seasonalFlowers = pickDiverse(
    rankedMain.filter((s) => (s.product.seasonTags ?? []).includes(currentSeason)), 4,
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
    fortune,
    recommendedFlowers,
    wealthFlowers,
    loveFlowers,
    seasonalFlowers,
  } satisfies AnalyzeResult & Record<string, unknown>)
}

import { NextRequest, NextResponse } from "next/server"
import KoreanLunarCalendar from "korean-lunar-calendar"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateSaju, getCurrentSeason } from "@/lib/saju"
import type { Ohaeng } from "@/lib/saju"
import { calcFortune } from "@/lib/fortune"
import { whoGenerates } from "@/lib/ohaengMatching"
import { flowerOhaengProfile } from "@/lib/ohaengProfile"
import {
  needVector, balanceGain, normalizeGains,
  blendScore, personalPreferenceScore, wealthOhaeng, loveOhaeng,
  type UserPersonalization,
} from "@/lib/recommendation"

const OHAENG_ALL: Ohaeng[] = ["목", "화", "토", "금", "수"]

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

  // 오행 분포 계산 — 부족한 기운 판별
  const raw: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  saju.pillars.forEach(p => { raw[p.stemOhaeng]++; raw[p.branchOhaeng]++ })
  const total = Object.values(raw).reduce((a, b) => a + b, 0)
  const pct = Object.fromEntries(
    OHAENG_ALL.map(o => [o, total > 0 ? Math.round((raw[o] / total) * 100) : 0])
  ) as Record<Ohaeng, number>
  // 가장 부족한 기운 하나만 추천에 사용 (20% 미만일 때만 — 균형 잡힌 사주는 없음)
  const weakest = OHAENG_ALL.reduce((a, b) => (pct[b] < pct[a] ? b : a))
  const lackingOhaeng = pct[weakest] < 20 ? [weakest] : []

  // 활성 상품 후보군을 넓게 가져와 꽃 오행 프로필로 점수화한다.
  const [{ data: candidates }, { data: seasonalData }] = await Promise.all([
    supabaseAdmin
      .from("Product")
      .select("id, name, price, images, flowerMeaning, description, category, colorTags, seasonTags, stock")
      .eq("isActive", true)
      .order("createdAt", { ascending: false })
      .limit(300),
    supabaseAdmin
      .from("Product")
      .select("id, name, price, images, flowerMeaning, category")
      .eq("isActive", true)
      .contains("seasonTags", [currentSeason])
      .limit(4),
  ])

  // 후보별 프로필·개인화·재고를 미리 계산해둔다.
  const scored = (candidates ?? []).map((p) => ({
    product: p,
    profile: flowerOhaengProfile(p),
    personal: personalPreferenceScore(p, user),
    stock: p.stock ?? 0,
  }))

  // 균형 최적화 — 사주 오행 분포의 부족분을 얼마나 채워주는가로 주 추천을 뽑는다.
  const need = needVector(pct)
  const balanceNorm = normalizeGains(scored.map((s) => balanceGain(s.profile, need)))
  const recommendedFlowers = scored
    .map((s, i) => ({ s, score: blendScore(balanceNorm[i], s.stock, s.personal) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.s.product)

  // 특정 오행을 채우는 리스트 — 프로필[오행]을 사주 점수로, 재고·개인화를 블렌딩. 품절 제외.
  function topByOhaeng(target: Ohaeng, limit: number, exclude = new Set<string>()) {
    return scored
      .filter((s) => s.stock > 0 && !exclude.has(s.product.id))
      .map((s) => ({ s, score: blendScore(s.profile[target] / 100, s.stock, s.personal) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.s.product)
  }

  // 부족한 기운에 맞는 상품이 모자라면, 그 기운을 낳아주는(상생) 오행 상품으로 채운다.
  const lackingProducts = lackingOhaeng.map((o) => {
    const exact = topByOhaeng(o, 3)
    const products = exact.length >= 3
      ? exact
      : [...exact, ...topByOhaeng(whoGenerates(o), 3 - exact.length, new Set(exact.map((p) => p.id)))]
    return { ohaeng: o, products }
  })

  // 운세별 추천 — 재물운(재성)·연애운(식상) 오행 프로필이 높은 꽃
  const wealthFlowers = topByOhaeng(wealthOhaeng(saju.mainOhaeng), 4)
  const loveFlowers = topByOhaeng(loveOhaeng(saju.mainOhaeng), 4)

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
    lackingProducts,
    fortune,
    recommendedFlowers,
    wealthFlowers,
    loveFlowers,
    seasonalFlowers: seasonalData ?? [],
  })
}

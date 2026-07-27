import { NextRequest, NextResponse } from "next/server"
import KoreanLunarCalendar from "korean-lunar-calendar"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateSaju, getCurrentSeason } from "@/lib/saju"
import type { Ohaeng } from "@/lib/saju"
import { calcFortune } from "@/lib/fortune"
import { scoreOhaengMatch, whoGenerates } from "@/lib/ohaengMatching"

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

  // 활성 상품 후보군을 넓게 가져와 색상·계절·꽃말 3축 점수(등록 시 자동 태깅과 동일 기준)로 정렬한다.
  const [{ data: candidates }, { data: seasonalData }] = await Promise.all([
    supabaseAdmin
      .from("Product")
      .select("id, name, price, images, flowerMeaning, description, category, colorTags, seasonTags")
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

  const scored = (candidates ?? []).map((p) => ({ product: p, scores: scoreOhaengMatch(p) }))

  function topByOhaeng(target: Ohaeng, limit: number, exclude = new Set<string>()) {
    return scored
      .filter((s) => !exclude.has(s.product.id))
      .sort((a, b) => b.scores[target] - a.scores[target])
      .slice(0, limit)
      .map((s) => s.product)
  }

  const recommendedFlowers = topByOhaeng(saju.mainOhaeng, 4)

  // 부족한 기운에 정확히 맞는 상품이 모자라면, 그 기운을 낳아주는(상생) 오행 상품으로 채운다.
  const lackingProducts = lackingOhaeng.map((o) => {
    const exact = topByOhaeng(o, 3)
    const products = exact.length >= 3
      ? exact
      : [...exact, ...topByOhaeng(whoGenerates(o), 3 - exact.length, new Set(exact.map((p) => p.id)))]
    return { ohaeng: o, products }
  })

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
    seasonalFlowers: seasonalData ?? [],
  })
}

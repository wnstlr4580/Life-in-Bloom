import { NextRequest, NextResponse } from "next/server"
import KoreanLunarCalendar from "korean-lunar-calendar"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateSaju, getCurrentSeason } from "@/lib/saju"
import type { Ohaeng } from "@/lib/saju"
import { calcFortune } from "@/lib/fortune"

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
  const lackingOhaeng = OHAENG_ALL.filter(o => pct[o] < 20)

  // 부족한 기운별 상품 조회 + 대표 오행 상품 + 계절 상품 병렬 조회
  const lackingQueries = lackingOhaeng.map(o =>
    supabaseAdmin
      .from("Product")
      .select("id, name, price, images, flowerMeaning, category")
      .eq("isActive", true)
      .contains("ohaengTags", [o])
      .limit(3)
  )

  const [ohaengResult, seasonalResult, ...lackingResults] = await Promise.all([
    supabaseAdmin
      .from("Product")
      .select("id, name, price, images, flowerMeaning, category")
      .eq("isActive", true)
      .contains("ohaengTags", [saju.mainOhaeng])
      .limit(4),
    supabaseAdmin
      .from("Product")
      .select("id, name, price, images, flowerMeaning, category")
      .eq("isActive", true)
      .contains("seasonTags", [currentSeason])
      .limit(4),
    ...lackingQueries,
  ])

  const lackingProducts = lackingOhaeng.map((o, i) => ({
    ohaeng: o,
    products: lackingResults[i]?.data ?? [],
  }))

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
    recommendedFlowers: ohaengResult.data ?? [],
    seasonalFlowers: seasonalResult.data ?? [],
  })
}

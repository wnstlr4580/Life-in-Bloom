import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { analyzeOhaeng, OHAENG_PROFILE, getCurrentSeason } from "@/lib/saju"

export async function POST(req: NextRequest) {
  const { birthDate, calendarType = "solar" } = await req.json()

  if (!birthDate) {
    return NextResponse.json({ error: "birthDate is required" }, { status: 400 })
  }

  const date = new Date(birthDate)
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 })
  }

  const ohaeng = analyzeOhaeng(date)
  const profile = OHAENG_PROFILE[ohaeng]
  const currentSeason = getCurrentSeason()

  // 오행 태그로 상품 추천
  const [ohaengProducts, seasonalProducts] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        ohaengTags: { has: ohaeng },
      },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        flowerMeaning: true,
        category: true,
      },
      take: 4,
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        seasonTags: { has: currentSeason },
        ohaengTags: { has: ohaeng, hasSome: undefined },
      },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        flowerMeaning: true,
        category: true,
      },
      take: 4,
    }),
  ])

  return NextResponse.json({
    ohaeng,
    profile,
    calendarType,
    birthDate,
    recommendedFlowers: ohaengProducts,
    seasonalFlowers: seasonalProducts,
  })
}

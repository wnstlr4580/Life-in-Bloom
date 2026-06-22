import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const ohaeng = searchParams.get("ohaeng")
  const color = searchParams.get("color")
  const page = Number(searchParams.get("page") ?? "1")
  const limit = 12

  const where = {
    isActive: true,
    ...(category && { category }),
    ...(ohaeng && { ohaengTags: { has: ohaeng } }),
    ...(color && { colorTags: { has: color } }),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        flowerMeaning: true,
        category: true,
        stock: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({ products, total, page, totalPages: Math.ceil(total / limit) })
}

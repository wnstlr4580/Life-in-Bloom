import { NextResponse } from "next/server"
import { requireSeller } from "@/lib/authorization"
import { classifyProductOhaeng, suggestBouquetNames } from "@/lib/product-ohaeng"

export async function POST(req: Request) {
  const actor = await requireSeller()
  if (!actor?.seller) return NextResponse.json({ error: "판매자 로그인이 필요해요" }, { status: 403 })
  const input = await req.json()
  return NextResponse.json({ ohaengTags: classifyProductOhaeng(input), names: suggestBouquetNames(input) })
}

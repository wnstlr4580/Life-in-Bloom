import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from("SellerStock")
    .select("flowerCode")
    .or("availableForDiy.eq.true,availableForCustom.eq.true")
    .eq("isVisible", true)
    .eq("isActive", true)
    .gt("quantity", 0)
    .or(`displayStartAt.is.null,displayStartAt.lte.${now}`)
    .or(`displayEndAt.is.null,displayEndAt.gte.${now}`)

  if (error) {
    return NextResponse.json({ error: "판매 가능한 꽃 재고를 확인하지 못했어요." }, { status: 500 })
  }

  const flowerIds = [...new Set((data ?? []).map((stock) => String(stock.flowerCode)))]
  return NextResponse.json({ flowerIds })
}

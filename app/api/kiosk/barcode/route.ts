import { NextRequest, NextResponse } from "next/server"
import { normalizeBarcode } from "@/lib/barcode"
import { pickPurchasedFlower } from "@/lib/kiosk/flowers"
import { supabaseAdmin } from "@/lib/supabase"

// 포토부스 "구매한 꽃" — 판매처 재고에 등록된 바코드로 꽃을 찾는다.
export async function GET(req: NextRequest) {
  const { barcode, error } = normalizeBarcode(req.nextUrl.searchParams.get("code"))
  if (!barcode) return NextResponse.json({ error: error ?? "바코드를 스캔해주세요" }, { status: 400 })

  const { data, error: queryError } = await supabaseAdmin
    .from("SellerStock")
    .select("flowerCode, flowerName, color, seller:Seller!inner(marketName, status)")
    .eq("barcode", barcode)
    .eq("isActive", true)
    .eq("seller.status", "APPROVED")
    .limit(1)
  if (queryError) return NextResponse.json({ error: "바코드를 조회하지 못했어요" }, { status: 500 })

  const stock = data?.[0]
  if (!stock) return NextResponse.json({ error: "등록되지 않은 바코드예요. 직원에게 문의해주세요" }, { status: 404 })
  const preset = pickPurchasedFlower(stock)
  if (!preset) return NextResponse.json({ error: `${stock.flowerName}은(는) 아직 포토부스 배경이 준비되지 않았어요` }, { status: 404 })
  const seller = Array.isArray(stock.seller) ? stock.seller[0] : stock.seller
  return NextResponse.json({ preset, flowerName: stock.flowerName, marketName: seller?.marketName ?? null })
}

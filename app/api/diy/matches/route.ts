import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { SIZES } from "@/lib/customFlowers"

type RequestedFlower = { id: string; quantity: number }
type SellerRow = {
  id: string
  marketName: string
  sellerType: string
  roadAddress: string
  detailAddress: string
  publicPhone: string | null
  latitude: number | string | null
  longitude: number | string | null
  isOpen: boolean
  offersCustomBouquet: boolean
  offersDiyFlowers: boolean
  customDeliveryScope: string
  customDeliveryRegions: string[]
}
type StockRow = {
  sellerId: string
  flowerCode: string
  flowerName: string
  quantity: number
  unitPrice: number
  unit: string
  availableForDiy: boolean
  availableForCustom: boolean
}
type MatchItem = {
  id: string
  name: string
  requested: number
  available: number
  unitPrice: number | null
  subtotal: number | null
}

const radians = (value: number) => value * Math.PI / 180

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadius = 6371
  const dLat = radians(lat2 - lat1)
  const dLng = radians(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function addressScore(userAddress: string, sellerAddress: string) {
  const tokens = userAddress.trim().split(/\s+/).filter((token) => token.length > 1).slice(0, 3)
  return tokens.reduce((score, token, index) => score + (sellerAddress.includes(token) ? 3 - index : 0), 0)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const flowers: RequestedFlower[] = (Array.isArray(body?.flowers) ? body.flowers : [])
    .map((flower: RequestedFlower) => ({
      id: String(flower?.id ?? "").slice(0, 100),
      quantity: Number(flower?.quantity),
    }))
    .filter((flower: RequestedFlower) => flower.id && Number.isInteger(flower.quantity) && flower.quantity > 0)

  if (flowers.length === 0 || flowers.length > 10) {
    return NextResponse.json({ error: "꽃과 송이 수를 확인해주세요." }, { status: 400 })
  }

  const size = SIZES.find((item) => item.id === body?.sizeId)
  const totalStems = flowers.reduce((sum, flower) => sum + flower.quantity, 0)
  if (!size || totalStems > size.stems || flowers.length > size.maxVarieties) {
    return NextResponse.json(
      { error: size ? `${size.name} 크기는 최대 ${size.stems}송이, ${size.maxVarieties}종까지 선택할 수 있어요.` : "꽃다발 크기를 확인해주세요." },
      { status: 400 },
    )
  }

  const latitude = Number(body?.latitude)
  const longitude = Number(body?.longitude)
  const hasCoordinates = body?.latitude !== null && body?.latitude !== undefined
    && body?.longitude !== null && body?.longitude !== undefined
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  const address = String(body?.address ?? "").trim().slice(0, 200)
  const radiusKm = Math.min(5, Math.max(1, Number(body?.radiusKm) || 3))
  const preferredSellerId = typeof body?.preferredSellerId === "string" ? body.preferredSellerId : null
  const fulfillmentMode = body?.fulfillmentMode === "diy" ? "diy" : "custom"
  const flowerIds = flowers.map((flower: RequestedFlower) => flower.id)
  const now = new Date().toISOString()

  const { data: stockData, error: stockError } = await supabaseAdmin
    .from("SellerStock")
    .select("sellerId, flowerCode, flowerName, quantity, unitPrice, unit, availableForDiy, availableForCustom")
    .in("flowerCode", flowerIds)
    .or("availableForDiy.eq.true,availableForCustom.eq.true")
    .eq("isVisible", true)
    .eq("isActive", true)
    .gt("quantity", 0)
    .or(`displayStartAt.is.null,displayStartAt.lte.${now}`)
    .or(`displayEndAt.is.null,displayEndAt.gte.${now}`)

  if (stockError) {
    return NextResponse.json({ error: "DIY 재고를 확인하지 못했어요." }, { status: 500 })
  }

  const stocks = (stockData ?? []) as StockRow[]
  const sellerIds = [...new Set([...stocks.map((stock) => stock.sellerId), ...(preferredSellerId ? [preferredSellerId] : [])])]
  if (sellerIds.length === 0) return NextResponse.json({ matches: [], radiusKm })

  const { data: sellerData, error: sellerError } = await supabaseAdmin
    .from("Seller")
    .select("id, marketName, sellerType, roadAddress, detailAddress, publicPhone, latitude, longitude, isOpen, offersCustomBouquet, offersDiyFlowers, customDeliveryScope, customDeliveryRegions")
    .in("id", sellerIds)
    .eq("status", "APPROVED")
    .eq("isOpen", true)

  if (sellerError) {
    return NextResponse.json({ error: "판매처 정보를 확인하지 못했어요." }, { status: 500 })
  }

  const sellers = (sellerData ?? []) as SellerRow[]
  const matches = sellers.map((seller) => {
    const sellerStocks = stocks.filter((stock) => stock.sellerId === seller.id)
    const buildItems = (mode: "diy" | "custom"): MatchItem[] => flowers.map((requested: RequestedFlower) => {
      const candidates = sellerStocks
        .filter((stock) => stock.flowerCode === requested.id && stock.unit === "STEM")
        .filter((stock) => mode === "diy" ? stock.availableForDiy : stock.availableForCustom)
        .sort((a, b) => a.unitPrice - b.unitPrice)
      const stock = candidates[0]
      const available = Math.min(stock?.quantity ?? 0, requested.quantity)
      return {
        id: requested.id,
        name: stock?.flowerName ?? requested.id,
        requested: requested.quantity,
        available,
        unitPrice: stock?.unitPrice ?? null,
        subtotal: stock ? stock.unitPrice * requested.quantity : null,
      }
    })
    const diyItems = buildItems("diy")
    const customItems = buildItems("custom")
    const sellerLat = Number(seller.latitude)
    const sellerLng = Number(seller.longitude)
    const hasSellerCoordinates = Number.isFinite(sellerLat) && Number.isFinite(sellerLng)
    const distance = hasCoordinates && hasSellerCoordinates
      ? distanceKm(latitude, longitude, sellerLat, sellerLng)
      : null
    const diyFulfilledCount = diyItems.filter((item) => item.available >= item.requested).length
    const customFulfilledCount = customItems.filter((item) => item.available >= item.requested).length
    const withinRadius = distance === null || distance <= radiusKm
    const diyComplete = seller.offersDiyFlowers && withinRadius && diyFulfilledCount === flowers.length
    const customComplete = seller.offersCustomBouquet && seller.customDeliveryScope !== "NONE" && customFulfilledCount === flowers.length
    const diyPrice = diyComplete ? diyItems.reduce((sum, item) => sum + (item.subtotal ?? 0), 0) : null
    const customPrice = customComplete
      ? customItems.reduce((sum, item) => sum + (item.subtotal ?? 0), 0) + 10000
      : null
    return {
      sellerId: seller.id,
      marketName: seller.marketName,
      sellerType: seller.sellerType,
      roadAddress: seller.roadAddress,
      detailAddress: seller.detailAddress,
      publicPhone: seller.publicPhone,
      distanceKm: distance === null ? null : Math.round(distance * 10) / 10,
      latitude: hasSellerCoordinates ? sellerLat : null,
      longitude: hasSellerCoordinates ? sellerLng : null,
      addressScore: address ? addressScore(address, seller.roadAddress) : 0,
      complete: diyComplete || customComplete,
      fulfilledCount: Math.max(diyFulfilledCount, customFulfilledCount),
      requestedCount: flowers.length,
      totalPrice: diyPrice ?? customPrice,
      items: diyComplete ? diyItems : customItems,
      diyItems,
      customItems,
      diyComplete,
      customComplete,
      diyPrice,
      customPrice,
      withinRadius,
      preferred: seller.id === preferredSellerId,
      customDeliveryScope: seller.customDeliveryScope,
      customDeliveryRegions: seller.customDeliveryRegions ?? [],
    }
  }).filter((match) => match.diyComplete || match.customComplete || match.preferred)
    .sort((a, b) => {
      if (fulfillmentMode === "custom" && (a.customDeliveryScope === "NATIONWIDE") !== (b.customDeliveryScope === "NATIONWIDE")) return a.customDeliveryScope === "NATIONWIDE" ? -1 : 1
      if (a.preferred !== b.preferred) return a.preferred ? -1 : 1
      if (a.diyComplete !== b.diyComplete) return a.diyComplete ? -1 : 1
      if (hasCoordinates) return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)
      if (a.addressScore !== b.addressScore) return b.addressScore - a.addressScore
      return b.fulfilledCount - a.fulfilledCount
    })

  return NextResponse.json({ matches, radiusKm })
}

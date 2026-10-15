import { WRAPPING } from "./customFlowers"

const validFee = (fee: unknown): fee is number => typeof fee === "number" && Number.isInteger(fee) && fee >= 0 && fee <= 100000

export function bouquetPrice(materialPrice: number, fee: unknown) {
  return validFee(fee) ? materialPrice + fee : null
}

// 판매자센터에서 포장 방식별로 입력한 포장재료비. 등록하지 않은 포장은 null (0원으로 취급하지 않음)
export function sellerWrappingPrice(prices: unknown, wrappingId: string) {
  if (!prices || typeof prices !== "object") return null
  const value = (prices as Record<string, unknown>)[wrappingId]
  return validFee(value) ? value : null
}

// 저장 전 검증: 알려진 포장 id + 0~100,000원 정수만 남긴다. 잘못된 값이 있으면 null
export function cleanWrappingPrices(value: unknown): Record<string, number> | null {
  if (value == null) return {}
  if (typeof value !== "object" || Array.isArray(value)) return null
  const result: Record<string, number> = {}
  for (const [id, price] of Object.entries(value as Record<string, unknown>)) {
    if (price === null || price === "") continue
    if (!WRAPPING.some((item) => item.id === id) || !validFee(price)) return null
    result[id] = price
  }
  return result
}

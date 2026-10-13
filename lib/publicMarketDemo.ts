import { APPROX_STEMS_PER_BUNDLE, purchaseLine } from "./publicMarketPricing"

// Deliberately synthetic fixtures, shared across markets. Never persist as auction observations.
const BUNDLE_PRICES: Record<string, number> = {
  장미: 12000, 튤립: 15000, 백합: 18000, 수국: 15000, 카네이션: 8000,
  거베라: 10000, 안개꽃: 12000, 해바라기: 10000, 프리지아: 9000, 유칼립투스: 10000,
}
export function demoPurchaseQuote(flowers: { id: string; group: string; quantity: number }[]) {
  const items = flowers.map(flower => {
    const stemsPerBundle = APPROX_STEMS_PER_BUNDLE[flower.group] ?? 10
    const bundlePrice = BUNDLE_PRICES[flower.group] ?? 12000
    return { ...flower, stemsPerBundle, bundlePrice, ...purchaseLine(flower.quantity, stemsPerBundle, bundlePrice) }
  })
  return { source: "DEMO_FIXTURE" as const, label: "시연용 예시 가격", items,
    total: items.reduce((sum, item) => sum + (item.total ?? 0), 0) }
}

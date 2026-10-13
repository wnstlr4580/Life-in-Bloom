import { describe, expect, it } from "vitest"
import { demoPurchaseQuote } from "../publicMarketDemo"
import { FLOWERS } from "../customFlowers"

describe("시연용 가격", () => {
  it("모든 꽃을 실제 경매값과 분리된 양수 예시 금액으로 계산한다", () => {
    for (const flower of FLOWERS) {
      const quote = demoPurchaseQuote([{ ...flower, quantity: 12 }])
      expect(quote.source).toBe("DEMO_FIXTURE")
      expect(quote.total).toBeGreaterThan(0)
      expect(quote.items[0].spareStems).toBeGreaterThanOrEqual(0)
    }
  })
  it("속 단위 올림과 복합 꽃 합계를 반영한다", () => {
    const quote = demoPurchaseQuote([{ id: "rose-red", group: "장미", quantity: 12 }, { id: "hydrangea-blue", group: "수국", quantity: 1 }])
    expect(quote.total).toBe(39000)
    expect(quote.items[0].spareStems).toBe(8)
  })
})

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { PublicMarketGuide } from "@/components/shop/PublicMarketGuide"
import { publicMarketDirectory } from "@/lib/publicMarketDirectory"

describe("공판장 실제 가격 안내", () => {
  it("가까운 미확보 공판장보다 실제 자료가 있는 공판장을 먼저 보여준다", () => {
    const markets = publicMarketDirectory().map((market, i) => ({ ...market, distanceKm: i + 1,
      auctionReferenceTotal: i >= 3 ? 18000 : null, basisDate: "2026-10-14" }))
    const html = renderToStaticMarkup(<PublicMarketGuide markets={markets} flowers={[{ id: "rose-red", name: "빨간 장미", group: "장미", quantity: 12, stemsPerBundle: 10 }]} onFocus={() => {}} />)
    expect(html).toContain("18,000원")
    expect(html).not.toContain("시연")
    expect(html).not.toContain('id="market-at-yangjae"')
    expect(html).toContain('id="market-gwangju-pungam"')
  })
  it("자료가 전혀 없어도 가짜 금액이나 NaN을 만들지 않는다", () => {
    const html = renderToStaticMarkup(<PublicMarketGuide markets={publicMarketDirectory()} flowers={[{ id: "rose-red", name: "빨간 장미", group: "장미", quantity: 12, stemsPerBundle: 10 }]} onFocus={() => {}} />)
    expect(html).toContain("선택 품목 자료 미확보")
    expect(html).not.toMatch(/시연|24,000원|NaN/)
  })
})

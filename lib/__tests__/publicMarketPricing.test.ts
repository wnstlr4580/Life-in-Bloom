import { describe, expect, it } from "vitest"
import { auctionReference, purchaseLine, type AuctionObservation } from "../publicMarketPricing"
import { parseAtDailyRows } from "../atDailyAuction"
const sourceUrl = "https://flower.at.or.kr/excel/excelDownLoad.do?flowerGubn=1&unit=BUNDLE&parser=2"
const row = (tradeDate: string, quantity: number, averagePrice: number): AuctionObservation => ({ marketId: "at-yangjae", tradeDate, itemName: "장미", quantity, averagePrice, minPrice: 1000, maxPrice: 50000, sourceUrl, fetchedAt: "2026-10-12T04:00:00Z" })

describe("경매 근거와 구매 수량", () => {
  it("소량 최신일이 정상 경매일 대표값을 덮어쓰지 않는다", () => {
    const result = auctionReference([row("2026-10-10", 12, 2100), row("2026-10-09", 14414, 8790), row("2026-10-07", 17084, 8177)], "at-yangjae", "장미", "2026-10-12")
    expect(result.dates).toEqual(["2026-10-09", "2026-10-07"])
    expect(result.average).toBe(Math.round((14414 * 8790 + 17084 * 8177) / (14414 + 17084)))
    expect(result.low).toBe(8177)
    expect(result.high).toBe(8790)
  })
  it("다른 공판장·오래된 가격·미래 날짜·미검증 단위를 섞지 않는다", () => {
    const result = auctionReference([row("2026-09-01", 100, 5000), row("2026-10-13", 100, 5000), { ...row("2026-10-09", 100, 5000), marketId: "other" }, { ...row("2026-10-09", 100, 5000), sourceUrl: "https://flower.at.or.kr/hab09/hab09.do" }], "at-yangjae", "장미", "2026-10-12")
    expect(result.average).toBeNull()
  })
  it("포장단위 미확인 꽃을 임의로 1속으로 계산하지 않는다", () => {
    expect(purchaseLine(12, null, 9000).total).toBeNull()
    expect(purchaseLine(12, 10, 9000)).toEqual({ bundles: 2, spareStems: 8, total: 18000 })
    expect(purchaseLine(12, 0, 9000).total).toBeNull()
    expect(purchaseLine(12, 5, null).total).toBeNull()
  })
})

describe("공식 엑셀 수집 검증", () => {
  const market = { id: "at-yangjae", name: "aT", companyCode: "0000000001" }
  it("같은 이름의 화분 장미를 절화 가격에 섞지 않는다", () => {
    const result = parseAtDailyRows([
      ["부류", "품목", "품종", "거래량", "최저가", "최고가", "평균가"],
      ["분화", "장미", "미니", 12, 2100, 2100, 2100],
      ["절화", "장미", "레드", 100, 4000, 8000, 6000],
      ["절화", "장미", "핑크", 100, 5000, 9000, 8000],
    ], market, "2026-10-09")
    expect(result).toHaveLength(1)
    expect(result[0].averagePrice).toBe(7000)
    expect(result[0].quantity).toBe(200)
    expect(result[0].sourceUrl).toContain("flowerGubn=1")
  })
  it("단위가 없는 기존 7열 파일은 추측하여 수집하지 않는다", () => {
    expect(() => parseAtDailyRows([["품목", "품종", "등급", "수량", "최저가", "최고가", "평균가"], ["장미", "미니", "상", 12, 2100, 2100, 2100]], market, "2026-10-10")).toThrow("검증")
  })
  it("열 순서가 바뀌어도 헤더 기준으로 해석한다", () => {
    const result = parseAtDailyRows([["평균가", "단위", "최고가", "수량", "품목", "최저가"], [7000, "속", 9000, 40, "장미", 4000]], market, "2026-10-09")
    expect(result[0].averagePrice).toBe(7000)
  })
})

import { describe, it, expect } from "vitest"
import { speciesSearchQuery, countSpeciesProducts, flowerBuyHref } from "../sajuFlowerLink"

describe("speciesSearchQuery", () => {
  it("보통은 종명 그대로", () => {
    expect(speciesSearchQuery("장미")).toBe("장미")
    expect(speciesSearchQuery("백합")).toBe("백합")
  })

  it("이표기가 있으면 상품 쪽 표기를 쓴다", () => {
    // 실측: 상품명에 "칼라" 0건, "카라" 1건
    expect(speciesSearchQuery("칼라")).toBe("카라")
    expect(speciesSearchQuery("카모마일")).toBe("캐모마일")
  })

  it("색을 붙이지 않는다 — 검색이 과하게 좁아진다", () => {
    // "흰 백합"으로 검색하면 "순백의 백합 부케"를 놓친다
    expect(speciesSearchQuery("백합")).not.toContain("흰")
  })
})

describe("countSpeciesProducts", () => {
  const names = [
    "순백의 백합 부케",
    "근조 바구니 — 흰 백합",
    "종로구 봄꽃상점 흰 백합 데일리 꽃다발",
    "웨딩 부케 — 화이트 카라",
    "봄날의 튤립 다발",
    "축하 NH생생화환_고급형_2단",
  ]

  it("이름에 종명이 든 상품을 센다", () => {
    expect(countSpeciesProducts(names, "백합")).toBe(3)
    expect(countSpeciesProducts(names, "튤립")).toBe(1)
  })

  it("이표기도 집계한다 — 칼라는 상품명에서 카라로 쓰인다", () => {
    expect(countSpeciesProducts(names, "칼라")).toBe(1)
  })

  it("상품이 없으면 0", () => {
    expect(countSpeciesProducts(names, "작약")).toBe(0)
    expect(countSpeciesProducts([], "장미")).toBe(0)
  })

  it("이름만 본다 — 설명文으로 새지 않는다", () => {
    // 국화는 상품명 일치 0건인데 화환 설명에 92건 등장한다. 설명을 보면 근조화환으로 보낸다.
    expect(countSpeciesProducts(["축하화환 3단", "K플라워박스"], "국화")).toBe(0)
  })
})

describe("flowerBuyHref (D3 분기)", () => {
  it("상품이 있으면 상품 검색으로 — 꽃 id를 함께 실어 폴백 CTA를 가능하게 한다", () => {
    expect(flowerBuyHref({ id: "rose-red", searchQuery: "장미", productCount: 13 }))
      .toBe(`/products?q=${encodeURIComponent("장미")}&flower=rose-red`)
  })

  it("상품이 없으면 나만의 꽃다발로", () => {
    expect(flowerBuyHref({ id: "peony-pink", searchQuery: "작약", productCount: 0 }))
      .toBe("/custom?flowers=peony-pink")
  })

  it("검색어를 URL 인코딩한다", () => {
    const href = flowerBuyHref({ id: "calla-white", searchQuery: "카라", productCount: 1 })
    expect(href).toContain(encodeURIComponent("카라"))
    expect(href).not.toContain("카라")
  })
})

import { describe, expect, it } from "vitest"
import { normalizeBarcode } from "@/lib/barcode"
import { pickPurchasedFlower } from "@/lib/kiosk/flowers"

describe("normalizeBarcode", () => {
  it("빈 값은 바코드 없음", () => expect(normalizeBarcode("")).toEqual({ barcode: null }))
  it("공백·하이픈을 지우고 숫자만 남긴다", () => expect(normalizeBarcode(" 200-1000-000012 ").barcode).toBe("2001000000012"))
  it("숫자 8~14자리가 아니면 오류", () => {
    expect(normalizeBarcode("1234567").error).toBeTruthy()
    expect(normalizeBarcode("12345678901234567").error).toBeTruthy()
    expect(normalizeBarcode("ABC12345").error).toBeTruthy()
  })
})

describe("pickPurchasedFlower", () => {
  it("카탈로그 id 재고는 그대로 연결", () => expect(pickPurchasedFlower({ flowerCode: "rose-red", flowerName: "빨간 장미", color: "레드" })?.id).toBe("rose-red"))
  it("판매자가 직접 등록한 재고는 꽃명·색상으로 연결", () => {
    expect(pickPurchasedFlower({ flowerCode: "장미-화이트-특", flowerName: "장미", color: "화이트" })?.name).toBe("흰 장미")
    expect(pickPurchasedFlower({ flowerCode: "튤립-퍼플-상", flowerName: "튤립", color: "퍼플" })?.name).toBe("보라 튤립")
  })
  it("포토부스 배경이 없는 꽃은 null", () => expect(pickPurchasedFlower({ flowerCode: "x", flowerName: "몬스테라", color: null })).toBeNull())
})

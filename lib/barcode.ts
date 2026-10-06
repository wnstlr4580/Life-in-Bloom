// 상품 바코드 — 숫자 8~14자리(EAN-8·EAN-13·UPC·GTIN-14). 빈 값은 "바코드 없음".
export function normalizeBarcode(value: unknown): { barcode: string | null; error?: string } {
  const text = String(value ?? "").replace(/[\s-]/g, "")
  if (!text) return { barcode: null }
  if (!/^\d{8,14}$/.test(text)) return { barcode: null, error: "바코드는 숫자 8~14자리로 입력해주세요" }
  return { barcode: text }
}

export function bouquetPrice(materialPrice: number, fee: unknown) {
  return typeof fee === "number" && Number.isInteger(fee) && fee >= 0 && fee <= 100000
    ? materialPrice + fee : null
}

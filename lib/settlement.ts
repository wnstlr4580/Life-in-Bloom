export const SETTLEMENT_POLICY = {
  DEFAULT_COMMISSION_RATE: 10,
  COMMISSION_VAT_RATE: 0.1,
  AUTO_CONFIRM_DAYS: 7,
  PAYOUT_WEEKDAY: 5, // 금요일
  PG_FEE_BORNE_BY: "PLATFORM" as const,
}

export type SettlementInput = {
  grossAmount: number
  shippingFeeAmount?: number
  commissionRate?: number
  discountShare?: number
  pgFee?: number
  adjustmentAmount?: number
}

export function calculateSettlement(input: SettlementInput) {
  const grossAmount = Math.max(0, Math.round(input.grossAmount))
  const shippingFeeAmount = Math.max(0, Math.round(input.shippingFeeAmount ?? 0))
  const commissionRate = Math.min(100, Math.max(0, Math.round(input.commissionRate ?? SETTLEMENT_POLICY.DEFAULT_COMMISSION_RATE)))
  const discountShare = Math.max(0, Math.round(input.discountShare ?? 0))
  const pgFee = Math.max(0, Math.round(input.pgFee ?? 0))
  const adjustmentAmount = Math.round(input.adjustmentAmount ?? 0)
  const commissionFee = Math.round(grossAmount * commissionRate / 100)
  const commissionVat = Math.round(commissionFee * SETTLEMENT_POLICY.COMMISSION_VAT_RATE)
  const pgFeeVat = Math.round(pgFee * SETTLEMENT_POLICY.COMMISSION_VAT_RATE)
  const settlementAmount = grossAmount + shippingFeeAmount - discountShare - commissionFee - commissionVat - pgFee - pgFeeVat + adjustmentAmount
  return { grossAmount, shippingFeeAmount, commissionRate, commissionFee, commissionVat, discountShare, pgFee, pgFeeVat, adjustmentAmount, settlementAmount }
}

export function nextWeeklyPayoutDate(from: Date) {
  const date = new Date(from)
  date.setHours(23, 59, 59, 999)
  const days = (SETTLEMENT_POLICY.PAYOUT_WEEKDAY - date.getDay() + 7) % 7 || 7
  date.setDate(date.getDate() + days)
  return date
}

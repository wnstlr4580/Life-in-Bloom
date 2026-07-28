import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"

export const POINT_POLICY = { PURCHASE: 100, REVIEW: 300, REMAKE_SALE: 500 } as const

export async function grantPointsOnce(input: { userId: string; amount: number; reason: keyof typeof POINT_POLICY; referenceType: string; referenceId: string }) {
  const { data, error } = await supabaseAdmin.rpc("grant_points_once", {
    p_id: nanoid(), p_user_id: input.userId, p_amount: input.amount, p_reason: input.reason,
    p_reference_type: input.referenceType, p_reference_id: input.referenceId,
  })
  if (error) console.error("point grant failed", error)
  return !error && data === true
}

/**
 * 이전에 남긴 포인트 트랜잭션 하나를 반대로 되돌린다 (금액의 부호와 무관하게 동작).
 * - 지급(양수, REVIEW/PURCHASE/REMAKE_SALE 등) 건을 되돌리면 → 회수(차감), 잔액은 0에서 멈춘다.
 * - 사용(음수, REDEEM) 건을 되돌리면 → 환급(증가).
 * 리뷰 삭제, 주문 취소 등에서 공통으로 쓴다.
 */
export async function revokePointsOnce(input: { userId: string; originalReason: string; referenceType: string; referenceId: string }) {
  const { data, error } = await supabaseAdmin.rpc("revoke_points_once", {
    p_id: nanoid(), p_user_id: input.userId, p_amount: 0, p_original_reason: input.originalReason,
    p_reference_type: input.referenceType, p_reference_id: input.referenceId,
  })
  if (error) console.error("point revoke failed", error)
  return !error && data === true
}

/**
 * 주문이 취소됐을 때, 그 주문으로 오갔던 포인트를 전부 되돌린다.
 * - 구매자에게 지급됐던 PURCHASE 포인트 회수
 * - 구매자가 결제에 썼던 포인트(REDEEM) 환급
 * - 이 주문이 남의 꽃다발 후기를 그대로 따라 산 것이었다면, 그 후기 작성자가 받은
 *   REMAKE_SALE 포인트도 회수 (거래 자체가 취소됐으므로)
 */
export async function revokeAllPointsForOrder(orderId: string, buyerUserId: string) {
  await revokePointsOnce({ userId: buyerUserId, originalReason: "PURCHASE", referenceType: "Order", referenceId: orderId })
  await revokePointsOnce({ userId: buyerUserId, originalReason: "REDEEM", referenceType: "Order", referenceId: orderId })

  const { data: remake } = await supabaseAdmin
    .from("PointTransaction")
    .select("userId")
    .eq("reason", "REMAKE_SALE")
    .eq("referenceType", "Order")
    .eq("referenceId", orderId)
    .maybeSingle()
  if (remake?.userId) {
    await revokePointsOnce({ userId: remake.userId, originalReason: "REMAKE_SALE", referenceType: "Order", referenceId: orderId })
  }
}

/** 결제 시 포인트를 사용한다. 잔액 부족이면 실패(false)를 반환한다. */
export async function redeemPointsOnce(input: { userId: string; amount: number; orderId: string }) {
  const { data, error } = await supabaseAdmin.rpc("redeem_points_once", {
    p_id: nanoid(), p_user_id: input.userId, p_amount: input.amount, p_order_id: input.orderId,
  })
  if (error) console.error("point redeem failed", error)
  return !error && data === true
}

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

/** 리뷰 삭제 등으로 이전에 지급한 포인트를 회수한다. 이미 다 써버렸다면 잔액은 0에서 멈춘다. */
export async function revokePointsOnce(input: { userId: string; originalReason: keyof typeof POINT_POLICY; referenceType: string; referenceId: string }) {
  const { data, error } = await supabaseAdmin.rpc("revoke_points_once", {
    p_id: nanoid(), p_user_id: input.userId, p_amount: 0, p_original_reason: input.originalReason,
    p_reference_type: input.referenceType, p_reference_id: input.referenceId,
  })
  if (error) console.error("point revoke failed", error)
  return !error && data === true
}

/** 결제 시 포인트를 사용한다. 잔액 부족이면 실패(false)를 반환한다. */
export async function redeemPointsOnce(input: { userId: string; amount: number; orderId: string }) {
  const { data, error } = await supabaseAdmin.rpc("redeem_points_once", {
    p_id: nanoid(), p_user_id: input.userId, p_amount: input.amount, p_order_id: input.orderId,
  })
  if (error) console.error("point redeem failed", error)
  return !error && data === true
}

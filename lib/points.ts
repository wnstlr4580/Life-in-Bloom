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

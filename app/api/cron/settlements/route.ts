import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { SETTLEMENT_POLICY, nextWeeklyPayoutDate } from "@/lib/settlement"
import { supabaseAdmin } from "@/lib/supabase"

// 배송 완료 후 7일 동안 구매자가 확정하지 않으면 자동 구매확정하고 다음 금요일 정산 대상으로 편입한다.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const cutoff = new Date(Date.now() - SETTLEMENT_POLICY.AUTO_CONFIRM_DAYS * 86400000).toISOString()
  const { data: targets, error } = await supabaseAdmin.from("OrderItem")
    .select("id").eq("fulfillmentStatus", "DELIVERED").eq("settlementStatus", "WAITING").lte("deliveredAt", cutoff).limit(1000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!targets?.length) return NextResponse.json({ confirmedCount: 0 })
  const confirmedAt = new Date().toISOString()
  const settlementDueAt = nextWeeklyPayoutDate(new Date()).toISOString()
  const ids = targets.map((item) => item.id)
  const { error: updateError } = await supabaseAdmin.from("OrderItem").update({ fulfillmentStatus: "PURCHASE_CONFIRMED", confirmedAt, settlementStatus: "READY", settlementDueAt }).in("id", ids)
  if (updateError) return NextResponse.json({ error: updateError.message, runId: nanoid(8) }, { status: 500 })
  return NextResponse.json({ confirmedCount: ids.length, settlementDueAt })
}

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Vercel Cron이 매일 호출 — 지급 1년이 지난 포인트를 만료 처리한다
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin.rpc("expire_old_points", { p_after_days: 365 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expiredCount: data })
}

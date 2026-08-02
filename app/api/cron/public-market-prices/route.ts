import { NextRequest, NextResponse } from "next/server"
import { fetchLatestAtDailyAuctions } from "@/lib/atDailyAuction"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const results = await fetchLatestAtDailyAuctions()
  const rows = results.flatMap((result) => result.rows)
  let saved = 0
  for (let index = 0; index < rows.length; index += 500) {
    const chunk = rows.slice(index, index + 500)
    const { error } = await supabaseAdmin.from("PublicMarketAuctionPrice").upsert(chunk, { onConflict: "marketId,tradeDate,itemName" })
    if (error) return NextResponse.json({ error: error.message, collected: rows.length, saved }, { status: 500 })
    saved += chunk.length
  }
  return NextResponse.json({ fetchedAt: new Date().toISOString(), saved, markets: results.map(({ market, status, tradeDate, rows: marketRows, ...rest }) => ({ marketId: market.id, status, tradeDate, rowCount: marketRows.length, ...rest })) })
}

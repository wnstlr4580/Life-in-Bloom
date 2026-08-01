import { NextResponse } from "next/server"
import { AT_AUCTION_MARKETS } from "@/lib/atAuctionMarkets"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const market = AT_AUCTION_MARKETS.find((candidate) => candidate.id === id)
  if (!market) return NextResponse.json({ error: "공판장을 찾을 수 없어요" }, { status: 404 })
  const format = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date)
  const endDate = format(new Date())
  const startDate = format(new Date(Date.now() - 7 * 86_400_000))
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>aT ${market.name} 경매자료로 이동</title></head><body><p>${market.name} 최근 경매자료로 이동하고 있습니다.</p><form id="at-form" method="post" action="https://flower.at.or.kr/hab09/hab09.do"><input type="hidden" name="currentPageNo" value="1"><input type="hidden" name="searchStrDate" value="${startDate}"><input type="hidden" name="searchEndDate" value="${endDate}"><input type="hidden" name="mobCmpCd" value="${market.companyCode}"><button type="submit">바로 이동</button></form><script>document.getElementById('at-form').submit()</script></body></html>`
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action https://flower.at.or.kr", "Referrer-Policy": "no-referrer" } })
}

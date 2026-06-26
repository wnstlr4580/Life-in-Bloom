import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { paymentId, expectedAmount } = await req.json()

  if (!paymentId) return NextResponse.json({ error: "paymentId 없음" }, { status: 400 })

  // PortOne V2 결제 조회 API
  const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: "결제 정보를 가져올 수 없습니다" }, { status: 400 })
  }

  const payment = await res.json()

  if (payment.status !== "PAID") {
    return NextResponse.json({ error: `결제 상태 오류: ${payment.status}` }, { status: 400 })
  }

  if (expectedAmount && payment.amount.total !== expectedAmount) {
    return NextResponse.json({ error: "결제 금액 불일치" }, { status: 400 })
  }

  return NextResponse.json({ ok: true, payment })
}

import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { supabaseAdmin } from "@/lib/supabase"

const VALID_STATUS = ["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"]

// 관리자 확인 — Vercel 환경변수 ADMIN_EMAILS에 쉼표로 구분해 등록 (예: a@b.com,c@d.com)
async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "__Secure-authjs.session-token",
  }).catch(() => null)
    ?? await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token",
  }).catch(() => null)

  const email = (token?.email as string | undefined)?.toLowerCase()
  if (!email) return false
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email)
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "권한이 없어요" }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from("Order")
    .select(`
      id, status, totalAmount, createdAt, deliveryType, shippingAddr, giftMessage,
      items:OrderItem(id, quantity, price, product:Product(name))
    `)
    .order("createdAt", { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "권한이 없어요" }, { status: 403 })

  const { orderId, status } = await req.json()
  if (!orderId || !VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("Order")
    .update({ status })
    .eq("id", orderId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

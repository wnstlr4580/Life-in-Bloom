import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { supabaseAdmin } from "@/lib/supabase"

// 내 계정 요약 (포인트 등)
export async function GET(req: NextRequest) {
  const token = await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "__Secure-authjs.session-token",
  }).catch(() => null)
    ?? await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token",
  }).catch(() => null)

  const email = token?.email as string | undefined
  if (!email) return NextResponse.json(null)

  const { data } = await supabaseAdmin
    .from("User")
    .select("points")
    .eq("email", email)
    .maybeSingle()

  return NextResponse.json({ points: data?.points ?? 0 })
}

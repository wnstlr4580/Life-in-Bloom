import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function GET(req: NextRequest) {
  const t1 = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "__Secure-authjs.session-token",
  }).catch((e) => ({ error: String(e) }))

  const t2 = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token",
  }).catch((e) => ({ error: String(e) }))

  return NextResponse.json({ secure: t1, insecure: t2 })
}

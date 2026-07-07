import { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// 관리자 확인 — Vercel 환경변수 ADMIN_EMAILS에 쉼표로 구분해 등록 (예: a@b.com,c@d.com)
export async function isAdmin(req: NextRequest): Promise<boolean> {
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

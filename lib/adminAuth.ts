import { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// 관리자 확인 — DB User.isAdmin 컬럼 기반 (jwt 콜백에서 로그인 시점에 토큰에 심어둠).
// ADMIN_EMAILS 환경변수는 과거 방식과의 호환을 위한 보조 수단으로 남겨둔다.
export async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "__Secure-authjs.session-token",
  }).catch(() => null)
    ?? await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token",
  }).catch(() => null)

  if (token?.isAdmin === true) return true

  const email = (token?.email as string | undefined)?.toLowerCase()
  if (!email) return false
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email)
}

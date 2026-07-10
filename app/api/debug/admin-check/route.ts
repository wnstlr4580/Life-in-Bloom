import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

// 임시 진단용 — 관리자 인식 문제 확인 후 삭제할 것
export async function GET(req: NextRequest) {
  const token = await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "__Secure-authjs.session-token",
  }).catch(() => null)
    ?? await getToken({
    req, secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token",
  }).catch(() => null)

  const tokenEmail = (token?.email as string | undefined) ?? null
  const raw = process.env.ADMIN_EMAILS ?? ""
  const adminList = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)

  return NextResponse.json({
    tokenEmail,
    tokenEmailLower: tokenEmail?.toLowerCase() ?? null,
    adminEmailsRawSet: raw.length > 0,
    adminEmailsCount: adminList.length,
    adminEmailsList: adminList, // 임시 확인용 — 이메일 목록 자체는 민감정보 아님
    isMatch: tokenEmail ? adminList.includes(tokenEmail.toLowerCase()) : false,
  })
}

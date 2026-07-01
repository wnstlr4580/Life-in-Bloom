import { NextRequest, NextResponse } from "next/server"

// 같은 레포/배포를 도메인만 다르게 노출하기 위한 라우팅.
// kiosk.* 서브도메인의 루트 접속을 /kiosk (풀스크린 키오스크 화면)로 연결한다.
// 다른 경로(/p/[id], /api/* 등)는 그대로 통과시킨다.
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? ""
  const isKioskHost = host.startsWith("kiosk.")

  if (isKioskHost && req.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/kiosk", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/"],
}

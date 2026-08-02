import { NextRequest, NextResponse } from "next/server"

// Cloudflare's OpenNext adapter currently requires Edge Middleware.
// Route the kiosk subdomain root to the fullscreen kiosk page.
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

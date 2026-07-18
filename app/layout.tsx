import type { Metadata, Viewport } from "next"
import { Noto_Sans_KR } from "next/font/google"
import { Providers } from "@/components/Providers"
import "./globals.css"

const notoSansKr = Noto_Sans_KR({ variable: "--font-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "인생내꽃 — 나를 닮은 꽃", template: "%s | 인생내꽃" },
  description: "생년월일 오행 분석으로 나를 닮은 꽃을 찾아보세요. 꽃다발, 화분, 커스텀 꽃다발까지 감성 플라워 커머스.",
  openGraph: {
    title: "인생내꽃 — 나를 닮은 꽃",
    description: "생년월일 오행 분석으로 나를 닮은 꽃을 찾아보세요.",
    siteName: "인생내꽃",
    locale: "ko_KR",
    type: "website",
  },
}

export const viewport: Viewport = {
  themeColor: "#fff1f2",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-scroll-behavior="smooth" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-stone-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

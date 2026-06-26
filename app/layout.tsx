import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Providers } from "@/components/Providers"
import "./globals.css"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "인생내꽃 — 나를 닮은 꽃",
  description: "오행으로 분석한 나만의 꽃을 찾아보세요. 꽃다발, 화분, 드라이플라워 감성 커머스.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-stone-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

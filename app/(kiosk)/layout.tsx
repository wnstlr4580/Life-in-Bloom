import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "오행 포토부스 — 인생내꽃",
  description: "오늘의 나에게 어울리는 꽃 배경으로 인생네컷을 남겨보세요.",
}

// 쇼핑몰 (shop) 레이아웃과 분리된 풀스크린 모바일 전용 레이아웃.
// 헤더/푸터/장바구니 등 쇼핑몰 UI를 두지 않는다.
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_#fff7f9_0%,_#fffdf8_48%,_#f7fbf3_100%)]">
      {children}
    </div>
  )
}

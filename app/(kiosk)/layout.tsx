import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "오행 포토부스 — 인생내꽃",
  description: "생년월일로 알아보는 나의 오행 기운, 꽃 배경 사진으로 만나보세요.",
}

// 쇼핑몰 (shop) 레이아웃과 분리된 풀스크린 모바일 전용 레이아웃.
// 헤더/푸터/장바구니 등 쇼핑몰 UI를 두지 않는다.
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-rose-50 to-stone-50">
      {children}
    </div>
  )
}

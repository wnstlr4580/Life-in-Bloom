"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { BarChart3, Boxes, ChevronRight, ClipboardList, LogOut, Package, Settings, Sparkles, Store } from "lucide-react"

const MENUS = [
  { href: "/seller", label: "판매자 홈", icon: Store },
  { href: "/seller/products", label: "완제품 상품 관리", icon: Package },
  { href: "/seller/stocks", label: "개별 꽃 재고", icon: Boxes, pending: true },
  { href: "/seller/orders", label: "주문·배송 관리", icon: ClipboardList },
  { href: "/seller/settlements", label: "정산 관리", icon: BarChart3 },
  { href: "/seller/settings", label: "판매처 설정", icon: Settings },
]

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [customEnabled, setCustomEnabled] = useState(false)
  const [diyEnabled, setDiyEnabled] = useState(false)
  useEffect(() => {
    fetch("/api/seller/profile").then((response) => response.ok ? response.json() : null).then((data) => {
      setCustomEnabled(Boolean(data?.seller?.offersCustomBouquet))
      setDiyEnabled(Boolean(data?.seller?.offersDiyFlowers))
    })
  }, [])
  const serviceMenus = [
    ...(customEnabled ? [{ href: "/seller/custom-bouquets", label: "나만의 꽃다발 관리", icon: Sparkles, pending: false }] : []),
    ...(diyEnabled ? [{ href: "/seller/stocks", label: "개별 꽃 재고", icon: Boxes, pending: false }] : []),
  ]
  const menus = [MENUS[0], MENUS[1], ...serviceMenus, ...MENUS.slice(3)]
  return <div className="min-h-[calc(100vh-64px)] bg-[#f7f8f5]">
    <div className="mx-auto flex max-w-[1440px]">
      <aside className="hidden lg:block w-60 shrink-0 border-r border-stone-200 bg-white min-h-[calc(100vh-64px)]">
        <div className="sticky top-16 flex min-h-[calc(100vh-64px)] flex-col p-5">
          <p className="px-3 text-xs font-bold tracking-wide text-emerald-700">SELLER CENTER</p>
          <nav className="mt-4 space-y-1">
            {menus.map(({ href, label, icon: Icon, pending }) => {
              const path = href.split("?")[0]
              const active = path === "/seller" ? pathname === path : pathname.startsWith(path)
              const content = <><Icon size={17} /><span className="flex-1">{label}</span>{pending ? <span className="text-[9px] text-stone-400">준비중</span> : <ChevronRight size={13} />}</>
              return pending
                ? <div key={href} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-stone-300 cursor-not-allowed">{content}</div>
                : <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${active ? "bg-emerald-50 font-semibold text-emerald-700" : "text-stone-600 hover:bg-stone-50"}`}>{content}</Link>
            })}
          </nav>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-auto flex w-full items-center gap-3 rounded-lg border-t border-stone-100 px-3 py-4 text-sm text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={17} />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  </div>
}

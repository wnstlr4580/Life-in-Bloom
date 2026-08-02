"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, Boxes, ChevronRight, CircleDollarSign, ClipboardList, FileClock, LayoutDashboard, MessageSquareWarning, SlidersHorizontal, Store, Users } from "lucide-react"

const MENUS = [
  { href: "/admin", label: "운영 대시보드", icon: LayoutDashboard },
  { href: "/admin/sellers", label: "판매처 관리", icon: Store },
  { href: "/admin/users", label: "사용자 관리", icon: Users },
  { href: "/admin/products", label: "상품 현황", icon: Boxes },
  { href: "/admin/exposure-policy", label: "노출 정책", icon: SlidersHorizontal },
  { href: "/admin/orders", label: "주문 현황", icon: ClipboardList },
  { href: "/admin/settlements", label: "정산 운영", icon: CircleDollarSign },
  { href: "/admin/content", label: "리뷰·게시물", icon: MessageSquareWarning },
  { href: "/admin/audit", label: "운영 기록", icon: FileClock },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f7f8f5]">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="hidden min-h-[calc(100vh-64px)] w-60 shrink-0 border-r border-stone-200 bg-white lg:block">
          <div className="sticky top-16 flex min-h-[calc(100vh-64px)] flex-col p-5">
            <div className="flex items-center gap-2 px-3 text-xs font-bold tracking-wide text-rose-600"><Activity size={14} /> ADMIN CENTER</div>
            <nav className="mt-4 space-y-1">
              {MENUS.map(({ href, label, icon: Icon }) => {
                const active = href === "/admin" ? pathname === href : pathname.startsWith(href)
                return <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${active ? "bg-rose-50 font-semibold text-rose-600" : "text-stone-600 hover:bg-stone-50"}`}><Icon size={17} /><span className="flex-1">{label}</span><ChevronRight size={13} /></Link>
              })}
            </nav>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

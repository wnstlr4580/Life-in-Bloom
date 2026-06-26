"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCartStore } from "@/store/cartStore"
import { useSession, signIn, signOut } from "next-auth/react"
import { ShoppingCart, Flower2, User, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"

const NAV = [
  { href: "/", label: "홈" },
  { href: "/saju", label: "나의 꽃 찾기" },
  { href: "/compat", label: "궁합 보기" },
  { href: "/products", label: "꽃 & 식물" },
  { href: "/custom", label: "꽃다발 만들기" },
]

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const totalCount = useCartStore((s) => s.totalCount())
  const { data: session } = useSession()

  return (
    <div className="min-h-screen flex flex-col">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-50 bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Flower2 size={22} className="text-rose-400" />
            <span className="text-lg font-bold text-stone-800">인생내꽃</span>
          </Link>

          {/* 가운데 네비 */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ href, label }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-rose-50 text-rose-500"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* 우측 액션 */}
          <div className="flex items-center gap-2">
            <Link href="/cart">
              <Button
                variant="ghost"
                size="sm"
                className={`relative gap-1.5 ${pathname === "/cart" ? "text-rose-500" : "text-stone-600"}`}
              >
                <ShoppingCart size={18} />
                <span className="text-sm">장바구니</span>
                {totalCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-400 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                    {totalCount > 99 ? "99+" : totalCount}
                  </span>
                )}
              </Button>
            </Link>

            {session?.user ? (
              <Link href="/mypage">
                <Button variant="ghost" size="sm" className="gap-1.5 text-stone-600">
                  <User size={18} />
                  <span className="text-sm hidden sm:inline">
                    {session.user.name?.split(" ")[0] ?? "마이페이지"}
                  </span>
                </Button>
              </Link>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signIn()}
                className="gap-1.5 text-stone-600"
              >
                <LogIn size={18} />
                <span className="text-sm hidden sm:inline">로그인</span>
              </Button>
            )}
          </div>
        </div>

        {/* 모바일 네비 */}
        <div className="md:hidden border-t border-stone-50 flex">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 text-center py-2.5 text-xs font-medium transition-colors ${
                  active ? "text-rose-500 border-b-2 border-rose-400" : "text-stone-500"
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-stone-100 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-stone-400">
          <div className="flex items-center gap-2">
            <Flower2 size={16} className="text-rose-300" />
            <span className="font-medium text-stone-600">인생내꽃</span>
            <span>— 나를 닮은 꽃</span>
          </div>
          <div className="flex gap-6">
            <span>이용약관</span>
            <span>개인정보처리방침</span>
            <span>고객센터</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useCartStore } from "@/store/cartStore"
import { useSession, signIn, signOut } from "next-auth/react"
import { ShoppingCart, Flower2, User, LogIn, Search } from "lucide-react"
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
  const router = useRouter()
  const totalCount = useCartStore((s) => s.totalCount())
  const { data: session } = useSession()
  const [query, setQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    router.push(`/products?q=${encodeURIComponent(q)}`)
    setQuery("")
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-100 shadow-sm">
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
            {/* 상품 검색 */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-full px-3 py-1.5 focus-within:border-rose-300 transition-colors">
              <Search size={14} className="text-stone-400 shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="꽃 검색"
                className="w-24 md:w-32 bg-transparent text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none"
              />
            </form>

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
                onClick={() => signIn("kakao")}
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
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Flower2 size={18} className="text-rose-400" />
                <span className="font-bold text-stone-800">인생내꽃</span>
              </div>
              <p className="text-sm text-stone-500 leading-relaxed">
                생년월일 오행으로 나를 닮은 꽃을 찾아드리는
                <br />
                감성 플라워 커머스
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-stone-700">서비스</p>
              <div className="flex flex-col gap-2 text-sm text-stone-500">
                <Link href="/saju" className="hover:text-rose-500 transition-colors">나의 꽃 찾기</Link>
                <Link href="/compat" className="hover:text-rose-500 transition-colors">궁합 보기</Link>
                <Link href="/custom" className="hover:text-rose-500 transition-colors">꽃다발 만들기</Link>
                <Link href="/products" className="hover:text-rose-500 transition-colors">꽃 & 식물</Link>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-stone-700">고객센터</p>
              <div className="text-sm text-stone-500 space-y-1.5">
                <p className="font-bold text-stone-700">0000-0000</p>
                <p>평일 10:00 - 18:00 (주말·공휴일 휴무)</p>
                <p>오전 11시 이전 주문 시 당일 배송</p>
                <p>이메일: help@life-in-bloom.example</p>
              </div>
            </div>
          </div>

          {/* 사업자 정보 — 실제 등록 후 값 교체 필요 */}
          <div className="pt-6 border-t border-stone-100 text-xs text-stone-400 leading-relaxed space-y-0.5 mb-6">
            <p>상호: 인생내꽃 · 대표: (등록 후 기재) · 사업자등록번호: (등록 후 기재)</p>
            <p>통신판매업신고: (신고 후 기재) · 주소: (등록 후 기재)</p>
            <p>개인정보 보호 책임자: (지정 후 기재)</p>
          </div>

          <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
            <p>© {new Date().getFullYear()} 인생내꽃. All rights reserved.</p>
            <div className="flex gap-5">
              <Link href="/terms" className="hover:text-stone-600 transition-colors">이용약관</Link>
              <Link href="/privacy" className="hover:text-stone-600 transition-colors font-medium">개인정보처리방침</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

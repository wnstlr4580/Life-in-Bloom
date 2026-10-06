"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useCartStore } from "@/store/cartStore"
import { signOut, useSession } from "next-auth/react"
import { ShoppingCart, Flower2, User, LogIn, LogOut, Search, Shield, Store } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavChild { href: string; label: string }
interface NavItem { href: string; label: string; children?: NavChild[] }

const NAV: NavItem[] = [
  {
    href: "/products", label: "꽃 & 식물",
    children: [
      { href: "/products", label: "전체 상품" },
      { href: "/products?category=bouquet", label: "꽃다발" },
      { href: "/products?category=basket", label: "꽃바구니" },
      { href: "/products?category=orchid", label: "난" },
      { href: "/products?category=plant", label: "화분" },
      { href: "/products?category=wreath", label: "화환" },
      { href: "/products?category=dried", label: "드라이플라워" },
    ],
  },
  {
    href: "/products", label: "선물 · 용도별",
    children: [
      { href: "/products?use=생일", label: "🎂 생일" },
      { href: "/products?use=축하", label: "🎉 축하" },
      { href: "/products?use=개업", label: "🏪 개업" },
      { href: "/products?use=결혼", label: "💍 결혼 · 프로포즈" },
      { href: "/products?use=추모", label: "🕊️ 추모" },
      { href: "/products?use=감사", label: "💐 감사" },
    ],
  },
  {
    href: "/saju", label: "오행 서비스",
    children: [
      { href: "/saju", label: "🔮 나의 꽃 찾기" },
      { href: "/compat", label: "💞 궁합 보기" },
      { href: "/kiosk", label: "📸 오행 포토부스" },
    ],
  },
  {
    href: "/diy", label: "꽃다발 만들기",
    children: [
      { href: "/diy", label: "💐 나만의 꽃다발 만들기" },
      { href: "/gallery", label: "📸 손님들의 꽃다발" },
    ],
  },
]

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const totalCount = useCartStore((s) => s.totalCount())
  const setActiveCartUser = useCartStore((s) => s.setActiveUser)
  const { data: session, status } = useSession()
  const [query, setQuery] = useState("")
  useEffect(() => {
    if (status === "loading") return
    setActiveCartUser(session?.user?.role === "CUSTOMER" ? session.user.id : null)
  }, [session?.user?.id, session?.user?.role, setActiveCartUser, status])

  const canUseCart = !session?.user || session.user.role === "CUSTOMER"

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

          {/* 가운데 네비 — 중메뉴에 마우스를 올리면 소메뉴가 펼쳐진다 */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ href, label, children }) => {
              const active = pathname === href
                || (href !== "/" && pathname.startsWith(href.split("?")[0]))
                || children?.some((child) => pathname === child.href.split("?")[0])
              return (
                <div key={label} className="relative group">
                  <Link
                    href={href}
                    className={`inline-block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-rose-50 text-rose-500"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                    }`}
                  >
                    {label}
                  </Link>
                  {children && (
                    <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50">
                      <div className="bg-white border border-stone-100 rounded-xl shadow-lg py-2 min-w-44">
                        {children.map((c) => (
                          <Link
                            key={c.label}
                            href={c.href}
                            className="block px-4 py-2 text-sm text-stone-600 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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

            {canUseCart && <Link href="/cart">
              <Button
                variant="ghost"
                size="sm"
                className={`relative gap-1.5 ${pathname === "/cart" ? "text-rose-500" : "text-stone-600"}`}
              >
                <ShoppingCart size={18} />
                <span className="text-sm">장바구니</span>
                {session?.user?.role === "CUSTOMER" && totalCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-400 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                    {totalCount > 99 ? "99+" : totalCount}
                  </span>
                )}
              </Button>
            </Link>}

            {(session?.user?.role === "ADMIN" || session?.user?.isAdmin === true) && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-1.5 text-rose-500 hover:text-rose-600">
                  <Shield size={18} />
                  <span className="text-sm hidden sm:inline">관리자</span>
                </Button>
              </Link>
            )}
            {session?.user?.role === "SELLER" && (
              <Link href="/seller">
                <Button variant="ghost" size="sm" className="gap-1.5 text-emerald-700 hover:text-emerald-800">
                  <Store size={18} /><span className="text-sm hidden sm:inline">판매자센터</span>
                </Button>
              </Link>
            )}

            {session?.user ? (
              <div className="flex items-center">
              <Link href={session.user.role === "SELLER" ? "/seller" : session.user.role === "ADMIN" ? "/admin" : "/mypage"}>
                <Button variant="ghost" size="sm" className="gap-1.5 text-stone-600">
                  <User size={18} />
                  <span className="text-sm hidden sm:inline">
                    {session.user.name?.split(" ")[0] ?? "마이페이지"}
                  </span>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" title="로그아웃" aria-label="로그아웃" onClick={() => signOut({ callbackUrl: "/" })} className="h-9 w-9 text-stone-500 hover:bg-rose-50 hover:text-rose-600">
                <LogOut size={18} />
              </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-stone-600"
                >
                  <LogIn size={18} />
                  <span className="text-sm hidden sm:inline">로그인</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* 모바일 네비 */}
        <div className="md:hidden border-t border-stone-50 flex">
          {NAV.map(({ href, label, children }) => {
            const active = pathname === href
              || (href !== "/" && pathname.startsWith(href.split("?")[0]))
              || children?.some((child) => pathname === child.href.split("?")[0])
            return (
              <Link
                key={label}
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
                <Link href="/diy" className="hover:text-rose-500 transition-colors">꽃다발 만들기·주문</Link>
                <Link href="/products" className="hover:text-rose-500 transition-colors">꽃 & 식물</Link>
                <Link href="/orders/lookup" className="hover:text-rose-500 transition-colors">주문 조회</Link>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-stone-700">고객센터</p>
              <div className="text-sm text-stone-500 space-y-1.5">
                <p>주문·배송 문의는 주문하신 판매처로 연결돼요</p>
                <p>오전 11시 이전 주문 시 당일 배송</p>
                <Link href="/orders/lookup" className="inline-block hover:text-rose-500 transition-colors">주문 조회 바로가기 →</Link>
              </div>
            </div>
          </div>

          {/* 사업자 정보 — 실제 등록 전까지 시연용 안내로 대체 */}
          <div className="pt-6 border-t border-stone-100 text-xs text-stone-400 leading-relaxed space-y-0.5 mb-6">
            <p>인생내꽃은 NH농협 사내 경진대회 출품용 시연 서비스입니다.</p>
          </div>

          <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
            <p>© 2026 인생내꽃. All rights reserved.</p>
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

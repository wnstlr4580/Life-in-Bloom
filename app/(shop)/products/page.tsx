"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { ProductCard } from "@/components/shop/ProductCard"

const CATEGORIES = [
  { value: "", label: "전체" },
  { value: "bouquet", label: "꽃다발" },
  { value: "plant", label: "화분" },
  { value: "wreath", label: "화환" },
  { value: "dried", label: "드라이플라워" },
]

const SORTS = [
  { value: "latest", label: "최신순" },
  { value: "price_asc", label: "낮은 가격순" },
  { value: "price_desc", label: "높은 가격순" },
]

// 용도별 분류 (Product.useTags)
const USES = [
  { value: "", label: "모든 용도" },
  { value: "생일", label: "🎂 생일" },
  { value: "축하", label: "🎉 축하" },
  { value: "개업", label: "🏪 개업" },
  { value: "결혼", label: "💍 결혼·프로포즈" },
  { value: "추모", label: "🕊️ 추모" },
  { value: "감사", label: "💐 감사" },
]

const OHAENG_LABEL: Record<string, string> = {
  목: "🌿 나무(목) 기운", 화: "🔥 불(화) 기운", 토: "🌾 흙(토) 기운", 금: "✨ 금(금) 기운", 수: "💧 물(수) 기운",
}

interface Product {
  id: string
  name: string
  price: number
  images: string[]
  flowerMeaning: string | null
  category: string
  stock: number
}

function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const q = searchParams.get("q") ?? ""
  const ohaeng = searchParams.get("ohaeng") ?? ""

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState("")
  const [use, setUse] = useState("")

  // 메가메뉴 링크(?category= / ?use=)로 진입하면 필터에 반영
  useEffect(() => { setCategory(searchParams.get("category") ?? "") }, [searchParams])
  useEffect(() => { setUse(searchParams.get("use") ?? "") }, [searchParams])
  const [sort, setSort] = useState("latest")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // 필터가 바뀌면 1페이지부터
  useEffect(() => { setPage(1) }, [q, ohaeng, category, use, sort])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category) params.set("category", category)
    if (use) params.set("use", use)
    if (q) params.set("q", q)
    if (ohaeng) params.set("ohaeng", ohaeng)
    if (sort !== "latest") params.set("sort", sort)
    params.set("page", String(page))
    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products ?? [])
        setTotalPages(d.totalPages ?? 1)
        setTotal(d.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [category, use, q, ohaeng, sort, page])

  const clearFilter = () => router.push(pathname)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold text-stone-800">꽃 & 식물</h1>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                category === c.value
                  ? "bg-rose-400 border-rose-400 text-white"
                  : "bg-white border-stone-200 text-stone-600 hover:border-rose-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 용도별 필터 */}
      <div className="flex gap-2 flex-wrap mb-4">
        {USES.map((u) => (
          <button
            key={u.value}
            onClick={() => setUse(u.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              use === u.value
                ? "bg-stone-700 border-stone-700 text-white"
                : "bg-white border-stone-200 text-stone-500 hover:border-stone-400"
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>

      {/* 활성 필터 + 정렬 */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap text-sm text-stone-500">
          {q && (
            <span className="inline-flex items-center gap-1.5 bg-stone-100 rounded-full px-3 py-1">
              🔎 &ldquo;{q}&rdquo; 검색 결과
              <button onClick={clearFilter} className="text-stone-400 hover:text-stone-600 font-bold">×</button>
            </span>
          )}
          {ohaeng && OHAENG_LABEL[ohaeng] && (
            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 rounded-full px-3 py-1">
              {OHAENG_LABEL[ohaeng]}에 어울리는 꽃
              <button onClick={clearFilter} className="text-rose-300 hover:text-rose-500 font-bold">×</button>
            </span>
          )}
          {!loading && <span className="text-xs text-stone-400">총 {total}개</span>}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="shrink-0 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 bg-white focus:outline-none focus:border-rose-300"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-32 text-stone-400">
          <p className="text-4xl mb-4">🌱</p>
          <p>{q ? `"${q}"에 맞는 상품이 없어요` : "상품이 없습니다"}</p>
          {(q || ohaeng) && (
            <button onClick={clearFilter} className="mt-4 text-sm text-rose-500 font-medium hover:text-rose-600">
              전체 상품 보기
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm text-stone-500 border border-stone-200 bg-white disabled:opacity-40 hover:border-rose-300 transition-colors"
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${
                    page === n
                      ? "bg-rose-400 border-rose-400 text-white"
                      : "bg-white border-stone-200 text-stone-600 hover:border-rose-300"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm text-stone-500 border border-stone-200 bg-white disabled:opacity-40 hover:border-rose-300 transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// useSearchParams()는 Suspense 경계 안에서 써야 한다
export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsContent />
    </Suspense>
  )
}

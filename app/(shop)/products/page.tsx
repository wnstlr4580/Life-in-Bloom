"use client"

import { useState, useEffect, useRef, Suspense, type ReactNode } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import { ProductCard } from "@/components/shop/ProductCard"
import { ChevronDown, RotateCcw, SlidersHorizontal, Store } from "lucide-react"

const CATEGORIES = [
  { value: "", label: "전체" },
  { value: "bouquet", label: "꽃다발" },
  { value: "basket", label: "꽃바구니" },
  { value: "orchid", label: "난" },
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
  { value: "기념일", label: "💝 기념일" },
  { value: "축하", label: "🎉 축하" },
  { value: "개업", label: "🏪 개업" },
  { value: "결혼", label: "💍 결혼" },
  { value: "프로포즈", label: "💗 프로포즈" },
  { value: "추모", label: "🕊️ 추모" },
  { value: "감사", label: "💐 감사" },
]

const OHAENG_LABEL: Record<string, string> = {
  목: "🌿 나무(목) 기운", 화: "🔥 불(화) 기운", 토: "🌾 흙(토) 기운", 금: "✨ 금(금) 기운", 수: "💧 물(수) 기운",
}

const COLOR_LABEL: Record<string, string> = {
  red: "빨강", pink: "핑크", yellow: "노랑", orange: "주황", blue: "파랑",
  purple: "보라", violet: "보라", green: "초록", white: "흰색", black: "검정",
  ivory: "아이보리", cream: "크림", beige: "베이지", brown: "갈색", gray: "회색", grey: "회색",
  gold: "골드", silver: "실버", pastel: "파스텔", mixed: "혼합", mix: "혼합", multicolor: "다색",
  lavender: "라벤더", coral: "코랄", burgundy: "버건디",
}

function colorLabel(value: string) {
  return COLOR_LABEL[value.trim().toLowerCase()] ?? value
}

interface Product {
  id: string
  name: string
  price: number
  images: string[]
  flowerMeaning: string | null
  category: string
  stock: number
  seller?: { marketName: string } | { marketName: string }[] | null
}

function ProductsContent() {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const q = searchParams.get("q") ?? ""
  const ohaeng = searchParams.get("ohaeng") ?? ""

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const hasLoaded = useRef(false)
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "")
  const [uses, setUses] = useState<string[]>(() => searchParams.getAll("use"))
  const [color, setColor] = useState(() => searchParams.get("color") ?? "")
  const [seller, setSeller] = useState(() => searchParams.get("seller") ?? "")
  const [minPrice, setMinPrice] = useState(() => searchParams.get("minPrice") ?? "")
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get("maxPrice") ?? "")
  const [inStock, setInStock] = useState(() => searchParams.get("inStock") === "true")
  const [filterOpen, setFilterOpen] = useState(() => Boolean(searchParams.get("color") || searchParams.get("seller") || searchParams.get("minPrice") || searchParams.get("maxPrice") || searchParams.get("inStock")))
  const [facets, setFacets] = useState<{ colors: string[]; uses: string[]; sellers: string[] }>({ colors: [], uses: [], sellers: [] })

  const [sort, setSort] = useState(() => searchParams.get("sort") ?? "latest")

  // 메가메뉴 등 외부 링크(?category=, ?use= 등)로 진입/이동하면 모든 필터를 그 URL 기준으로 다시 맞춘다.
  // 일부만(category만) 동기화하면, 남아있는 다른 필터(uses 등) 때문에 아래 "URL 기록" 효과가
  // 방금 이동한 URL을 옛 필터값으로 되돌려버려 메뉴 이동이 먹통인 것처럼 보인다.
  useEffect(() => {
    setCategory(searchParams.get("category") ?? "")
    setUses(searchParams.getAll("use"))
    setColor(searchParams.get("color") ?? "")
    setSeller(searchParams.get("seller") ?? "")
    setMinPrice(searchParams.get("minPrice") ?? "")
    setMaxPrice(searchParams.get("maxPrice") ?? "")
    setInStock(searchParams.get("inStock") === "true")
    setSort(searchParams.get("sort") ?? "latest")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // 필터가 바뀌면 1페이지부터
  useEffect(() => { setPage(1) }, [q, ohaeng, category, uses, color, seller, minPrice, maxPrice, inStock, sort])

  // 상세 상품에서 뒤로 왔을 때 선택 조건이 복원되도록 필터를 URL에 기록한다.
  useEffect(() => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (ohaeng) params.set("ohaeng", ohaeng)
    if (category) params.set("category", category)
    uses.forEach((value) => params.append("use", value))
    if (color) params.set("color", color)
    if (seller) params.set("seller", seller)
    if (minPrice) params.set("minPrice", minPrice)
    if (maxPrice) params.set("maxPrice", maxPrice)
    if (inStock) params.set("inStock", "true")
    if (sort !== "latest") params.set("sort", sort)
    const nextUrl = params.size ? `${pathname}?${params.toString()}` : pathname
    const currentUrl = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname
    if (nextUrl !== currentUrl) window.history.replaceState(null, "", nextUrl)
  }, [q, ohaeng, category, uses, color, seller, minPrice, maxPrice, inStock, sort, pathname, searchParams])

  useEffect(() => {
    const controller = new AbortController()
    if (!hasLoaded.current) setLoading(true)
    const params = new URLSearchParams()
    if (category) params.set("category", category)
    uses.forEach((value) => params.append("use", value))
    if (q) params.set("q", q)
    if (color) params.set("color", color)
    if (seller) params.set("seller", seller)
    if (minPrice) params.set("minPrice", minPrice)
    if (maxPrice) params.set("maxPrice", maxPrice)
    if (inStock) params.set("inStock", "true")
    if (ohaeng) params.set("ohaeng", ohaeng)
    if (sort !== "latest") params.set("sort", sort)
    params.set("page", String(page))
    fetch(`/api/products?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (controller.signal.aborted) return
        setProducts(d.products ?? [])
        setTotalPages(d.totalPages ?? 1)
        setTotal(d.total ?? 0)
        setFacets(d.facets ?? { colors: [], uses: [], sellers: [] })
        hasLoaded.current = true
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        console.error(error)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [category, uses, q, color, seller, minPrice, maxPrice, inStock, ohaeng, sort, page])

  const clearFilter = () => {
    setCategory(""); setUses([]); setColor(""); setSeller(""); setMinPrice(""); setMaxPrice(""); setInStock(false); setSort("latest")
    window.history.replaceState(null, "", pathname)
  }

  const toggleUse = (value: string) => {
    if (!value) {
      setUses([])
      return
    }
    setUses((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  const clearKeyword = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("q")
    window.history.replaceState(null, "", params.size ? `${pathname}?${params.toString()}` : pathname)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-3 flex items-center gap-5">
        <h1 className="shrink-0 text-2xl font-bold text-stone-800">꽃 &amp; 식물</h1>
        <div className="flex min-w-0 flex-1 justify-end gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                category === c.value
                  ? "border-rose-400 bg-rose-400 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-rose-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-6 flex items-center gap-3 border-b border-stone-100 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {USES.map((item) => (
            <button
              key={item.value}
              onClick={() => toggleUse(item.value)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                (item.value ? uses.includes(item.value) : uses.length === 0)
                  ? "border-stone-700 bg-stone-700 text-white"
                  : "border-stone-200 bg-white text-stone-500 hover:border-stone-400"
              }`}
            >
              {item.label}
            </button>
          ))}
          {!loading && <span className="ml-2 shrink-0 text-xs text-stone-400">총 {total}개</span>}
        </div>

        <button onClick={() => setFilterOpen((value) => !value)} className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold ${filterOpen ? "border-rose-300 bg-rose-50 text-rose-600" : "border-stone-200 bg-white text-stone-600"}`}><SlidersHorizontal size={15} /><span className="hidden sm:inline">필터</span><ChevronDown size={13} className={filterOpen ? "rotate-180" : ""} /></button>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬" className="h-9 shrink-0 rounded-xl border border-stone-200 bg-white px-2.5 text-sm text-stone-600 outline-none focus:border-rose-300">
          {SORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>

        {filterOpen && <section className="absolute right-0 top-[calc(100%+8px)] z-30 w-full rounded-2xl border border-stone-200 bg-white p-4 shadow-xl sm:w-[620px]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="판매처" icon={<Store size={14} />} value={seller} onChange={setSeller} options={facets.sellers} empty="모든 판매처" />
            <FilterSelect label="주요 색상" value={color} onChange={setColor} options={facets.colors} empty="모든 색상" optionLabel={colorLabel} />
            <label className="space-y-1.5"><span className="text-xs font-semibold text-stone-600">최소 가격</span><input type="number" min={0} step={1000} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0원" className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-rose-300" /></label>
            <label className="space-y-1.5"><span className="text-xs font-semibold text-stone-600">최대 가격</span><input type="number" min={0} step={1000} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="예: 100000" className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-rose-300" /></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-600"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="accent-rose-400" />구매 가능한 상품만 보기</label>
            <button onClick={clearFilter} className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-rose-500"><RotateCcw size={14} />모든 조건 초기화</button>
          </div>
        </section>}
      </div>

      {/* 활성 필터 */}
      {(q || ohaeng || seller || color || minPrice || maxPrice || inStock) && <div className="mb-5 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap text-sm text-stone-500">
          {q && (
            <span className="inline-flex items-center gap-1.5 bg-stone-100 rounded-full px-3 py-1">
              🔎 &ldquo;{q}&rdquo;
              <button onClick={clearKeyword} className="text-stone-400 hover:text-stone-600 font-bold">×</button>
            </span>
          )}
          {seller && <FilterChip label={`판매처 · ${seller}`} clear={() => setSeller("")} />}
          {color && <FilterChip label={`색상 · ${colorLabel(color)}`} clear={() => setColor("")} />}
          {(minPrice || maxPrice) && <FilterChip label={`${minPrice ? Number(minPrice).toLocaleString() : "0"}원 ~ ${maxPrice ? `${Number(maxPrice).toLocaleString()}원` : "제한 없음"}`} clear={() => { setMinPrice(""); setMaxPrice("") }} />}
          {inStock && <FilterChip label="구매 가능" clear={() => setInStock(false)} />}
          {ohaeng && OHAENG_LABEL[ohaeng] && (
            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 rounded-full px-3 py-1">
              {OHAENG_LABEL[ohaeng]}에 어울리는 꽃
              <button onClick={clearFilter} className="text-rose-300 hover:text-rose-500 font-bold">×</button>
            </span>
          )}
        </div>
      </div>}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-32 text-stone-400">
          <p className="text-4xl mb-4">🌱</p>
          <p>{q ? `"${q}"에 맞는 상품이 없어요` : "선택한 조건에 맞는 상품이 없습니다"}</p>
          {(q || ohaeng || seller || color || minPrice || maxPrice || inStock || category || uses.length > 0) && (
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

function FilterSelect({ label, icon, value, onChange, options, empty, optionLabel = (option) => option }: { label: string; icon?: ReactNode; value: string; onChange: (value: string) => void; options: string[]; empty: string; optionLabel?: (option: string) => string }) {
  return <label className="space-y-1.5"><span className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">{icon}{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-rose-300"><option value="">{empty}</option>{options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}</select></label>
}

function FilterChip({ label, clear }: { label: string; clear: () => void }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">{label}<button onClick={clear} className="font-bold text-rose-300 hover:text-rose-600">×</button></span>
}

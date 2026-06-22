"use client"

import { useState, useEffect } from "react"
import { ProductCard } from "@/components/shop/ProductCard"

const CATEGORIES = [
  { value: "", label: "전체" },
  { value: "bouquet", label: "꽃다발" },
  { value: "plant", label: "화분" },
  { value: "wreath", label: "화환" },
  { value: "dried", label: "드라이플라워" },
]

interface Product {
  id: string
  name: string
  price: number
  images: string[]
  flowerMeaning: string | null
  category: string
  stock: number
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState("")

  useEffect(() => {
    setLoading(true)
    fetch(`/api/products${category ? `?category=${category}` : ""}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoading(false))
  }, [category])

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-stone-800 mb-6">꽃 & 식물</h1>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                category === c.value
                  ? "bg-rose-400 border-rose-400 text-white"
                  : "bg-white border-stone-200 text-stone-600 hover:border-rose-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 상품 그리드 */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <p className="text-3xl mb-3">🌱</p>
            <p className="text-sm">상품이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

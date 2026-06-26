"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ShoppingBag, ArrowLeft, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCartStore } from "@/store/cartStore"
import Link from "next/link"

interface Product {
  id: string; name: string; description: string; price: number; stock: number
  images: string[]; flowerMeaning: string | null; ohaengTags: string[]
  colorTags: string[]; seasonTags: string[]; category: string
}

const OHAENG_EMOJI: Record<string, string> = { 목: "🌿", 화: "🔥", 토: "🌾", 금: "✨", 수: "💧" }
const CATEGORY_LABEL: Record<string, string> = { bouquet: "꽃다발", plant: "화분", wreath: "화환", dried: "드라이플라워" }

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    fetch(`/api/products/${id}`).then((r) => r.json()).then(setProduct)
  }, [id])

  const handleAddToCart = () => {
    if (!product) return
    addItem({
      id: crypto.randomUUID(),
      productId: product.id,
      quantity,
      product: { id: product.id, name: product.name, price: product.price, images: product.images, stock: product.stock },
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-32 flex justify-center">
        <div className="w-10 h-10 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-2 text-sm text-stone-400 mb-8">
        <Link href="/products" className="hover:text-rose-400 transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> 목록으로
        </Link>
        <span>/</span>
        <span>{CATEGORY_LABEL[product.category] ?? product.category}</span>
        <span>/</span>
        <span className="text-stone-600">{product.name}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* 이미지 */}
        <div className="lg:w-1/2 shrink-0">
          <div className="aspect-square bg-stone-50 rounded-3xl overflow-hidden flex items-center justify-center">
            {product.images[0] ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-9xl">🌸</span>
            )}
          </div>
        </div>

        {/* 상품 정보 */}
        <div className="flex-1 space-y-6">
          <div>
            <div className="flex gap-1.5 mb-3">
              <span className="text-xs bg-stone-100 text-stone-500 px-2.5 py-1 rounded-full">
                {CATEGORY_LABEL[product.category]}
              </span>
              {product.ohaengTags.map((tag) => (
                <span key={tag} className="text-xs bg-rose-50 text-rose-500 px-2.5 py-1 rounded-full">
                  {OHAENG_EMOJI[tag]} {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-bold text-stone-800">{product.name}</h1>
            {product.flowerMeaning && (
              <p className="text-stone-400 mt-2 text-sm">꽃말 — {product.flowerMeaning}</p>
            )}
          </div>

          <p className="text-3xl font-bold text-rose-500">{product.price.toLocaleString()}원</p>

          <p className="text-stone-600 leading-relaxed">{product.description}</p>

          {/* 색상 태그 */}
          {product.colorTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.colorTags.map((c) => (
                <span key={c} className="text-xs bg-stone-50 text-stone-500 px-3 py-1 rounded-full border border-stone-100">
                  {c}
                </span>
              ))}
            </div>
          )}

          <div className="border-t border-stone-100 pt-6 space-y-4">
            {/* 수량 선택 */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-stone-700 w-12">수량</span>
              <div className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-2.5">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-rose-500 font-medium">−</button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))} className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-rose-500 font-medium">+</button>
              </div>
              <span className="text-sm text-stone-400">재고 {product.stock}개</span>
            </div>

            {/* 합계 */}
            <div className="flex items-center justify-between py-3 px-4 bg-rose-50 rounded-xl">
              <span className="text-sm text-stone-600">합계</span>
              <span className="text-xl font-bold text-rose-500">{(product.price * quantity).toLocaleString()}원</span>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 h-12 bg-rose-400 hover:bg-rose-500 text-white font-semibold text-base gap-2 disabled:opacity-50"
              >
                <ShoppingBag size={18} />
                {added ? "담겼어요! 🌸" : product.stock === 0 ? "품절" : "장바구니 담기"}
              </Button>
              <Button variant="outline" size="icon" className="h-12 w-12 border-stone-200 shrink-0">
                <Heart size={18} className="text-stone-400" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

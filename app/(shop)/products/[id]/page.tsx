"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ShoppingBag, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCartStore } from "@/store/cartStore"

interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  images: string[]
  flowerMeaning: string | null
  ohaengTags: string[]
  colorTags: string[]
  category: string
}

const OHAENG_EMOJI: Record<string, string> = { 목: "🌿", 화: "🔥", 토: "🌾", 금: "✨", 수: "💧" }

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then(setProduct)
  }, [id])

  const handleAddToCart = () => {
    if (!product) return
    addItem({
      id: crypto.randomUUID(),
      productId: product.id,
      quantity,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        images: product.images,
        stock: product.stock,
      },
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-md mx-auto">
        {/* 이미지 */}
        <div className="aspect-square bg-white relative">
          {product.images[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl">🌸</div>
          )}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
          >
            <ArrowLeft size={18} className="text-stone-600" />
          </button>
        </div>

        {/* 상품 정보 */}
        <div className="bg-white px-5 pt-5 pb-24">
          <div className="flex gap-1.5 mb-2">
            {product.ohaengTags.map((tag) => (
              <span key={tag} className="text-xs bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full">
                {OHAENG_EMOJI[tag]} {tag}
              </span>
            ))}
          </div>
          <h1 className="text-xl font-bold text-stone-800">{product.name}</h1>
          {product.flowerMeaning && (
            <p className="text-sm text-stone-400 mt-1">꽃말: {product.flowerMeaning}</p>
          )}
          <p className="text-2xl font-bold text-rose-500 mt-3">
            {product.price.toLocaleString()}원
          </p>
          <p className="text-sm text-stone-600 mt-4 leading-relaxed">{product.description}</p>

          {/* 수량 */}
          <div className="flex items-center gap-4 mt-6">
            <span className="text-sm text-stone-600 font-medium">수량</span>
            <div className="flex items-center gap-3 bg-stone-50 rounded-xl px-3 py-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-rose-500"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-rose-500"
              >
                +
              </button>
            </div>
            <span className="text-xs text-stone-400">재고 {product.stock}개</span>
          </div>
        </div>

        {/* 하단 고정 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-5 pt-3 bg-white/95 backdrop-blur border-t border-stone-100">
          <Button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="w-full bg-rose-400 hover:bg-rose-500 text-white h-12 text-base font-semibold gap-2"
          >
            <ShoppingBag size={18} />
            {added ? "담겼어요! 🌸" : product.stock === 0 ? "품절" : "장바구니 담기"}
          </Button>
        </div>
      </div>
    </main>
  )
}

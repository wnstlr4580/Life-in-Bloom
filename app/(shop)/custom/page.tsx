"use client"

import { useState } from "react"
import { useCartStore } from "@/store/cartStore"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Plus, Minus, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { nanoid } from "nanoid"
import Image from "next/image"

const FLOWERS = [
  { id: "rose", name: "장미", emoji: "🌹", img: "https://images.unsplash.com/photo-1523693916903-027d144a2b7d?w=300&h=300&fit=crop&q=80", color: "red", price: 3000, ohaeng: "화" },
  { id: "tulip", name: "튤립", emoji: "🌷", img: "https://images.unsplash.com/photo-1778074631493-5bdb54f8ada6?w=300&h=300&fit=crop&q=80", color: "pink", price: 2500, ohaeng: "목" },
  { id: "lily", name: "백합", emoji: "🤍", img: "https://images.unsplash.com/photo-1592242690836-0bddd3f89466?w=300&h=300&fit=crop&q=80", color: "white", price: 3500, ohaeng: "금" },
  { id: "sunflower", name: "해바라기", emoji: "🌻", img: "https://images.unsplash.com/photo-1776445602573-0cc8680b4d0a?w=300&h=300&fit=crop&q=80", color: "yellow", price: 2000, ohaeng: "토" },
  { id: "lavender", name: "라벤더", emoji: "💜", img: "https://images.unsplash.com/photo-1528190590778-23ac3ad37dff?w=300&h=300&fit=crop&q=80", color: "purple", price: 2500, ohaeng: "수" },
  { id: "daisy", name: "데이지", emoji: "🌼", img: "https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?w=300&h=300&fit=crop&q=80", color: "yellow", price: 1500, ohaeng: "토" },
  { id: "carnation", name: "카네이션", emoji: "🌸", img: "https://images.unsplash.com/photo-1497276236755-0f85ba99a126?w=300&h=300&fit=crop&q=80", color: "pink", price: 2000, ohaeng: "화" },
  { id: "hydrangea", name: "수국", emoji: "💙", img: "https://images.unsplash.com/photo-1750369326137-21de716e3224?w=300&h=300&fit=crop&q=80", color: "blue", price: 4000, ohaeng: "수" },
]

const WRAPPING = [
  { id: "kraft", name: "크라프트지", emoji: "📦", price: 2000 },
  { id: "ribbon", name: "리본 장식", emoji: "🎀", price: 3000 },
  { id: "lace", name: "레이스 포장", emoji: "🤍", price: 4000 },
  { id: "minimal", name: "미니멀 포장", emoji: "⬜", price: 1500 },
]

const COLOR_FILTER = ["전체", "red", "pink", "white", "yellow", "purple", "blue"]
const COLOR_LABEL: Record<string, string> = { 전체: "전체", red: "레드", pink: "핑크", white: "화이트", yellow: "옐로우", purple: "퍼플", blue: "블루" }

interface SelectedFlower {
  id: string
  name: string
  emoji: string
  price: number
  count: number
}

export default function CustomPage() {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const [selected, setSelected] = useState<Record<string, SelectedFlower>>({})
  const [wrapping, setWrapping] = useState(WRAPPING[0])
  const [colorFilter, setColorFilter] = useState("전체")
  const [added, setAdded] = useState(false)

  const BASE_PRICE = 10000
  const flowerTotal = Object.values(selected).reduce((s, f) => s + f.price * f.count, 0)
  const totalPrice = BASE_PRICE + flowerTotal + wrapping.price
  const totalFlowers = Object.values(selected).reduce((s, f) => s + f.count, 0)

  const adjust = (flower: typeof FLOWERS[0], delta: number) => {
    setSelected((prev) => {
      const cur = prev[flower.id]?.count ?? 0
      const next = Math.max(0, Math.min(5, cur + delta))
      if (next === 0) {
        const { [flower.id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [flower.id]: { id: flower.id, name: flower.name, emoji: flower.emoji, price: flower.price, count: next } }
    })
  }

  const handleAddToCart = () => {
    if (totalFlowers === 0) return
    const name = `커스텀 꽃다발 (${Object.values(selected).map((f) => `${f.emoji}${f.name}×${f.count}`).join(", ")})`
    addItem({
      id: nanoid(),
      productId: `custom_${nanoid(8)}`,
      quantity: 1,
      product: {
        id: `custom_${nanoid(8)}`,
        name,
        price: totalPrice,
        images: [],
        stock: 99,
      },
    })
    setAdded(true)
    setTimeout(() => { setAdded(false); router.push("/cart") }, 1000)
  }

  const filtered = colorFilter === "전체" ? FLOWERS : FLOWERS.filter((f) => f.color === colorFilter)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
          <Sparkles size={22} className="text-rose-400" /> 나만의 꽃다발 만들기
        </h1>
        <p className="text-stone-400 text-sm mt-1">원하는 꽃을 골라 나만의 꽃다발을 구성해 보세요</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* 왼쪽 — 꽃 선택 */}
        <div className="flex-1 space-y-6">
          {/* 색상 필터 */}
          <div className="flex gap-2 flex-wrap">
            {COLOR_FILTER.map((c) => (
              <button
                key={c}
                onClick={() => setColorFilter(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${colorFilter === c ? "bg-rose-400 border-rose-400 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-rose-300"}`}
              >
                {COLOR_LABEL[c]}
              </button>
            ))}
          </div>

          {/* 꽃 목록 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((flower) => {
              const count = selected[flower.id]?.count ?? 0
              return (
                <div key={flower.id} className={`bg-white rounded-2xl overflow-hidden border-2 transition-all ${count > 0 ? "border-rose-300 shadow-sm" : "border-stone-100 hover:border-stone-200"}`}>
                  <div className="relative aspect-square">
                    <Image src={flower.img} alt={flower.name} fill className="object-cover" />
                    {count > 0 && (
                      <div className="absolute top-2 right-2 bg-rose-400 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                        {count}
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-sm font-semibold text-stone-800">{flower.name}</p>
                    <p className="text-xs text-stone-400">{flower.price.toLocaleString()}원/송이</p>
                    <span className="text-[10px] bg-rose-50 text-rose-400 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">{flower.ohaeng}</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 bg-stone-50 rounded-xl py-1.5">
                    <button onClick={() => adjust(flower, -1)} disabled={count === 0} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-100 disabled:opacity-30 transition-colors">
                      <Minus size={13} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-stone-800">{count}</span>
                    <button onClick={() => adjust(flower, 1)} disabled={count >= 5} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-100 disabled:opacity-30 transition-colors">
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 포장 선택 */}
          <section className="bg-white rounded-2xl p-6 border border-stone-100">
            <h2 className="font-semibold text-stone-800 mb-4">포장 방식</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {WRAPPING.map((w) => (
                <label key={w.id} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-colors ${wrapping.id === w.id ? "border-rose-400 bg-rose-50" : "border-stone-100 hover:border-stone-200"}`}>
                  <input type="radio" name="wrapping" value={w.id} checked={wrapping.id === w.id} onChange={() => setWrapping(w)} className="sr-only" />
                  <span className="text-2xl">{w.emoji}</span>
                  <span className="text-xs font-medium text-stone-700 text-center">{w.name}</span>
                  <span className="text-xs text-stone-400">+{w.price.toLocaleString()}원</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* 오른쪽 — 미리보기 & 요약 */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-2xl border border-stone-100 sticky top-24 overflow-hidden">
            {/* 미리보기 */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-6 text-center min-h-48 flex flex-col items-center justify-center">
              {totalFlowers === 0 ? (
                <div className="space-y-2">
                  <p className="text-4xl opacity-30">💐</p>
                  <p className="text-xs text-stone-400">꽃을 선택해 주세요</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {Object.values(selected).flatMap((f) =>
                      Array(f.count).fill(null).map((_, i) => (
                        <div key={`${f.id}-${i}`} className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                          <img src={FLOWERS.find((fl) => fl.id === f.id)?.img} alt={f.name} className="w-full h-full object-cover" />
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-stone-500">{wrapping.emoji} {wrapping.name}</p>
                  <p className="text-xs text-stone-400">총 {totalFlowers}송이</p>
                </div>
              )}
            </div>

            {/* 가격 요약 */}
            <div className="p-5 space-y-3">
              <div className="space-y-1.5 text-sm text-stone-600">
                <div className="flex justify-between"><span>기본 포장재</span><span>{BASE_PRICE.toLocaleString()}원</span></div>
                {Object.values(selected).map((f) => (
                  <div key={f.id} className="flex justify-between">
                    <span>{f.emoji} {f.name} ×{f.count}</span>
                    <span>{(f.price * f.count).toLocaleString()}원</span>
                  </div>
                ))}
                <div className="flex justify-between"><span>{wrapping.emoji} {wrapping.name}</span><span>{wrapping.price.toLocaleString()}원</span></div>
              </div>
              <div className="border-t border-stone-100 pt-3 flex justify-between font-bold text-stone-800">
                <span>합계</span>
                <span className="text-rose-500 text-lg">{totalPrice.toLocaleString()}원</span>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={totalFlowers === 0 || added}
                className="w-full h-11 bg-rose-400 hover:bg-rose-500 text-white font-semibold gap-2 disabled:opacity-50"
              >
                <ShoppingCart size={16} />
                {added ? "담겼어요! 🌸" : "장바구니 담기"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

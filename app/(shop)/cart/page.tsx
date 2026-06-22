"use client"

import { useCartStore } from "@/store/cartStore"
import { Button } from "@/components/ui/button"
import { Trash2, ShoppingBag } from "lucide-react"
import Link from "next/link"

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice } = useCartStore()
  const total = totalPrice()

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4">
        <span className="text-5xl">🛒</span>
        <p className="text-stone-500 text-sm">장바구니가 비어있어요</p>
        <Link href="/products">
          <Button className="bg-rose-400 hover:bg-rose-500 text-white">꽃 구경하기</Button>
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-stone-800 mb-5 flex items-center gap-2">
          <ShoppingBag size={20} /> 장바구니
        </h1>

        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 flex gap-3 border border-stone-100">
              <div className="w-16 h-16 bg-stone-50 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                {item.product.images[0] ? (
                  <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🌸</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800 line-clamp-1">{item.product.name}</p>
                <p className="text-sm font-bold text-rose-500 mt-0.5">
                  {(item.product.price * item.quantity).toLocaleString()}원
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-2 py-1">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="text-stone-400 hover:text-rose-400 text-sm w-5 text-center"
                    >
                      −
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, Math.min(item.product.stock, item.quantity + 1))}
                      className="text-stone-400 hover:text-rose-400 text-sm w-5 text-center"
                    >
                      +
                    </button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-stone-300 hover:text-red-400 p-1">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 결제 요약 */}
        <div className="bg-white rounded-2xl p-4 border border-stone-100 mb-4">
          <div className="flex justify-between text-sm text-stone-600 mb-2">
            <span>상품 금액</span>
            <span>{total.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm text-stone-600 mb-3">
            <span>배송비</span>
            <span className="text-rose-400">{total >= 50000 ? "무료" : "3,000원"}</span>
          </div>
          <div className="border-t border-stone-100 pt-3 flex justify-between font-bold text-stone-800">
            <span>총 결제금액</span>
            <span className="text-rose-500">
              {(total >= 50000 ? total : total + 3000).toLocaleString()}원
            </span>
          </div>
        </div>

        <Button className="w-full bg-rose-400 hover:bg-rose-500 text-white h-12 text-base font-semibold">
          주문하기
        </Button>
      </div>
    </main>
  )
}

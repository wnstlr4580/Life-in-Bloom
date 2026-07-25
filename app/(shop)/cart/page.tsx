"use client"

import { useCartStore } from "@/store/cartStore"
import { Button } from "@/components/ui/button"
import { Trash2, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

export default function CartPage() {
  const { data: session, status } = useSession()
  const { items, updateQuantity, removeItem, totalPrice } = useCartStore()
  const total = totalPrice()

  if (status === "loading") {
    return <div className="mx-auto max-w-6xl px-6 py-32 text-center text-stone-400">회원 정보를 확인하고 있어요...</div>
  }
  if (!session?.user) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-32">
        <span className="text-5xl">🔐</span>
        <p className="font-semibold text-stone-700">장바구니는 로그인한 일반회원만 볼 수 있어요.</p>
        <Link href="/login"><Button className="bg-rose-400 text-white hover:bg-rose-500">로그인하기</Button></Link>
      </div>
    )
  }
  if (session.user.role !== "CUSTOMER") {
    return <div className="mx-auto max-w-6xl px-6 py-32 text-center font-semibold text-stone-600">판매자와 관리자는 장바구니 및 꽃 구매를 이용할 수 없어요.</div>
  }

  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-32 flex flex-col items-center gap-4">
        <span className="text-6xl">🛒</span>
        <p className="text-stone-400">장바구니가 비어있어요</p>
        <Link href="/products">
          <Button className="bg-rose-400 hover:bg-rose-500 text-white">꽃 구경하기</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-stone-800 mb-8 flex items-center gap-2">
        <ShoppingBag size={22} /> 장바구니
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* 상품 목록 */}
        <div className="flex-1 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-5 flex gap-4 border border-stone-100 hover:border-stone-200 transition-colors">
              <div className="w-20 h-20 bg-stone-50 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                {item.product.images[0] ? (
                  <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🌸</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-800">{item.product.name}</p>
                <p className="text-lg font-bold text-rose-500 mt-1">
                  {(item.product.price * item.quantity).toLocaleString()}원
                </p>
                <p className="text-xs text-stone-400">개당 {item.product.price.toLocaleString()}원</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => removeItem(item.id)} className="text-stone-300 hover:text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
                <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-1.5">
                  <button
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    className="text-stone-400 hover:text-rose-400 w-5 text-center font-medium"
                  >
                    −
                  </button>
                  <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, Math.min(item.product.stock, item.quantity + 1))}
                    className="text-stone-400 hover:text-rose-400 w-5 text-center font-medium"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 결제 요약 — 사이드바 */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white rounded-2xl p-6 border border-stone-100 sticky top-24 space-y-4">
            <h2 className="font-bold text-stone-800 text-lg">주문 요약</h2>
            <div className="space-y-2 text-sm text-stone-600">
              <div className="flex justify-between">
                <span>상품 금액</span>
                <span>{total.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span>수령 방법</span>
                <span className="text-stone-400">결제 단계에서 선택</span>
              </div>
            </div>
            <div className="border-t border-stone-100 pt-4 flex justify-between font-bold text-stone-800">
              <span>총 결제금액</span>
              <span className="text-rose-500 text-lg">{total.toLocaleString()}원</span>
            </div>
            <Link href="/checkout" className="block">
              <Button className="w-full h-12 bg-rose-400 hover:bg-rose-500 text-white font-semibold text-base">
                주문하기
              </Button>
            </Link>
            <Link href="/products" className="block text-center text-sm text-stone-400 hover:text-rose-400 transition-colors">
              쇼핑 계속하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

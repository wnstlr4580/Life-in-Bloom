"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCartStore } from "@/store/cartStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Truck, Gift, CreditCard } from "lucide-react"
import Link from "next/link"
import { nanoid } from "nanoid"

type DeliveryType = "standard" | "express" | "pickup"

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, clear } = useCartStore()
  const total = totalPrice()
  const shippingFee = total >= 50000 ? 0 : 3000

  const [form, setForm] = useState({ name: "", phone: "", address: "", addressDetail: "", giftMessage: "", giftWrapping: false })
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("standard")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-32 flex flex-col items-center gap-4">
        <p className="text-stone-400">주문할 상품이 없어요</p>
        <Link href="/products"><Button className="bg-rose-400 hover:bg-rose-500 text-white">꽃 구경하기</Button></Link>
      </div>
    )
  }

  const giftFee = form.giftWrapping ? 2000 : 0
  const expressFee = deliveryType === "express" ? 5000 : 0
  const grandTotal = total + shippingFee + giftFee + expressFee

  const validate = () => {
    if (!form.name || !form.phone || !form.address) {
      setError("배송 정보를 모두 입력해주세요")
      return false
    }
    return true
  }

  const createOrder = async (paymentId?: string) => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.product.price })),
        totalAmount: grandTotal,
        shippingFee: shippingFee + expressFee,
        deliveryType,
        shippingAddr: { name: form.name, phone: form.phone, address: form.address, addressDetail: form.addressDetail },
        giftMessage: form.giftMessage || null,
        giftWrapping: form.giftWrapping,
        paymentId: paymentId ?? null,
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error ?? "주문에 실패했습니다")
    }
    return res.json()
  }

  const handlePayment = async () => {
    if (!validate()) return
    setLoading(true)
    setError("")

    try {
      const PortOne = (await import("@portone/browser-sdk/v2")).default
      const paymentId = `order_${nanoid()}`

      const response = await PortOne.requestPayment({
        storeId: "store-b6ae6b94-3891-4a84-afce-0428f5b5de34",
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName: items.length === 1 ? items[0].product.name : `${items[0].product.name} 외 ${items.length - 1}건`,
        totalAmount: grandTotal,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        customer: { fullName: form.name, phoneNumber: form.phone },
        redirectUrl: `${window.location.origin}/checkout/complete`,
      })

      if (response?.code) {
        // 결제 취소 또는 실패
        if (response.code !== "USER_CANCEL") setError(response.message ?? "결제에 실패했습니다")
        return
      }

      // 서버에서 결제 검증
      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, expectedAmount: grandTotal }),
      })

      if (!verifyRes.ok) {
        const d = await verifyRes.json()
        throw new Error(d.error ?? "결제 검증에 실패했습니다")
      }

      // 주문 생성
      const { orderId } = await createOrder(paymentId)
      clear()
      router.push(`/checkout/complete?orderId=${orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "결제 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-stone-800 mb-8">주문 / 결제</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* 왼쪽 — 입력 폼 */}
        <div className="flex-1 space-y-5">
          {/* 배송 방법 */}
          <section className="bg-white rounded-2xl p-6 border border-stone-100">
            <h2 className="font-semibold text-stone-800 mb-4 flex items-center gap-2"><Truck size={16} /> 배송 방법</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { value: "standard", label: "일반배송", sub: "3~5일 소요 · 무료(5만원↑)" },
                { value: "express", label: "당일배송", sub: "오전 11시 이전 주문 · +5,000원" },
                { value: "pickup", label: "매장 픽업", sub: "서울 성수점 · 무료" },
              ] as const).map(({ value, label, sub }) => (
                <label key={value} className={`flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-colors ${deliveryType === value ? "border-rose-400 bg-rose-50" : "border-stone-100 hover:border-stone-200"}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="delivery" value={value} checked={deliveryType === value} onChange={() => setDeliveryType(value)} className="accent-rose-400" />
                    <span className="text-sm font-semibold text-stone-800">{label}</span>
                  </div>
                  <p className="text-xs text-stone-400 pl-5">{sub}</p>
                </label>
              ))}
            </div>
          </section>

          {/* 배송지 */}
          <section className="bg-white rounded-2xl p-6 border border-stone-100 space-y-4">
            <h2 className="font-semibold text-stone-800">배송지 정보</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">받는 분 *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="이름" className="rounded-xl border-stone-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">연락처 *</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" className="rounded-xl border-stone-200" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">주소 *</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="도로명 주소" className="rounded-xl border-stone-200" />
              <Input value={form.addressDetail} onChange={(e) => setForm((f) => ({ ...f, addressDetail: e.target.value }))} placeholder="상세 주소" className="mt-2 rounded-xl border-stone-200" />
            </div>
          </section>

          {/* 선물 옵션 */}
          <section className="bg-white rounded-2xl p-6 border border-stone-100 space-y-4">
            <h2 className="font-semibold text-stone-800 flex items-center gap-2"><Gift size={16} /> 선물 옵션</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.giftWrapping} onChange={(e) => setForm((f) => ({ ...f, giftWrapping: e.target.checked }))} className="accent-rose-400 w-4 h-4" />
              <span className="text-sm text-stone-700">선물 포장 (+2,000원)</span>
            </label>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">메시지 카드 (선택)</Label>
              <textarea value={form.giftMessage} onChange={(e) => setForm((f) => ({ ...f, giftMessage: e.target.value }))} placeholder="전하고 싶은 메시지를 남겨보세요" rows={3} className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-rose-300" />
            </div>
          </section>
        </div>

        {/* 오른쪽 — 주문 요약 */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white rounded-2xl p-6 border border-stone-100 sticky top-24 space-y-4">
            <h2 className="font-bold text-stone-800">주문 상품</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-stone-600 line-clamp-1 flex-1 mr-2">{item.product.name} × {item.quantity}</span>
                  <span className="text-stone-800 font-medium shrink-0">{(item.product.price * item.quantity).toLocaleString()}원</span>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-2 text-sm text-stone-600">
              <div className="flex justify-between"><span>상품 금액</span><span>{total.toLocaleString()}원</span></div>
              <div className="flex justify-between"><span>배송비</span><span className={shippingFee === 0 ? "text-rose-400" : ""}>{shippingFee === 0 ? "무료" : `${shippingFee.toLocaleString()}원`}</span></div>
              {expressFee > 0 && <div className="flex justify-between"><span>당일배송 추가비</span><span>{expressFee.toLocaleString()}원</span></div>}
              {form.giftWrapping && <div className="flex justify-between"><span>선물 포장</span><span>2,000원</span></div>}
            </div>

            <div className="border-t border-stone-100 pt-4 flex justify-between font-bold text-stone-800">
              <span>총 결제금액</span>
              <span className="text-rose-500 text-lg">{grandTotal.toLocaleString()}원</span>
            </div>

            {error && <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg p-2">{error}</p>}

            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full h-12 bg-rose-400 hover:bg-rose-500 text-white font-semibold text-base disabled:opacity-60 gap-2"
            >
              <CreditCard size={18} />
              {loading ? "처리 중..." : `${grandTotal.toLocaleString()}원 결제하기`}
            </Button>
            <p className="text-xs text-center text-stone-400">카드 · 카카오페이 · 토스 등 결제 가능</p>
          </div>
        </div>
      </div>
    </div>
  )
}

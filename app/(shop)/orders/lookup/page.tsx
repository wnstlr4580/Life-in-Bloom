"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search } from "lucide-react"

const STATUS_LABEL: Record<string, string> = {
  PENDING: "결제 대기", PAID: "결제 완료", PREPARING: "준비 중",
  SHIPPED: "배송 중", DELIVERED: "배송 완료", CANCELLED: "취소됨",
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700", PAID: "bg-blue-100 text-blue-700",
  PREPARING: "bg-purple-100 text-purple-700", SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700", CANCELLED: "bg-stone-100 text-stone-500",
}

interface LookupResult {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  deliveryDate: string | null
  recipientName: string | null
  items: { id: string; quantity: number; price: number; product: { name: string } | null }[]
}

export default function OrderLookupPage() {
  const [orderId, setOrderId] = useState("")
  const [phone, setPhone] = useState("")
  const [result, setResult] = useState<LookupResult | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderId.trim() || !phone.trim()) { setError("주문번호와 연락처를 입력해주세요"); return }
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch(`/api/orders/lookup?orderId=${encodeURIComponent(orderId.trim())}&phone=${encodeURIComponent(phone)}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? "조회에 실패했어요")
      setResult(d)
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회에 실패했어요")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <p className="text-3xl mb-2">📦</p>
        <h1 className="text-2xl font-bold text-stone-800">주문 조회</h1>
        <p className="text-sm text-stone-400 mt-2">
          주문 완료 화면에서 받은 주문번호와<br />주문 시 입력한 연락처로 조회할 수 있어요
        </p>
      </div>

      <form onSubmit={handleLookup} className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">주문번호</Label>
          <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="주문번호를 붙여넣어주세요" className="rounded-xl border-stone-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">연락처</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className="rounded-xl border-stone-200" />
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full h-11 bg-rose-400 hover:bg-rose-500 text-white font-semibold gap-2">
          <Search size={16} /> {loading ? "조회 중..." : "조회하기"}
        </Button>
      </form>

      {result && (
        <div className="mt-6 bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${STATUS_COLOR[result.status] ?? "bg-stone-100 text-stone-500"}`}>
              {STATUS_LABEL[result.status] ?? result.status}
            </span>
            <span className="text-xs text-stone-400">
              주문일 {new Date(result.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </div>

          <div className="space-y-1.5 text-sm text-stone-600">
            {result.recipientName && <p>받는 분: {result.recipientName}</p>}
            {result.deliveryDate && <p>받는 날짜: {result.deliveryDate}</p>}
          </div>

          <div className="border-t border-stone-100 pt-4 space-y-2">
            {result.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-stone-600">{item.product?.name ?? "상품"} × {item.quantity}</span>
                <span className="text-stone-800 font-medium">{(item.price * item.quantity).toLocaleString()}원</span>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-100 pt-4 flex justify-between font-bold text-stone-800">
            <span>총 결제금액</span>
            <span className="text-rose-500">{result.totalAmount.toLocaleString()}원</span>
          </div>
        </div>
      )}
    </div>
  )
}

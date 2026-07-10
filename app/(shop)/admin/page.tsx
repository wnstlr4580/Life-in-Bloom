"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const STATUS_LABEL: Record<string, string> = {
  PENDING: "결제 대기", PAID: "결제 완료", PREPARING: "준비 중",
  SHIPPED: "배송 중", DELIVERED: "배송 완료", CANCELLED: "취소됨",
}
const STATUS_ORDER = ["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"]

interface AdminOrder {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  deliveryType: string
  shippingAddr: Record<string, string> | null
  giftMessage: string | null
  items: { id: string; quantity: number; price: number; product: { name: string } | null }[]
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [forbidden, setForbidden] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/orders")
      .then((r) => {
        if (r.status === 403) { setForbidden(true); return { orders: [] } }
        return r.json()
      })
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (session?.user) load()
    else if (status !== "loading") setLoading(false)
  }, [session, status, load])

  const changeStatus = async (orderId: string, newStatus: string) => {
    setSaving(orderId)
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: newStatus }),
    })
    if (res.ok) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)))
    }
    setSaving(null)
  }

  if (status === "loading" || loading) {
    return <div className="max-w-6xl mx-auto px-6 py-32 flex justify-center"><div className="w-8 h-8 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto px-6 py-32 text-center space-y-4">
        <p className="text-stone-500">관리자 로그인이 필요해요</p>
        <Link href="/login?callbackUrl=/admin"><Button className="bg-rose-400 hover:bg-rose-500 text-white">로그인</Button></Link>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="max-w-md mx-auto px-6 py-32 text-center space-y-2">
        <p className="text-3xl">🔒</p>
        <p className="text-stone-500">관리자 권한이 없는 계정이에요</p>
        <p className="text-xs text-stone-400">Vercel 환경변수 ADMIN_EMAILS에 이메일을 등록해주세요</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-stone-800">주문 관리</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="text-sm text-rose-500 font-medium hover:text-rose-600">상품 관리 →</Link>
          <Button onClick={load} variant="outline" className="h-9 text-sm border-stone-200">새로고침</Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-stone-400 py-24">아직 주문이 없어요</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const addr = o.shippingAddr
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-stone-100 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-xs text-stone-400 font-mono truncate">{o.id}</p>
                    <p className="text-xs text-stone-400">{new Date(o.createdAt).toLocaleString("ko-KR")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={o.status}
                      disabled={saving === o.id}
                      onChange={(e) => changeStatus(o.id, e.target.value)}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300 disabled:opacity-50"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5 text-stone-600">
                    {o.items.map((it) => (
                      <p key={it.id}>{it.product?.name ?? "상품"} × {it.quantity}</p>
                    ))}
                    <p className="font-bold text-stone-800 pt-1">{o.totalAmount.toLocaleString()}원</p>
                  </div>
                  {addr && (
                    <div className="text-xs text-stone-500 space-y-0.5">
                      <p>받는 분: {addr.name} ({addr.phone})</p>
                      {addr.ordererName && <p>주문자: {addr.ordererName} ({addr.ordererPhone})</p>}
                      {addr.address && <p>주소: {addr.address} {addr.addressDetail}</p>}
                      {addr.deliveryDate && <p>받는 날짜: {addr.deliveryDate} {addr.deliveryTime === "morning" ? "(오전)" : addr.deliveryTime === "afternoon" ? "(오후)" : ""}</p>}
                      {o.giftMessage && <p>메시지: {o.giftMessage}</p>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

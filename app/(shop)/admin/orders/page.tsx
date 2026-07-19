"use client"

import { useEffect, useMemo, useState } from "react"

type Order = { id: string; status: string; totalAmount: number; createdAt: string; deliveryType: string; items: Array<{ id: string; quantity: number; price: number; itemType: string; fulfillmentStatus: string; seller: { marketName: string } | null; product: { name: string } | null }> }
const STATUS: Record<string, string> = { PENDING: "결제 대기", PAID: "결제 완료", PREPARING: "준비 중", SHIPPED: "배송 중", DELIVERED: "배송 완료", CANCELLED: "취소" }

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState("ALL")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => { fetch("/api/admin/orders", { cache: "no-store" }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setOrders(d.orders ?? []) }).catch((e) => setError(e.message || "주문 현황을 불러오지 못했어요")).finally(() => setLoading(false)) }, [])
  const visible = useMemo(() => filter === "ALL" ? orders : orders.filter((o) => o.status === filter), [orders, filter])
  return <div className="p-6 sm:p-10">
    <h1 className="text-2xl font-bold">주문 현황</h1><p className="mt-2 text-sm text-stone-500">배송 처리는 판매자가 담당하며, 관리자는 판매처별 주문 흐름과 이상 건을 확인합니다.</p>
    <div className="mt-6 flex flex-wrap gap-2">{["ALL", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1.5 text-xs ${filter === s ? "bg-stone-900 text-white" : "bg-white"}`}>{s === "ALL" ? "전체" : STATUS[s]}</button>)}</div>
    {loading && <State text="주문 현황을 불러오는 중..." />}{error && <State error text={error} />}
    {!loading && !error && visible.length === 0 && <State text="조건에 맞는 주문이 없습니다." />}
    <div className="mt-5 space-y-3">{visible.map((o) => <div key={o.id} className="rounded-2xl border bg-white p-5">
      <div className="flex justify-between gap-3"><div><p className="font-mono text-xs text-stone-400">{o.id}</p><p className="mt-1 text-xs text-stone-400">{new Date(o.createdAt).toLocaleString("ko-KR")}</p></div><div className="text-right"><span className="rounded-full bg-stone-100 px-2 py-1 text-xs">{STATUS[o.status] ?? o.status}</span><p className="mt-2 font-bold">{o.totalAmount.toLocaleString()}원</p></div></div>
      <div className="mt-4 grid gap-2">{o.items.map((item) => <div key={item.id} className="flex justify-between rounded-xl bg-stone-50 p-3 text-sm"><span>{item.product?.name} × {item.quantity}<small className="ml-2 text-stone-400">{item.seller?.marketName ?? "판매처 미지정"}</small></span><span className="text-xs text-stone-500">{item.itemType} · {item.fulfillmentStatus}</span></div>)}</div>
    </div>)}</div>
  </div>
}
function State({ text, error }: { text: string; error?: boolean }) { return <p className={`mt-5 rounded-xl p-5 text-center text-sm ${error ? "bg-rose-50 text-rose-600" : "border bg-white text-stone-400"}`}>{text}</p> }

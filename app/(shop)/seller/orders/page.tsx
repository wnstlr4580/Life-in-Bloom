"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ClipboardList, PackageCheck, Search, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Item = {
  id: string; orderId: string; quantity: number; price: number; itemType: string; fulfillmentStatus: string
  courier: string | null; trackingNumber: string | null
  product: { name: string; images: string[] } | { name: string; images: string[] }[]
  order: { createdAt: string; deliveryType: string; shippingAddr: Record<string, string>; giftMessage: string | null } | { createdAt: string; deliveryType: string; shippingAddr: Record<string, string>; giftMessage: string | null }[]
}
const STATUS: Record<string, string> = { PAID: "신규 주문", PREPARING: "상품 준비", SHIPPED: "배송 중", DELIVERED: "배송 완료", CANCELLED: "취소" }
const TYPE: Record<string, string> = { FINISHED: "완제품", CUSTOM_BOUQUET: "나만의 꽃다발", DIY_FLOWER: "개별 꽃·DIY" }

export default function SellerOrdersPage() {
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")
  const [query, setQuery] = useState("")
  const [error, setError] = useState("")
  const [shippingId, setShippingId] = useState<string | null>(null)
  const [shipping, setShipping] = useState({ courier: "", trackingNumber: "" })
  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (type) params.set("type", type)
    if (query) params.set("q", query)
    const response = await fetch(`/api/seller/orders?${params}`)
    const data = await response.json()
    if (response.ok) setItems(data.items ?? []); else setError(data.error)
  }, [status, type, query])
  useEffect(() => { load() }, [load])
  const counts = useMemo(() => Object.keys(STATUS).reduce((result, key) => ({ ...result, [key]: items.filter((item) => item.fulfillmentStatus === key).length }), {} as Record<string, number>), [items])
  const update = async (id: string, nextStatus: string) => {
    setError("")
    const response = await fetch("/api/seller/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: nextStatus, ...shipping }) })
    const data = await response.json()
    if (response.ok) { setShippingId(null); setShipping({ courier: "", trackingNumber: "" }); await load() } else setError(data.error)
  }
  return <div className="max-w-6xl px-6 py-10">
    <p className="text-sm font-semibold text-emerald-700">판매자센터</p>
    <h1 className="mt-1 text-2xl font-bold">주문·배송 관리</h1>
    <p className="mt-2 text-sm text-stone-500">완제품과 나만의 꽃다발, 개별 꽃 주문을 한곳에서 확인하고 유형별로 필터링합니다.</p>
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
      {Object.entries(STATUS).map(([key, label]) => <button key={key} onClick={() => setStatus(status === key ? "" : key)} className={`rounded-2xl border p-4 text-left ${status === key ? "border-emerald-500 bg-emerald-50" : "border-stone-200 bg-white"}`}><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-2xl font-bold">{counts[key] ?? 0}</p></button>)}
    </div>
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 lg:flex-row">
      <div className="flex flex-1 items-center gap-2"><Search size={17} className="text-stone-400" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="주문번호, 상품명, 수령인, 연락처 검색" className="border-0 shadow-none" /></div>
      <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-stone-200 px-3 text-sm"><option value="">전체 상품유형</option>{Object.entries(TYPE).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    </div>
    {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    <div className="mt-5 space-y-3">
      {items.length === 0 ? <div className="rounded-2xl border border-stone-200 bg-white py-24 text-center text-stone-400"><ClipboardList className="mx-auto mb-3" />조건에 맞는 주문이 없어요.</div> : items.map((item) => {
        const product = Array.isArray(item.product) ? item.product[0] : item.product
        const order = Array.isArray(item.order) ? item.order[0] : item.order
        const addr = order?.shippingAddr ?? {}
        return <article key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{TYPE[item.itemType]}</span><span className="rounded-full bg-stone-100 px-2 py-1 text-[10px]">{STATUS[item.fulfillmentStatus]}</span><span className="text-xs text-stone-400">#{item.orderId}</span></div><h2 className="mt-3 font-bold">{product?.name}</h2><p className="mt-1 text-sm">{item.quantity}개 · {(item.price * item.quantity).toLocaleString()}원</p><p className="mt-3 text-xs leading-5 text-stone-500">{addr.name ?? addr.recipient} · {addr.phone}<br />{addr.address} {addr.detailAddress}<br />희망일: {addr.deliveryDate || "미지정"} {addr.deliveryTime || ""}</p>{order?.giftMessage && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-600">메시지: {order.giftMessage}</p>}</div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {item.fulfillmentStatus === "PAID" && <><Button onClick={() => update(item.id, "PREPARING")} className="bg-emerald-700 text-white"><PackageCheck size={15} />준비 시작</Button><Button variant="outline" onClick={() => update(item.id, "CANCELLED")}>주문 취소</Button></>}
              {item.fulfillmentStatus === "PREPARING" && <><Button onClick={() => setShippingId(item.id)} className="bg-emerald-700 text-white"><Truck size={15} />발송 처리</Button>{order?.deliveryType === "pickup" && <Button variant="outline" onClick={() => update(item.id, "DELIVERED")}>픽업 완료</Button>}</>}
              {item.fulfillmentStatus === "SHIPPED" && <Button onClick={() => update(item.id, "DELIVERED")} className="bg-emerald-700 text-white">배송 완료</Button>}
            </div>
          </div>
          {shippingId === item.id && <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row"><Input value={shipping.courier} onChange={(e) => setShipping({ ...shipping, courier: e.target.value })} placeholder="택배사" /><Input value={shipping.trackingNumber} onChange={(e) => setShipping({ ...shipping, trackingNumber: e.target.value })} placeholder="송장번호" /><Button onClick={() => update(item.id, "SHIPPED")} className="bg-emerald-700 text-white">발송 확정</Button></div>}
        </article>
      })}
    </div>
  </div>
}

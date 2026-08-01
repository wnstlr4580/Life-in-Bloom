"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarClock, CircleDollarSign, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"

type Relation<T> = T | T[] | null
type SellerInfo = { id: string; marketName: string; settlementBank: string; settlementAccount: string; settlementHolder: string; commissionRate: number }
type Item = { id: string; orderId: string; quantity: number; price: number; commissionFee: number; commissionVat: number; shippingFeeAmount: number; pgFee: number; adjustmentAmount: number; settlementAmount: number; settlementStatus: string; settlementDueAt: string | null; settledAt: string | null; seller: Relation<SellerInfo>; product: Relation<{ name: string }> }
const STATUS: Record<string, string> = { WAITING: "구매확정 대기", READY: "정산 예정", HOLD: "보류", PAID: "지급 완료" }
const one = <T,>(value: Relation<T>) => Array.isArray(value) ? value[0] : value
const won = (value: number) => `${value.toLocaleString()}원`

export default function AdminSettlementsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [tab, setTab] = useState("READY")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => fetch("/api/admin/settlements", { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setItems(data.items ?? []) }).catch((e) => setError(e.message)), [])
  useEffect(() => { load() }, [load])
  const visible = useMemo(() => items.filter((item) => !tab || item.settlementStatus === tab), [items, tab])
  const summary = (status: string) => items.filter((item) => item.settlementStatus === status).reduce((sum, item) => sum + item.settlementAmount, 0)
  const action = async (actionName: "PAY" | "HOLD" | "RELEASE", itemIds: string[]) => {
    const reason = actionName === "HOLD" ? prompt("정산 보류 사유를 입력하세요") : ""
    if (actionName === "HOLD" && !reason) return
    setBusy(true); setError("")
    const response = await fetch("/api/admin/settlements", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName, itemIds, reason }) })
    const data = await response.json(); if (!response.ok) setError(data.error); else await load(); setBusy(false)
  }
  const updateRate = async (seller: SellerInfo) => {
    const input = prompt(`${seller.marketName}의 신규 주문 수수료율(0~100)을 입력하세요`, String(seller.commissionRate))
    if (input === null) return
    const commissionRate = Number(input)
    setBusy(true); setError("")
    const response = await fetch("/api/admin/settlements", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "UPDATE_SELLER_RATE", sellerId: seller.id, commissionRate }) })
    const data = await response.json(); if (!response.ok) setError(data.error); else await load(); setBusy(false)
  }
  return <div className="p-6 sm:p-10">
    <h1 className="text-2xl font-bold">정산 운영</h1><p className="mt-2 text-sm text-stone-500">구매확정된 주문을 검토하고 지급대행 송금 결과에 맞춰 상태를 기록합니다. 지급 완료 버튼 자체는 은행 송금을 실행하지 않습니다.</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><Summary icon={<CalendarClock/>} label="구매확정 대기" value={summary("WAITING")}/><Summary icon={<CircleDollarSign/>} label="정산 예정" value={summary("READY")}/><Summary icon={<Landmark/>} label="지급 완료" value={summary("PAID")}/></div>
    <div className="mt-6 flex gap-2">{[["","전체"],["WAITING","대기"],["READY","예정"],["HOLD","보류"],["PAID","완료"]].map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm ${tab === key ? "bg-stone-900 text-white" : "border bg-white"}`}>{label}</button>)}</div>
    {error && <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{error}</p>}
    <div className="mt-4 space-y-3">{visible.map((item) => { const seller = one(item.seller); const product = one(item.product); const due = item.settlementDueAt ? new Date(item.settlementDueAt) : null; const payable = item.settlementStatus === "READY" && due && due <= new Date(); return <article key={item.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-4"><div><p className="font-bold">{seller?.marketName} · {product?.name}</p><p className="mt-1 text-xs text-stone-400">#{item.orderId} · {seller?.settlementBank} {seller?.settlementAccount} ({seller?.settlementHolder})</p>{seller && <button onClick={() => updateRate(seller)} className="mt-2 text-xs font-semibold text-emerald-700">신규 주문 수수료 {seller.commissionRate}% 변경</button>}</div><div className="text-right"><span className="rounded-full bg-stone-100 px-2 py-1 text-xs">{STATUS[item.settlementStatus]}</span><p className="mt-2 text-lg font-bold text-emerald-700">{won(item.settlementAmount)}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-3 text-xs sm:grid-cols-5"><span>상품 {won(item.price * item.quantity)}</span><span>배송비 +{won(item.shippingFeeAmount)}</span><span>수수료 -{won(item.commissionFee)}</span><span>VAT -{won(item.commissionVat)}</span><span>조정 {won(item.adjustmentAmount)}</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-stone-500">{due ? `${due.toLocaleDateString("ko-KR")} 지급 예정` : "구매확정 전"}</p><div className="flex gap-2">{["WAITING","READY"].includes(item.settlementStatus) && <Button disabled={busy} variant="outline" onClick={() => action("HOLD", [item.id])}>보류</Button>}{item.settlementStatus === "HOLD" && <Button disabled={busy} variant="outline" onClick={() => action("RELEASE", [item.id])}>보류 해제</Button>}{item.settlementStatus === "READY" && <Button disabled={busy || !payable} onClick={() => action("PAY", [item.id])} className="bg-emerald-700 text-white">지급 완료</Button>}</div></div></article> })}</div>
  </div>
}
function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-2xl border bg-white p-5"><span className="text-emerald-700">{icon}</span><p className="mt-3 text-xs text-stone-400">{label}</p><p className="mt-1 text-xl font-bold">{won(value)}</p></div> }

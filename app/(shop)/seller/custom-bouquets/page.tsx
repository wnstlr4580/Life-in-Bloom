"use client"

import { useCallback, useEffect, useState } from "react"
import { Boxes, ClipboardList, PackageCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Product = { id: string; name: string; price: number; stock: number; images: string[]; flowerMeaning: string | null; isActive: boolean; createdAt: string }
type OrderItem = { id: string; quantity: number; price: number; productId: string; order: { id: string; status: string; createdAt: string; shippingAddr: Record<string, string>; giftMessage: string | null } | { id: string; status: string; createdAt: string; shippingAddr: Record<string, string>; giftMessage: string | null }[] }

export default function CustomBouquetsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [tab, setTab] = useState<"orders" | "stock">("orders")
  const [error, setError] = useState("")
  const load = useCallback(async () => {
    const response = await fetch("/api/seller/custom-bouquets")
    const data = await response.json()
    if (response.ok) { setProducts(data.products ?? []); setOrders(data.orders ?? []) } else setError(data.error)
  }, [])
  useEffect(() => { load() }, [load])
  const update = async (product: Product, stock: number) => {
    const response = await fetch("/api/seller/custom-bouquets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: product.id, stock, isActive: product.isActive }) })
    if (response.ok) await load()
  }
  return <div className="max-w-6xl px-6 py-10">
    <p className="text-sm font-semibold text-emerald-700">판매자센터</p><h1 className="mt-1 text-2xl font-bold">나만의 꽃다발 관리</h1>
    <p className="mt-2 text-sm text-stone-500">고객이 직접 구성한 꽃다발 주문과 제작 가능한 조합 재고를 별도로 관리합니다.</p>
    <div className="mt-7 grid sm:grid-cols-3 gap-4">
      <Metric icon={<ClipboardList />} label="커스텀 주문 항목" value={orders.length} />
      <Metric icon={<Boxes />} label="생성된 조합 상품" value={products.length} />
      <Metric icon={<PackageCheck />} label="제작 가능 재고" value={products.filter((p) => p.stock > 0).length} />
    </div>
    <div className="mt-6 flex gap-2 border-b border-stone-200">
      <Tab active={tab === "orders"} onClick={() => setTab("orders")}>커스텀 주문</Tab>
      <Tab active={tab === "stock"} onClick={() => setTab("stock")}>조합 상품·재고</Tab>
    </div>
    {error && <p className="mt-5 text-sm text-red-600">{error}</p>}
    {tab === "orders" ? <div className="mt-5 space-y-3">
      {orders.length === 0 ? <Empty text="아직 들어온 나만의 꽃다발 주문이 없어요." /> : orders.map((item) => {
        const order = Array.isArray(item.order) ? item.order[0] : item.order
        const product = products.find((p) => p.id === item.productId)
        return <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="font-bold">{product?.name ?? "나만의 꽃다발"}</p><p className="mt-1 text-xs text-stone-400">주문 {order?.id} · {order ? new Date(order.createdAt).toLocaleString("ko-KR") : ""}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{order?.status ?? "확인 필요"}</span></div>
          <p className="mt-3 text-sm text-stone-600">수량 {item.quantity} · {(item.price * item.quantity).toLocaleString()}원</p>
          {product?.flowerMeaning && <details className="mt-3 rounded-xl bg-stone-50 p-3 text-xs"><summary className="cursor-pointer font-semibold">고객이 선택한 꽃 구성 보기</summary><pre className="mt-2 whitespace-pre-wrap break-all text-stone-500">{product.flowerMeaning}</pre></details>}
        </div>
      })}
    </div> : <div className="mt-5 rounded-2xl border border-stone-200 bg-white overflow-hidden">
      {products.length === 0 ? <Empty text="고객이 만든 조합 상품이 아직 없어요." /> : products.map((product) => <div key={product.id} className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-stone-100 p-4 last:border-0">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-rose-50">{product.images[0] ? <img src={product.images[0]} alt="" className="h-full w-full object-cover" /> : <Sparkles className="text-rose-300" />}</div>
        <div className="flex-1"><p className="font-semibold">{product.name}</p><p className="mt-1 text-xs text-stone-400">{product.price.toLocaleString()}원 · 생성 {new Date(product.createdAt).toLocaleDateString("ko-KR")}</p></div>
        <div className="flex items-center gap-2"><Input type="number" min={0} defaultValue={product.stock} className="w-24" onBlur={(e) => update(product, Number(e.target.value))} /><span className="text-xs text-stone-400">제작 가능 수량</span></div>
      </div>)}
    </div>}
  </div>
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-2xl border border-stone-200 bg-white p-5"><span className="text-emerald-700">{icon}</span><p className="mt-3 text-xs text-stone-400">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div> }
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <Button type="button" variant="ghost" onClick={onClick} className={`rounded-none border-b-2 ${active ? "border-emerald-600 text-emerald-700" : "border-transparent text-stone-500"}`}>{children}</Button> }
function Empty({ text }: { text: string }) { return <div className="py-24 text-center text-sm text-stone-400">{text}</div> }

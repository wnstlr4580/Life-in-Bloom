"use client"

import { useEffect, useState } from "react"
import { CalendarClock, CircleDollarSign, Landmark, ReceiptText } from "lucide-react"

type Data = {
  summary: { gross: number; commission: number; waiting: number; ready: number; paid: number }
  account: { bank: string; account: string; holder: string }
  items: { id: string; orderId: string; quantity: number; price: number; itemType: string; commissionRate: number; commissionFee: number; settlementAmount: number; settlementStatus: string; settlementDueAt: string | null; product: { name: string } | { name: string }[]; order: { createdAt: string } | { createdAt: string }[] }[]
}
const TYPE: Record<string, string> = { FINISHED: "완제품", CUSTOM_BOUQUET: "나만의 꽃다발", DIY_FLOWER: "개별 꽃·DIY" }
const STATUS: Record<string, string> = { WAITING: "구매확정 대기", READY: "정산 예정", PAID: "지급 완료", HOLD: "정산 보류" }
const won = (value: number) => `${value.toLocaleString()}원`

export default function SellerSettlementsPage() {
  const [data, setData] = useState<Data | null>(null)
  const [tab, setTab] = useState("")
  useEffect(() => { fetch("/api/seller/settlements").then((response) => response.json()).then(setData) }, [])
  if (!data) return <div className="py-32 text-center text-stone-400">정산 내역을 불러오는 중...</div>
  const items = data.items.filter((item) => !tab || item.settlementStatus === tab)
  return <div className="max-w-6xl px-6 py-10">
    <p className="text-sm font-semibold text-emerald-700">판매자센터</p><h1 className="mt-1 text-2xl font-bold">정산 관리</h1>
    <p className="mt-2 text-sm text-stone-500">상품 유형과 관계없이 배송 완료된 주문상품을 기준으로 정산합니다. 현재 기본 수수료는 10%입니다.</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Summary icon={<ReceiptText />} label="총 판매금액" value={won(data.summary.gross)} />
      <Summary icon={<CircleDollarSign />} label="수수료" value={`-${won(data.summary.commission)}`} />
      <Summary icon={<CalendarClock />} label="정산 예정" value={won(data.summary.ready)} />
      <Summary icon={<Landmark />} label="지급 완료" value={won(data.summary.paid)} />
    </div>
    <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 sm:flex-row sm:items-center"><div><p className="text-xs font-bold text-emerald-700">정산 계좌</p><p className="mt-1 font-semibold">{data.account.bank} {data.account.account}</p><p className="text-xs text-stone-500">예금주 {data.account.holder}</p></div><p className="text-xs text-stone-500">배송 완료 후 7일 뒤 정산 예정으로 전환됩니다.</p></div>
    <div className="mt-6 flex gap-2 overflow-x-auto">{[["","전체"],["WAITING","구매확정 대기"],["READY","정산 예정"],["PAID","지급 완료"]].map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${tab === key ? "bg-emerald-700 text-white" : "border bg-white text-stone-600"}`}>{label}</button>)}</div>
    <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="hidden grid-cols-[1fr_120px_130px_130px_130px] gap-3 bg-stone-50 px-5 py-3 text-xs font-semibold text-stone-500 lg:grid"><span>주문상품</span><span>판매금액</span><span>수수료</span><span>정산액</span><span>상태</span></div>
      {items.length === 0 ? <div className="py-24 text-center text-sm text-stone-400">정산 내역이 없어요.</div> : items.map((item) => {
        const product = Array.isArray(item.product) ? item.product[0] : item.product
        return <div key={item.id} className="grid gap-2 border-t px-5 py-4 text-sm first:border-0 lg:grid-cols-[1fr_120px_130px_130px_130px] lg:items-center"><div><p className="font-semibold">{product?.name}</p><p className="mt-1 text-xs text-stone-400">#{item.orderId} · {TYPE[item.itemType]}</p></div><span>{won(item.price * item.quantity)}</span><span className="text-red-500">-{won(item.commissionFee)}</span><strong className="text-emerald-700">{won(item.settlementAmount)}</strong><div><span className="rounded-full bg-stone-100 px-2 py-1 text-xs">{STATUS[item.settlementStatus]}</span>{item.settlementDueAt && <p className="mt-1 text-[10px] text-stone-400">{new Date(item.settlementDueAt).toLocaleDateString("ko-KR")} 예정</p>}</div></div>
      })}
    </div>
  </div>
}
function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-2xl border border-stone-200 bg-white p-5"><span className="text-emerald-700">{icon}</span><p className="mt-3 text-xs text-stone-400">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div> }

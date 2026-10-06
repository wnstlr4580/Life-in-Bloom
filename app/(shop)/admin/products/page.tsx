"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Product = { id: string; name: string; price: number; stock: number; category: string; images: string[]; isActive: boolean; isPromoted: boolean; exposurePriority: number; saleStatus: string; createdAt: string; useTags: string[]; colorTags: string[]; seasonTags: string[]; seller: { id: string; marketName: string; status: string } | null }
const initialFilters = { q: "", seller: "", category: "ALL", use: "ALL", visibility: "ALL", stock: "ALL", sort: "newest" }
const CATEGORY: Record<string, string> = { bouquet: "꽃다발", basket: "꽃바구니", orchid: "난·화분", plant: "식물", wreath: "화환", dried: "드라이플라워" }

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filters, setFilters] = useState(initialFilters)
  const [reason, setReason] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = async (values = filters) => {
    setLoading(true); setError("")
    const response = await fetch(`/api/admin/products?${new URLSearchParams(values)}`, { cache: "no-store" })
    const data = await response.json()
    if (response.ok) setProducts(data.products ?? []); else setError(data.error || "상품을 불러오지 못했습니다.")
    setLoading(false)
  }
  useEffect(() => { load(initialFilters) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = async (product: Product) => {
    const response = await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: product.id, isActive: !product.isActive, reason: reason[product.id] }) })
    const data = await response.json(); if (!response.ok) return alert(data.error)
    load()
  }
  const update = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }))
  const setExposure = async (product: Product, values: Partial<Pick<Product, "isPromoted" | "exposurePriority">>) => {
    const response = await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: product.id, ...values }) })
    if (response.ok) { setSelected(null); load() } else alert((await response.json()).error)
  }
  return <div className="p-6 sm:p-10">
    <h1 className="text-2xl font-bold">상품 현황</h1><p className="mt-2 text-sm text-stone-500">구매 화면과 같은 기준으로 상품을 찾고, 정책 위반 상품의 노출 상태를 관리합니다.</p>
    <form onSubmit={(e) => { e.preventDefault(); load() }} className="mt-6 rounded-2xl border bg-white p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <input value={filters.q} onChange={(e) => update("q", e.target.value)} placeholder="상품명·색상·태그 검색" className="h-10 rounded-xl border px-3 text-sm" />
      <input value={filters.seller} onChange={(e) => update("seller", e.target.value)} placeholder="판매처명 검색" className="h-10 rounded-xl border px-3 text-sm" />
      <Select value={filters.category} set={(v) => update("category", v)} options={[["ALL","모든 상품 유형"],["bouquet","꽃다발"],["basket","꽃바구니"],["orchid","난·화분"],["plant","식물"],["wreath","화환"],["dried","드라이플라워"]]} />
      <Select value={filters.use} set={(v) => update("use", v)} options={[["ALL","모든 용도"],["생일","생일"],["축하","축하"],["개업","개업"],["결혼","결혼·웨딩"],["추모","추모"],["감사","감사"]]} />
      <Select value={filters.visibility} set={(v) => update("visibility", v)} options={[["ALL","모든 노출 상태"],["ACTIVE","노출 중"],["HIDDEN","노출 중지"]]} />
      <Select value={filters.stock} set={(v) => update("stock", v)} options={[["ALL","모든 재고"],["AVAILABLE","재고 있음"],["SOLD_OUT","품절"]]} />
      <Select value={filters.sort} set={(v) => update("sort", v)} options={[["newest","최신 등록순"],["priceAsc","낮은 가격순"],["priceDesc","높은 가격순"],["stockAsc","재고 적은순"]]} />
    </div><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => { setFilters(initialFilters); load(initialFilters) }} className="h-9 rounded-lg border px-4 text-xs">초기화</button><button className="h-9 rounded-lg bg-stone-900 px-5 text-xs text-white">검색</button></div></form>
    {loading && <p className="mt-5 rounded-2xl border bg-white p-12 text-center text-sm text-stone-400">상품을 불러오는 중...</p>}
    {error && <p className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{error}</p>}
    {!loading && !error && <div className="mt-5 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[640px] table-auto text-left text-sm [&_th]:px-3 [&_td]:px-3 [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden [&_th:nth-child(7)]:hidden [&_td:nth-child(7)]:hidden"><thead className="bg-stone-50 text-xs text-stone-500"><tr><Th>상품</Th><Th>판매처</Th><Th>분류·태그</Th><Th>가격</Th><Th>재고</Th><Th>노출 상태</Th><Th>등록일</Th><Th>관리</Th></tr></thead><tbody className="divide-y">{products.map((p) => <tr key={p.id} className={`align-top hover:bg-stone-50/60 ${p.isActive ? "" : "opacity-60"}`}>
      <Td><Link href={`/products/${p.id}`} className="flex min-w-0 items-center gap-3 font-semibold hover:text-rose-500"><span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100">{p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}</span><span className="min-w-0 whitespace-normal break-keep leading-5">{p.name}</span></Link></Td>
      <Td>{p.seller ? <Link href={`/admin/sellers?open=${p.seller.id}`} className="font-medium underline-offset-2 hover:underline">{p.seller.marketName}</Link> : "판매처 미지정"}</Td>
      <Td><p>{CATEGORY[p.category] ?? "기타 상품"}</p><div className="mt-2 flex flex-wrap gap-1">{[...p.useTags, ...p.colorTags, ...p.seasonTags].slice(0, 4).map((tag) => <Tag key={tag}>{tag}</Tag>)}</div></Td>
      <Td><span className="whitespace-nowrap">{p.price.toLocaleString()}원</span></Td><Td><span className={`whitespace-nowrap ${p.stock === 0 ? "text-rose-600" : ""}`}>{p.stock === 0 ? "품절" : `${p.stock}개`}</span></Td>
      <Td><Tag tone={p.isActive ? "green" : "red"}>{p.isActive ? "노출 중" : "노출 중지"}</Tag></Td><Td>{new Date(p.createdAt).toLocaleDateString("ko-KR")}</Td>
      <Td><button onClick={() => setSelected(p)} className="h-9 w-full rounded-lg border px-3 text-xs font-semibold">상세·관리</button></Td>
    </tr>)}</tbody></table>{products.length === 0 && <p className="p-16 text-center text-sm text-stone-400">조건에 맞는 상품이 없습니다.</p>}</div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={() => setSelected(null)}><section onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-stone-400">{selected.seller?.marketName}</p><h2 className="mt-1 text-lg font-bold">{selected.name}</h2></div><button onClick={() => setSelected(null)} className="rounded-lg border px-3 py-1 text-sm">닫기</button></div><dl className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-stone-50 p-4 text-sm"><div><dt className="text-xs text-stone-400">분류</dt><dd className="mt-1">{CATEGORY[selected.category] ?? "기타 상품"}</dd></div><div><dt className="text-xs text-stone-400">가격·재고</dt><dd className="mt-1">{selected.price.toLocaleString()}원 · {selected.stock}개</dd></div></dl><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={selected.isPromoted} onChange={(e) => setSelected({ ...selected, isPromoted: e.target.checked })} /> 재고 소진용 상단 노출</label><label className="mt-3 block text-xs">우선순위 (0~100)<input type="number" min="0" max="100" value={selected.exposurePriority} onChange={(e) => setSelected({ ...selected, exposurePriority: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-3" /></label><button onClick={() => setExposure(selected, { isPromoted: selected.isPromoted, exposurePriority: selected.exposurePriority })} className="mt-3 h-9 w-full rounded-lg bg-amber-600 text-xs font-bold text-white">노출 우선순위 저장</button></div><div className="mt-5"><label className="text-xs font-semibold">{selected.isActive ? "노출 중지 사유" : "현재 노출이 중지된 상품입니다."}</label>{selected.isActive && <textarea value={reason[selected.id] ?? ""} onChange={(e) => setReason((r) => ({ ...r, [selected.id]: e.target.value }))} placeholder="판매자에게 전달할 노출 중지 사유를 입력하세요." className="mt-2 h-24 w-full resize-none rounded-xl border p-3 text-sm" />}<button onClick={async () => { await toggle(selected); setSelected(null) }} className={`mt-3 h-11 w-full rounded-xl border text-sm font-semibold ${selected.isActive ? "text-rose-600" : "text-emerald-700"}`}>{selected.isActive ? "사유 전달 후 노출 중지" : "노출 복구"}</button></div></section></div>}
  </div>
}
function Select({ value, set, options }: { value: string; set: (v: string) => void; options: string[][] }) { return <select value={value} onChange={(e) => set(e.target.value)} className="h-10 rounded-xl border bg-white px-3 text-sm">{options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select> }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 font-semibold">{children}</th> }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-4">{children}</td> }
function Tag({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "red" }) { const style = tone === "green" ? "bg-emerald-100 text-emerald-700" : tone === "red" ? "bg-rose-100 text-rose-700" : "bg-stone-100 text-stone-600"; return <span className={`rounded-full px-2 py-1 text-[10px] ${style}`}>{children}</span> }

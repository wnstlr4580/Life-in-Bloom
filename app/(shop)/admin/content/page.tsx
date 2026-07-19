"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Item = { id: string; content: string | null; isHidden: boolean; moderationReason: string | null; createdAt: string; authorName?: string | null; userId?: string; rating?: number; User?: { email: string; name: string } | null; Product?: { id: string; name: string; seller: { id: string; marketName: string } | null } | null }
const initialFilters = { q: "", type: "ALL", visibility: "ALL" }

export default function AdminContentPage() {
  const [reviews, setReviews] = useState<Item[]>([])
  const [posts, setPosts] = useState<Item[]>([])
  const [filters, setFilters] = useState(initialFilters)
  const [reason, setReason] = useState<Record<string, string>>({})
  const [opened, setOpened] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = async (values = filters) => {
    setLoading(true); setError("")
    const response = await fetch(`/api/admin/content?${new URLSearchParams({ q: values.q, visibility: values.visibility })}`, { cache: "no-store" })
    const data = await response.json()
    if (response.ok) { setReviews(data.reviews ?? []); setPosts(data.posts ?? []) } else setError(data.error || "리뷰·게시물을 불러오지 못했습니다.")
    setLoading(false)
  }
  useEffect(() => { load(initialFilters) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = async (type: string, item: Item) => {
    const response = await fetch("/api/admin/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id: item.id, hidden: !item.isHidden, reason: reason[`${type}-${item.id}`] }) })
    const data = await response.json(); if (!response.ok) return alert(data.error); load()
  }
  const rows = [
    ...(filters.type === "ALL" || filters.type === "REVIEW" ? reviews.map((item) => ({ ...item, type: "REVIEW" })) : []),
    ...(filters.type === "ALL" || filters.type === "BOUQUET_POST" ? posts.map((item) => ({ ...item, type: "BOUQUET_POST" })) : []),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  const sellerStats = Object.values(reviews.reduce<Record<string, { id: string; name: string; count: number; total: number }>>((acc, review) => {
    const seller = review.Product?.seller
    if (!seller) return acc
    const current = acc[seller.id] ?? { id: seller.id, name: seller.marketName, count: 0, total: 0 }
    current.count += 1; current.total += review.rating ?? 0; acc[seller.id] = current
    return acc
  }, {})).sort((a, b) => b.count - a.count)
  return <div className="p-6 sm:p-10">
    <h1 className="text-2xl font-bold">리뷰·게시물 관리</h1><p className="mt-2 text-sm text-stone-500">작성자·내용·상품·판매처를 함께 검색하고 원본을 확인한 뒤 노출 상태를 관리합니다.</p>
    <form onSubmit={(e) => { e.preventDefault(); load() }} className="mt-6 rounded-2xl border bg-white p-4"><div className="grid gap-3 md:grid-cols-3">
      <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="작성자·내용·상품·판매처 검색" className="h-10 rounded-xl border px-3 text-sm" />
      <Select value={filters.type} set={(type) => setFilters({ ...filters, type })} options={[["ALL","전체 콘텐츠"],["REVIEW","상품 리뷰"],["BOUQUET_POST","꽃다발 갤러리"]]} />
      <Select value={filters.visibility} set={(visibility) => setFilters({ ...filters, visibility })} options={[["ALL","모든 노출 상태"],["VISIBLE","노출 중"],["HIDDEN","숨김"]]} />
    </div><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => { setFilters(initialFilters); load(initialFilters) }} className="h-9 rounded-lg border px-4 text-xs">초기화</button><button className="h-9 rounded-lg bg-stone-900 px-5 text-xs text-white">검색</button></div></form>
    {!loading && !error && sellerStats.length > 0 && <section className="mt-5"><h2 className="text-sm font-bold">판매처 리뷰 요약</h2><div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{sellerStats.slice(0, 8).map((stat) => <Link key={stat.id} href={`/admin/sellers?open=${stat.id}`} className="rounded-xl border bg-white p-4 hover:border-rose-200"><p className="truncate text-sm font-semibold">{stat.name}</p><p className="mt-2 text-xs text-stone-500">평균 <strong className="text-amber-500">★ {(stat.total / stat.count).toFixed(1)}</strong> · 리뷰 {stat.count}건</p></Link>)}</div></section>}
    {loading && <p className="mt-5 rounded-2xl border bg-white p-12 text-center text-sm text-stone-400">리뷰·게시물을 불러오는 중...</p>}
    {error && <p className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{error}</p>}
    {!loading && !error && <div className="mt-5 overflow-hidden rounded-2xl border bg-white"><table className="w-full table-auto text-left text-sm [&_th]:px-3 [&_td]:px-3 [&_th:last-child]:pr-8 [&_td:last-child]:pr-8 [&_th:nth-child(2)]:hidden [&_td:nth-child(2)]:hidden [&_th:nth-child(6)]:hidden [&_td:nth-child(6)]:hidden"><thead className="bg-stone-50 text-xs text-stone-500"><tr><Th>구분</Th><Th>작성자</Th><Th>내용</Th><Th>판매처·상품</Th><Th>평점</Th><Th>작성일</Th><Th>상태</Th><Th>관리</Th></tr></thead><tbody className="divide-y">{rows.map((item) => {
      const key = `${item.type}-${item.id}`; const isReview = item.type === "REVIEW"
      return <tr key={key} className={`align-top hover:bg-stone-50/60 ${item.isHidden ? "opacity-60" : ""}`}><Td><Badge tone={isReview ? "amber" : "green"}>{isReview ? "상품 리뷰" : "꽃다발 갤러리"}</Badge></Td>
        <Td><strong>{item.authorName || item.User?.name || "이름 미등록"}</strong><p className="mt-1 text-xs text-stone-400">{item.User?.email || item.userId || "-"}</p></Td>
        <Td><button onClick={() => setOpened(opened === key ? null : key)} className="rounded-lg border px-3 py-2 text-xs font-semibold">{opened === key ? "상세 닫기" : "내용 상세 보기"}</button>{opened === key && <div className="mt-3 max-w-72 rounded-xl bg-stone-50 p-3 text-xs leading-5"><p className="whitespace-pre-wrap">{item.content || "내용 없음"}</p>{item.moderationReason && <p className="mt-2 text-rose-600">숨김 사유: {item.moderationReason}</p>}</div>}</Td>
        <Td>{isReview && item.Product ? <div className="space-y-2">{item.Product.seller ? <Link href={`/admin/sellers?open=${item.Product.seller.id}`} className="block font-semibold text-rose-500 underline-offset-2 hover:underline">판매처: {item.Product.seller.marketName}</Link> : <p className="text-xs text-stone-400">판매처 정보 없음</p>}<Link href={`/products/${item.Product.id}`} className="block text-xs text-stone-600 underline-offset-2 hover:underline">상품: {item.Product.name}</Link></div> : <div className="space-y-1"><p className="font-medium">사용자 제작 꽃다발</p><p className="text-xs text-stone-400">판매처·판매 상품 없음</p><Link href={`/custom?post=${item.id}`} className="block text-xs text-rose-500 underline-offset-2 hover:underline">원본 게시물 보기</Link></div>}</Td>
        <Td>{isReview ? <span className="whitespace-nowrap" aria-label={`별점 ${item.rating ?? 0}점`}>{[1, 2, 3, 4, 5].map((star) => <span key={star} className={star <= (item.rating ?? 0) ? "text-amber-400" : "text-stone-200"}>★</span>)}</span> : "-"}</Td><Td>{new Date(item.createdAt).toLocaleString("ko-KR")}</Td><Td><Badge tone={item.isHidden ? "red" : "green"}>{item.isHidden ? "숨김" : "노출 중"}</Badge></Td>
        <Td><div className="w-48 space-y-2">{!item.isHidden && <input value={reason[key] ?? ""} onChange={(e) => setReason((r) => ({ ...r, [key]: e.target.value }))} placeholder="숨김 사유" className="h-8 w-full rounded-lg border px-2 text-xs" />}<button onClick={() => toggle(item.type, item)} className={`h-8 w-full rounded-lg border text-xs ${item.isHidden ? "text-emerald-700" : "text-rose-600"}`}>{item.isHidden ? "노출 복구" : "숨김 처리"}</button></div></Td>
      </tr>
    })}</tbody></table>{rows.length === 0 && <p className="p-16 text-center text-sm text-stone-400">조건에 맞는 리뷰·게시물이 없습니다.</p>}</div>}
  </div>
}
function Select({ value, set, options }: { value: string; set: (v: string) => void; options: string[][] }) { return <select value={value} onChange={(e) => set(e.target.value)} className="h-10 rounded-xl border bg-white px-3 text-sm">{options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select> }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 font-semibold">{children}</th> }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-4">{children}</td> }
function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "red" | "amber" }) { const style = tone === "green" ? "bg-emerald-100 text-emerald-700" : tone === "red" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"; return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${style}`}>{children}</span> }

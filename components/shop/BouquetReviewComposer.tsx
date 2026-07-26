"use client"

import { useEffect, useMemo, useState } from "react"
import { Camera, Check, Star, X } from "lucide-react"

type EligibleItem = { id: string; previewImageUrl: string | null; bouquetMode: string | null; confirmedAt: string; product: { id: string; name: string; images: string[] } | { id: string; name: string; images: string[] }[] }
const TAGS = ["사진과 같아요", "꽃이 풍성해요", "색감이 예뻐요", "포장이 꼼꼼해요", "신선해요", "선물하기 좋아요", "직접 만들기 쉬워요", "재구매하고 싶어요"]

export function BouquetReviewComposer({ open, onClose, initialOrderItemId, productId, onSaved }: { open: boolean; onClose: () => void; initialOrderItemId?: string | null; productId?: string; onSaved?: () => void }) {
  const [items, setItems] = useState<EligibleItem[]>([])
  const [orderItemId, setOrderItemId] = useState(initialOrderItemId ?? "")
  const [rating, setRating] = useState(5)
  const [tags, setTags] = useState<string[]>([])
  const [content, setContent] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const selected = items.find((item) => item.id === orderItemId)
  const product = selected && (Array.isArray(selected.product) ? selected.product[0] : selected.product)
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files])

  useEffect(() => {
    if (!open) return
    fetch(`/api/bouquet-reviews/eligible${productId ? `?productId=${encodeURIComponent(productId)}` : ""}`).then((r) => r.json()).then((data) => {
      const next = data.items ?? []; setItems(next)
      setOrderItemId((current) => initialOrderItemId ?? current ?? next[0]?.id ?? "")
    })
  }, [open, initialOrderItemId, productId])
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])
  if (!open) return null

  const submit = async () => {
    if (!orderItemId || files.length === 0) { setError("구매내역과 실제 꽃다발 사진을 선택해주세요"); return }
    setSaving(true); setError("")
    const form = new FormData(); form.append("orderItemId", orderItemId); form.append("rating", String(rating)); form.append("tags", tags.join(",")); form.append("content", content)
    files.forEach((file) => form.append("images", file))
    const response = await fetch("/api/bouquet-reviews", { method: "POST", body: form }); const data = await response.json()
    if (!response.ok) { setError(data.error ?? "리뷰 저장에 실패했어요"); setSaving(false); return }
    alert(`리뷰가 등록됐어요${data.pointsGranted ? ` · ${data.pointsGranted}P 적립` : ""}`); onSaved?.(); onClose()
  }

  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 sm:items-center sm:p-5" onMouseDown={onClose}>
    <section className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl" onMouseDown={(e) => e.stopPropagation()}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-5 py-4 backdrop-blur"><div><h2 className="text-lg font-bold">구매 후기 작성</h2><p className="text-xs text-stone-400">첫 사진이 대표 사진으로 등록돼요 · 리뷰 작성 300P</p></div><button onClick={onClose} className="rounded-full p-2 hover:bg-stone-100"><X /></button></header>
      <div className="space-y-6 p-5 sm:p-7">
        {items.length === 0 ? <div className="rounded-2xl bg-stone-50 p-10 text-center text-sm text-stone-500">구매확정 후 리뷰를 작성할 수 있어요.<br/>마이페이지 구매내역에서 먼저 구매확정해주세요.</div> : <>
          <div><label className="text-sm font-bold">리뷰할 구매 상품</label><select value={orderItemId} onChange={(e) => setOrderItemId(e.target.value)} className="mt-2 h-12 w-full rounded-xl border bg-white px-3 text-sm"><option value="">구매내역 선택</option>{items.map((item) => { const p = Array.isArray(item.product) ? item.product[0] : item.product; return <option key={item.id} value={item.id}>{item.bouquetMode === "diy" ? "직접 만들기" : "주문제작"} · {p?.name}</option> })}</select></div>
          {selected && <div className="grid grid-cols-2 overflow-hidden rounded-2xl border"><div className="relative aspect-square bg-violet-50">{(selected.previewImageUrl || product?.images?.[0]) ? <img src={selected.previewImageUrl || product?.images?.[0]} alt="AI 예상" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-4xl">💐</div>}<span className="absolute left-2 top-2 rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold text-white">AI 예상</span></div><div className="flex aspect-square items-center justify-center bg-rose-50 text-center text-xs text-stone-400"><Camera className="mx-auto mb-2"/>실제 받은 꽃 사진을<br/>옆에 채워주세요</div></div>}
          <div><p className="text-sm font-bold">만족도</p><div className="mt-2 flex gap-1">{[1,2,3,4,5].map((n) => <button key={n} onClick={() => setRating(n)}><Star size={30} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-stone-200"}/></button>)}</div></div>
          <div><p className="text-sm font-bold">어떤 점이 좋았나요? <span className="font-normal text-stone-400">최대 5개</span></p><div className="mt-2 flex flex-wrap gap-2">{TAGS.map((tag) => <button key={tag} onClick={() => setTags((current) => current.includes(tag) ? current.filter((v) => v !== tag) : current.length < 5 ? [...current, tag] : current)} className={`rounded-full border px-3 py-2 text-xs ${tags.includes(tag) ? "border-rose-400 bg-rose-50 font-bold text-rose-600" : "border-stone-200"}`}>{tags.includes(tag) && <Check size={12} className="mr-1 inline"/>}{tag}</button>)}</div></div>
          <div><p className="text-sm font-bold">실제 꽃다발 사진 <span className="font-normal text-stone-400">1~8장 · 여러 번 나눠서 추가 가능</span></p><label className="mt-2 flex min-h-24 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed text-sm text-stone-500 hover:border-rose-300"><Camera size={17} className="mr-2"/>{files.length ? `사진 추가하기 (${files.length}/8)` : "사진 선택하기"}<input type="file" multiple accept="image/*" className="hidden" onClick={(e) => { e.currentTarget.value = "" }} onChange={(e) => setFiles((current) => [...current, ...Array.from(e.target.files ?? [])].slice(0,8))}/></label>{previews.length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{previews.map((src, i) => <div key={src} className="relative aspect-square overflow-hidden rounded-xl"><img src={src} alt="" className="h-full w-full object-cover"/>{i === 0 && <span className="absolute left-1 top-1 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">대표</span>}<button type="button" onClick={() => setFiles((current) => current.filter((_, index) => index !== i))} className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white" aria-label={`사진 ${i+1} 삭제`}><X size={11}/></button></div>)}</div>}</div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} maxLength={1000} placeholder="꽃의 상태, AI 예상 이미지와 실제 모습, 제작 경험을 자세히 알려주세요." className="w-full resize-none rounded-2xl border p-4 text-sm"/>
          {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-600">{error}</p>}
          <button onClick={submit} disabled={saving} className="h-12 w-full rounded-xl bg-rose-500 font-bold text-white disabled:opacity-50">{saving ? "사진과 리뷰 저장 중..." : "리뷰 등록하고 300P 받기"}</button>
        </>}
      </div>
    </section>
  </div>
}

"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Camera, ChevronLeft, ChevronRight, MapPin, MessageCircle, Search, SlidersHorizontal, Sparkles, Star, X } from "lucide-react"
import { BouquetReviewComposer } from "@/components/shop/BouquetReviewComposer"
import { useSession } from "next-auth/react"
import { FLOWERS, SIZES, WRAPPING } from "@/lib/customFlowers"

type Relation<T> = T | T[] | null
type Seller = { id: string; marketName: string }
type Review = {
  id: string; rating: number; content: string; images: string[]; previewImageUrl: string | null
  tags: string[]; orderMode: string | null; composition: Record<string, unknown> | null; derivedOrderCount: number; createdAt: string
  user: Relation<{ id: string; name: string | null }>
  product: Relation<{ id: string; name: string; seller: Relation<Seller> }>
  orderItem: Relation<{ price: number; seller: Relation<Seller> }>
}
type Comment = { id: string; content: string; parentId: string | null; createdAt: string; user: Relation<{ id: string; name: string | null }> }
const one = <T,>(value: Relation<T>) => Array.isArray(value) ? value[0] ?? null : value
const dateText = (value: string) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value))
function Highlight({ text, query }: { text: string; query: string }) {
  const keyword = query.trim()
  if (!keyword) return <>{text}</>
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = text.split(new RegExp(`(${escaped})`, "gi"))
  return <>{parts.map((part, index) => part.toLowerCase() === keyword.toLowerCase() ? <mark key={index} className="rounded bg-yellow-200 px-0.5 text-inherit">{part}</mark> : <span key={index}>{part}</span>)}</>
}
type SavedComposition = { sizeId?: string; wrappingId?: string; flowers?: { id: string; quantity: number }[]; mainFlowerId?: string | null; additionalFlowerIds?: string[] }
function getCompositionDetails(raw: Record<string, unknown> | null) {
  const value = (raw ?? {}) as SavedComposition
  const size = SIZES.find((item) => item.id === value.sizeId) ?? SIZES[1]
  const wrapping = WRAPPING.find((item) => item.id === value.wrappingId)
  let selected = Array.isArray(value.flowers)
    ? value.flowers.filter((item) => FLOWERS.some((flower) => flower.id === item.id) && Number(item.quantity) > 0)
    : []
  if (selected.length === 0) {
    const ids = [value.mainFlowerId, ...(value.additionalFlowerIds ?? [])].filter((id): id is string => Boolean(id && FLOWERS.some((flower) => flower.id === id)))
    if (ids.length === 1) selected = [{ id: ids[0], quantity: size.stems }]
    if (ids.length > 1) {
      const rest = size.stems - size.mainStems
      selected = [{ id: ids[0], quantity: size.mainStems }, ...ids.slice(1).map((id, index) => ({ id, quantity: Math.floor(rest / (ids.length - 1)) + (index < rest % (ids.length - 1) ? 1 : 0) }))]
    }
  }
  return { size, wrapping, flowers: selected.map((item) => ({ ...item, name: FLOWERS.find((flower) => flower.id === item.id)?.name ?? item.id })) }
}

export default function GalleryPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [selected, setSelected] = useState<Review | null>(null)
  const [writing, setWriting] = useState(false)
  const [productId, setProductId] = useState<string | undefined>()
  const [filters, setFilters] = useState({ q: "", seller: "", mode: "", sort: "latest" })
  const [facets, setFacets] = useState<{ sellers: string[]; flowers: { id: string; name: string }[] }>({ sellers: [], flowers: [] })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [appliedQuery, setAppliedQuery] = useState("")
  const load = async (next = filters) => { setLoading(true); const params = new URLSearchParams({ limit: "50", ...next }); const response = await fetch(`/api/bouquet-reviews?${params}`, { cache: "no-store" }); const data = await response.json(); setReviews(data.reviews ?? []); setTotal(data.total ?? data.reviews?.length ?? 0); if (data.facets) setFacets(data.facets); setAppliedQuery(next.q); setLoading(false) }
  useEffect(() => {
    load()
    const params = new URLSearchParams(window.location.search)
    setWriting(params.get("write") === "1")
    setProductId(params.get("productId") ?? undefined)
    const reviewId = params.get("review")
    if (reviewId) fetch(`/api/bouquet-reviews?id=${encodeURIComponent(reviewId)}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setSelected(d.reviews?.[0] ?? null))
  }, [])
  const closeDetail = () => { setSelected(null); history.replaceState(null, "", "/gallery") }
  const resetFilters = () => { const next = { q: "", seller: "", mode: "", sort: "latest" }; setFilters(next); load(next) }
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <div className="mb-9 text-center"><p className="text-xs font-bold tracking-[.2em] text-rose-500">BOUQUET REVIEW</p><h1 className="mt-2 text-2xl font-bold">손님들의 꽃다발</h1><p className="mt-2 text-sm text-stone-500">AI로 미리 만든 꽃다발과 실제로 받은 모습을 나란히 확인해보세요.</p><button onClick={() => setWriting(true)} className="mt-5 rounded-full bg-rose-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-100">📷 구매 후기 쓰기</button></div>
    <form onSubmit={(event) => { event.preventDefault(); load() }} className="mb-7 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-rose-500"/><h2 className="font-bold text-stone-800">리뷰 찾아보기</h2><span className="ml-auto text-xs text-stone-400">총 {total}개</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
      <label className="flex h-11 items-center gap-2 rounded-xl border px-3"><Search size={15} className="text-stone-400"/><input list="review-search-options" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="후기·상품·판매처·꽃 통합 검색" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/><datalist id="review-search-options">{facets.flowers.map((flower) => <option key={flower.id} value={flower.name}/>)}</datalist></label>
      <select value={filters.seller} onChange={(e) => setFilters({ ...filters, seller: e.target.value })} className="h-11 rounded-xl border bg-white px-3 text-sm"><option value="">모든 판매처</option>{facets.sellers.map((seller) => <option key={seller}>{seller}</option>)}</select>
      <select value={filters.mode} onChange={(e) => setFilters({ ...filters, mode: e.target.value })} className="h-11 rounded-xl border bg-white px-3 text-sm"><option value="">모든 제작 방식</option><option value="custom">주문제작</option><option value="diy">직접 만들기</option></select>
      <select value={filters.sort} onChange={(e) => { const next = { ...filters, sort: e.target.value }; setFilters(next); load(next) }} className="h-11 rounded-xl border bg-white px-3 text-sm"><option value="latest">최신순</option><option value="popular">따라 만든 순</option><option value="rating">별점 높은 순</option><option value="price_asc">가격 낮은 순</option><option value="price_desc">가격 높은 순</option></select>
    </div><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={resetFilters} className="rounded-xl border px-4 py-2 text-xs text-stone-500">초기화</button><button disabled={loading} className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{loading ? "찾는 중..." : "필터 적용"}</button></div></form>
    {reviews.length === 0 ? <div className="rounded-3xl bg-stone-50 py-24 text-center text-stone-400"><Camera className="mx-auto mb-3"/>{loading ? "리뷰를 찾고 있어요." : "선택한 조건에 맞는 리뷰가 없어요."}<button onClick={resetFilters} className="mx-auto mt-3 block text-xs font-bold text-rose-500">필터 초기화</button></div> : <div className="grid gap-5 md:grid-cols-2">{reviews.map((review) => {
      const user = one(review.user), product = one(review.product), seller = one(product?.seller ?? null) ?? one(one(review.orderItem)?.seller ?? null), composition = getCompositionDetails(review.composition)
      return <article key={review.id} className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><button onClick={() => { setSelected(review); history.replaceState(null, "", `/gallery?review=${review.id}`) }} className="block w-full text-left">
        <div className="grid grid-cols-2"><Photo src={review.previewImageUrl} label="AI 꽃다발" tone="violet"/><Photo src={review.images[0]} label={review.images.length > 1 ? `실제 후기 ${review.images.length}장` : "실제 후기"} tone="rose"/></div>
        <div className="p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><ModeBadge mode={review.orderMode}/><Stars rating={review.rating}/></div><h2 className="mt-3 font-bold text-stone-800"><Highlight text={product?.name ?? "나만의 꽃다발"} query={appliedQuery}/></h2><p className="mt-1 line-clamp-2 text-sm text-stone-500"><Highlight text={review.content} query={appliedQuery}/></p><div className="mt-2 flex flex-wrap gap-1">{composition.flowers.map((flower) => <span key={flower.id} className="rounded-full bg-stone-50 px-2 py-1 text-[10px] text-stone-600"><Highlight text={flower.name} query={appliedQuery}/> {flower.quantity}송이</span>)}</div><div className="mt-3 flex items-center justify-between gap-2 text-xs text-stone-400"><span className="shrink-0">{user?.name ?? "구매자"} · {dateText(review.createdAt)}</span><span className="min-w-0 truncate text-right">{one(review.orderItem)?.price ? `${one(review.orderItem)!.price.toLocaleString()}원 · ` : ""}{seller?.marketName ? <><Highlight text={seller.marketName} query={appliedQuery}/> · </> : ""}상세보기 →</span></div></div>
      </button></article>
    })}</div>}
    <BouquetReviewComposer open={writing} productId={productId} onClose={() => setWriting(false)} onSaved={load}/>
    {selected && <ReviewDetail review={selected} onClose={closeDetail}/>}
  </div>
}

function ModeBadge({ mode }: { mode: string | null }) { const diy = mode === "diy"; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${diy ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>{diy ? "직접 만들기" : "주문제작"}</span> }
function Stars({ rating }: { rating: number }) { return <span className="flex text-amber-400">{[1,2,3,4,5].map((n) => <Star key={n} size={14} className={n <= rating ? "fill-current" : "text-stone-200"}/>)}</span> }
function Photo({ src, label, tone }: { src: string | null; label: string; tone: "violet" | "rose" }) { return <div className={`relative aspect-square ${tone === "violet" ? "bg-violet-50" : "bg-rose-50"}`}>{src ? <img src={src} alt={label} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-4xl">💐</div>}<span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold text-white ${tone === "violet" ? "bg-violet-600" : "bg-rose-500"}`}>{tone === "violet" ? <Sparkles size={10} className="mr-1 inline"/> : <Camera size={10} className="mr-1 inline"/>}{label}</span></div> }

function ReviewDetail({ review, onClose }: { review: Review; onClose: () => void }) {
  const [image, setImage] = useState(0), [comments, setComments] = useState<Comment[]>([]), [comment, setComment] = useState(""), [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null), [editingComment, setEditingComment] = useState<string | null>(null)
  const [editingReview, setEditingReview] = useState(false), [reviewDraft, setReviewDraft] = useState(review.content)
  const { data: session } = useSession()
  const user = one(review.user), product = one(review.product), seller = one(product?.seller ?? null) ?? one(one(review.orderItem)?.seller ?? null)
  const composition = getCompositionDetails(review.composition)
  const loadComments = () => fetch(`/api/bouquet-reviews/${review.id}/comments`, { cache: "no-store" }).then((r) => r.json()).then((d) => setComments(d.comments ?? []))
  useEffect(() => { loadComments() }, [review.id])
  const submit = async () => { if (!comment.trim()) return; setSending(true); const res = await fetch(`/api/bouquet-reviews/${review.id}/comments`, { method: editingComment ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: comment, parentId: replyTo, commentId: editingComment }) }); setSending(false); if (res.ok) { setComment(""); setReplyTo(null); setEditingComment(null); loadComments() } else if (res.status === 401) location.href = `/login?callbackUrl=${encodeURIComponent(`/gallery?review=${review.id}`)}` }
  const removeComment = async (id: string) => { if (!confirm("댓글을 삭제할까요? 답글도 함께 삭제됩니다.")) return; const res = await fetch(`/api/bouquet-reviews/${review.id}/comments?commentId=${encodeURIComponent(id)}`, { method: "DELETE" }); if (res.ok) loadComments() }
  const saveReview = async () => { const res = await fetch(`/api/reviews/${review.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: review.rating, content: reviewDraft }) }); if (res.ok) { review.content = reviewDraft; setEditingReview(false) } }
  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 sm:items-center sm:p-6" onMouseDown={onClose}><section className="max-h-[96vh] w-full overflow-y-auto rounded-t-3xl bg-white sm:max-w-4xl sm:rounded-3xl" onMouseDown={(e) => e.stopPropagation()}>
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-5 py-4"><div className="flex items-center gap-3"><ModeBadge mode={review.orderMode}/><div><h2 className="font-bold">{product?.name ?? "나만의 꽃다발"}</h2><p className="text-xs text-stone-400">{user?.name ?? "구매자"} · {dateText(review.createdAt)}</p></div></div><button onClick={onClose} className="rounded-full p-2 hover:bg-stone-100"><X/></button></header>
    <div className="p-4 sm:p-7"><div className="grid gap-3 sm:grid-cols-2"><Photo src={review.previewImageUrl} label="AI 꽃다발" tone="violet"/><div className="relative"><Photo src={review.images[image]} label={`실제 후기 ${image + 1}/${review.images.length}`} tone="rose"/>{review.images.length > 1 && <><button aria-label="이전 사진" onClick={() => setImage((image - 1 + review.images.length) % review.images.length)} className="absolute left-2 top-1/2 rounded-full bg-white/90 p-2 shadow"><ChevronLeft size={18}/></button><button aria-label="다음 사진" onClick={() => setImage((image + 1) % review.images.length)} className="absolute right-2 top-1/2 rounded-full bg-white/90 p-2 shadow"><ChevronRight size={18}/></button></>}</div></div>
      {review.images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{review.images.map((src,i) => <button key={`${src}-${i}`} onClick={() => setImage(i)} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${image === i ? "border-rose-500" : "border-transparent"}`}><img src={src} alt={`실제 후기 ${i+1}`} className="h-full w-full object-cover"/><span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] text-white">{i+1}</span></button>)}</div>}
      <div className="mt-6"><div className="flex items-center justify-between"><Stars rating={review.rating}/><span className="text-xs text-stone-400">{review.derivedOrderCount ?? 0}명이 이 조합을 따라 만들었어요</span></div><div className="mt-3 flex flex-wrap gap-2">{review.tags.map((tag) => <span key={tag} className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600">{tag}</span>)}</div>
      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-stone-800">💐 이 꽃다발의 구성</h3><span className="text-xs font-medium text-emerald-700">{composition.size.name} 사이즈{composition.wrapping ? ` · ${composition.wrapping.name}` : ""}</span></div>{composition.flowers.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{composition.flowers.map((flower) => <span key={flower.id} className="rounded-full bg-white px-3 py-1.5 text-xs text-stone-700 shadow-sm"><b>{flower.name}</b> {flower.quantity}송이</span>)}</div> : <p className="mt-3 text-xs text-stone-500">저장된 꽃 구성 정보가 없습니다.</p>}</div>
      {editingReview ? <div className="mt-5"><textarea value={reviewDraft} onChange={(e) => setReviewDraft(e.target.value)} rows={5} maxLength={1000} className="w-full rounded-2xl border p-4 text-sm"/><div className="mt-2 flex justify-end gap-2"><button onClick={() => setEditingReview(false)} className="rounded-lg border px-3 py-2 text-xs">취소</button><button onClick={saveReview} className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-bold text-white">리뷰 수정 저장</button></div></div> : <><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-stone-700">{review.content}</p>{one(review.user)?.id === session?.user?.id && <button onClick={() => setEditingReview(true)} className="mt-2 text-xs text-stone-400 hover:text-rose-500">리뷰 내용 수정</button>}</>}</div>
      {seller && <Link href={`/products?seller=${encodeURIComponent(seller.marketName)}`} className="mt-6 flex items-center justify-between rounded-2xl border border-stone-200 p-4 transition hover:border-rose-300 hover:bg-rose-50"><span className="flex items-center gap-2 text-sm"><MapPin size={17} className="text-rose-500"/><b>{seller.marketName}</b>에서 구매했어요</span><span className="text-xs font-bold text-rose-500">꽃집 상품 보기 →</span></Link>}
      <Link href={`/diy?review=${review.id}`} className="mt-4 block rounded-2xl bg-rose-500 px-5 py-4 text-center text-sm font-bold text-white shadow-lg shadow-rose-100">💐 이 조합 그대로 따라 만들기</Link>
      <section className="mt-8 border-t pt-6"><h3 className="flex items-center gap-2 font-bold"><MessageCircle size={18}/> 댓글 {comments.length}</h3>{(replyTo || editingComment) && <div className="mt-3 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600"><span>{editingComment ? "댓글 수정 중" : "답글 작성 중"}</span><button onClick={() => { setReplyTo(null); setEditingComment(null); setComment("") }}>취소</button></div>}<div className="mt-4 flex gap-2"><input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit() }} maxLength={500} placeholder={replyTo ? "답글을 입력하세요" : "궁금한 점이나 감상을 남겨보세요"} className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm outline-none focus:border-rose-300"/><button onClick={submit} disabled={sending || !comment.trim()} className="rounded-xl bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-40">{editingComment ? "수정" : "등록"}</button></div><div className="mt-4 space-y-3">{comments.map((item) => { const author = one(item.user); const mine = author?.id === session?.user?.id; return <div key={item.id} className={`${item.parentId ? "ml-7 border-l-2 border-rose-100" : ""} rounded-2xl bg-stone-50 p-4`}><div className="flex justify-between gap-3 text-xs"><b className="text-stone-700">{item.parentId && "↳ "}{author?.name ?? "사용자"}</b><span className="text-stone-400">{dateText(item.createdAt)}</span></div><p className="mt-2 text-sm text-stone-600">{item.content}</p><div className="mt-2 flex gap-3 text-[11px] text-stone-400">{!item.parentId && <button onClick={() => { setReplyTo(item.id); setEditingComment(null); setComment("") }} className="hover:text-rose-500">답글</button>}{mine && <><button onClick={() => { setEditingComment(item.id); setReplyTo(null); setComment(item.content) }} className="hover:text-rose-500">수정</button><button onClick={() => removeComment(item.id)} className="hover:text-red-500">삭제</button></>}</div></div> })}{comments.length === 0 && <p className="py-3 text-center text-xs text-stone-400">첫 댓글을 남겨보세요.</p>}</div></section>
    </div>
  </section></div>
}

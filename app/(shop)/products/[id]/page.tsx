"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { ShoppingBag, ArrowLeft, Heart, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCartStore } from "@/store/cartStore"
import Link from "next/link"

interface Review {
  id: string; rating: number; content: string; createdAt: string; userId: string
  user: { name: string | null; image: string | null } | null
}

interface Product {
  id: string; name: string; description: string; price: number; stock: number
  images: string[]; flowerMeaning: string | null; ohaengTags: string[]
  colorTags: string[]; seasonTags: string[]; category: string
  reviews?: Review[]
}

const OHAENG_EMOJI: Record<string, string> = { 목: "🌿", 화: "🔥", 토: "🌾", 금: "✨", 수: "💧" }
const CATEGORY_LABEL: Record<string, string> = { bouquet: "꽃다발", plant: "화분", wreath: "화환", dried: "드라이플라워" }

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  // 리뷰 작성 폼
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState("")
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState("")

  // 리뷰 수정 (본인 또는 관리자)
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [editRating, setEditRating] = useState(5)
  const [editText, setEditText] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  const canManage = (r: Review) =>
    !!session?.user && (session.user.id === r.userId || session.user.isAdmin)

  const startEditReview = (r: Review) => {
    setEditingReviewId(r.id)
    setEditRating(r.rating)
    setEditText(r.content)
  }

  const saveEditReview = async () => {
    if (!editingReviewId) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/reviews/${editingReviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: editRating, content: editText }),
      })
      if (res.ok) {
        setEditingReviewId(null)
        loadProduct()
      }
    } finally {
      setEditSaving(false)
    }
  }

  const deleteReview = async (reviewId: string) => {
    if (!confirm("이 후기를 삭제할까요?")) return
    const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" })
    if (res.ok) loadProduct()
  }

  const loadProduct = useCallback(() => {
    fetch(`/api/products/${id}`).then((r) => r.json()).then(setProduct)
  }, [id])

  useEffect(() => { loadProduct() }, [loadProduct])

  const submitReview = async () => {
    if (!reviewText.trim()) { setReviewError("리뷰 내용을 입력해주세요"); return }
    setReviewLoading(true)
    setReviewError("")
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, rating, content: reviewText }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? "리뷰 저장에 실패했어요")
      }
      setReviewText("")
      setRating(5)
      loadProduct()
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "리뷰 저장에 실패했어요")
    } finally {
      setReviewLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!product) return
    addItem({
      id: crypto.randomUUID(),
      productId: product.id,
      quantity,
      product: { id: product.id, name: product.name, price: product.price, images: product.images, stock: product.stock },
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-32 flex justify-center">
        <div className="w-10 h-10 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-2 text-sm text-stone-400 mb-8">
        <Link href="/products" className="hover:text-rose-400 transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> 목록으로
        </Link>
        <span>/</span>
        <span>{CATEGORY_LABEL[product.category] ?? product.category}</span>
        <span>/</span>
        <span className="text-stone-600">{product.name}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* 이미지 */}
        <div className="lg:w-1/2 shrink-0">
          <div className="aspect-square bg-stone-50 rounded-3xl overflow-hidden flex items-center justify-center">
            {product.images[0] ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-9xl">🌸</span>
            )}
          </div>
        </div>

        {/* 상품 정보 */}
        <div className="flex-1 space-y-6">
          <div>
            <div className="flex gap-1.5 mb-3">
              <span className="text-xs bg-stone-100 text-stone-500 px-2.5 py-1 rounded-full">
                {CATEGORY_LABEL[product.category]}
              </span>
              {product.ohaengTags.map((tag) => (
                <span key={tag} className="text-xs bg-rose-50 text-rose-500 px-2.5 py-1 rounded-full">
                  {OHAENG_EMOJI[tag]} {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-bold text-stone-800">{product.name}</h1>
            {product.flowerMeaning && (
              <p className="text-stone-400 mt-2 text-sm">꽃말 — {product.flowerMeaning}</p>
            )}
          </div>

          <p className="text-3xl font-bold text-rose-500">{product.price.toLocaleString()}원</p>

          <p className="text-stone-600 leading-relaxed">{product.description}</p>

          {/* 색상 태그 */}
          {product.colorTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.colorTags.map((c) => (
                <span key={c} className="text-xs bg-stone-50 text-stone-500 px-3 py-1 rounded-full border border-stone-100">
                  {c}
                </span>
              ))}
            </div>
          )}

          <div className="border-t border-stone-100 pt-6 space-y-4">
            {/* 수량 선택 */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-stone-700 w-12">수량</span>
              <div className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-2.5">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-rose-500 font-medium">−</button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))} className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-rose-500 font-medium">+</button>
              </div>
              <span className="text-sm text-stone-400">재고 {product.stock}개</span>
            </div>

            {/* 합계 */}
            <div className="flex items-center justify-between py-3 px-4 bg-rose-50 rounded-xl">
              <span className="text-sm text-stone-600">합계</span>
              <span className="text-xl font-bold text-rose-500">{(product.price * quantity).toLocaleString()}원</span>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 h-12 bg-rose-400 hover:bg-rose-500 text-white font-semibold text-base gap-2 disabled:opacity-50"
              >
                <ShoppingBag size={18} />
                {added ? "담겼어요! 🌸" : product.stock === 0 ? "품절" : "장바구니 담기"}
              </Button>
              <Button variant="outline" size="icon" className="h-12 w-12 border-stone-200 shrink-0">
                <Heart size={18} className="text-stone-400" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 리뷰 */}
      <div className="mt-16 max-w-3xl">
        <h2 className="text-lg font-bold text-stone-800 mb-1">
          구매 후기 {product.reviews && product.reviews.length > 0 && `(${product.reviews.length})`}
        </h2>
        {product.reviews && product.reviews.length > 0 && (
          <div className="flex items-center gap-1.5 mb-5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={15}
                  className={n <= Math.round(product.reviews!.reduce((a, r) => a + r.rating, 0) / product.reviews!.length)
                    ? "fill-amber-400 text-amber-400" : "text-stone-200"} />
              ))}
            </div>
            <span className="text-sm text-stone-500">
              {(product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length).toFixed(1)}
            </span>
          </div>
        )}

        {/* 작성 폼 */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-6">
          {session?.user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-600">별점</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} className="p-0.5">
                      <Star size={20} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-stone-200 hover:text-amber-200"} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="꽃은 어땠나요? 후기를 남겨주세요"
                rows={3}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-rose-300"
              />
              {reviewError && <p className="text-xs text-red-500">{reviewError}</p>}
              <div className="text-right">
                <Button onClick={submitReview} disabled={reviewLoading} className="bg-rose-400 hover:bg-rose-500 text-white h-9 px-5 text-sm">
                  {reviewLoading ? "등록 중..." : "후기 남기기"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-500">로그인하면 후기를 남길 수 있어요</p>
              <Button onClick={() => signIn("kakao")} variant="outline" className="h-9 text-sm border-stone-200">로그인</Button>
            </div>
          )}
        </div>

        {/* 리뷰 목록 */}
        {product.reviews && product.reviews.length > 0 ? (
          <div className="space-y-3">
            {product.reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-stone-100 p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-700">{r.user?.name ?? "구매자"}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={12} className={n <= r.rating ? "fill-amber-400 text-amber-400" : "text-stone-200"} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage(r) && editingReviewId !== r.id && (
                      <>
                        <button onClick={() => startEditReview(r)} className="text-xs text-stone-400 hover:text-rose-500">수정</button>
                        <button onClick={() => deleteReview(r.id)} className="text-xs text-stone-400 hover:text-red-500">삭제</button>
                      </>
                    )}
                    <span className="text-xs text-stone-400">{new Date(r.createdAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                </div>

                {editingReviewId === r.id ? (
                  <div className="space-y-2 mt-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onClick={() => setEditRating(n)} className="p-0.5">
                          <Star size={18} className={n <= editRating ? "fill-amber-400 text-amber-400" : "text-stone-200"} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-rose-300"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button onClick={saveEditReview} disabled={editSaving} className="h-8 px-4 bg-rose-400 hover:bg-rose-500 text-white text-xs">
                        {editSaving ? "저장 중..." : "저장"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingReviewId(null)} className="h-8 px-4 text-xs border-stone-200 text-stone-500">취소</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-stone-600 leading-relaxed">{r.content}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400 text-center py-8">아직 후기가 없어요. 첫 후기를 남겨보세요 🌸</p>
        )}
      </div>
    </div>
  )
}

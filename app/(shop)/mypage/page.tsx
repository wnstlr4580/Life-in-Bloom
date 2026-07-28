"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Package, User, ChevronRight, Sparkles, Pencil, Camera } from "lucide-react"
import Image from "next/image"
import { BirthDateForm } from "@/components/saju/BirthDateForm"
import { BouquetReviewComposer } from "@/components/shop/BouquetReviewComposer"

const GENDER_LABEL: Record<string, string> = { male: "남성", female: "여성" }
const CALENDAR_LABEL: Record<string, string> = { solar: "양력", lunar: "음력" }

interface SajuProfile {
  name: string; gender: string; birthDate: string
  calendarType: string; birthHour: string; city: string
}
interface SpecialDate { id: string; type: "birthday" | "anniversary"; label: string; monthDay: string }

const STATUS_LABEL: Record<string, string> = {
  PENDING: "결제 대기", PAID: "결제 완료", PREPARING: "준비 중",
  SHIPPED: "배송 중", DELIVERED: "배송 완료", CANCELLED: "취소됨",
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700", PAID: "bg-blue-100 text-blue-700",
  PREPARING: "bg-purple-100 text-purple-700", SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700", CANCELLED: "bg-stone-100 text-stone-500",
}

interface OrderItem {
  id: string; quantity: number; price: number
  fulfillmentStatus: string; confirmedAt: string | null; bouquetMode: string | null; previewImageUrl: string | null
  review?: { id: string } | { id: string }[] | null
  product: { id: string; name: string; images: string[]; flowerMeaning?: string | null }
}
interface Order {
  id: string; status: string; totalAmount: number; createdAt: string; items: OrderItem[]
}
interface PointTransaction {
  id: string; amount: number; reason: string; referenceType: string; createdAt: string
}

const POINT_REASON_LABEL: Record<string, string> = {
  PURCHASE: "구매 적립", REVIEW: "후기 작성 적립", REMAKE_SALE: "내 조합 판매 적립", REDEEM: "포인트 사용",
  PURCHASE_REVOKED: "구매 취소로 회수", REVIEW_REVOKED: "후기 삭제로 회수", REMAKE_SALE_REVOKED: "판매 취소로 회수", REDEEM_REVOKED: "사용 포인트 환급",
}

export default function MyPage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  useEffect(() => {
    if (session?.user.role === "SELLER") router.replace("/seller")
    else if (session?.user.role === "ADMIN") router.replace("/admin")
  }, [router, session])
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [sajuProfile, setSajuProfile] = useState<SajuProfile | null>(null)
  const [loadingSaju, setLoadingSaju] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [points, setPoints] = useState<number | null>(null)
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([])
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([])
  const [dateLabel, setDateLabel] = useState("")
  const [dateMonthDay, setDateMonthDay] = useState("")
  const [dateMessage, setDateMessage] = useState("")

  // 받은 꽃다발 후기 올리기
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null)
  const [reviewFile, setReviewFile] = useState<File | null>(null)
  const [reviewContent, setReviewContent] = useState("")
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewMessage, setReviewMessage] = useState("")
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  const confirmPurchase = async (itemId: string) => {
    if (!confirm("상품을 잘 받으셨나요? 구매확정 후 리뷰를 작성할 수 있어요.")) return
    const response = await fetch(`/api/orders/items/${itemId}/confirm`, { method: "POST" })
    const data = await response.json()
    if (!response.ok) return alert(data.error ?? "구매확정에 실패했어요")
    setOrders((current) => current.map((order) => ({ ...order, items: order.items.map((item) => item.id === itemId ? { ...item, confirmedAt: data.confirmedAt, fulfillmentStatus: "PURCHASE_CONFIRMED" } : item) })))
  }

  const handleReviewSubmit = async (orderId: string) => {
    if (!reviewFile) { setReviewMessage("꽃다발 사진을 골라주세요"); return }
    setReviewSaving(true)
    setReviewMessage("")
    try {
      const order = orders.find((o) => o.id === orderId)
      const compositionStr = order?.items.find((i) => i.product.flowerMeaning)?.product.flowerMeaning
      const composition = compositionStr ? JSON.parse(compositionStr) : {}
      const form = new FormData()
      form.append("file", reviewFile)
      form.append("content", reviewContent)
      form.append("composition", JSON.stringify(composition))
      const res = await fetch("/api/bouquet-posts", { method: "POST", body: form })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? "후기 올리기에 실패했어요")
      setReviewMessage("후기가 올라갔어요! 🌸")
      setReviewFile(null)
      setReviewContent("")
      setTimeout(() => { setReviewingOrderId(null); setReviewMessage("") }, 2000)
    } catch (e) {
      setReviewMessage(e instanceof Error ? e.message : "후기 올리기에 실패했어요")
    } finally {
      setReviewSaving(false)
    }
  }

  // 닉네임 변경
  const [nickEditing, setNickEditing] = useState(false)
  const [nickInput, setNickInput] = useState("")
  const [nickSaving, setNickSaving] = useState(false)
  const [nickError, setNickError] = useState("")

  const handleNickSave = async () => {
    setNickSaving(true)
    setNickError("")
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nickInput }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? "닉네임 변경에 실패했어요")
      await update({ name: d.name }) // 세션(헤더 표시) 즉시 갱신
      setNickEditing(false)
    } catch (e) {
      setNickError(e instanceof Error ? e.message : "닉네임 변경에 실패했어요")
    } finally {
      setNickSaving(false)
    }
  }

  const loadSajuProfile = useCallback(() => {
    setLoadingSaju(true)
    return fetch("/api/saju/profile").then((r) => r.json()).then((d) => setSajuProfile(d)).finally(() => setLoadingSaju(false))
  }, [])

  const loadSpecialDates = useCallback(() => {
    fetch("/api/account/special-dates").then((r) => r.json()).then((d) => setSpecialDates(d.dates ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!session?.user) return
    setLoadingOrders(true)
    fetch("/api/orders").then((r) => r.json()).then((d) => setOrders(d.orders ?? [])).finally(() => setLoadingOrders(false))
    fetch("/api/me").then((r) => r.json()).then((d) => { setPoints(d?.points ?? 0); setPointHistory(d?.pointTransactions ?? []) }).catch(() => {})
    loadSajuProfile()
    loadSpecialDates()
  }, [session, loadSajuProfile, loadSpecialDates])

  const addSpecialDate = async () => {
    setDateMessage("")
    const response = await fetch("/api/account/special-dates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "anniversary", label: dateLabel, monthDay: dateMonthDay }) })
    const data = await response.json()
    if (!response.ok) { setDateMessage(data.error ?? "저장하지 못했어요."); return }
    setDateLabel(""); setDateMonthDay(""); loadSpecialDates()
  }

  const deleteSpecialDate = async (id: string) => {
    await fetch(`/api/account/special-dates?id=${id}`, { method: "DELETE" })
    loadSpecialDates()
  }

  const handleSaveProfile = async (data: {
    name: string; gender: string; birthDate: string; birthHour: string; city: string; calendarType: string
  }) => {
    setSaving(true)
    try {
      await fetch("/api/saju/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      await loadSajuProfile()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading") {
    return <div className="max-w-6xl mx-auto px-6 py-32 flex justify-center"><div className="w-8 h-8 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!session?.user) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-32 flex flex-col items-center gap-8 text-center">
        <div className="space-y-3">
          <p className="text-5xl">🌸</p>
          <h2 className="text-2xl font-bold text-stone-800">로그인하고 내 꽃을 관리하세요</h2>
          <p className="text-stone-400">주문 내역, 위시리스트를 확인할 수 있어요</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => signIn("kakao")} className="h-12 px-8 bg-[#FEE500] hover:bg-[#F5D800] text-stone-800 font-semibold">
            카카오로 시작하기
          </Button>
          <Button onClick={() => signIn("google")} variant="outline" className="h-12 px-8 font-semibold">
            Google로 시작하기
          </Button>
        </div>
        <Link href="/login" className="text-sm text-stone-400 hover:text-rose-500 underline">
          이메일로 로그인
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <BouquetReviewComposer open={!!reviewingItemId} initialOrderItemId={reviewingItemId} onClose={() => setReviewingItemId(null)} onSaved={() => { setReviewingItemId(null); window.location.reload() }} />
      <h1 className="text-2xl font-bold text-stone-800 mb-8">마이페이지</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* 사이드바 */}
        <div className="lg:w-64 shrink-0 space-y-4">
          {/* 프로필 카드 */}
          <div className="bg-white rounded-2xl p-6 border border-stone-100 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-rose-50 flex items-center justify-center shrink-0">
                {session.user.image ? (
                  <Image src={session.user.image} alt="" width={56} height={56} className="object-cover" />
                ) : (
                  <User size={28} className="text-rose-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {nickEditing ? (
                  <div className="space-y-1.5">
                    <input
                      value={nickInput}
                      onChange={(e) => setNickInput(e.target.value)}
                      maxLength={12}
                      placeholder="닉네임 (2~12자)"
                      className="w-full rounded-lg border border-stone-200 px-2 py-1 text-sm text-stone-800 focus:outline-none focus:border-rose-300"
                    />
                    <div className="flex gap-1.5">
                      <button onClick={handleNickSave} disabled={nickSaving} className="text-xs px-2 py-1 rounded-lg bg-rose-400 text-white font-medium disabled:opacity-50">
                        {nickSaving ? "저장 중" : "저장"}
                      </button>
                      <button onClick={() => { setNickEditing(false); setNickError("") }} className="text-xs px-2 py-1 rounded-lg text-stone-400 border border-stone-200">
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="font-bold text-stone-800 truncate flex items-center gap-1.5">
                    {session.user.name ?? "꽃 애호가"}
                    <button
                      onClick={() => { setNickInput(session.user.name ?? ""); setNickEditing(true) }}
                      className="text-stone-300 hover:text-rose-400 transition-colors shrink-0"
                      aria-label="닉네임 변경"
                    >
                      <Pencil size={12} />
                    </button>
                  </p>
                )}
                <p className="text-xs text-stone-400 truncate">{session.user.email}</p>
              </div>
            </div>
            {nickError && <p className="text-xs text-red-500">{nickError}</p>}
            {points !== null && (
              <div className="flex items-center justify-between bg-rose-50 rounded-xl px-3.5 py-2.5">
                <span className="text-xs text-stone-600">보유 포인트</span>
                <span className="text-sm font-bold text-rose-500">{points.toLocaleString()}P</span>
              </div>
            )}
          </div>

          {/* 관리자 메뉴 */}
          {(session.user.role === "ADMIN" || session.user.isAdmin === true) && (
            <div className="bg-rose-50 rounded-2xl border border-rose-100 overflow-hidden">
              <Link href="/admin" className="w-full flex items-center justify-between px-4 py-3.5 border-b border-rose-100 hover:bg-rose-100 transition-colors text-left">
                <span className="text-sm font-semibold text-rose-600 flex items-center gap-2"><span>🛠️</span>관리자 — 주문 관리</span>
                <ChevronRight size={14} className="text-rose-300" />
              </Link>
              <Link href="/admin/products" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-rose-100 transition-colors text-left">
                <span className="text-sm font-semibold text-rose-600 flex items-center gap-2"><span>🛠️</span>관리자 — 상품 관리</span>
                <ChevronRight size={14} className="text-rose-300" />
              </Link>
              <Link href="/admin/sellers" className="w-full flex items-center justify-between px-4 py-3.5 border-t border-rose-100 hover:bg-rose-100 transition-colors text-left">
                <span className="text-sm font-semibold text-rose-600 flex items-center gap-2"><span>🏪</span>관리자 — 판매처 심사</span>
                <ChevronRight size={14} className="text-rose-300" />
              </Link>
            </div>
          )}

          {/* 메뉴 */}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            {[
              { label: "위시리스트", emoji: "🤍" },
              { label: "알림 설정", emoji: "🔔" },
            ].map(({ label, emoji }) => (
              <button key={label} className="w-full flex items-center justify-between px-4 py-3.5 border-b last:border-0 border-stone-50 hover:bg-stone-50 transition-colors text-left">
                <span className="text-sm text-stone-700 flex items-center gap-2"><span>{emoji}</span>{label}</span>
                <ChevronRight size={14} className="text-stone-300" />
              </button>
            ))}
            <Link href="/terms" className="w-full flex items-center justify-between px-4 py-3.5 border-b border-stone-50 hover:bg-stone-50 transition-colors text-left">
              <span className="text-sm text-stone-700 flex items-center gap-2"><span>📋</span>이용약관</span>
              <ChevronRight size={14} className="text-stone-300" />
            </Link>
            <Link href="/privacy" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-stone-50 transition-colors text-left">
              <span className="text-sm text-stone-700 flex items-center gap-2"><span>🔒</span>개인정보처리방침</span>
              <ChevronRight size={14} className="text-stone-300" />
            </Link>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 space-y-6">
          {/* 나의 오행 분석 정보 */}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
              <h2 className="font-semibold text-stone-800 flex items-center gap-2">
                <Sparkles size={16} /> 나의 오행 분석 정보
              </h2>
              {!editing && (
                <button onClick={() => setEditing(true)} className="text-sm text-rose-400 hover:text-rose-500 flex items-center gap-1">
                  <Pencil size={13} /> {sajuProfile ? "정보 수정" : "정보 입력"}
                </button>
              )}
            </div>

            {editing ? (
              <div className="p-6 max-w-md">
                <BirthDateForm
                  onSubmit={handleSaveProfile}
                  loading={saving}
                  defaultValues={sajuProfile ?? undefined}
                  submitLabel="저장하기"
                />
                <button onClick={() => setEditing(false)} className="w-full text-center text-sm text-stone-400 hover:text-stone-600 mt-3">
                  취소
                </button>
              </div>
            ) : loadingSaju ? (
              <div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" /></div>
            ) : !sajuProfile ? (
              <div className="py-12 text-center text-stone-400">
                <p className="text-3xl mb-3">🔮</p>
                <p className="text-sm">아직 저장된 사주 정보가 없어요</p>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-stone-400 mb-1">이름</p>
                  <p className="text-stone-800 font-medium">{sajuProfile.name || "미입력"}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-1">성별</p>
                  <p className="text-stone-800 font-medium">{GENDER_LABEL[sajuProfile.gender] ?? sajuProfile.gender}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-1">생년월일</p>
                  <p className="text-stone-800 font-medium">{sajuProfile.birthDate} ({CALENDAR_LABEL[sajuProfile.calendarType] ?? sajuProfile.calendarType})</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-1">태어난 시간</p>
                  <p className="text-stone-800 font-medium">{sajuProfile.birthHour === "unknown" ? "모름" : sajuProfile.birthHour}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-1">태어난 지역</p>
                  <p className="text-stone-800 font-medium">{sajuProfile.city || "미입력"}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-1">가입 이메일</p>
                  <p className="text-stone-800 font-medium truncate">{session.user.email}</p>
                </div>
                <div className="col-span-2 sm:col-span-3 pt-1">
                  <Link href="/saju" className="text-xs text-rose-400 hover:text-rose-500">
                    → 이 정보로 오행 분석 결과 다시 보기
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
            <div className="border-b border-stone-50 px-6 py-4">
              <h2 className="font-semibold text-stone-800">🎁 꽃 추천 일정</h2>
              <p className="mt-1 text-xs text-stone-400">생일은 위 생년월일에서 자동 사용하고, 기념일은 연도 없이 월·일만 저장해요.</p>
            </div>
            <div className="space-y-3 p-6">
              {specialDates.map((date) => (
                <div key={date.id} className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3 text-sm">
                  <span><strong className="text-stone-800">{date.label}</strong> <span className="ml-2 text-rose-500">{date.monthDay.replace("-", "월 ")}일</span></span>
                  <button onClick={() => deleteSpecialDate(date.id)} className="text-xs text-stone-400 hover:text-red-500">삭제</button>
                </div>
              ))}
              <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                <input value={dateLabel} onChange={(event) => setDateLabel(event.target.value)} placeholder="예: 결혼기념일" className="h-10 rounded-xl border border-stone-200 px-3 text-sm" />
                <input value={dateMonthDay} onChange={(event) => setDateMonthDay(event.target.value)} placeholder="MM-DD" pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])" className="h-10 rounded-xl border border-stone-200 px-3 text-sm" />
                <Button onClick={addSpecialDate} className="h-10 bg-rose-400 text-white hover:bg-rose-500">추가</Button>
              </div>
              {dateMessage && <p className="text-xs text-red-500">{dateMessage}</p>}
            </div>
          </div>

          {/* 포인트 내역 */}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
              <h2 className="font-semibold text-stone-800 flex items-center gap-2">🌟 포인트 내역</h2>
              <span className="text-sm font-bold text-rose-500">{(points ?? 0).toLocaleString()}P 보유</span>
            </div>
            {pointHistory.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <p className="text-sm">아직 포인트 내역이 없어요</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-50">
                {pointHistory.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm text-stone-700">{POINT_REASON_LABEL[tx.reason] ?? tx.reason}</p>
                      <p className="text-xs text-stone-400">{new Date(tx.createdAt).toLocaleDateString("ko-KR")}</p>
                    </div>
                    <span className={`text-sm font-bold ${tx.amount >= 0 ? "text-rose-500" : "text-stone-500"}`}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}P
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 주문 내역 */}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
              <h2 className="font-semibold text-stone-800 flex items-center gap-2">
                <Package size={16} /> 주문 내역
              </h2>
              <span className="text-sm text-stone-400">{orders.length}건</span>
            </div>

            {loadingOrders ? (
              <div className="py-16 flex justify-center"><div className="w-6 h-6 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" /></div>
            ) : orders.length === 0 ? (
              <div className="py-20 text-center text-stone-400">
                <p className="text-3xl mb-3">📦</p>
                <p className="text-sm">아직 주문 내역이 없어요</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-50">
                {orders.map((order) => (
                  <div key={order.id} className="p-6 hover:bg-stone-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-stone-400">{new Date(order.createdAt).toLocaleDateString("ko-KR")}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {order.items.slice(0, 2).map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center shrink-0 overflow-hidden">
                            {item.product.images[0] ? (
                              <Image src={item.product.images[0]} alt="" width={40} height={40} className="object-cover" />
                            ) : <span>🌸</span>}
                          </div>
                          <span className="text-sm text-stone-700 flex-1 line-clamp-1">{item.product.name}</span>
                          <span className="text-sm text-stone-400">×{item.quantity}</span>
                          <span className="text-sm font-medium text-stone-800">{(item.price * item.quantity).toLocaleString()}원</span>
                          {order.status !== "PENDING" && order.status !== "CANCELLED" && <div className="ml-2 flex shrink-0 gap-1">{!item.confirmedAt ? <button onClick={() => confirmPurchase(item.id)} className="rounded-lg border border-emerald-200 px-2 py-1 text-[10px] font-bold text-emerald-700">구매확정</button> : (Array.isArray(item.review) ? item.review.length === 0 : !item.review) ? <button onClick={() => setReviewingItemId(item.id)} className="rounded-lg bg-rose-500 px-2 py-1 text-[10px] font-bold text-white">리뷰쓰기</button> : <span className="rounded-lg bg-stone-100 px-2 py-1 text-[10px] text-stone-500">리뷰완료</span>}</div>}
                        </div>
                      ))}
                      {order.items.length > 2 && <p className="text-xs text-stone-400 pl-13">외 {order.items.length - 2}개</p>}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-bold text-stone-800">총 {order.totalAmount.toLocaleString()}원</span>
                      <button onClick={() => setExpandedOrderId((current) => current === order.id ? null : order.id)} className="text-sm text-rose-400 hover:text-rose-500 flex items-center gap-1">
                        {expandedOrderId === order.id ? "접기" : "상세보기"} <ChevronRight size={14} className={expandedOrderId === order.id ? "rotate-90" : ""} />
                      </button>
                    </div>
                    {expandedOrderId === order.id && <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm"><div className="flex justify-between border-b border-stone-200 pb-3"><span className="text-stone-500">주문번호</span><span className="font-mono text-xs text-stone-700">{order.id}</span></div><div className="mt-3 space-y-3">{order.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4"><div><p className="font-medium text-stone-800">{item.product.name}</p><p className="mt-1 text-xs text-stone-400">{item.bouquetMode === "diy" ? "직접 만들기" : item.bouquetMode === "custom" ? "주문제작" : "완제품"} · {item.quantity}개</p></div><span className="shrink-0 font-semibold">{(item.price * item.quantity).toLocaleString()}원</span></div>)}</div><div className="mt-4 flex justify-between border-t border-stone-200 pt-3"><span className="text-stone-500">주문 상태</span><span className={`rounded-full px-2 py-1 text-xs ${STATUS_COLOR[order.status]}`}>{STATUS_LABEL[order.status]}</span></div></div>}
                    {false && order.status !== "CANCELLED" && order.status !== "PENDING" && (
                      <div className="mt-3 border-t border-stone-100 pt-3">
                        {reviewingOrderId !== order.id ? (
                          <button
                            onClick={() => { setReviewingOrderId(order.id); setReviewFile(null); setReviewContent(""); setReviewMessage("") }}
                            className="w-full flex items-center justify-center gap-1.5 text-xs text-stone-500 hover:text-rose-500 border border-stone-200 hover:border-rose-200 py-2 rounded-xl transition-colors"
                          >
                            <Camera size={13} /> 받은 꽃다발 후기 올리기
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-stone-700">📸 받은 꽃다발 사진 자랑하기</p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setReviewFile(e.target.files?.[0] ?? null)}
                              className="w-full text-xs text-stone-500 file:mr-2 file:rounded-lg file:border-0 file:bg-rose-50 file:text-rose-500 file:text-xs file:px-3 file:py-1.5"
                            />
                            <textarea
                              value={reviewContent}
                              onChange={(e) => setReviewContent(e.target.value)}
                              placeholder="한마디 남겨주세요 (예: 프로포즈 대성공!)"
                              rows={2}
                              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-rose-300"
                            />
                            <div className="flex gap-2">
                              <Button onClick={() => handleReviewSubmit(order.id)} disabled={reviewSaving} className="flex-1 h-8 bg-rose-400 hover:bg-rose-500 text-white text-xs">
                                {reviewSaving ? "올리는 중..." : "올리기"}
                              </Button>
                              <Button variant="outline" onClick={() => setReviewingOrderId(null)} className="h-8 text-xs border-stone-200 text-stone-500">취소</Button>
                            </div>
                            <p className="text-[10px] text-stone-400">다른 분이 이 조합 그대로 구매하면 500포인트를 드려요</p>
                            {reviewMessage && <p className="text-[11px] text-rose-500 text-center">{reviewMessage}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

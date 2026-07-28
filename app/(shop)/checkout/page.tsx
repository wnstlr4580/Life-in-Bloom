"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useCartStore } from "@/store/cartStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Truck, Gift, CreditCard } from "lucide-react"
import Link from "next/link"
import { nanoid } from "nanoid"
import { useSession } from "next-auth/react"

type DeliveryType = "standard" | "express" | "pickup"

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { items, totalPrice, clear } = useCartStore()
  const total = totalPrice()

  const [form, setForm] = useState({
    ordererName: "", ordererPhone: "",
    name: "", phone: "", address: "", addressDetail: "",
    deliveryDate: "", deliveryTime: "anytime",
    giftMessage: "", giftWrapping: false,
  })
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("standard")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // 결제 모듈 테스트 중에는 체크 시 실제 결제 없이 바로 주문 완료 처리
  const [skipPayment, setSkipPayment] = useState(false)
  const [myPoints, setMyPoints] = useState(0)
  const [pointsInput, setPointsInput] = useState("")

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => setMyPoints(d?.points ?? 0)).catch(() => {})
  }, [])
  const bouquetFulfillment = items.find((item) => item.fulfillment)?.fulfillment
  const pickupOnly = items.some((item) => item.fulfillment?.orderMode === "diy")
  const pickupStoreName = bouquetFulfillment?.sellerName

  const selectedDeliveryType: DeliveryType = pickupOnly ? "pickup" : deliveryType
  const shippingFee = selectedDeliveryType === "pickup" || total >= 50000 ? 0 : 3000

  // 받는 날짜 최소값 (오늘)
  const todayStr = new Date().toLocaleDateString("sv-SE")

  // 카카오(다음) 우편번호 검색 — 팝업 차단을 피하려고 화면 안 레이어(embed)로 띄운다
  const [postcodeOpen, setPostcodeOpen] = useState(false)
  const postcodeRef = useRef<HTMLDivElement>(null)
  const openPostcode = () => setPostcodeOpen(true)

  useEffect(() => {
    if (!postcodeOpen) return
    type PostcodeData = { roadAddress?: string; jibunAddress?: string }
    const w = window as unknown as {
      daum?: {
        Postcode: new (opts: {
          oncomplete: (d: PostcodeData) => void
          width?: string
          height?: string
        }) => { embed: (el: HTMLElement) => void }
      }
    }
    const embed = () => {
      if (!w.daum || !postcodeRef.current) return
      postcodeRef.current.innerHTML = ""
      new w.daum.Postcode({
        oncomplete: (d) => {
          setForm((f) => ({ ...f, address: d.roadAddress || d.jibunAddress || "" }))
          setPostcodeOpen(false)
        },
        width: "100%",
        height: "100%",
      }).embed(postcodeRef.current)
    }
    if (w.daum?.Postcode) {
      embed()
    } else {
      const script = document.createElement("script")
      script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
      script.onload = embed
      document.head.appendChild(script)
    }
  }, [postcodeOpen])

  if (status === "loading") {
    return <div className="mx-auto max-w-6xl px-6 py-32 text-center text-stone-400">회원 정보를 확인하고 있어요...</div>
  }
  if (!session?.user) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-32">
        <p className="font-semibold text-stone-700">주문하려면 일반회원으로 로그인해 주세요.</p>
        <Link href="/login"><Button className="bg-rose-400 text-white hover:bg-rose-500">로그인하기</Button></Link>
      </div>
    )
  }
  if (session.user.role !== "CUSTOMER") {
    return <div className="mx-auto max-w-6xl px-6 py-32 text-center font-semibold text-stone-600">판매자와 관리자는 꽃을 구매할 수 없어요.</div>
  }

  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-32 flex flex-col items-center gap-4">
        <p className="text-stone-400">주문할 상품이 없어요</p>
        <Link href="/products"><Button className="bg-rose-400 hover:bg-rose-500 text-white">꽃 구경하기</Button></Link>
      </div>
    )
  }

  const giftFee = form.giftWrapping ? 2000 : 0
  const expressFee = selectedDeliveryType === "express" ? 5000 : 0
  const grandTotal = total + shippingFee + giftFee + expressFee
  // 사용 포인트는 보유 포인트와 결제 총액을 넘을 수 없다
  const maxUsablePoints = Math.min(myPoints, grandTotal)
  const pointsUsed = Math.min(Math.max(0, Number(pointsInput) || 0), maxUsablePoints)
  const payableTotal = grandTotal - pointsUsed

  const validate = () => {
    if (!form.ordererName || !form.ordererPhone) {
      setError("주문하시는 분의 이름과 연락처를 입력해주세요")
      return false
    }
    if (!form.name || !form.phone) {
      setError("받는 분의 이름과 연락처를 입력해주세요")
      return false
    }
    if (selectedDeliveryType !== "pickup" && !form.address) {
      setError("배송 주소를 입력해주세요")
      return false
    }
    if (selectedDeliveryType !== "pickup" && bouquetFulfillment?.deliveryScope === "REGIONAL" && !(bouquetFulfillment.deliveryRegions ?? []).some((region) => form.address.includes(region))) {
      setError(`${bouquetFulfillment.sellerName}의 배송 가능 지역은 ${(bouquetFulfillment.deliveryRegions ?? []).join(", ")}입니다. 주소를 다시 확인해주세요.`)
      return false
    }
    if (!form.deliveryDate) {
      setError("받는 날짜를 선택해주세요")
      return false
    }
    return true
  }

  const createOrder = async (paymentId?: string) => {
    const orderItems = await Promise.all(items.map(async (i) => {
      let previewImageUrl = i.previewImageUrl ?? i.product.images[0] ?? null
      if (previewImageUrl?.startsWith("blob:") || previewImageUrl?.startsWith("data:")) {
        const imageBlob = await fetch(previewImageUrl).then((response) => response.blob())
        const previewForm = new FormData(); previewForm.append("file", new File([imageBlob], "ai-bouquet.jpg", { type: imageBlob.type || "image/jpeg" }))
        const uploaded = await fetch("/api/custom/store-preview", { method: "POST", body: previewForm })
        if (uploaded.ok) previewImageUrl = (await uploaded.json()).url
      }
      return { productId: i.productId, quantity: i.quantity, price: i.product.price, name: i.product.name, images: i.product.images, composition: i.composition ?? null, fulfillment: i.fulfillment ?? null, previewImageUrl }
    }))
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: orderItems,
        totalAmount: grandTotal,
        shippingFee: shippingFee + expressFee,
        deliveryType: selectedDeliveryType,
        shippingAddr: {
          name: form.name, phone: form.phone, address: form.address, addressDetail: form.addressDetail,
          ordererName: form.ordererName, ordererPhone: form.ordererPhone,
          deliveryDate: form.deliveryDate, deliveryTime: form.deliveryTime,
        },
        giftMessage: form.giftMessage || null,
        giftWrapping: form.giftWrapping,
        paymentId: paymentId ?? null,
        pointsUsed,
        // 후기 갤러리의 조합 그대로 만든 주문이면 글쓴이 포인트 적립용으로 전달
        sourcePostId: typeof window !== "undefined" ? sessionStorage.getItem("bouquetSourcePost") : null,
        sourceReviewId: typeof window !== "undefined" ? sessionStorage.getItem("bouquetSourceReview") : null,
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error ?? "주문에 실패했습니다")
    }
    sessionStorage.removeItem("bouquetSourcePost")
    sessionStorage.removeItem("bouquetSourceReview")
    return res.json()
  }

  const handlePayment = async () => {
    if (!validate()) return

    setLoading(true)
    setError("")

    try {
      if (skipPayment || payableTotal === 0) {
        // 결제 테스트 건너뛰기, 또는 포인트로 전액 결제되어 실제 결제가 필요 없는 경우
        const paymentId = payableTotal === 0 && !skipPayment ? `points_${nanoid()}` : `test_${nanoid()}`
        const { orderId } = await createOrder(paymentId)
        clear()
        router.push(`/checkout/complete?orderId=${orderId}`)
        return
      }

      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
      if (!channelKey || !storeId) {
        setError("결제 설정이 아직 완료되지 않았어요 (NEXT_PUBLIC_PORTONE_STORE_ID 미등록). 관리자에게 문의하거나 '결제 건너뛰기'를 이용해주세요.")
        return
      }

      const PortOne = (await import("@portone/browser-sdk/v2")).default
      const paymentId = `order_${nanoid()}`

      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        orderName: items.length === 1 ? items[0].product.name : `${items[0].product.name} 외 ${items.length - 1}건`,
        totalAmount: payableTotal,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        customer: {
          fullName: form.ordererName,
          phoneNumber: form.ordererPhone,
          email: session.user.email ?? undefined,
        },
        windowType: { pc: "IFRAME", mobile: "REDIRECTION" },
        redirectUrl: `${window.location.origin}/checkout/complete`,
      })

      if (response?.code) {
        // 결제 취소 또는 실패
        if (response.code !== "USER_CANCEL") setError(response.message ?? "결제에 실패했습니다")
        return
      }

      // 서버에서 결제 검증
      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, expectedAmount: payableTotal }),
      })

      if (!verifyRes.ok) {
        const d = await verifyRes.json()
        throw new Error(d.error ?? "결제 검증에 실패했습니다")
      }

      const { orderId } = await createOrder(paymentId)
      clear()
      router.push(`/checkout/complete?orderId=${orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "주문 처리 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* 주소 검색 레이어 — 팝업 대신 화면 안에 띄워 팝업 차단을 피한다 */}
      {postcodeOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setPostcodeOpen(false)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden w-full max-w-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
              <p className="text-sm font-semibold text-stone-700">주소 검색</p>
              <button
                onClick={() => setPostcodeOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none"
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div ref={postcodeRef} className="h-[440px]" />
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-stone-800 mb-8">주문 / 결제</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* 왼쪽 — 입력 폼 */}
        <div className="flex-1 space-y-5">
          {/* 배송 방법 */}
          <section className="bg-white rounded-2xl p-6 border border-stone-100">
            <h2 className="font-semibold text-stone-800 mb-4 flex items-center gap-2"><Truck size={16} /> 배송 방법</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                ...(!pickupOnly ? [
                  { value: "standard" as const, label: bouquetFulfillment ? "배달" : "일반배송", sub: "배송비 3,000원 · 5만원 이상 무료" },
                  { value: "express" as const, label: "당일 배달", sub: "오전 11시 이전 주문 · +5,000원" },
                ] : []),
                { value: "pickup" as const, label: "매장 픽업", sub: `${pickupStoreName ?? "선택 매장"} · 무료` },
              ]).map(({ value, label, sub }) => (
                <label key={value} className={`flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedDeliveryType === value ? "border-rose-400 bg-rose-50" : "border-stone-100 hover:border-stone-200"}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="delivery" value={value} checked={selectedDeliveryType === value} onChange={() => setDeliveryType(value)} className="accent-rose-400" />
                    <span className="text-sm font-semibold text-stone-800">{label}</span>
                  </div>
                  <p className="text-xs text-stone-400 pl-5">{sub}</p>
                </label>
              ))}
            </div>
          </section>

          {/* 주문하시는 분 */}
          <section className="bg-white rounded-2xl p-6 border border-stone-100 space-y-4">
            <h2 className="font-semibold text-stone-800">주문하시는 분</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">이름 *</Label>
                <Input value={form.ordererName} onChange={(e) => setForm((f) => ({ ...f, ordererName: e.target.value }))} placeholder="이름" className="rounded-xl border-stone-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">연락처 *</Label>
                <Input value={form.ordererPhone} onChange={(e) => setForm((f) => ({ ...f, ordererPhone: e.target.value }))} placeholder="010-0000-0000" className="rounded-xl border-stone-200" />
              </div>
            </div>
          </section>

          {/* 받는 분 */}
          <section className="bg-white rounded-2xl p-6 border border-stone-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-stone-800">받는 분</h2>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, name: f.ordererName, phone: f.ordererPhone }))}
                className="text-xs text-rose-500 font-medium hover:text-rose-600"
              >
                주문하시는 분과 같아요
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">이름 *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="이름" className="rounded-xl border-stone-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">연락처 *</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" className="rounded-xl border-stone-200" />
              </div>
            </div>
            {selectedDeliveryType !== "pickup" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">주소 *</Label>
                <div className="flex gap-2">
                  <Input value={form.address} readOnly onClick={openPostcode} placeholder="주소 검색을 눌러주세요" className="rounded-xl border-stone-200 cursor-pointer flex-1" />
                  <Button type="button" variant="outline" onClick={openPostcode} className="rounded-xl border-stone-200 shrink-0">주소 검색</Button>
                </div>
                <Input value={form.addressDetail} onChange={(e) => setForm((f) => ({ ...f, addressDetail: e.target.value }))} placeholder="상세 주소 (동/호수 등)" className="mt-2 rounded-xl border-stone-200" />
              </div>
            )}
          </section>

          {/* 받는 날짜 */}
          <section className="bg-white rounded-2xl p-6 border border-stone-100 space-y-4">
            <h2 className="font-semibold text-stone-800">
              {selectedDeliveryType === "pickup" ? "픽업 날짜" : "받는 날짜"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">날짜 *</Label>
                <Input
                  type="date"
                  min={todayStr}
                  value={form.deliveryDate}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))}
                  className="rounded-xl border-stone-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">시간대</Label>
                <select
                  value={form.deliveryTime}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryTime: e.target.value }))}
                  className="w-full h-9 rounded-xl border border-stone-200 px-3 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
                >
                  <option value="anytime">상관없어요</option>
                  <option value="morning">오전 (9시~12시)</option>
                  <option value="afternoon">오후 (12시~18시)</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-stone-400">
              기념일·경조사 날짜에 맞춰 신선한 꽃을 보내드려요. 당일 배송은 오전 11시 이전 주문 시 가능해요.
            </p>
          </section>

          {/* 선물 옵션 */}
          <section className="bg-white rounded-2xl p-6 border border-stone-100 space-y-4">
            <h2 className="font-semibold text-stone-800 flex items-center gap-2"><Gift size={16} /> 선물 옵션</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.giftWrapping} onChange={(e) => setForm((f) => ({ ...f, giftWrapping: e.target.checked }))} className="accent-rose-400 w-4 h-4" />
              <span className="text-sm text-stone-700">선물 포장 (+2,000원)</span>
            </label>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">메시지 카드 (선택)</Label>
              <textarea value={form.giftMessage} onChange={(e) => setForm((f) => ({ ...f, giftMessage: e.target.value }))} placeholder="전하고 싶은 메시지를 남겨보세요" rows={3} className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-rose-300" />
            </div>
          </section>
        </div>

        {/* 오른쪽 — 주문 요약 */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white rounded-2xl p-6 border border-stone-100 sticky top-24 space-y-4">
            <h2 className="font-bold text-stone-800">주문 상품</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-stone-600 line-clamp-1 flex-1 mr-2">{item.product.name} × {item.quantity}</span>
                  <span className="text-stone-800 font-medium shrink-0">{(item.product.price * item.quantity).toLocaleString()}원</span>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-2 text-sm text-stone-600">
              <div className="flex justify-between"><span>상품 금액</span><span>{total.toLocaleString()}원</span></div>
              <div className="flex justify-between"><span>배송비</span><span className={shippingFee === 0 ? "text-rose-400" : ""}>{shippingFee === 0 ? "무료" : `${shippingFee.toLocaleString()}원`}</span></div>
              {expressFee > 0 && <div className="flex justify-between"><span>당일배송 추가비</span><span>{expressFee.toLocaleString()}원</span></div>}
              {form.giftWrapping && <div className="flex justify-between"><span>선물 포장</span><span>2,000원</span></div>}
            </div>

            {/* 포인트 사용 */}
            <div className="border-t border-stone-100 pt-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-stone-500">포인트 사용 (보유 {myPoints.toLocaleString()}P)</Label>
                <button
                  type="button"
                  onClick={() => setPointsInput(String(maxUsablePoints))}
                  className="text-xs font-medium text-rose-500 hover:text-rose-600"
                >
                  전액 사용
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={maxUsablePoints}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  placeholder="0"
                  className="rounded-xl border-stone-200"
                />
                {pointsUsed > 0 && (
                  <Button type="button" variant="outline" onClick={() => setPointsInput("")} className="shrink-0 rounded-xl border-stone-200 text-stone-500">
                    취소
                  </Button>
                )}
              </div>
              {maxUsablePoints === 0 && <p className="text-[11px] text-stone-400">사용할 수 있는 포인트가 없어요</p>}
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-1">
              {pointsUsed > 0 && (
                <div className="flex justify-between text-sm text-stone-500">
                  <span>포인트 사용</span>
                  <span>-{pointsUsed.toLocaleString()}원</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-stone-800">
                <span>총 결제금액</span>
                <span className="text-rose-500 text-lg">{payableTotal.toLocaleString()}원</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg p-2">{error}</p>}

            <label className="flex items-center gap-2 text-xs text-stone-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipPayment}
                onChange={(e) => setSkipPayment(e.target.checked)}
                className="accent-amber-500 w-3.5 h-3.5"
              />
              결제 건너뛰기 (테스트용 — 실제 결제 없이 주문만 생성)
            </label>

            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full h-12 bg-rose-400 hover:bg-rose-500 text-white font-semibold text-base disabled:opacity-60 gap-2"
            >
              <CreditCard size={18} />
              {loading
                ? "처리 중..."
                : skipPayment
                ? "주문 완료 (테스트)"
                : payableTotal === 0
                ? "포인트로 전액 결제하기"
                : `${payableTotal.toLocaleString()}원 결제하기`}
            </Button>
            <p className="text-xs text-center text-stone-400">카드 · 카카오페이 · 토스 등 결제 가능</p>
          </div>
        </div>
      </div>
    </div>
  )
}

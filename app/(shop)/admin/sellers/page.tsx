"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

type Seller = {
  id: string; status: string; marketName: string; legalBusinessName: string
  businessNumber: string; representativeName: string; managerName: string
  managerPhone: string; sellerType: string; submittedAt: string
  offersCustomBouquet: boolean; offersDiyFlowers: boolean
  User: { email: string } | { email: string }[] | null
}

type SellerDetail = Seller & {
  legalBusinessName: string; representativeName: string; businessType: string
  businessCategory: string; mailOrderNumber: string | null; publicPhone: string | null
  introduction: string | null; postalCode: string; roadAddress: string; detailAddress: string
  settlementBank: string; settlementAccount: string; settlementHolder: string
  businessLicenseUrl: string | null; sellsFinishedProducts: boolean
  approvedAt: string | null
}

type Review = { id: string; fromStatus: string | null; toStatus: string; reason: string | null; snapshot?: { requestType?: string; requestedChanges?: Record<string, string> }; createdAt: string }

const LABEL: Record<string, string> = { PENDING: "신청", UNDER_REVIEW: "검토중", APPROVED: "승인", REJECTED: "반려", SUSPENDED: "정지" }

export default function AdminSellersPage() {
  const { data: session, status } = useSession()
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [reason, setReason] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, { seller: SellerDetail; reviews: Review[] }>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/sellers")
    if (response.status === 403) { setForbidden(true); setLoading(false); return }
    const data = await response.json()
    setSellers(data.sellers ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { if (session?.user) load(); else if (status !== "loading") setLoading(false) }, [load, session, status])

  const review = async (sellerId: string, nextStatus: string) => {
    setSaving(sellerId)
    const response = await fetch("/api/admin/sellers", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId, status: nextStatus, reason: reason[sellerId] ?? "" }),
    })
    const data = await response.json()
    if (response.ok) {
      const message = nextStatus === "APPROVED" ? "판매처 승인이 완료됐습니다." : nextStatus === "REJECTED" ? "판매처 신청을 반려했습니다." : "검토 중 상태로 변경했습니다."
      setSellers((current) => current.map((seller) => seller.id === sellerId ? { ...seller, status: nextStatus } : seller))
      setActionMessage((current) => ({ ...current, [sellerId]: message }))
      setDetails((current) => {
        const next = { ...current }
        delete next[sellerId]
        return next
      })
      setExpanded(null)
      await load()
    } else alert(data.error ?? "처리에 실패했어요")
    setSaving(null)
  }

  const openDetail = async (sellerId: string) => {
    if (expanded === sellerId) { setExpanded(null); return }
    setExpanded(sellerId)
    if (details[sellerId]) return
    setDetailLoading(sellerId)
    const response = await fetch(`/api/admin/sellers/${sellerId}`)
    const data = await response.json()
    if (response.ok) setDetails((current) => ({ ...current, [sellerId]: data }))
    else alert(data.error ?? "상세 정보를 불러오지 못했어요")
    setDetailLoading(null)
  }

  if (status === "loading" || loading) return <div className="py-32 text-center text-stone-400">판매처 신청을 불러오는 중...</div>
  if (!session?.user) return <Notice text="관리자 로그인이 필요해요" />
  if (forbidden) return <Notice text="관리자 권한이 없는 계정이에요" />

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-8"><div><Link href="/admin" className="text-xs text-stone-400">← 관리자센터</Link><h1 className="text-2xl font-bold text-stone-800 mt-3">판매처 가입 심사</h1></div><span className="text-sm text-stone-400">{sellers.length}건</span></div>
      <div className="space-y-4">
        {sellers.length === 0 && <div className="bg-white border border-stone-100 rounded-2xl py-20 text-center text-stone-400">접수된 판매처 신청이 없어요.</div>}
        {sellers.map((seller) => {
          const user = Array.isArray(seller.User) ? seller.User[0] : seller.User
          return (
            <div key={seller.id} className="bg-white rounded-2xl border border-stone-100 p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2"><h2 className="font-bold text-stone-800">{seller.marketName}</h2><span className="text-xs rounded-full bg-stone-100 text-stone-600 px-2.5 py-1">{LABEL[seller.status] ?? seller.status}</span></div>
                  <p className="text-sm text-stone-500 mt-2">{seller.legalBusinessName} · {seller.businessNumber} · 대표 {seller.representativeName}</p>
                  <p className="text-xs text-stone-400 mt-1">담당 {seller.managerName} {seller.managerPhone} · {user?.email}</p>
                  <p className="text-xs text-emerald-600 mt-3">{seller.offersCustomBouquet && "나만의 꽃다발 주문 참여"} {seller.offersDiyFlowers && " · 직접 만든다면? 참여"}</p>
                </div>
                <div className="lg:w-80 space-y-2">
                  <Button type="button" variant="outline" onClick={() => openDetail(seller.id)} className="w-full h-9 border-stone-200">
                    {expanded === seller.id ? "상세 접기" : "신청 상세 확인"}
                  </Button>
                  {seller.status === "APPROVED" ? (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-700">✓ 승인 완료된 판매처입니다</div>
                  ) : (
                    <>
                      <input value={reason[seller.id] ?? ""} onChange={(e) => setReason((r) => ({ ...r, [seller.id]: e.target.value }))} placeholder="반려 사유" className="w-full h-9 rounded-xl border border-stone-200 px-3 text-sm" />
                      <div className="flex flex-wrap gap-2">
                        {seller.status !== "UNDER_REVIEW" && <Button size="sm" variant="outline" disabled={saving === seller.id} onClick={() => review(seller.id, "UNDER_REVIEW")}>검토 시작</Button>}
                        <Button size="sm" disabled={saving === seller.id} onClick={() => review(seller.id, "APPROVED")} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving === seller.id ? "처리 중..." : "승인"}</Button>
                        <Button size="sm" variant="outline" disabled={saving === seller.id} onClick={() => review(seller.id, "REJECTED")} className="text-red-500">반려</Button>
                      </div>
                    </>
                  )}
                  {actionMessage[seller.id] && <p className="text-xs font-semibold text-emerald-700">{actionMessage[seller.id]}</p>}
                </div>
              </div>
              {expanded === seller.id && (
                <div className="mt-6 pt-6 border-t border-stone-100">
                  {detailLoading === seller.id || !details[seller.id] ? (
                    <p className="py-8 text-center text-sm text-stone-400">신청 상세 정보를 불러오는 중...</p>
                  ) : (
                    <SellerDetailPanel detail={details[seller.id]} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Notice({ text }: { text: string }) { return <div className="max-w-md mx-auto py-32 text-center text-stone-500">{text}</div> }

function SellerDetailPanel({ detail }: { detail: { seller: SellerDetail; reviews: Review[] } }) {
  const seller = detail.seller
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <DetailSection title="사업자 정보">
          <Row label="상호명" value={seller.legalBusinessName} />
          <Row label="사업자번호" value={seller.businessNumber} />
          <Row label="대표자" value={seller.representativeName} />
          <Row label="업태 / 종목" value={`${seller.businessType} / ${seller.businessCategory}`} />
          <Row label="통신판매업" value={seller.mailOrderNumber || "미입력"} />
        </DetailSection>
        <DetailSection title="담당자·판매처">
          <Row label="마켓명" value={seller.marketName} />
          <Row label="담당자" value={seller.managerName} />
          <Row label="담당자 연락처" value={seller.managerPhone} />
          <Row label="고객 문의" value={seller.publicPhone || "미입력"} />
          <Row label="판매처 유형" value={seller.sellerType} />
        </DetailSection>
        <DetailSection title="영업 위치">
          <Row label="우편번호" value={seller.postalCode} />
          <Row label="주소" value={`${seller.roadAddress} ${seller.detailAddress}`} />
          <Row label="소개" value={seller.introduction || "미입력"} />
        </DetailSection>
        <DetailSection title="정산 정보">
          <Row label="은행" value={seller.settlementBank} />
          <Row label="계좌번호" value={seller.settlementAccount} />
          <Row label="예금주" value={seller.settlementHolder} />
          {seller.businessLicenseUrl ? (
            <a href={seller.businessLicenseUrl} target="_blank" rel="noreferrer" className="inline-flex mt-2 text-xs font-semibold text-blue-600 hover:underline">사업자등록증 열기 ↗</a>
          ) : <p className="text-xs text-red-500 mt-2">사업자등록증을 열 수 없습니다.</p>}
        </DetailSection>
      </div>

      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
        <p className="text-xs font-bold text-emerald-800 mb-2">신청 서비스</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Service active={seller.sellsFinishedProducts} label="완제품 꽃 상품" />
          <Service active={seller.offersCustomBouquet} label="나만의 꽃다발 주문하기" />
          <Service active={seller.offersDiyFlowers} label="직접 만든다면?" />
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-stone-700 mb-2">심사 이력</p>
        <div className="rounded-xl border border-stone-100 divide-y divide-stone-100">
          {detail.reviews.map((review) => (
            <div key={review.id} className="px-4 py-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1"><span className="text-stone-700">{review.fromStatus ? `${LABEL[review.fromStatus] ?? review.fromStatus} → ` : ""}{LABEL[review.toStatus] ?? review.toStatus}</span>
              <span className="text-stone-400">{review.reason || "사유 없음"} · {new Date(review.createdAt).toLocaleString("ko-KR")}</span></div>
              {review.snapshot?.requestType === "SELLER_CHANGE_REQUEST" && review.snapshot.requestedChanges && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900">
                <p className="font-bold mb-2">판매자가 요청한 중요정보 변경</p>
                {Object.entries(review.snapshot.requestedChanges).map(([key, value]) => <p key={key}>{CHANGE_LABEL[key] ?? key}: {value}</p>)}
              </div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
const CHANGE_LABEL: Record<string, string> = { businessNumber: "사업자번호", legalBusinessName: "법적 상호", representativeName: "대표자", settlementBank: "정산 은행", settlementAccount: "정산 계좌", settlementHolder: "예금주" }

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-stone-100 bg-stone-50/60 p-4"><h3 className="text-xs font-bold text-stone-800 mb-3">{title}</h3><div className="space-y-2">{children}</div></section>
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="text-xs"><span className="block text-stone-400">{label}</span><span className="block text-stone-700 mt-0.5 break-words">{value}</span></div>
}

function Service({ active, label }: { active: boolean; label: string }) {
  return <span className={`rounded-full px-3 py-1 ${active ? "bg-emerald-700 text-white" : "bg-white text-stone-400 line-through"}`}>{label}</span>
}

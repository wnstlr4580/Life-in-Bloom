"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Package, ShoppingBag, Store, XCircle } from "lucide-react"

type Seller = {
  status: string; marketName: string; legalBusinessName: string; businessNumber: string
  roadAddress: string; detailAddress: string; submittedAt: string
  sellsFinishedProducts: boolean; offersCustomBouquet: boolean; offersDiyFlowers: boolean
}
type Dashboard = { totalProducts: number; activeProducts: number; soldOutProducts: number; endingSoonProducts: number; newOrders: number; preparingOrders: number }

const STATUS = {
  PENDING: { label: "신청 접수", description: "판매자 신청서가 접수됐어요. 관리자가 확인하기 전입니다.", icon: Clock3, color: "amber" },
  UNDER_REVIEW: { label: "검토 중", description: "관리자가 사업자 및 판매처 정보를 확인하고 있어요.", icon: Clock3, color: "blue" },
  APPROVED: { label: "승인 완료", description: "판매자센터의 모든 기능을 이용할 수 있어요.", icon: CheckCircle2, color: "emerald" },
  REJECTED: { label: "신청 반려", description: "반려 사유를 확인한 뒤 정보를 보완해주세요.", icon: XCircle, color: "red" },
  SUSPENDED: { label: "이용 정지", description: "현재 판매 기능이 정지됐어요. 관리자에게 문의해주세요.", icon: XCircle, color: "red" },
} as const

export default function SellerPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [seller, setSeller] = useState<Seller | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)

  const load = useCallback(async () => {
    const response = await fetch("/api/seller/profile")
    if (response.status === 403) { setForbidden(true); setLoading(false); return }
    const data = await response.json()
    setSeller(data.seller ?? null)
    setReason(data.latestReview?.reason ?? null)
    setLoading(false)
    if (data.seller?.status === "APPROVED") {
      const dashboardResponse = await fetch("/api/seller/dashboard")
      if (dashboardResponse.ok) setDashboard(await dashboardResponse.json())
    }
  }, [])

  useEffect(() => {
    if (session?.user) load()
    else if (sessionStatus !== "loading") setLoading(false)
  }, [load, session, sessionStatus])

  const toggle = (key: "sellsFinishedProducts" | "offersCustomBouquet" | "offersDiyFlowers") =>
    setSeller((current) => current ? { ...current, [key]: !current[key] } : current)

  const saveServices = async () => {
    if (!seller) return
    setSaving(true)
    const response = await fetch("/api/seller/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(seller),
    })
    if (!response.ok) await load()
    setSaving(false)
  }

  if (sessionStatus === "loading" || loading) return <Loading />
  if (!session?.user) return <Notice text="판매자 로그인이 필요해요" href="/login?callbackUrl=/seller" button="로그인" />
  if (forbidden) return <Notice text="판매자 계정으로 로그인해주세요" href="/signup/seller" button="판매자 회원가입" />
  if (!seller) return <Notice text="판매처 정보를 불러오지 못했어요" href="/" button="홈으로" />

  const config = STATUS[seller.status as keyof typeof STATUS] ?? STATUS.PENDING
  const Icon = config.icon
  const approved = seller.status === "APPROVED"

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div><p className="text-sm text-emerald-600 font-medium">판매자센터</p><h1 className="text-2xl font-bold text-stone-800 mt-1">{seller.marketName}</h1></div>
        <span className="text-xs text-stone-400">{session.user.email}</span>
      </div>

      <div className={`rounded-2xl border p-6 mb-6 ${approved ? "bg-emerald-50 border-emerald-100" : seller.status === "REJECTED" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
        <div className="flex items-start gap-4">
          <Icon className={approved ? "text-emerald-600" : seller.status === "REJECTED" ? "text-red-500" : "text-amber-600"} />
          <div><h2 className="font-bold text-stone-800">{config.label}</h2><p className="text-sm text-stone-600 mt-1">{config.description}</p>{reason && <p className="text-sm text-red-600 mt-3">사유: {reason}</p>}</div>
        </div>
      </div>

      {!approved ? (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card title="제출한 사업자 정보"><Info label="상호명" value={seller.legalBusinessName} /><Info label="사업자번호" value={seller.businessNumber} /></Card>
          <Card title="판매처 정보"><Info label="마켓명" value={seller.marketName} /><Info label="주소" value={`${seller.roadAddress} ${seller.detailAddress}`} /></Card>
          <ServiceSettings seller={seller} toggle={toggle} save={saveServices} saving={saving} disabled />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="font-bold text-stone-800">오늘의 운영 현황</h2>
            <p className="mt-1 text-xs text-stone-400">처리가 필요한 항목부터 확인하세요.</p>
            <div className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-4">
              <Metric icon={<ShoppingBag />} label="신규 주문" value={dashboard?.newOrders ?? 0} tone="emerald" />
              <Metric icon={<Clock3 />} label="제작·배송 준비" value={dashboard?.preparingOrders ?? 0} tone="blue" />
              <Metric icon={<AlertTriangle />} label="품절 상품" value={dashboard?.soldOutProducts ?? 0} tone="red" />
              <Metric icon={<CalendarClock />} label="7일 내 노출 종료" value={dashboard?.endingSoonProducts ?? 0} tone="amber" />
            </div>
          </div>
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <Card title="상품 현황">
              <Info label="전체 등록 상품" value={`${dashboard?.totalProducts ?? 0}개`} />
              <Info label="판매·노출 중" value={`${dashboard?.activeProducts ?? 0}개`} />
              <Link href="/seller/products" className="mt-4 block rounded-lg bg-emerald-700 py-2.5 text-center text-sm font-semibold text-white">상품 관리 바로가기</Link>
            </Card>
            <Card title="빠른 작업">
              <Link href="/seller/products?mode=bulk" className="block rounded-lg border border-stone-200 px-4 py-3 text-sm hover:border-emerald-400">엑셀로 상품 일괄등록 →</Link>
              <Link href="/seller/settings" className="block rounded-lg border border-stone-200 px-4 py-3 text-sm hover:border-emerald-400">판매처 정보 수정 →</Link>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function Loading() { return <div className="py-32 flex justify-center"><div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /></div> }
function Notice({ text, href, button }: { text: string; href: string; button: string }) { return <div className="max-w-md mx-auto py-32 text-center"><p className="text-stone-500 mb-5">{text}</p><Link href={href}><Button>{button}</Button></Link></div> }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <div className="bg-white rounded-2xl border border-stone-100 p-6"><h2 className="font-bold text-stone-800 mb-4">{title}</h2><div className="space-y-3">{children}</div></div> }
function Info({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 text-sm"><span className="text-stone-400">{label}</span><span className="text-stone-700 text-right">{value}</span></div> }
function Feature({ icon, title, description, href, pending = false }: { icon: React.ReactNode; title: string; description: string; href: string; pending?: boolean }) {
  const content = <><div className="flex items-start justify-between"><span className="text-emerald-600">{icon}</span><span className={`text-[10px] rounded-full px-2 py-1 ${pending ? "bg-stone-100 text-stone-500" : "bg-emerald-50 text-emerald-700"}`}>{pending ? "다음 구현 단계" : "사용 가능"}</span></div><h2 className="font-bold text-stone-800 mt-4">{title}</h2><p className="text-sm text-stone-500 mt-2 leading-6">{description}</p></>
  return pending ? <div className="bg-white rounded-2xl border border-stone-100 p-6">{content}</div> : <Link href={href} className="bg-white rounded-2xl border border-stone-100 p-6 hover:border-emerald-300 hover:shadow-md transition-all">{content}</Link>
}
function ServiceToggle({ checked, onChange, title, disabled }: { checked: boolean; onChange: () => void; title: string; disabled?: boolean }) { return <label className={`flex items-center justify-between gap-4 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}><span className="text-sm text-stone-700">{title}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="w-4 h-4 accent-emerald-600" /></label> }
function ServiceSettings({ seller, toggle, save, saving, disabled = false }: { seller: Seller; toggle: (key: "sellsFinishedProducts" | "offersCustomBouquet" | "offersDiyFlowers") => void; save: () => void; saving: boolean; disabled?: boolean }) {
  return <Card title="서비스 참여 설정">
    <ServiceToggle disabled={disabled} checked={seller.sellsFinishedProducts} onChange={() => toggle("sellsFinishedProducts")} title="완제품 판매" />
    <ServiceToggle disabled={disabled} checked={seller.offersCustomBouquet} onChange={() => toggle("offersCustomBouquet")} title="나만의 꽃다발 주문하기" />
    <ServiceToggle disabled={disabled} checked={seller.offersDiyFlowers} onChange={() => toggle("offersDiyFlowers")} title="직접 만든다면?" />
    <p className="text-[11px] text-stone-400 mt-3">{disabled ? "심사 중에는 신청 당시 서비스 설정을 변경할 수 없습니다." : "끄면 신규 노출만 중단됩니다."}</p>
    <Button onClick={save} disabled={saving || disabled} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">{disabled ? "심사 완료 후 변경 가능" : saving ? "저장 중..." : "설정 저장"}</Button>
  </Card>
}
function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "emerald" | "blue" | "red" | "amber" }) {
  const colors = { emerald: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700", red: "bg-red-50 text-red-600", amber: "bg-amber-50 text-amber-700" }
  return <div className="rounded-2xl border border-stone-200 bg-white p-5"><span className={`inline-grid h-9 w-9 place-items-center rounded-xl ${colors[tone]}`}>{icon}</span><p className="mt-4 text-xs text-stone-500">{label}</p><p className="mt-1 text-2xl font-bold text-stone-900">{value}<span className="ml-1 text-sm font-normal text-stone-400">건</span></p></div>
}

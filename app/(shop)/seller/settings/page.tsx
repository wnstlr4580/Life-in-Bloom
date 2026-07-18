"use client"

import { useEffect, useState } from "react"
import Script from "next/script"
import { CheckCircle2, FileText, LockKeyhole, MapPin, Save, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Seller = {
  legalBusinessName: string; businessNumber: string; representativeName: string
  marketName: string; managerName: string; managerPhone: string; publicPhone: string
  introduction: string; postalCode: string; roadAddress: string; detailAddress: string
  settlementBank: string; settlementAccount: string; settlementHolder: string; isOpen: boolean
  businessLicenseUrl: string | null; status?: string
  sellsFinishedProducts: boolean; offersCustomBouquet: boolean; offersDiyFlowers: boolean
}

export default function SellerSettingsPage() {
  const [seller, setSeller] = useState<Seller | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [reviewReason, setReviewReason] = useState("")
  useEffect(() => { fetch("/api/seller/profile").then((r) => r.json()).then((data) => setSeller(data.seller ?? null)) }, [])
  if (!seller) return <div className="py-32 text-center text-stone-400">판매처 정보를 불러오는 중...</div>
  const set = <K extends keyof Seller>(key: K, value: Seller[K]) => setSeller((current) => current ? { ...current, [key]: value } : current)
  const openAddress = () => {
    const Postcode = (window as typeof window & { daum?: { Postcode: new (options: { oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void }) => { open: () => void } } }).daum?.Postcode
    if (!Postcode) return setError("주소 검색을 불러오는 중입니다.")
    new Postcode({ oncomplete: (data) => {
      setSeller((current) => current ? { ...current, postalCode: data.zonecode, roadAddress: data.roadAddress || data.jibunAddress } : current)
    }}).open()
  }
  const save = async () => {
    setSaving(true); setError(""); setMessage("")
    const response = await fetch("/api/seller/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(seller) })
    const data = await response.json()
    if (response.ok) { setSeller(data.seller); setMessage("판매처 정보가 저장됐습니다.") }
    else setError(data.error ?? "저장하지 못했어요")
    setSaving(false)
  }
  const requestReview = async () => {
    setSaving(true); setError(""); setMessage("")
    const response = await fetch("/api/seller/review-request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...seller, reason: reviewReason }),
    })
    const data = await response.json()
    if (response.ok) { set("status", "UNDER_REVIEW"); setMessage("재심사 요청이 접수됐습니다."); setReviewReason("") }
    else setError(data.error ?? "재심사 요청에 실패했어요")
    setSaving(false)
  }
  return <div className="max-w-5xl px-6 py-10">
    <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
    <p className="text-sm font-semibold text-emerald-700">판매자센터</p><h1 className="mt-1 text-2xl font-bold">판매처 설정</h1>
    <p className="mt-2 text-sm text-stone-500">고객에게 노출되는 판매처 정보와 제공 서비스를 관리합니다.</p>
    {message && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} className="inline mr-2" />{message}</div>}
    <div className="mt-7 space-y-5">
      <Section title="운영 상태" icon={<Store size={18} />}>
        <label className="flex items-center justify-between rounded-xl bg-stone-50 p-4"><span><strong className="block text-sm">판매처 영업</strong><span className="text-xs text-stone-500">끄면 판매처의 신규 노출을 일시 중단합니다.</span></span><input type="checkbox" checked={seller.isOpen} onChange={(e) => set("isOpen", e.target.checked)} className="h-5 w-5 accent-emerald-700" /></label>
      </Section>
      <Section title="판매처 기본정보" icon={<Store size={18} />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="마켓명 *"><Input value={seller.marketName} maxLength={50} onChange={(e) => set("marketName", e.target.value)} /></Field>
          <Field label="담당자명 *"><Input value={seller.managerName} maxLength={30} onChange={(e) => set("managerName", e.target.value)} /></Field>
          <Field label="담당자 연락처 *"><Input value={seller.managerPhone} inputMode="numeric" onChange={(e) => set("managerPhone", e.target.value.replace(/\D/g, "").slice(0,11))} /></Field>
          <Field label="고객 문의 전화"><Input value={seller.publicPhone ?? ""} inputMode="numeric" onChange={(e) => set("publicPhone", e.target.value.replace(/\D/g, "").slice(0,11))} /></Field>
          <Field label="판매처 소개" className="sm:col-span-2"><textarea value={seller.introduction ?? ""} maxLength={500} onChange={(e) => set("introduction", e.target.value)} rows={4} className="w-full rounded-lg border border-stone-200 p-3 text-sm" /></Field>
        </div>
      </Section>
      <Section title="판매처 주소" icon={<MapPin size={18} />}>
        <div className="grid sm:grid-cols-[180px_1fr] gap-4">
          <Field label="우편번호 *"><div className="flex gap-2"><Input readOnly value={seller.postalCode} className="bg-stone-50" /><Button type="button" variant="outline" onClick={openAddress} className="whitespace-nowrap">주소 검색</Button></div></Field>
          <Field label="도로명주소 *"><Input readOnly value={seller.roadAddress} className="bg-stone-50" /></Field>
          <Field label="상세주소" className="sm:col-span-2"><Input value={seller.detailAddress ?? ""} maxLength={100} onChange={(e) => set("detailAddress", e.target.value)} /></Field>
        </div>
      </Section>
      <Section title="제공 서비스" icon={<Store size={18} />}>
        <div className="grid sm:grid-cols-3 gap-3">
          <Service checked={seller.sellsFinishedProducts} onChange={(v) => set("sellsFinishedProducts", v)} label="완제품 꽃 상품" />
          <Service checked={seller.offersCustomBouquet} onChange={(v) => set("offersCustomBouquet", v)} label="나만의 꽃다발 주문" />
          <Service checked={seller.offersDiyFlowers} onChange={(v) => set("offersDiyFlowers", v)} label="개별 꽃·소재 판매" />
        </div>
      </Section>
      <Section title="심사·정산 정보" icon={<LockKeyhole size={18} />}>
        <p className="mb-4 text-xs text-amber-700">아래 정보를 변경하면 즉시 반영되지 않고 관리자 재심사를 거칩니다.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="사업자번호"><Input value={seller.businessNumber} inputMode="numeric" onChange={(e) => set("businessNumber", e.target.value.replace(/\D/g, "").slice(0,10))} /></Field>
          <Field label="대표자"><Input value={seller.representativeName} onChange={(e) => set("representativeName", e.target.value)} /></Field>
          <Field label="법적 상호"><Input value={seller.legalBusinessName} onChange={(e) => set("legalBusinessName", e.target.value)} /></Field>
          <Field label="정산 은행"><Input value={seller.settlementBank} onChange={(e) => set("settlementBank", e.target.value)} /></Field>
          <Field label="예금주"><Input value={seller.settlementHolder} onChange={(e) => set("settlementHolder", e.target.value)} /></Field>
          <Field label="정산 계좌"><Input value={seller.settlementAccount} inputMode="numeric" onChange={(e) => set("settlementAccount", e.target.value.replace(/\D/g, "").slice(0,20))} /></Field>
        </div>
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center justify-between gap-4"><span className="text-sm font-semibold text-stone-700"><FileText size={16} className="inline mr-2" />등록된 사업자등록증</span>
          {seller.businessLicenseUrl ? <a href={seller.businessLicenseUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-emerald-700 hover:underline">파일 열기 ↗</a> : <span className="text-xs text-red-500">파일을 열 수 없음</span>}</div>
        </div>
        <Field label="변경·재심사 요청 사유" className="mt-4"><textarea value={reviewReason} maxLength={500} onChange={(e) => setReviewReason(e.target.value)} rows={3} placeholder="변경이 필요한 정보와 사유를 적어주세요." className="w-full rounded-lg border border-stone-200 p-3 text-sm" /></Field>
        <Button type="button" variant="outline" disabled={saving || seller.status === "UNDER_REVIEW"} onClick={requestReview} className="mt-3 border-amber-300 text-amber-800">{seller.status === "UNDER_REVIEW" ? "재심사 진행 중" : "중요정보 변경 재심사 요청"}</Button>
      </Section>
    </div>
    {error && <p className="mt-5 text-sm text-red-600">{error}</p>}
    <div className="sticky bottom-0 mt-5 flex justify-end border-t border-stone-200 bg-[#f7f8f5]/95 py-4"><Button onClick={save} disabled={saving} className="min-w-40 bg-emerald-700 text-white"><Save size={16} />{saving ? "저장 중..." : "변경사항 저장"}</Button></div>
  </div>
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-2xl border border-stone-200 bg-white p-6"><h2 className="mb-5 flex items-center gap-2 font-bold text-stone-800"><span className="text-emerald-700">{icon}</span>{title}</h2>{children}</section> }
function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={className}><Label className="mb-1.5 block text-xs text-stone-600">{label}</Label>{children}</div> }
function Service({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) { return <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm ${checked ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-800" : "border-stone-200"}`}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-emerald-700" />{label}</label> }

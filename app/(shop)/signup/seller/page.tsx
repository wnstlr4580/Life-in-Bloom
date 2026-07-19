"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import Script from "next/script"
import { Building2, CheckCircle2, Circle, FileCheck2, Landmark, Leaf, ShieldCheck, Store, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initial = {
  email: "", password: "", passwordConfirm: "", managerName: "", managerPhone: "",
  legalBusinessName: "", businessNumber: "", representativeName: "", businessType: "",
  businessCategory: "", mailOrderNumber: "", marketName: "", sellerType: "FLOWER_SHOP",
  publicPhone: "", introduction: "", postalCode: "", roadAddress: "", detailAddress: "",
  latitude: "", longitude: "", settlementBank: "", settlementAccount: "",
  settlementHolder: "", sellsFinishedProducts: true, offersCustomBouquet: false,
  offersDiyFlowers: false, termsAgreed: false,
}

type FormKey = keyof typeof initial

export default function SellerSignupPage() {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [license, setLicense] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const openAddressSearch = () => {
    const Postcode = (window as typeof window & { daum?: { Postcode: new (options: { oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void }) => { open: () => void } } }).daum?.Postcode
    if (!Postcode) return setError("주소 검색을 불러오는 중입니다. 잠시 후 다시 눌러주세요.")
    new Postcode({ oncomplete: (data) => {
      setForm((current) => ({ ...current, postalCode: data.zonecode, roadAddress: data.roadAddress || data.jibunAddress }))
      setError("")
    }}).open()
  }

  const set = (key: FormKey, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => { const next = { ...current }; delete next[key]; return next })
  }
  const stepReady = [
    Boolean(form.email && form.password && form.passwordConfirm && form.managerName && form.managerPhone),
    Boolean(form.legalBusinessName && form.businessNumber && form.representativeName && form.businessType && form.businessCategory && license),
    Boolean(form.marketName && form.sellerType && form.postalCode && form.roadAddress),
    Boolean(form.settlementBank && form.settlementAccount && form.settlementHolder),
    Boolean(form.sellsFinishedProducts || form.offersCustomBouquet || form.offersDiyFlowers),
  ]
  const completedSteps = stepReady.filter(Boolean).length

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    const errors: Record<string, string> = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "올바른 이메일 주소를 입력해주세요."
    if (form.password.length < 8) errors.password = "비밀번호는 8자 이상이어야 합니다."
    if (form.password !== form.passwordConfirm) errors.passwordConfirm = "비밀번호가 일치하지 않습니다."
    if (!form.managerName.trim()) errors.managerName = "담당자명을 입력해주세요."
    if (!/^\d{10,11}$/.test(form.managerPhone.replace(/\D/g, ""))) errors.managerPhone = "휴대전화 번호 10~11자리를 입력해주세요."
    if (!/^\d{10}$/.test(form.businessNumber.replace(/\D/g, ""))) errors.businessNumber = "사업자등록번호 숫자 10자리를 입력해주세요."
    for (const key of ["legalBusinessName", "representativeName", "businessType", "businessCategory", "marketName", "settlementBank", "settlementAccount", "settlementHolder"] as FormKey[]) if (!String(form[key]).trim()) errors[key] = "필수 입력 항목입니다."
    if (!license) errors.businessLicense = "사업자등록증을 첨부해주세요."
    if (!form.postalCode || !form.roadAddress) errors.postalCode = "도로명주소 검색으로 주소를 선택해주세요."
    if (![form.sellsFinishedProducts, form.offersCustomBouquet, form.offersDiyFlowers].some(Boolean)) errors.services = "판매 서비스를 한 개 이상 선택해주세요."
    if (!form.termsAgreed) errors.termsAgreed = "필수 약관에 동의해주세요."
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      const first = Object.keys(errors)[0]
      requestAnimationFrame(() => {
        const target = document.getElementById(first)
        target?.scrollIntoView({ behavior: "smooth", block: "center" })
        if (target instanceof HTMLElement) target.focus()
      })
      return
    }
    if (!license) return
    setLoading(true)
    try {
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => body.append(key, String(value)))
      body.append("businessLicense", license)
      const response = await fetch("/api/auth/signup/seller", { method: "POST", body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "판매자 가입에 실패했어요")
      const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false })
      if (result?.error) throw new Error("가입은 완료됐지만 로그인에 실패했어요")
      router.push("/seller")
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "판매자 가입에 실패했어요")
    } finally {
      setLoading(false)
    }
  }

  const field = (key: FormKey, label: string, placeholder = "", type = "text", required = true) => (
    <div className="space-y-1.5">
      <Label htmlFor={key} className="text-xs font-medium text-stone-600">{label}{required && " *"}</Label>
      <Input id={key} type={type} required={required} value={String(form[key])} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} className={`h-11 rounded-lg bg-white focus-visible:ring-emerald-100 ${fieldErrors[key] ? "border-red-400 focus-visible:border-red-500" : "border-stone-200 focus-visible:border-emerald-500"}`} />
      {fieldErrors[key] && <p className="text-xs text-red-500">{fieldErrors[key]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f7f8f5]">
      <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-emerald-700 text-white grid place-items-center"><Leaf size={18} /></span>
            <span><strong className="text-stone-900">인생내꽃</strong><span className="text-stone-400 ml-2 text-sm">판매자 입점</span></span>
          </Link>
          <Link href="/login" className="text-xs sm:text-sm text-stone-500 hover:text-emerald-700">판매자 로그인</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <Link href="/signup" className="text-xs text-stone-400 hover:text-stone-600">← 회원 유형 다시 선택</Link>
        <div className="mt-5 mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-emerald-700 mb-2">FLOWER PARTNER ONBOARDING</p>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">꽃을 잘 아는 판매자님을 기다려요</h1>
            <p className="text-sm text-stone-500 mt-3">사업자와 판매처 정보를 등록하면 검토 후 인생내꽃의 고객과 연결해 드립니다.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-500 bg-white border border-stone-200 rounded-full px-4 py-2">
            <ShieldCheck size={16} className="text-emerald-600" /> 제출 정보는 입점 심사에만 사용돼요
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 mb-7 grid md:grid-cols-[1fr_auto] gap-4 items-center">
          <div className="flex gap-3">
            <FileCheck2 className="text-emerald-700 shrink-0 mt-0.5" size={20} />
            <div><p className="text-sm font-bold text-stone-800">입점 전에 준비해주세요</p><p className="text-xs text-stone-600 mt-1 leading-5">사업자등록증, 판매처 주소, 정산 계좌가 필요합니다. 꽃 판매 방식은 가입 후에도 자유롭게 바꿀 수 있어요.</p></div>
          </div>
          <div className="text-xs text-emerald-800 font-medium bg-white/80 rounded-lg px-3 py-2">예상 입력 시간 약 5분</div>
        </div>

        <form
          onSubmit={submit}
          noValidate
          className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-7 items-start"
        >
          <aside className="lg:sticky lg:top-6 bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3"><span className="text-sm font-bold text-stone-800">입점 정보</span><span className="text-xs text-emerald-700">{completedSteps}/5 완료</span></div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mb-5"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${completedSteps * 20}%` }} /></div>
            <nav className="space-y-1">
              <Step href="#account" ready={stepReady[0]} icon={<UserRound size={15} />} label="계정과 담당자" />
              <Step href="#business" ready={stepReady[1]} icon={<Building2 size={15} />} label="사업자 정보" />
              <Step href="#store" ready={stepReady[2]} icon={<Store size={15} />} label="판매처 정보" />
              <Step href="#settlement" ready={stepReady[3]} icon={<Landmark size={15} />} label="정산 정보" />
              <Step href="#services" ready={stepReady[4]} icon={<Leaf size={15} />} label="꽃 판매 서비스" />
            </nav>
            <div className="mt-5 pt-5 border-t border-stone-100 text-xs text-stone-400 leading-5">승인 전에는 상품이 노출되지 않으며, 반려 시 사유를 확인하고 다시 제출할 수 있어요.</div>
          </aside>

          <div className="space-y-5 min-w-0">
            <Section id="account" eyebrow="STEP 1" title="계정과 담당자" description="판매자센터 로그인과 입점 안내에 사용할 정보입니다.">
              <div className="grid sm:grid-cols-2 gap-4">
                {field("email", "로그인 이메일", "seller@example.com", "email")}
                {field("managerName", "입점 담당자명", "홍길동")}
                {field("password", "비밀번호", "8자 이상", "password")}
                {field("passwordConfirm", "비밀번호 확인", "비밀번호 재입력", "password")}
                {field("managerPhone", "담당자 휴대전화", "01012345678", "tel")}
              </div>
            </Section>

            <Section id="business" eyebrow="STEP 2" title="사업자 정보" description="사업자등록증과 동일하게 입력해주세요.">
              <div className="grid sm:grid-cols-2 gap-4">
                {field("businessNumber", "사업자등록번호", "숫자 10자리")}
                {field("legalBusinessName", "상호명(법적 사업자명)", "인생꽃집")}
                {field("representativeName", "대표자명", "홍길동")}
                {field("businessType", "업태", "도소매")}
                {field("businessCategory", "종목", "생화·화훼")}
                {field("mailOrderNumber", "통신판매업 신고번호", "선택 입력", "text", false)}
                <div className="sm:col-span-2 space-y-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
                  <Label htmlFor="businessLicense" className="text-xs font-medium text-stone-600">사업자등록증 *</Label>
                  <Input id="businessLicense" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => { setLicense(e.target.files?.[0] ?? null); setFieldErrors((current) => { const next = { ...current }; delete next.businessLicense; return next }) }} className={`h-11 bg-white file:text-stone-600 ${fieldErrors.businessLicense ? "border-red-400" : "border-stone-200"}`} />
                  <p className="text-[11px] text-stone-400">{license ? `${license.name} 선택됨` : "PDF, JPG, PNG, WEBP · 최대 10MB"}</p>
                  {fieldErrors.businessLicense && <p className="text-xs text-red-500">{fieldErrors.businessLicense}</p>}
                </div>
              </div>
            </Section>

            <Section id="store" eyebrow="STEP 3" title="판매처 정보" description="고객에게 보일 꽃 판매처의 이름과 위치를 알려주세요.">
              <div className="grid sm:grid-cols-2 gap-4">
                {field("marketName", "마켓명(고객 노출명)", "꽃길 플라워")}
                {field("publicPhone", "고객 문의 전화번호", "선택 입력", "tel", false)}
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs font-medium text-stone-600">판매처 형태 *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <SellerType value="FLOWER_SHOP" current={form.sellerType} onChange={(value) => set("sellerType", value)} label="동네 꽃집" detail="제작·픽업" />
                    <SellerType value="FARM" current={form.sellerType} onChange={(value) => set("sellerType", value)} label="화훼 농가" detail="산지 직송" />
                    <SellerType value="WHOLESALE" current={form.sellerType} onChange={(value) => set("sellerType", value)} label="도매 판매처" detail="대량 납품" />
                    <SellerType value="OTHER" current={form.sellerType} onChange={(value) => set("sellerType", value)} label="기타" detail="복합 운영" />
                  </div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium text-stone-600">우편번호 *</Label><div className="flex gap-2"><Input required readOnly value={form.postalCode} placeholder="주소 검색" className="h-11 bg-stone-50" /><Button type="button" variant="outline" onClick={openAddressSearch} className="h-11 whitespace-nowrap">도로명주소 검색</Button></div></div>
                {fieldErrors.postalCode && <p id="postalCode" tabIndex={-1} className="text-xs text-red-500 sm:col-span-2">{fieldErrors.postalCode}</p>}
                <div className="sm:col-span-2 space-y-1.5"><Label className="text-xs font-medium text-stone-600">도로명주소 *</Label><Input required readOnly value={form.roadAddress} placeholder="주소 검색 버튼을 눌러주세요" className="h-11 bg-stone-50" /></div>
                <div className="sm:col-span-2">{field("detailAddress", "상세주소", "1층", "text", false)}</div>
                <div className="sm:col-span-2">{field("introduction", "판매처 소개", "주력 꽃과 제작 스타일을 간단히 소개해주세요.", "text", false)}</div>
              </div>
            </Section>

            <Section id="settlement" eyebrow="STEP 4" title="정산 정보" description="판매 대금을 정산받을 사업자 명의 계좌를 입력해주세요.">
              <div className="grid sm:grid-cols-3 gap-4">
                {field("settlementBank", "은행", "국민은행")}
                {field("settlementAccount", "계좌번호", "숫자만 입력")}
                {field("settlementHolder", "예금주", "홍길동")}
              </div>
            </Section>

            <Section id="services" eyebrow="STEP 5" title="어떤 꽃을 판매하시나요?" description="입점 후 판매자센터에서 언제든 변경할 수 있습니다.">
              <div className="grid md:grid-cols-3 gap-3">
                <Check checked={form.sellsFinishedProducts} onChange={(v) => set("sellsFinishedProducts", v)} title="완제품 꽃 상품" description="꽃다발·화분·선물세트를 바로 판매해요." badge="상품 등록" />
                <Check checked={form.offersCustomBouquet} onChange={(v) => set("offersCustomBouquet", v)} title="맞춤 꽃다발 제작" description="고객이 고른 꽃을 조합해 제작·배송해요." badge="제작 주문" />
                <Check checked={form.offersDiyFlowers} onChange={(v) => set("offersDiyFlowers", v)} title="개별 꽃·소재 판매" description="송이 단위 재고와 가격을 고객에게 보여줘요." badge="DIY·재료" />
              </div>
              {fieldErrors.services && <p id="services" tabIndex={-1} className="mt-3 text-xs text-red-500">{fieldErrors.services}</p>}
            </Section>

            <label id="termsAgreed" className={`flex items-start gap-3 bg-white border rounded-2xl p-5 cursor-pointer ${fieldErrors.termsAgreed ? "border-red-400" : "border-stone-200"}`}>
              <input type="checkbox" checked={form.termsAgreed} onChange={(e) => set("termsAgreed", e.target.checked)} className="mt-1 accent-emerald-700" />
              <span><span className="block text-sm font-semibold text-stone-700">판매자 이용약관과 정보 처리에 동의합니다. <strong className="text-emerald-700">(필수)</strong></span><span className="block text-xs text-stone-400 mt-1">개인정보 수집, 사업자 심사, 정산 정보 처리 내용을 포함합니다.</span></span>
            </label>
            {fieldErrors.termsAgreed && <p className="-mt-3 text-xs text-red-500">{fieldErrors.termsAgreed}</p>}
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div className="sticky bottom-0 z-10 bg-[#f7f8f5]/95 backdrop-blur border-t border-stone-200 -mx-2 px-2 py-4 flex items-center justify-between gap-4">
              <p className="hidden sm:block text-xs text-stone-500">필수 정보를 확인한 후 심사를 신청해주세요.</p>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto sm:min-w-56 h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl">
                {loading ? "신청서를 제출하는 중..." : "판매자 가입 및 심사 신청"}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

function Section({ id, eyebrow, title, description, children }: { id: string; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6 bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"><div className="mb-6"><p className="text-[11px] font-bold tracking-wider text-emerald-700">{eyebrow}</p><h2 className="text-lg font-bold text-stone-900 mt-1">{title}</h2><p className="text-xs text-stone-400 mt-1">{description}</p></div>{children}</section>
}

function Check({ checked, onChange, title, description, badge }: { checked: boolean; onChange: (value: boolean) => void; title: string; description: string; badge: string }) {
  return <label className={`relative flex min-h-36 flex-col cursor-pointer rounded-xl border p-4 transition-all ${checked ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500" : "border-stone-200 bg-white hover:border-stone-300"}`}><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-1">{badge}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-emerald-700" /></div><span className="block text-sm font-bold text-stone-800 mt-4">{title}</span><span className="text-xs text-stone-500 mt-1 leading-5">{description}</span></label>
}

function Step({ href, ready, icon, label }: { href: string; ready: boolean; icon: React.ReactNode; label: string }) {
  return <a href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${ready ? "text-emerald-700 bg-emerald-50" : "text-stone-500 hover:bg-stone-50"}`}>{ready ? <CheckCircle2 size={16} /> : <Circle size={16} className="text-stone-300" />}<span className="text-stone-400">{icon}</span><span>{label}</span></a>
}

function SellerType({ value, current, onChange, label, detail }: { value: string; current: string; onChange: (value: string) => void; label: string; detail: string }) {
  const active = value === current
  return <button type="button" onClick={() => onChange(value)} className={`rounded-xl border p-3 text-left transition-all ${active ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" : "border-stone-200 bg-white hover:border-stone-300"}`}><span className="block text-sm font-semibold text-stone-800">{label}</span><span className="block text-[11px] text-stone-400 mt-1">{detail}</span></button>
}

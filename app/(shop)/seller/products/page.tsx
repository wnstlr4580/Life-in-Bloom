"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, Box, CalendarDays, CheckCircle2, ChevronDown, Download, FileSpreadsheet, ImagePlus, PackagePlus, Search, SlidersHorizontal, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const CATEGORIES = [
  ["bouquet", "꽃다발"], ["flower-box", "플라워 박스"], ["plant", "화분"],
  ["wreath", "화환"], ["gift-set", "꽃 선물세트"], ["dried", "드라이플라워"],
] as const
const USES = ["생일", "기념일", "축하", "개업", "결혼", "프로포즈", "감사", "추모"]
const SEASONS = [["spring", "봄"], ["summer", "여름"], ["autumn", "가을"], ["winter", "겨울"], ["all", "사계절"]] as const
const COLORS = ["화이트", "핑크", "레드", "옐로", "퍼플", "블루", "그린", "파스텔", "믹스"]

type Product = {
  id: string; name: string; description: string; price: number; stock: number
  composition: string | null; sizeGuide: string | null; substitutionNotice: string | null; originInfo: string | null
  deliveryArea: string | null; sameDayCutoff: string | null; orderNotice: string | null; careInstructions: string | null
  category: string; images: string[]; detailImages: string[]; noticeImages: string[]; flowerMeaning: string | null
  ohaengTags: string[]; seasonTags: string[]; colorTags: string[]
  useTags: string[]; deliveryDays: string[]; deliveryStartTime: string | null; deliveryEndTime: string | null
  displayStartAt: string | null; displayEndAt: string | null; saleStatus: "ON_SALE" | "SOLD_OUT" | "PAUSED" | "HIDDEN"; isActive: boolean; createdAt: string
  sellerPromoted: boolean; sellerPriority: number
}

const emptyForm = {
  name: "", description: "", price: "", stock: "10", category: "bouquet",
  composition: "", sizeGuide: "", substitutionNotice: "", originInfo: "", deliveryArea: "", sameDayCutoff: "",
  orderNotice: "", careInstructions: "",
  seasonTags: ["all"] as string[], colorTags: [] as string[], useTags: [] as string[],
  deliveryDays: ["월", "화", "수", "목", "금"] as string[], deliveryStartTime: "09:00", deliveryEndTime: "18:00",
  displayStartAt: "", displayEndAt: "",
  sellerPromoted: false, sellerPriority: "0",
}

export default function SellerProductsPage() {
  const { data: session, status } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [mode, setMode] = useState<"list" | "create" | "bulk">("list")
  const [query, setQuery] = useState("")
  const [form, setForm] = useState(emptyForm)
  const [files, setFiles] = useState<File[]>([])
  const [detailFiles, setDetailFiles] = useState<File[]>([])
  const [noticeFiles, setNoticeFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [suggestedNames, setSuggestedNames] = useState<string[]>([])

  const load = useCallback(async () => {
    const response = await fetch("/api/seller/products")
    if (response.status === 403) { setForbidden(true); setLoading(false); return }
    const data = await response.json()
    setProducts(data.products ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { if (session?.user) load(); else if (status !== "loading") setLoading(false) }, [load, session, status])
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "bulk") setMode("bulk") }, [])

  const filtered = useMemo(() => products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase())), [products, query])
  const toggleTag = (key: "seasonTags" | "colorTags" | "useTags" | "deliveryDays", value: string) =>
    setForm((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((tag) => tag !== value) : [...current[key], value] }))

  const createProduct = async () => {
    setError(""); setMessage("")
    const requiredTexts = [form.name, form.description, form.composition, form.sizeGuide, form.substitutionNotice, form.originInfo, form.deliveryArea, form.sameDayCutoff, form.orderNotice, form.careInstructions]
    if (requiredTexts.some((value) => !value.trim()) || !form.price || files.length < 3 || detailFiles.length < 1) {
      setError("필수 상품·구성·크기·원산지·배송·주문 안내와 갤러리 사진 3장 이상, 상세 이미지 1장 이상을 입력해주세요."); return
    }
    setSaving(true)
    const body = new FormData()
    Object.entries(form).forEach(([key, value]) => body.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value)))
    files.forEach((file) => body.append("images", file))
    detailFiles.forEach((file) => body.append("detailImages", file))
    noticeFiles.forEach((file) => body.append("noticeImages", file))
    const response = await fetch("/api/seller/products", { method: "POST", body })
    const data = await response.json()
    if (response.ok) {
      setForm(emptyForm); setFiles([]); setDetailFiles([]); setNoticeFiles([]); setMessage("상품이 등록됐습니다."); setMode("list"); await load()
    } else setError(data.error ?? "상품 등록에 실패했어요")
    setSaving(false)
  }

  const suggestNames = async () => {
    const response = await fetch("/api/seller/products/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const data = await response.json()
    if (response.ok) setSuggestedNames(data.names ?? [])
  }

  const updateProduct = async (id: string, update: Partial<Product>) => {
    const response = await fetch("/api/seller/products", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...update }),
    })
    const data = await response.json()
    if (response.ok) setProducts((current) => current.map((product) => product.id === id ? { ...product, ...data } : product))
    else alert(data.error ?? "상품 수정에 실패했어요")
  }

  if (status === "loading" || loading) return <div className="py-32 text-center text-stone-400">상품 정보를 불러오는 중...</div>
  if (!session?.user) return <Notice text="판매자 로그인이 필요해요" />
  if (forbidden) return <Notice text="승인된 판매자만 상품을 관리할 수 있어요" />

  return (
    <div className="min-h-[70vh] bg-[#f7f8f5]">
      <div className="max-w-7xl mx-auto px-6 py-9">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div><Link href="/seller" className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-emerald-700"><ArrowLeft size={13} /> 판매자센터</Link><p className="text-sm font-semibold text-emerald-700 mt-4">완제품 상품 관리</p><h1 className="text-2xl font-bold text-stone-900 mt-1">{mode === "create" ? "새 꽃 상품 등록" : "상품 조회·수정"}</h1></div>
          <div className="flex gap-2">
            <Button type="button" variant={mode === "list" ? "default" : "outline"} onClick={() => setMode("list")} className={mode === "list" ? "bg-emerald-700 text-white" : "border-stone-200"}>상품 목록</Button>
            <Button type="button" onClick={() => setMode("create")} className="bg-emerald-700 hover:bg-emerald-800 text-white"><PackagePlus size={16} /> 상품 등록</Button>
            <Button type="button" variant="outline" onClick={() => setMode("bulk")} className="border-emerald-200 text-emerald-700"><FileSpreadsheet size={16} /> 엑셀 등록</Button>
          </div>
        </div>

        {message && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} className="inline mr-2" />{message}</div>}
        {mode === "list" ? (
          <ProductList products={filtered} allProducts={products} query={query} setQuery={setQuery} updateProduct={updateProduct} reload={load} />
        ) : mode === "bulk" ? <BulkRegistration onDone={async (count) => { setMessage(`${count}개 상품이 등록됐습니다.`); setMode("list"); await load() }} /> : (
          <div className="grid xl:grid-cols-[1fr_300px] gap-6 items-start">
            <div className="space-y-5">
              <Section number="01" title="노출 상품명과 카테고리" description="고객이 검색 결과에서 가장 먼저 보는 정보입니다.">
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="상품명 *" className="sm:col-span-2"><div className="flex gap-2"><Input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 계절 장미를 담은 핑크 꽃다발" className="h-11 border-stone-200" /><Button type="button" variant="outline" onClick={suggestNames} className="h-11 shrink-0">이름 추천</Button></div>{suggestedNames.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{suggestedNames.map((name) => <button type="button" key={name} onClick={() => setForm({ ...form, name })} className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100">{name}</button>)}</div>}</Field>
                  <Field label="카테고리 *"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm">{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                </div>
              </Section>
              <Section number="02" title="판매 가격과 재고" description="실제로 판매 가능한 수량만 입력해주세요.">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="판매가(원) *"><Input type="number" min={100} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="45000" className="h-11 border-stone-200" /></Field>
                  <Field label="판매 가능 수량 *"><Input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="h-11 border-stone-200" /></Field>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><input type="checkbox" checked={form.sellerPromoted} onChange={(e) => setForm({ ...form, sellerPromoted: e.target.checked })} className="accent-emerald-700"/>내 상품 중 우선노출</label><Field label="판매자 직접 우선순위 (0~100)"><Input type="number" min={0} max={100} value={form.sellerPriority} onChange={(e) => setForm({ ...form, sellerPriority: e.target.value })}/></Field></div>
              </Section>
              <Section number="03" title="대표·갤러리 이미지" description="첫 사진은 대표 이미지입니다. 정면, 측면·포장, 크기 비교 사진을 포함해 3~5장 등록해주세요.">
                <label className="min-h-36 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400">
                  <ImagePlus className="text-emerald-600" /><span className="text-sm font-semibold text-stone-700 mt-2">상품 사진 선택</span><span className="text-xs text-stone-400 mt-1">JPG · PNG · WEBP</span>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} />
                </label>
                {files.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">{files.map((file, index) => <div key={`${file.name}-${index}`} className="aspect-square rounded-lg overflow-hidden bg-stone-100 relative"><img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />{index === 0 && <span className="absolute left-1.5 top-1.5 text-[10px] bg-emerald-700 text-white rounded px-1.5 py-0.5">대표</span>}</div>)}</div>}
              </Section>
              <Section number="04" title="꽃 상품 상세 정보" description="꽃의 구성과 관리 방법, 제작 특성을 구체적으로 적어주세요.">
                <Field label="상세 설명 *"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={7} placeholder={"사용 꽃과 소재, 대략적인 크기, 포장 방식, 생화 특성상 사진과 달라질 수 있는 점, 관리 방법을 적어주세요."} className="w-full rounded-lg border border-stone-200 p-3 text-sm resize-y" /><WritingHelp field="description" category={form.category} onApply={(value) => setForm({ ...form, description: value })} /></Field>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="주요 꽃·소재 구성 *"><textarea value={form.composition} onChange={(e) => setForm({ ...form, composition: e.target.value })} rows={3} placeholder="예: 핑크 장미 10송이, 리시안셔스, 유칼립투스, 포장지" className="w-full rounded-lg border p-3 text-sm" /><WritingHelp field="composition" category={form.category} onApply={(value) => setForm({ ...form, composition: value })} /></Field>
                  <Field label="상품 크기 *"><textarea value={form.sizeGuide} onChange={(e) => setForm({ ...form, sizeGuide: e.target.value })} rows={3} placeholder="예: 가로 약 35cm × 높이 약 45cm (수작업 오차 ±5cm)" className="w-full rounded-lg border p-3 text-sm" /><WritingHelp field="sizeGuide" category={form.category} onApply={(value) => setForm({ ...form, sizeGuide: value })} /></Field>
                  <Field label="원산지 정보 *"><textarea value={form.originInfo} onChange={(e) => setForm({ ...form, originInfo: e.target.value })} rows={3} placeholder="예: 장미 국내산, 기타 소재 국내산·수입산 혼합" className="w-full rounded-lg border p-3 text-sm" /><WritingHelp field="originInfo" category={form.category} onApply={(value) => setForm({ ...form, originInfo: value })} /></Field>
                  <Field label="소재 변경 안내 *"><textarea value={form.substitutionNotice} onChange={(e) => setForm({ ...form, substitutionNotice: e.target.value })} rows={3} placeholder="계절과 수급에 따라 비슷한 색감·가격대 소재로 변경될 수 있습니다." className="w-full rounded-lg border p-3 text-sm" /><WritingHelp field="substitutionNotice" category={form.category} onApply={(value) => setForm({ ...form, substitutionNotice: value })} /></Field>
                  <Field label="꽃 관리 방법 *"><textarea value={form.careInstructions} onChange={(e) => setForm({ ...form, careInstructions: e.target.value })} rows={3} placeholder="포장을 풀고 줄기 끝을 사선으로 잘라 깨끗한 물에 꽂아주세요." className="w-full rounded-lg border p-3 text-sm" /><WritingHelp field="careInstructions" category={form.category} onApply={(value) => setForm({ ...form, careInstructions: value })} /></Field>
                  <Field label="주문 전 필수 안내 *"><textarea value={form.orderNotice} onChange={(e) => setForm({ ...form, orderNotice: e.target.value })} rows={3} placeholder="생화 특성, 취소 마감, 수령인 연락 필요 여부 등을 적어주세요." className="w-full rounded-lg border p-3 text-sm" /><WritingHelp field="orderNotice" category={form.category} onApply={(value) => setForm({ ...form, orderNotice: value })} /></Field>
                </div>
                <ImagePicker label="상품 상세 이미지 *" description="구성, 크기, 포장, 분위기를 설명하는 이미지를 1~20장 등록하세요." files={detailFiles} setFiles={(value) => setDetailFiles(value.slice(0, 20))} />
                <ImagePicker label="주문 전 공지 이미지" description="배송·교환·생화 유의사항 등을 최대 10장 등록하세요." files={noticeFiles} setFiles={(value) => setNoticeFiles(value.slice(0, 10))} />
                <p className="mt-4 rounded-xl bg-stone-50 p-4 text-xs text-stone-500">완제품은 여러 꽃과 소재가 조합되므로 꽃말을 별도로 입력하지 않습니다. 꽃말 추천은 개별 꽃 판매에서 꽃명 기준으로 제공됩니다.</p>
              </Section>
              <Section number="05" title="검색과 추천 정보" description="오행은 입력한 꽃·색상 정보를 바탕으로 인생내꽃이 자동 분류합니다.">
                <div className="space-y-5">
                  <Tags label="용도" options={USES.map((value) => [value, value] as const)} selected={form.useTags} toggle={(value) => toggleTag("useTags", value)} />
                  <Tags label="주요 색상" options={COLORS.map((value) => [value, value] as const)} selected={form.colorTags} toggle={(value) => toggleTag("colorTags", value)} />
                  <Tags label="추천 계절" options={SEASONS} selected={form.seasonTags} toggle={(value) => toggleTag("seasonTags", value)} />
                  <div className="rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800">오행 태그는 판매자가 선택하지 않습니다. 등록 후 내부 추천 알고리즘이 자동으로 부여합니다.</div>
                </div>
              </Section>
              <Section number="06" title="배송 가능 시간과 상품 노출 기간" description="구매자가 실제로 주문할 수 있는 범위만 설정해주세요.">
                <Tags label="배송 가능 요일" options={["월","화","수","목","금","토","일"].map((v) => [v,v] as const)} selected={form.deliveryDays} toggle={(v) => toggleTag("deliveryDays", v)} />
                <div className="grid sm:grid-cols-2 gap-4 mt-5">
                  <Field label="배송 가능 지역 *"><Input value={form.deliveryArea} onChange={(e) => setForm({ ...form, deliveryArea: e.target.value })} placeholder="예: 서울 전 지역, 경기 일부(상세페이지 참고)" /><WritingHelp field="deliveryArea" category={form.category} onApply={(value) => setForm({ ...form, deliveryArea: value })} /></Field>
                  <Field label="당일 배송 주문 마감 *"><Input value={form.sameDayCutoff} onChange={(e) => setForm({ ...form, sameDayCutoff: e.target.value })} placeholder="예: 평일 오전 11시 이전 결제 완료" /><WritingHelp field="sameDayCutoff" category={form.category} onApply={(value) => setForm({ ...form, sameDayCutoff: value })} /></Field>
                  <Field label="배송 시작 시간"><Input type="time" value={form.deliveryStartTime} onChange={(e) => setForm({ ...form, deliveryStartTime: e.target.value })} /></Field>
                  <Field label="배송 종료 시간"><Input type="time" value={form.deliveryEndTime} onChange={(e) => setForm({ ...form, deliveryEndTime: e.target.value })} /></Field>
                  <Field label="상품 노출 시작"><DateTimeInput value={form.displayStartAt} onChange={(value) => setForm({ ...form, displayStartAt: value })} /></Field>
                  <Field label="상품 노출 종료"><DateTimeInput value={form.displayEndAt} onChange={(value) => setForm({ ...form, displayEndAt: value })} /></Field>
                </div>
              </Section>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="sticky bottom-0 bg-[#f7f8f5]/95 border-t border-stone-200 py-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setMode("list")} className="border-stone-200">취소</Button>
                <Button type="button" disabled={saving} onClick={createProduct} className="min-w-36 bg-emerald-700 hover:bg-emerald-800 text-white"><Upload size={15} />{saving ? "등록 중..." : "상품 등록"}</Button>
              </div>
            </div>
            <aside className="xl:sticky xl:top-6 rounded-2xl border border-stone-200 bg-white p-5">
              <p className="text-sm font-bold text-stone-800">등록 전 확인</p>
              <ul className="mt-4 space-y-3 text-xs text-stone-500 leading-5">
                <li>• 대표 이미지는 정사각형에 가깝고 꽃이 선명한 사진을 권장해요.</li>
                <li>• 생화는 계절과 수급에 따라 일부 소재가 변경될 수 있음을 설명에 적어주세요.</li>
                <li>• 실제 제작 가능한 재고와 가격을 입력해주세요.</li>
                <li>• 개별 송이 재고는 ‘개별 꽃 재고’ 메뉴에서 따로 관리합니다.</li>
              </ul>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

function ProductList({ products, allProducts, query, setQuery, updateProduct, reload }: { products: Product[]; allProducts: Product[]; query: string; setQuery: (value: string) => void; updateProduct: (id: string, update: Partial<Product>) => Promise<void>; reload: () => Promise<void> }) {
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [color, setColor] = useState("")
  const [use, setUse] = useState("")
  const [season, setSeason] = useState("")
  const [ohaeng, setOhaeng] = useState("")
  const [minStock, setMinStock] = useState("")
  const [maxStock, setMaxStock] = useState("")
  const [displayFrom, setDisplayFrom] = useState("")
  const [displayTo, setDisplayTo] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const result = products.filter((product) => {
    if (category && product.category !== category) return false
    if (status === "active" && product.saleStatus !== "ON_SALE") return false
    if (status === "paused" && product.saleStatus !== "PAUSED") return false
    if (status === "hidden" && product.saleStatus !== "HIDDEN") return false
    if (status === "soldout" && product.stock !== 0) return false
    if (color && !product.colorTags.includes(color)) return false
    if (use && !product.useTags.includes(use)) return false
    if (season && !product.seasonTags.includes(season)) return false
    if (ohaeng && !product.ohaengTags.includes(ohaeng)) return false
    if (minStock && product.stock < Number(minStock)) return false
    if (maxStock && product.stock > Number(maxStock)) return false
    if (displayFrom && (!product.displayEndAt || product.displayEndAt < displayFrom)) return false
    if (displayTo && (!product.displayStartAt || product.displayStartAt > `${displayTo}T23:59`)) return false
    return true
  })
  return <div className="space-y-5">
    <div className="grid grid-cols-3 gap-3"><Stat label="전체 상품" value={allProducts.length} /><Stat label="판매 중" value={allProducts.filter((p) => p.saleStatus === "ON_SALE" && p.stock > 0).length} /><Stat label="품절" value={allProducts.filter((p) => p.stock === 0).length} /></div>
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center gap-3"><Search size={18} className="text-stone-400" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="상품명으로 검색" className="border-0 shadow-none focus-visible:ring-0" /></div>
      <div className="mt-4 border-t border-stone-100 pt-4"><button type="button" onClick={() => setFiltersOpen((open) => !open)} className="mb-3 flex w-full items-center gap-2 text-xs font-bold text-stone-600 sm:pointer-events-none"><SlidersHorizontal size={14} />상세 필터<ChevronDown size={14} className={`ml-auto sm:hidden transition-transform ${filtersOpen ? "rotate-180" : ""}`} /></button>
        <div className={`${filtersOpen ? "grid" : "hidden"} sm:grid grid-cols-2 md:grid-cols-4 gap-3`}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-lg border border-stone-200 px-3 text-xs"><option value="">전체 카테고리</option>{CATEGORIES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-stone-200 px-3 text-xs"><option value="">전체 상태</option><option value="active">판매 중</option><option value="paused">판매 중지</option><option value="hidden">숨김</option><option value="soldout">품절</option></select>
          <select value={color} onChange={(e) => setColor(e.target.value)} className="h-10 rounded-lg border border-stone-200 px-3 text-xs"><option value="">전체 색상</option>{COLORS.map((v) => <option key={v}>{v}</option>)}</select>
          <select value={use} onChange={(e) => setUse(e.target.value)} className="h-10 rounded-lg border border-stone-200 px-3 text-xs"><option value="">전체 용도</option>{USES.map((v) => <option key={v}>{v}</option>)}</select>
          <select value={season} onChange={(e) => setSeason(e.target.value)} className="h-10 rounded-lg border border-stone-200 px-3 text-xs"><option value="">전체 계절</option>{SEASONS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={ohaeng} onChange={(e) => setOhaeng(e.target.value)} className="h-10 rounded-lg border border-stone-200 px-3 text-xs"><option value="">전체 자동 오행</option>{["목","화","토","금","수"].map((v) => <option key={v}>{v}</option>)}</select>
          <Input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="최소 재고" className="h-10 text-xs" />
          <Input type="number" min={0} value={maxStock} onChange={(e) => setMaxStock(e.target.value)} placeholder="최대 재고" className="h-10 text-xs" />
          <Field label="노출 겹침 시작"><Input type="date" value={displayFrom} onChange={(e) => setDisplayFrom(e.target.value)} className="h-10 text-xs" /></Field>
          <Field label="노출 겹침 종료"><Input type="date" value={displayTo} onChange={(e) => setDisplayTo(e.target.value)} className="h-10 text-xs" /></Field>
        </div>
        <div className="mt-3 flex items-center justify-between"><p className="text-xs text-stone-400">조건에 맞는 상품 {result.length}개</p><button type="button" onClick={() => { setCategory(""); setStatus(""); setColor(""); setUse(""); setSeason(""); setOhaeng(""); setMinStock(""); setMaxStock(""); setDisplayFrom(""); setDisplayTo(""); setQuery("") }} className="text-xs text-emerald-700">필터 초기화</button></div>
      </div>
    </div>
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      {result.length === 0 ? <div className="py-24 text-center"><Box className="mx-auto text-stone-300" /><p className="text-sm text-stone-400 mt-3">조건에 맞는 상품이 없습니다.</p></div> :
      <div className="divide-y divide-stone-100">{result.map((product) => <div key={product.id}>
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <button type="button" onClick={() => setExpanded(expanded === product.id ? null : product.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0">{product.images[0] ? <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center">🌸</div>}</div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold text-stone-800 truncate">{product.name}</p><StatusBadge product={product} /></div><p className="text-sm font-bold text-stone-800 mt-2">{product.price.toLocaleString()}원</p><p className="text-xs text-stone-400 mt-1">{CATEGORIES.find(([value]) => value === product.category)?.[1]} · 재고 {product.stock}개</p></div><ChevronDown size={17} className={`text-stone-400 transition-transform ${expanded === product.id ? "rotate-180" : ""}`} />
          </button>
          <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><input type="checkbox" checked={product.sellerPromoted ?? false} onChange={(e) => updateProduct(product.id, { sellerPromoted: e.target.checked })} className="accent-emerald-700"/>우선노출</label><label className="flex items-center gap-1 text-[11px] text-stone-500">순위<Input type="number" min={0} max={100} defaultValue={product.sellerPriority ?? 0} aria-label="판매자 우선순위" onBlur={(e) => updateProduct(product.id, { sellerPriority: Number(e.target.value) })} className="w-16 h-9" /></label><label className="flex items-center gap-1 text-[11px] text-stone-500">재고<Input type="number" min={0} defaultValue={product.stock} aria-label="재고" onBlur={(e) => updateProduct(product.id, { stock: Number(e.target.value) })} className="w-20 h-9" /></label><select value={product.stock === 0 && product.saleStatus === "ON_SALE" ? "SOLD_OUT" : product.saleStatus ?? (product.isActive ? "ON_SALE" : "PAUSED")} onChange={(e) => updateProduct(product.id, { saleStatus: e.target.value as Product["saleStatus"] })} className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-xs"><option value="ON_SALE">판매 중</option><option value="SOLD_OUT" disabled>품절 (재고 0)</option><option value="PAUSED">판매 중지</option><option value="HIDDEN">숨김</option></select></div>
        </div>
        {expanded === product.id && <ProductDetail product={product} reload={reload} />}
      </div>)}</div>}
    </div>
  </div>
}

function ProductDetail({ product, reload }: { product: Product; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const tags = [...product.colorTags, ...product.useTags, ...product.seasonTags, ...product.ohaengTags]
  return <div className="border-t border-stone-100 bg-stone-50/70 p-5 sm:pl-28">
    <div className="mb-4 flex justify-end"><Button variant="outline" onClick={() => setEditing(true)} className="border-emerald-200 text-emerald-700">전체 정보 수정</Button></div>
    <div className="grid md:grid-cols-2 gap-5 text-xs">
      <div><p className="font-bold text-stone-700">상품 설명</p><p className="mt-2 whitespace-pre-wrap leading-6 text-stone-500">{product.description}</p></div>
      <div className="space-y-3">
        <div><p className="font-bold text-stone-700">검색·추천 태그</p><div className="mt-2 flex flex-wrap gap-1.5">{tags.length ? tags.map((tag, index) => <span key={`${tag}-${index}`} className="rounded-full bg-white border border-stone-200 px-2.5 py-1 text-stone-600">{tag}</span>) : <span className="text-stone-400">등록된 태그 없음</span>}</div></div>
        <p><strong className="text-stone-700">배송 가능:</strong> {product.deliveryDays?.join(", ") || "미설정"} {product.deliveryStartTime && `${product.deliveryStartTime}~${product.deliveryEndTime}`}</p>
        <p><strong className="text-stone-700">노출 기간:</strong> {formatDate(product.displayStartAt)} ~ {formatDate(product.displayEndAt)}</p>
        <p><strong className="text-stone-700">상품 ID:</strong> {product.id}</p>
      </div>
    </div>
    {product.images.length > 1 && <div className="mt-4 flex gap-2 overflow-x-auto">{product.images.map((image, index) => <img key={image} src={image} alt={`${product.name} ${index + 1}`} className="h-24 w-24 rounded-lg object-cover" />)}</div>}
    {editing && <ProductEditModal product={product} close={() => setEditing(false)} reload={reload} />}
  </div>
}

function ProductEditModal({ product, close, reload }: { product: Product; close: () => void; reload: () => Promise<void> }) {
  const [draft, setDraft] = useState({
    name: product.name, description: product.description, category: product.category,
    composition: product.composition ?? "", sizeGuide: product.sizeGuide ?? "", substitutionNotice: product.substitutionNotice ?? "",
    originInfo: product.originInfo ?? "", deliveryArea: product.deliveryArea ?? "", sameDayCutoff: product.sameDayCutoff ?? "",
    orderNotice: product.orderNotice ?? "", careInstructions: product.careInstructions ?? "",
    price: String(product.price), stock: String(product.stock), saleStatus: product.saleStatus,
    seasonTags: [...(product.seasonTags ?? [])], colorTags: [...(product.colorTags ?? [])], useTags: [...(product.useTags ?? [])],
    deliveryDays: [...(product.deliveryDays ?? [])], deliveryStartTime: product.deliveryStartTime ?? "",
    deliveryEndTime: product.deliveryEndTime ?? "", displayStartAt: localDate(product.displayStartAt), displayEndAt: localDate(product.displayEndAt),
  })
  const [existingImages, setExistingImages] = useState(product.images ?? [])
  const [existingDetail, setExistingDetail] = useState(product.detailImages ?? [])
  const [existingNotice, setExistingNotice] = useState(product.noticeImages ?? [])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newDetail, setNewDetail] = useState<File[]>([])
  const [newNotice, setNewNotice] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const toggle = (key: "seasonTags" | "colorTags" | "useTags" | "deliveryDays", value: string) =>
    setDraft((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((tag) => tag !== value) : [...current[key], value] }))
  const save = async () => {
    setSaving(true); setError("")
    if (!draft.name.trim() || !draft.description.trim() || existingImages.length + newImages.length < 1) {
      setError("상품명, 상세 설명, 대표 이미지는 필수입니다."); setSaving(false); return
    }
    const patchResponse = await fetch("/api/seller/products", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id, ...draft, price: Number(draft.price), stock: Number(draft.stock) }),
    })
    const patchData = await patchResponse.json()
    if (!patchResponse.ok) { setError(patchData.error ?? "상품 정보를 저장하지 못했어요"); setSaving(false); return }
    const body = new FormData()
    body.append("id", product.id)
    body.append("existingImages", JSON.stringify(existingImages))
    body.append("existingDetailImages", JSON.stringify(existingDetail))
    body.append("existingNoticeImages", JSON.stringify(existingNotice))
    newImages.forEach((file) => body.append("images", file))
    newDetail.forEach((file) => body.append("detailImages", file))
    newNotice.forEach((file) => body.append("noticeImages", file))
    const imageResponse = await fetch("/api/seller/products", { method: "PUT", body })
    const imageData = await imageResponse.json()
    if (!imageResponse.ok) { setError(imageData.error ?? "상품 이미지를 저장하지 못했어요"); setSaving(false); return }
    await reload()
    setSaving(false); close()
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
    <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[#f7f8f5] p-6 shadow-2xl">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-emerald-700">완제품 수정</p><h2 className="mt-1 text-xl font-bold">{product.name}</h2></div><button onClick={close} className="text-2xl text-stone-500">×</button></div>
      <div className="mt-5 space-y-5">
        <section className="rounded-xl border bg-white p-5"><div className="grid gap-4 sm:grid-cols-2">
          <Field label="상품명 *"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="카테고리"><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">{CATEGORIES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="판매가"><Input type="number" min={100} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></Field>
          <Field label="재고"><Input type="number" min={0} value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} /></Field>
          <Field label="판매 상태"><select value={Number(draft.stock) === 0 && draft.saleStatus === "ON_SALE" ? "SOLD_OUT" : draft.saleStatus} onChange={(e) => setDraft({ ...draft, saleStatus: e.target.value as Product["saleStatus"] })} className="h-10 w-full rounded-md border px-3 text-sm"><option value="ON_SALE">판매 중</option><option value="SOLD_OUT" disabled>품절 (재고 0)</option><option value="PAUSED">판매 중지</option><option value="HIDDEN">숨김</option></select></Field>
          <Field label="배송 시간"><div className="grid grid-cols-2 gap-2"><Input type="time" value={draft.deliveryStartTime} onChange={(e) => setDraft({ ...draft, deliveryStartTime: e.target.value })} /><Input type="time" value={draft.deliveryEndTime} onChange={(e) => setDraft({ ...draft, deliveryEndTime: e.target.value })} /></div></Field>
          <Field label="노출 시작"><Input type="datetime-local" value={draft.displayStartAt} onChange={(e) => setDraft({ ...draft, displayStartAt: e.target.value })} /></Field>
          <Field label="노출 종료"><Input type="datetime-local" value={draft.displayEndAt} onChange={(e) => setDraft({ ...draft, displayEndAt: e.target.value })} /></Field>
          <Field label="상세 설명 *" className="sm:col-span-2"><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={7} className="w-full rounded-md border p-3 text-sm" /></Field>
          <Field label="주요 꽃·소재 구성 *"><textarea value={draft.composition} onChange={(e) => setDraft({ ...draft, composition: e.target.value })} rows={3} className="w-full rounded-md border p-3 text-sm" /></Field>
          <Field label="상품 크기 *"><textarea value={draft.sizeGuide} onChange={(e) => setDraft({ ...draft, sizeGuide: e.target.value })} rows={3} className="w-full rounded-md border p-3 text-sm" /></Field>
          <Field label="원산지 정보 *"><textarea value={draft.originInfo} onChange={(e) => setDraft({ ...draft, originInfo: e.target.value })} rows={3} className="w-full rounded-md border p-3 text-sm" /></Field>
          <Field label="소재 변경 안내 *"><textarea value={draft.substitutionNotice} onChange={(e) => setDraft({ ...draft, substitutionNotice: e.target.value })} rows={3} className="w-full rounded-md border p-3 text-sm" /></Field>
          <Field label="배송 가능 지역 *"><Input value={draft.deliveryArea} onChange={(e) => setDraft({ ...draft, deliveryArea: e.target.value })} /></Field>
          <Field label="당일 배송 주문 마감 *"><Input value={draft.sameDayCutoff} onChange={(e) => setDraft({ ...draft, sameDayCutoff: e.target.value })} /></Field>
          <Field label="꽃 관리 방법 *"><textarea value={draft.careInstructions} onChange={(e) => setDraft({ ...draft, careInstructions: e.target.value })} rows={3} className="w-full rounded-md border p-3 text-sm" /></Field>
          <Field label="주문 전 필수 안내 *"><textarea value={draft.orderNotice} onChange={(e) => setDraft({ ...draft, orderNotice: e.target.value })} rows={3} className="w-full rounded-md border p-3 text-sm" /></Field>
        </div></section>
        <section className="rounded-xl border bg-white p-5 space-y-4">
          <Tags label="배송 가능 요일" options={["월","화","수","목","금","토","일"].map((v) => [v,v] as const)} selected={draft.deliveryDays} toggle={(v) => toggle("deliveryDays", v)} />
          <Tags label="용도" options={USES.map((v) => [v,v] as const)} selected={draft.useTags} toggle={(v) => toggle("useTags", v)} />
          <Tags label="주요 색상" options={COLORS.map((v) => [v,v] as const)} selected={draft.colorTags} toggle={(v) => toggle("colorTags", v)} />
          <Tags label="계절" options={SEASONS} selected={draft.seasonTags} toggle={(v) => toggle("seasonTags", v)} />
        </section>
        <ExistingImageEditor label="대표·갤러리 이미지 (첫 장이 대표)" images={existingImages} setImages={setExistingImages} newFiles={newImages} setNewFiles={(v) => setNewImages(v.slice(0, Math.max(0, 5 - existingImages.length)))} max={5} />
        <ExistingImageEditor label="상품 상세 이미지" images={existingDetail} setImages={setExistingDetail} newFiles={newDetail} setNewFiles={(v) => setNewDetail(v.slice(0, Math.max(0, 20 - existingDetail.length)))} max={20} />
        <ExistingImageEditor label="주문 전 공지 이미지" images={existingNotice} setImages={setExistingNotice} newFiles={newNotice} setNewFiles={(v) => setNewNotice(v.slice(0, Math.max(0, 10 - existingNotice.length)))} max={10} />
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t bg-[#f7f8f5]/95 py-4"><Button variant="outline" onClick={close}>취소</Button><Button onClick={save} disabled={saving} className="bg-emerald-700 text-white">{saving ? "저장 중..." : "수정 내용 저장"}</Button></div>
    </div>
  </div>
}

function ExistingImageEditor({ label, images, setImages, newFiles, setNewFiles, max }: { label: string; images: string[]; setImages: (value: string[]) => void; newFiles: File[]; setNewFiles: (value: File[]) => void; max: number }) {
  return <section className="rounded-xl border bg-white p-5"><p className="text-sm font-bold">{label}</p><p className="mt-1 text-xs text-stone-400">삭제 후 새 이미지를 추가할 수 있습니다. 최대 {max}장</p>
    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">{images.map((image, index) => <div key={image} className="relative aspect-square overflow-hidden rounded-lg bg-stone-100"><img src={image} alt="" className="h-full w-full object-cover" /><button type="button" onClick={() => setImages(images.filter((_, i) => i !== index))} className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-xs text-white">×</button></div>)}{newFiles.map((file, index) => <div key={`${file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-lg bg-stone-100"><img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" /><button type="button" onClick={() => setNewFiles(newFiles.filter((_, i) => i !== index))} className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-xs text-white">×</button></div>)}</div>
    <label className="mt-3 flex cursor-pointer justify-center rounded-lg border border-dashed p-3 text-xs text-stone-500">이미지 추가<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setNewFiles([...newFiles, ...Array.from(e.target.files ?? [])].slice(0, Math.max(0, max - images.length)))} /></label>
  </section>
}

const localDate = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : ""
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString("ko-KR") : "제한 없음"
function StatusBadge({ product }: { product: Product }) {
  if (product.stock === 0) return <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] text-red-600">품절</span>
  const config = { ON_SALE: ["판매 중", "bg-emerald-50 text-emerald-700"], SOLD_OUT: ["품절", "bg-red-50 text-red-600"], PAUSED: ["판매 중지", "bg-amber-50 text-amber-700"], HIDDEN: ["숨김", "bg-stone-100 text-stone-500"] }[product.saleStatus ?? "ON_SALE"]
  return <span className={`rounded-full px-2 py-1 text-[10px] ${config[1]}`}>{config[0]}</span>
}

function BulkRegistration({ onDone }: { onDone: (count: number) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([])
  const [error, setError] = useState("")
  const upload = async () => {
    if (!file) return setError("작성한 엑셀 파일을 선택해주세요.")
    setSaving(true); setError(""); setErrors([])
    const body = new FormData(); body.append("file", file)
    const response = await fetch("/api/seller/products/bulk", { method: "POST", body })
    const data = await response.json()
    if (response.ok) onDone(data.count)
    else { setError(data.error ?? "엑셀 등록에 실패했어요"); setErrors(data.errors ?? []) }
    setSaving(false)
  }
  return <div className="space-y-5">
    <section className="rounded-2xl border border-stone-200 bg-white p-7">
      <p className="text-xs font-bold text-emerald-700">STEP 1</p><h2 className="text-xl font-bold mt-1">상품등록 양식 다운로드</h2>
      <p className="text-sm text-stone-500 mt-2">예시 행과 작성안내를 확인한 뒤 최대 500개 상품을 입력하세요. 오행은 자동 분류됩니다.</p>
      <a href="/templates/life-in-bloom-product-template.xlsx" download className="inline-flex items-center gap-2 mt-5 rounded-lg border border-emerald-600 px-4 py-2.5 text-sm font-semibold text-emerald-700"><Download size={16} /> 엑셀 양식 다운로드</a>
    </section>
    <section className="rounded-2xl border border-stone-200 bg-white p-7">
      <p className="text-xs font-bold text-emerald-700">STEP 2</p><h2 className="text-xl font-bold mt-1">작성한 엑셀 업로드</h2>
      <label className="mt-5 min-h-44 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400">
        <FileSpreadsheet size={30} className="text-emerald-600" /><span className="mt-2 text-sm font-semibold">{file?.name ?? "XLSX 파일 선택"}</span>
        <span className="text-xs text-stone-400 mt-1">5MB 이하 · 최대 500행</span>
        <input type="file" accept=".xlsx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {errors.length > 0 && <div className="mt-3 rounded-xl bg-red-50 p-4 text-xs text-red-700 space-y-1">{errors.slice(0, 30).map((item) => <p key={`${item.row}-${item.message}`}>{item.row}행: {item.message}</p>)}</div>}
      <Button type="button" disabled={saving || !file} onClick={upload} className="mt-5 bg-emerald-700 text-white"><Upload size={16} /> {saving ? "검증·등록 중..." : "엑셀 상품 등록"}</Button>
    </section>
  </div>
}

function DateTimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value ? value.replace(/\D/g, "").slice(0, 12) : "")
  useEffect(() => { if (value.includes("T")) setText(value.replace(/\D/g, "").slice(0, 12)) }, [value])
  const commit = () => {
    const d = text
    if (d.length === 8) onChange(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T00:00`)
    else if (d.length === 12) onChange(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${d.slice(8,10)}:${d.slice(10,12)}`)
    else if (d.length === 0) onChange("")
  }
  return <div className="grid grid-cols-[1fr_48px] gap-2">
    <Input inputMode="numeric" value={text} onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 12))} onBlur={commit} placeholder="20260718 또는 202607180900" maxLength={12} className="font-mono" />
    <label className="relative grid h-10 place-items-center rounded-md border border-stone-200 bg-white text-stone-500 hover:border-emerald-400 cursor-pointer" title="달력에서 선택">
      <CalendarDays size={17} /><input type="datetime-local" value={value.includes("T") ? value : ""} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
    </label>
    <p className="col-span-2 text-[11px] text-stone-400">숫자 8자리(날짜) 또는 12자리(날짜+시간) 연속 입력 가능</p>
  </div>
}

function Section({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-stone-200 bg-white p-6"><p className="text-[11px] font-bold text-emerald-700">STEP {number}</p><h2 className="text-lg font-bold text-stone-900 mt-1">{title}</h2><p className="text-xs text-stone-400 mt-1 mb-6">{description}</p>{children}</section> }
function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={`space-y-1.5 ${className}`}><Label className="text-xs text-stone-600">{label}</Label>{children}</div> }
function Tags({ label, options, selected, toggle }: { label: string; options: readonly (readonly [string, string])[]; selected: string[]; toggle: (value: string) => void }) { return <div><p className="text-xs font-medium text-stone-600 mb-2">{label}</p><div className="flex flex-wrap gap-2">{options.map(([value, text]) => <button type="button" key={value} onClick={() => toggle(value)} className={`rounded-full border px-3 py-1.5 text-xs ${selected.includes(value) ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold" : "border-stone-200 text-stone-500"}`}>{text}</button>)}</div></div> }
function ImagePicker({ label, description, files, setFiles }: { label: string; description: string; files: File[]; setFiles: (value: File[]) => void }) { return <div className="mt-5"><p className="text-xs font-medium text-stone-600">{label}</p><p className="mt-1 text-[11px] text-stone-400">{description}</p><label className="mt-2 flex cursor-pointer justify-center rounded-lg border border-dashed p-3 text-xs text-stone-500">이미지 여러 장 선택<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></label>{files.length > 0 && <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">{files.map((file, index) => <div key={`${file.name}-${index}`} className="aspect-square overflow-hidden rounded-lg bg-stone-100"><img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" /></div>)}</div>}</div> }
function WritingHelp({ field, category, onApply }: { field: string; category: string; onApply: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [examples, setExamples] = useState<{ id: string; title: string; content: string }[]>([])
  const show = async () => {
    setOpen(true)
    if (examples.length) return
    setLoading(true)
    const response = await fetch(`/api/seller/product-examples?field=${encodeURIComponent(field)}&category=${encodeURIComponent(category)}`)
    const data = await response.json()
    if (response.ok) setExamples(data.examples ?? [])
    setLoading(false)
  }
  return <><button type="button" onClick={show} className="mt-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">작성 도움말 · 예문 보기</button>
    {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"><div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-emerald-700">판매자 작성 도움말</p><h3 className="mt-1 text-lg font-bold">마음에 드는 예문을 참고하거나 바로 적용하세요</h3></div><button onClick={() => setOpen(false)} className="text-2xl text-stone-400">×</button></div>
      <p className="mt-2 text-xs text-stone-500">예문을 그대로 사용한 뒤 실제 상품에 맞는 꽃명, 수량, 지역과 시간을 반드시 수정해주세요.</p>
      <div className="mt-5 space-y-3">{loading ? <p className="py-10 text-center text-sm text-stone-400">예문을 불러오는 중...</p> : examples.map((example) => <article key={example.id} className="rounded-xl border border-stone-200 p-4"><p className="text-sm font-bold text-stone-800">{example.title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">{example.content}</p><div className="mt-3 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(example.content)} className="h-8 text-xs">복사</Button><Button type="button" onClick={() => { onApply(example.content); setOpen(false) }} className="h-8 bg-emerald-700 text-xs text-white">이 예문 적용</Button></div></article>)}</div>
    </div></div>}
  </>
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-xs text-stone-400">{label}</p><p className="text-2xl font-bold text-stone-800 mt-2">{value}</p></div> }
function Notice({ text }: { text: string }) { return <div className="py-32 text-center text-stone-500">{text}</div> }

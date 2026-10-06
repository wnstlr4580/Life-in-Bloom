"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Eye, EyeOff, FileSpreadsheet, Flower2, ImageIcon, PackagePlus, Search, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Stock = {
  id: string; flowerName: string; flowerMeaning: string | null; color: string | null; grade: string | null
  unit: string; quantity: number; unitPrice: number; imageUrl: string | null; isActive: boolean; isVisible: boolean; barcode: string | null
  availableForCustom: boolean; availableForDiy: boolean; displayStartAt: string | null; displayEndAt: string | null
}
type Suggestion = { name: string; meaning: string; color: string; ohaeng: string }
const empty = {
  flowerName: "", flowerMeaning: "", color: "", grade: "상", unit: "STEM", quantity: "0", unitPrice: "0", barcode: "",
  availableForCustom: true, availableForDiy: false, isVisible: true, displayStartAt: "", displayEndAt: "",
}
const UNIT: Record<string, string> = { STEM: "송이", BUNCH: "단", BOX: "박스" }

export default function SellerStocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [form, setForm] = useState(empty)
  const [image, setImage] = useState<File | null>(null)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Stock | null>(null)
  const [error, setError] = useState("")
  const [excelOpen, setExcelOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [excelResult, setExcelResult] = useState("")
  const [filters, setFilters] = useState({ q: "", color: "", grade: "", unit: "", usage: "", visible: "", min: "", max: "", date: "" })

  const load = useCallback(async () => {
    const response = await fetch("/api/seller/stocks")
    const data = await response.json()
    if (response.ok) { setStocks(data.stocks ?? []); setSuggestions(data.suggestions ?? []) } else setError(data.error)
  }, [])
  useEffect(() => { load() }, [load])

  const recommended = useMemo(() => suggestions.filter((s) => s.name.includes(form.flowerName.trim())).slice(0, 8), [form.flowerName, suggestions])
  const colors = useMemo(() => [...new Set(stocks.map((s) => s.color).filter(Boolean))] as string[], [stocks])
  const grades = useMemo(() => [...new Set(stocks.map((s) => s.grade).filter(Boolean))] as string[], [stocks])
  const filtered = useMemo(() => stocks.filter((s) => {
    const q = filters.q.toLowerCase()
    const at = filters.date ? new Date(`${filters.date}T23:59:59`) : null
    return (!q || [s.flowerName, s.color, s.grade, s.barcode].some((v) => v?.toLowerCase().includes(q))) &&
      (!filters.color || s.color === filters.color) && (!filters.grade || s.grade === filters.grade) &&
      (!filters.unit || s.unit === filters.unit) &&
      (!filters.usage || (filters.usage === "CUSTOM" ? s.availableForCustom : s.availableForDiy)) &&
      (!filters.visible || (filters.visible === "VISIBLE" ? s.isVisible : !s.isVisible)) &&
      (!filters.min || s.quantity >= Number(filters.min)) && (!filters.max || s.quantity <= Number(filters.max)) &&
      (!at || ((!s.displayStartAt || new Date(s.displayStartAt) <= at) && (!s.displayEndAt || new Date(s.displayEndAt) >= at)))
  }), [stocks, filters])

  const create = async () => {
    setError("")
    const body = new FormData()
    Object.entries(form).forEach(([key, value]) => body.append(key, String(value)))
    if (image) body.append("image", image)
    const response = await fetch("/api/seller/stocks", { method: "POST", body })
    const data = await response.json()
    if (response.ok) { setForm(empty); setImage(null); setOpen(false); await load() } else setError(data.error)
  }
  const update = async (id: string, patch: Partial<Stock>) => {
    const response = await fetch("/api/seller/stocks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) })
    const data = await response.json()
    if (response.ok) await load(); else setError(data.error)
  }
  const uploadExcel = async () => {
    if (!excelFile) { setError("업로드할 엑셀 파일을 선택해주세요"); return }
    setUploading(true); setError(""); setExcelResult("")
    const body = new FormData(); body.append("file", excelFile)
    const response = await fetch("/api/seller/stocks/bulk", { method: "POST", body })
    const data = await response.json()
    if (response.ok) { setExcelResult(`${data.inserted}건을 등록했습니다.`); setExcelFile(null); await load() }
    else setError(data.errors?.length ? `${data.error} ${data.errors.map((item: { row: number; message: string }) => `${item.row}행: ${item.message}`).join(" / ")}` : data.error)
    setUploading(false)
  }
  const replaceImage = async (id: string, file: File) => {
    const body = new FormData(); body.append("id", id); body.append("image", file)
    const response = await fetch("/api/seller/stocks", { method: "PUT", body })
    const data = await response.json()
    if (response.ok) await load(); else setError(data.error)
  }

  return <div className="max-w-6xl px-6 py-10">
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-semibold text-emerald-700">판매자센터</p><h1 className="mt-1 text-2xl font-bold">개별 꽃 재고</h1><p className="mt-2 text-sm text-stone-500">나만의 꽃다발 주문 제작과 고객 DIY에 노출할 꽃·소재를 관리합니다.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => setExcelOpen((v) => !v)}><FileSpreadsheet size={16} />엑셀 등록</Button><Button onClick={() => setOpen((v) => !v)} className="bg-emerald-700 text-white"><PackagePlus size={16} />개별 꽃 등록</Button></div>
    </div>

    {excelOpen && <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-bold">개별 꽃 엑셀 일괄 등록</h2><p className="mt-1 text-sm text-stone-500">기존 양식은 주문 제작·DIY·노출을 기본 활성화하여 등록합니다.</p></div><a href="/templates/life-in-bloom-flower-stock-template.xlsx" download className="inline-flex h-10 items-center gap-2 rounded-md border bg-white px-4 text-sm"><Download size={16} />양식 다운로드</a></div>
      <div className="mt-4 flex gap-3"><input type="file" accept=".xlsx" onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)} className="flex-1 text-sm" /><Button onClick={uploadExcel} disabled={uploading} className="bg-emerald-700 text-white"><Upload size={16} />{uploading ? "등록 중" : "검증 후 등록"}</Button></div>{excelResult && <p className="mt-3 text-sm text-emerald-700">{excelResult}</p>}
    </section>}

    {open && <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex justify-between"><div><h2 className="font-bold">꽃·소재 등록</h2><p className="mt-1 text-xs text-stone-400">대표사진은 고객 선택 화면에 사용됩니다.</p></div><button onClick={() => setOpen(false)}><X size={18} /></button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Field label="꽃명 *"><Input value={form.flowerName} onChange={(e) => setForm({ ...form, flowerName: e.target.value })} /></Field>
        <Field label="색상"><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
        <Field label="등급"><select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm"><option>특</option><option>상</option><option>보통</option></select></Field>
        <Field label="관리 단위"><select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm"><option value="STEM">송이</option><option value="BUNCH">단</option><option value="BOX">박스</option></select></Field>
        <Field label="재고 *"><Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
        <Field label="단가(원) *"><Input type="number" min={0} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></Field>
        <Field label="노출 시작"><Input type="datetime-local" value={form.displayStartAt} onChange={(e) => setForm({ ...form, displayStartAt: e.target.value })} /></Field>
        <Field label="노출 종료"><Input type="datetime-local" value={form.displayEndAt} onChange={(e) => setForm({ ...form, displayEndAt: e.target.value })} /></Field>
        <Field label="대표사진"><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] ?? null)} /></Field>
        <Field label="상품 바코드 (선택)"><Input inputMode="numeric" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="리더기로 스캔하거나 숫자 입력" /></Field>
        <Field label="꽃말" className="sm:col-span-3"><Input value={form.flowerMeaning} maxLength={200} onChange={(e) => setForm({ ...form, flowerMeaning: e.target.value })} placeholder="꽃명을 입력하면 자체 DB에서 추천합니다." /></Field>
      </div>
      {form.flowerName && recommended.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{recommended.map((item) => <button key={`${item.ohaeng}-${item.name}`} onClick={() => setForm({ ...form, flowerName: item.name, flowerMeaning: item.meaning })} className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-700">{item.name} · {item.meaning}</button>)}</div>}
      <div className="mt-5 grid gap-2 sm:grid-cols-3"><Check checked={form.availableForCustom} onChange={(v) => setForm({ ...form, availableForCustom: v })} label="주문 제작용" /><Check checked={form.availableForDiy} onChange={(v) => setForm({ ...form, availableForDiy: v })} label="고객 DIY용" /><Check checked={form.isVisible} onChange={(v) => setForm({ ...form, isVisible: v })} label="고객에게 노출" /></div>
      <div className="mt-5 flex justify-end"><Button onClick={create} className="bg-emerald-700 text-white">재고 등록</Button></div>
    </section>}

    {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2"><Search size={17} className="text-stone-400" /><Input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="꽃명, 색상, 등급, 바코드 검색" className="border-0 shadow-none" /></div>
      <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="mt-3 w-full rounded-lg border border-stone-200 py-2 text-xs font-semibold text-stone-600 sm:hidden">{filtersOpen ? "상세 필터 접기" : "상세 필터 펼치기"}</button>
      <div className={`mt-3 ${filtersOpen ? "grid" : "hidden"} gap-2 sm:grid sm:grid-cols-4 lg:grid-cols-8`}>
        <Select value={filters.color} onChange={(v) => setFilters({ ...filters, color: v })} label="모든 색상" values={colors} />
        <Select value={filters.grade} onChange={(v) => setFilters({ ...filters, grade: v })} label="모든 등급" values={grades} />
        <select value={filters.unit} onChange={(e) => setFilters({ ...filters, unit: e.target.value })} className="h-9 rounded-lg border px-2 text-xs"><option value="">모든 단위</option><option value="STEM">송이</option><option value="BUNCH">단</option><option value="BOX">박스</option></select>
        <select value={filters.usage} onChange={(e) => setFilters({ ...filters, usage: e.target.value })} className="h-9 rounded-lg border px-2 text-xs"><option value="">모든 사용처</option><option value="CUSTOM">주문 제작</option><option value="DIY">고객 DIY</option></select>
        <select value={filters.visible} onChange={(e) => setFilters({ ...filters, visible: e.target.value })} className="h-9 rounded-lg border px-2 text-xs"><option value="">모든 노출상태</option><option value="VISIBLE">노출</option><option value="HIDDEN">숨김</option></select>
        <Input type="number" min={0} placeholder="최소 재고" value={filters.min} onChange={(e) => setFilters({ ...filters, min: e.target.value })} className="h-9 text-xs" />
        <Input type="number" min={0} placeholder="최대 재고" value={filters.max} onChange={(e) => setFilters({ ...filters, max: e.target.value })} className="h-9 text-xs" />
        <Input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} className="h-9 text-xs" />
      </div>
      <p className="mt-3 text-xs text-stone-400">검색 결과 {filtered.length}종</p>
    </section>

    <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {filtered.length === 0 ? <div className="py-24 text-center text-sm text-stone-400"><Flower2 className="mx-auto mb-3" />조건에 맞는 재고가 없어요.</div> : filtered.map((stock) => <div key={stock.id} className="flex flex-col gap-4 border-b p-4 last:border-0 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100">{stock.imageUrl ? <img src={stock.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={20} className="text-stone-300" />}</div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{stock.flowerName}</p><Badge active={stock.isActive} on={stock.isActive ? "사용 중" : "사용 중지"} /><Badge active={stock.isVisible} on={stock.isVisible ? "노출" : "숨김"} /></div><p className="mt-1 text-xs text-stone-400">{stock.color || "기본색"} · {stock.grade || "기본등급"} · {UNIT[stock.unit]}{stock.barcode ? ` · 바코드 ${stock.barcode}` : ""}</p><div className="mt-2 flex gap-1">{stock.availableForCustom && <Tag>주문 제작</Tag>}{stock.availableForDiy && <Tag>고객 DIY</Tag>}</div></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={stock.grade ?? ""} onChange={(e) => update(stock.id, { grade: e.target.value })} className="h-10 rounded-md border px-2 text-xs"><option value="">기본등급</option><option>특</option><option>상</option><option>보통</option></select>
          <select value={stock.unit} onChange={(e) => update(stock.id, { unit: e.target.value })} className="h-10 rounded-md border px-2 text-xs"><option value="STEM">송이</option><option value="BUNCH">단</option><option value="BOX">박스</option></select>
          <Input type="number" min={0} defaultValue={stock.quantity} onBlur={(e) => update(stock.id, { quantity: Number(e.target.value) })} className="w-20" /><span className="text-xs">{UNIT[stock.unit]}</span><Input type="number" min={0} defaultValue={stock.unitPrice} onBlur={(e) => update(stock.id, { unitPrice: Number(e.target.value) })} className="w-24" /><span className="text-xs">원</span><Button variant="outline" onClick={() => setDetail(stock)}>상세보기</Button><Button variant="outline" onClick={() => update(stock.id, { isVisible: !stock.isVisible })}>{stock.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}{stock.isVisible ? "숨김" : "노출"}</Button>
        </div>
      </div>)}
    </div>
    {detail && <Detail stock={detail} close={() => setDetail(null)} update={update} replaceImage={replaceImage} />}
  </div>
}

function Detail({ stock, close, update, replaceImage }: { stock: Stock; close: () => void; update: (id: string, patch: Partial<Stock>) => Promise<void>; replaceImage: (id: string, file: File) => Promise<void> }) {
  const [draft, setDraft] = useState({ ...stock, displayStartAt: stock.displayStartAt?.slice(0, 16) ?? "", displayEndAt: stock.displayEndAt?.slice(0, 16) ?? "" })
  const [newImage, setNewImage] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    if (newImage) await replaceImage(stock.id, newImage)
    await update(stock.id, {
      flowerName: draft.flowerName, flowerMeaning: draft.flowerMeaning, color: draft.color, grade: draft.grade,
      unit: draft.unit, quantity: Number(draft.quantity), unitPrice: Number(draft.unitPrice), barcode: draft.barcode ?? "",
      displayStartAt: draft.displayStartAt || null, displayEndAt: draft.displayEndAt || null,
      availableForCustom: draft.availableForCustom, availableForDiy: draft.availableForDiy,
      isActive: draft.isActive, isVisible: draft.isVisible,
    })
    setSaving(false); close()
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
    <div className="flex justify-between"><div><p className="text-xs font-bold text-emerald-700">개별 꽃 수정</p><h2 className="mt-1 text-xl font-bold">{stock.flowerName}</h2></div><button onClick={close}><X /></button></div>
    {newImage ? <img src={URL.createObjectURL(newImage)} alt="" className="mt-4 h-52 w-full rounded-xl object-cover" /> : stock.imageUrl ? <img src={stock.imageUrl} alt="" className="mt-4 h-52 w-full rounded-xl object-cover" /> : <div className="mt-4 flex h-52 items-center justify-center rounded-xl bg-stone-100"><ImageIcon className="text-stone-300" /></div>}
    <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-dashed p-3 text-xs text-stone-500">대표사진 등록·변경<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setNewImage(e.target.files?.[0] ?? null)} /></label>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="꽃명"><Input value={draft.flowerName} onChange={(e) => setDraft({ ...draft, flowerName: e.target.value })} /></Field>
      <Field label="색상"><Input value={draft.color ?? ""} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></Field>
      <Field label="등급"><select value={draft.grade ?? ""} onChange={(e) => setDraft({ ...draft, grade: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm"><option value="">기본등급</option><option>특</option><option>상</option><option>보통</option></select></Field>
      <Field label="관리 단위"><select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm"><option value="STEM">송이</option><option value="BUNCH">단</option><option value="BOX">박스</option></select></Field>
      <Field label="재고"><Input type="number" min={0} value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} /></Field>
      <Field label="단가"><Input type="number" min={0} value={draft.unitPrice} onChange={(e) => setDraft({ ...draft, unitPrice: Number(e.target.value) })} /></Field>
      <Field label="상품 바코드"><Input inputMode="numeric" value={draft.barcode ?? ""} onChange={(e) => setDraft({ ...draft, barcode: e.target.value })} placeholder="포토부스 '구매한 꽃' 스캔용" /></Field>
      <Field label="노출 시작"><Input type="datetime-local" value={draft.displayStartAt} onChange={(e) => setDraft({ ...draft, displayStartAt: e.target.value })} /></Field>
      <Field label="노출 종료"><Input type="datetime-local" value={draft.displayEndAt} onChange={(e) => setDraft({ ...draft, displayEndAt: e.target.value })} /></Field>
      <Field label="꽃말" className="sm:col-span-2"><textarea value={draft.flowerMeaning ?? ""} onChange={(e) => setDraft({ ...draft, flowerMeaning: e.target.value })} rows={3} className="w-full rounded-md border p-3 text-sm" /></Field>
    </div>
    <div className="mt-5 grid gap-2 sm:grid-cols-2"><Check checked={draft.availableForCustom} onChange={(v) => setDraft({ ...draft, availableForCustom: v })} label="나만의 꽃다발 주문 제작에 사용" /><Check checked={draft.availableForDiy} onChange={(v) => setDraft({ ...draft, availableForDiy: v })} label="고객 DIY 직접 만들기에 사용" /><Check checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} label="재고 사용 가능" /><Check checked={draft.isVisible} onChange={(v) => setDraft({ ...draft, isVisible: v })} label="고객에게 노출" /></div>
    <div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={close}>취소</Button><Button onClick={save} disabled={saving} className="bg-emerald-700 text-white">{saving ? "저장 중..." : "수정 내용 저장"}</Button></div>
  </div></div>
}
function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={className}><Label className="mb-1.5 block text-xs">{label}</Label>{children}</div> }
function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) { return <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label> }
function Badge({ active, on }: { active: boolean; on: string }) { return <span className={`rounded-full px-2 py-1 text-[10px] ${active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{on}</span> }
function Tag({ children }: { children: React.ReactNode }) { return <span className="rounded bg-sky-50 px-2 py-1 text-[10px] text-sky-700">{children}</span> }
function Select({ value, onChange, label, values }: { value: string; onChange: (v: string) => void; label: string; values: string[] }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-lg border px-2 text-xs"><option value="">{label}</option>{values.map((v) => <option key={v}>{v}</option>)}</select> }

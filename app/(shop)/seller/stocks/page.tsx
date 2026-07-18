"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, FileSpreadsheet, Flower2, PackagePlus, Search, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Stock = { id: string; flowerName: string; flowerMeaning: string | null; color: string | null; grade: string | null; unit: string; quantity: number; unitPrice: number; isActive: boolean }
type Suggestion = { name: string; meaning: string; color: string; ohaeng: string }
const empty = { flowerName: "", flowerMeaning: "", color: "", grade: "", unit: "STEM", quantity: "0", unitPrice: "0", isActive: true }

export default function SellerStocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [form, setForm] = useState(empty)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [excelOpen, setExcelOpen] = useState(false)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [excelResult, setExcelResult] = useState("")
  const load = useCallback(async () => {
    const response = await fetch("/api/seller/stocks"); const data = await response.json()
    if (response.ok) { setStocks(data.stocks ?? []); setSuggestions(data.suggestions ?? []) } else setError(data.error)
  }, [])
  useEffect(() => { load() }, [load])
  const recommended = useMemo(() => suggestions.filter((s) => s.name.includes(form.flowerName.trim())).slice(0, 8), [form.flowerName, suggestions])
  const filtered = stocks.filter((s) => [s.flowerName, s.color, s.grade, s.flowerMeaning].some((v) => v?.toLowerCase().includes(query.toLowerCase())))
  const create = async () => {
    setError("")
    const response = await fetch("/api/seller/stocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }) })
    const data = await response.json()
    if (response.ok) { setForm(empty); setOpen(false); await load() } else setError(data.error)
  }
  const update = async (id: string, patch: Partial<Stock>) => {
    const response = await fetch("/api/seller/stocks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) })
    if (response.ok) await load()
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
  return <div className="max-w-6xl px-6 py-10">
    <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">판매자센터</p><h1 className="mt-1 text-2xl font-bold">개별 꽃 재고</h1><p className="mt-2 text-sm text-stone-500">DIY 판매와 나만의 꽃다발 제작에 사용할 꽃·소재의 송이 재고와 단가를 관리합니다.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setExcelOpen((v) => !v)}><FileSpreadsheet size={16} />엑셀 등록</Button><Button onClick={() => setOpen((v) => !v)} className="bg-emerald-700 text-white"><PackagePlus size={16} />개별 꽃 등록</Button></div></div>
    {excelOpen && <section className="mt-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="flex items-center gap-2 font-bold"><FileSpreadsheet size={18} className="text-emerald-700" />개별 꽃 엑셀 일괄 등록</h2><p className="mt-2 text-sm text-stone-500">양식의 열 이름은 유지하고 최대 500행까지 입력하세요. 꽃말을 비우면 인생내꽃 DB에서 자동 추천합니다.</p></div><a href="/templates/life-in-bloom-flower-stock-template.xlsx" download className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700"><Download size={16} />양식 다운로드</a></div>
      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-dashed border-emerald-300 bg-white p-5 sm:flex-row sm:items-center"><input type="file" accept=".xlsx" onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)} className="flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-emerald-700" /><Button onClick={uploadExcel} disabled={uploading} className="bg-emerald-700 text-white"><Upload size={16} />{uploading ? "검증·등록 중" : "검증 후 등록"}</Button></div>
      {excelResult && <p className="mt-3 text-sm font-semibold text-emerald-700">{excelResult}</p>}
    </section>}
    {open && <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="font-bold">꽃·소재 등록</h2>
      <div className="mt-5 grid sm:grid-cols-3 gap-4">
        <Field label="꽃명 *"><Input value={form.flowerName} onChange={(e) => setForm({ ...form, flowerName: e.target.value })} placeholder="예: 빨간 장미" /></Field>
        <Field label="색상"><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="빨강" /></Field>
        <Field label="등급"><Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="특 / 상 / 보통" /></Field>
        <Field label="판매 단위"><select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-10 w-full rounded-md border border-stone-200 px-3 text-sm"><option value="STEM">송이</option><option value="BUNCH">단</option><option value="BOX">박스</option></select></Field>
        <Field label="현재 재고 *"><Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
        <Field label="단가(원) *"><Input type="number" min={0} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></Field>
        <Field label="꽃말" className="sm:col-span-3"><Input value={form.flowerMeaning} maxLength={200} onChange={(e) => setForm({ ...form, flowerMeaning: e.target.value })} placeholder="꽃명을 입력하면 자체 DB에서 꽃말을 추천합니다." /></Field>
      </div>
      {form.flowerName && recommended.length > 0 && <div className="mt-3 rounded-xl bg-rose-50 p-4"><p className="text-xs font-bold text-rose-700">인생내꽃 DB 추천</p><div className="mt-2 flex flex-wrap gap-2">{recommended.map((item) => <button type="button" key={`${item.ohaeng}-${item.name}`} onClick={() => setForm({ ...form, flowerName: item.name, flowerMeaning: item.meaning })} className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs text-rose-700">{item.name} · {item.meaning}</button>)}</div></div>}
      <div className="mt-5 flex justify-end"><Button onClick={create} className="bg-emerald-700 text-white">재고 등록</Button></div>
    </section>}
    {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4"><Search size={17} className="text-stone-400" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="꽃명, 색상, 등급, 꽃말 검색" className="border-0 shadow-none" /></div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {filtered.length === 0 ? <div className="py-24 text-center text-sm text-stone-400"><Flower2 className="mx-auto mb-3 text-stone-300" />등록된 개별 꽃 재고가 없어요.</div> : filtered.map((stock) => <div key={stock.id} className="flex flex-col gap-4 border-b border-stone-100 p-4 last:border-0 lg:flex-row lg:items-center">
        <div className="flex-1"><div className="flex items-center gap-2"><p className="font-semibold">{stock.flowerName}</p><span className={`rounded-full px-2 py-1 text-[10px] ${stock.isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{stock.isActive ? "판매·사용 중" : "중지"}</span></div><p className="mt-1 text-xs text-stone-400">{stock.color || "기본색"} · {stock.grade || "기본등급"} · {stock.unit === "STEM" ? "송이" : stock.unit === "BUNCH" ? "단" : "박스"}</p>{stock.flowerMeaning && <p className="mt-2 text-xs text-rose-500">꽃말 · {stock.flowerMeaning}</p>}</div>
        <div className="flex items-center gap-2"><Input type="number" min={0} defaultValue={stock.quantity} onBlur={(e) => update(stock.id, { quantity: Number(e.target.value) })} className="w-24" /><span className="text-xs text-stone-400">개</span><Input type="number" min={0} defaultValue={stock.unitPrice} onBlur={(e) => update(stock.id, { unitPrice: Number(e.target.value) })} className="w-28" /><span className="text-xs text-stone-400">원</span><Button variant="outline" onClick={() => update(stock.id, { isActive: !stock.isActive })}>{stock.isActive ? "중지" : "재개"}</Button></div>
      </div>)}
    </div>
  </div>
}
function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={className}><Label className="mb-1.5 block text-xs text-stone-600">{label}</Label>{children}</div> }

"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signIn } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const CATEGORIES = [
  { value: "bouquet", label: "꽃다발" },
  { value: "plant", label: "화분" },
  { value: "wreath", label: "화환" },
  { value: "dried", label: "드라이플라워" },
]
const OHAENG = ["목", "화", "토", "금", "수"]
const USES = ["생일", "축하", "개업", "결혼", "추모", "감사"]
const SEASONS = [
  { value: "spring", label: "봄" }, { value: "summer", label: "여름" },
  { value: "autumn", label: "가을" }, { value: "winter", label: "겨울" }, { value: "all", label: "사계절" },
]

interface AdminProduct {
  id: string
  name: string
  description: string
  price: number
  stock: number
  category: string
  images: string[]
  flowerMeaning: string | null
  ohaengTags: string[]
  seasonTags: string[]
  colorTags: string[]
  useTags: string[] | null
  isActive: boolean
}

interface FormState {
  name: string; price: string; stock: string; category: string
  description: string; flowerMeaning: string; imageUrl: string; colorTags: string
  ohaengTags: string[]; useTags: string[]; seasonTags: string[]
}

const emptyForm = (): FormState => ({
  name: "", price: "", stock: "10", category: "bouquet",
  description: "", flowerMeaning: "", imageUrl: "", colorTags: "",
  ohaengTags: [], useTags: [], seasonTags: ["all"],
})

function toggleIn(arr: string[], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

export default function AdminProductsPage() {
  const { data: session, status } = useSession()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [forbidden, setForbidden] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/products")
      .then((r) => {
        if (r.status === 403) { setForbidden(true); return { products: [] } }
        return r.json()
      })
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (session?.user) load()
    else if (status !== "loading") setLoading(false)
  }, [session, status, load])

  const startEdit = (p: AdminProduct) => {
    setEditingId(p.id)
    setForm({
      name: p.name, price: String(p.price), stock: String(p.stock), category: p.category,
      description: p.description ?? "", flowerMeaning: p.flowerMeaning ?? "",
      imageUrl: p.images[0] ?? "", colorTags: (p.colorTags ?? []).join(", "),
      ohaengTags: p.ohaengTags ?? [], useTags: p.useTags ?? [], seasonTags: p.seasonTags ?? [],
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm()); setError("") }

  const save = async () => {
    if (!form.name.trim() || !form.price) { setError("이름과 가격은 꼭 입력해주세요"); return }
    setSaving(true)
    setError("")
    const payload = {
      name: form.name, price: Number(form.price), stock: Number(form.stock || 0),
      category: form.category, description: form.description,
      flowerMeaning: form.flowerMeaning,
      images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
      colorTags: form.colorTags.split(",").map((s) => s.trim()).filter(Boolean),
      ohaengTags: form.ohaengTags, useTags: form.useTags, seasonTags: form.seasonTags,
    }
    try {
      const res = await fetch("/api/admin/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? "저장에 실패했어요")
      cancelEdit()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했어요")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (p: AdminProduct) => {
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
    })
    if (res.ok) setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: !p.isActive } : x)))
  }

  if (status === "loading" || loading) {
    return <div className="max-w-6xl mx-auto px-6 py-32 flex justify-center"><div className="w-8 h-8 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto px-6 py-32 text-center space-y-4">
        <p className="text-stone-500">관리자 로그인이 필요해요</p>
        <Button onClick={() => signIn("kakao")} className="bg-rose-400 hover:bg-rose-500 text-white">로그인</Button>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="max-w-md mx-auto px-6 py-32 text-center space-y-2">
        <p className="text-3xl">🔒</p>
        <p className="text-stone-500">관리자 권한이 없는 계정이에요</p>
        <p className="text-xs text-stone-400">Vercel 환경변수 ADMIN_EMAILS에 이메일을 등록해주세요</p>
      </div>
    )
  }

  const checkboxGroup = (
    label: string,
    options: { value: string; label: string }[],
    selected: string[],
    onToggle: (v: string) => void,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-stone-500">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selected.includes(o.value)
                ? "bg-rose-400 border-rose-400 text-white"
                : "bg-white border-stone-200 text-stone-500 hover:border-rose-300"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-stone-800">상품 관리</h1>
        <Link href="/admin" className="text-sm text-rose-500 font-medium hover:text-rose-600">주문 관리 →</Link>
      </div>

      {/* 등록/수정 폼 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-8 space-y-4">
        <h2 className="font-semibold text-stone-800">{editingId ? "상품 수정" : "새 상품 등록"}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs text-stone-500">상품 이름 *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="예: 생일 꽃다발 — 핑크 장미" className="rounded-xl border-stone-200" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">가격(원) *</Label>
            <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="45000" className="rounded-xl border-stone-200" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">재고</Label>
            <Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className="rounded-xl border-stone-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">카테고리 *</Label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full h-9 rounded-xl border border-stone-200 px-3 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">이미지 주소</Label>
            <Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="/flowers/pink_rose.jpg 또는 https://..." className="rounded-xl border-stone-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">꽃말</Label>
            <Input value={form.flowerMeaning} onChange={(e) => setForm((f) => ({ ...f, flowerMeaning: e.target.value }))} placeholder="예: 행복한 사랑" className="rounded-xl border-stone-200" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">색상 태그 (쉼표로 구분)</Label>
            <Input value={form.colorTags} onChange={(e) => setForm((f) => ({ ...f, colorTags: e.target.value }))} placeholder="pink, red" className="rounded-xl border-stone-200" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">상품 설명</Label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder="상품 소개를 적어주세요"
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-rose-300"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {checkboxGroup("오행 태그", OHAENG.map((o) => ({ value: o, label: o })), form.ohaengTags, (v) => setForm((f) => ({ ...f, ohaengTags: toggleIn(f.ohaengTags, v) })))}
          {checkboxGroup("용도 태그", USES.map((u) => ({ value: u, label: u })), form.useTags, (v) => setForm((f) => ({ ...f, useTags: toggleIn(f.useTags, v) })))}
          {checkboxGroup("계절 태그", SEASONS, form.seasonTags, (v) => setForm((f) => ({ ...f, seasonTags: toggleIn(f.seasonTags, v) })))}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2 justify-end">
          {editingId && (
            <Button variant="outline" onClick={cancelEdit} className="h-10 border-stone-200 text-stone-600">취소</Button>
          )}
          <Button onClick={save} disabled={saving} className="h-10 px-6 bg-rose-400 hover:bg-rose-500 text-white font-semibold">
            {saving ? "저장 중..." : editingId ? "수정 저장" : "상품 등록"}
          </Button>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${p.isActive ? "border-stone-100" : "border-stone-100 opacity-50"}`}>
            <div className="w-14 h-14 rounded-lg bg-stone-50 overflow-hidden shrink-0 flex items-center justify-center">
              {p.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">🌸</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-800 truncate">{p.name}</p>
              <p className="text-xs text-stone-400">
                {p.price.toLocaleString()}원 · 재고 {p.stock} · {CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category}
                {(p.useTags ?? []).length > 0 && ` · ${(p.useTags ?? []).join("/")}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleActive(p)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                  p.isActive
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-stone-50 border-stone-200 text-stone-400"
                }`}
              >
                {p.isActive ? "판매 중" : "숨김"}
              </button>
              <Button variant="outline" onClick={() => startEdit(p)} className="h-8 text-xs border-stone-200 text-stone-600">수정</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

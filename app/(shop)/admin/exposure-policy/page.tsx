"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Save, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

type Policy = {
  nonghyupPriorityEnabled: boolean
  preferredSellerIds: string[]
  inventoryMode: "NONE" | "HIGH_STOCK" | "LOW_STOCK"
  adminPromotionsEnabled: boolean
  sellerPoliciesEnabled: boolean
}
type Seller = { id: string; marketName: string }

export default function ExposurePolicyPage() {
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [sellers, setSellers] = useState<Seller[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  useEffect(() => { fetch("/api/admin/exposure-policy").then(async (response) => ({ ok: response.ok, data: await response.json() })).then(({ ok, data }) => { if (!ok) setError(data.error); else { setPolicy(data.policy); setSellers(data.sellers ?? []) } }) }, [])
  if (!policy) return <div className="p-10 text-stone-500">{error || "노출 정책을 불러오는 중..."}</div>
  const set = <K extends keyof Policy>(key: K, value: Policy[K]) => setPolicy((current) => current ? { ...current, [key]: value } : current)
  const toggleSeller = (id: string) => set("preferredSellerIds", policy.preferredSellerIds.includes(id) ? policy.preferredSellerIds.filter((value) => value !== id) : [...policy.preferredSellerIds, id])
  const save = async () => {
    setSaving(true); setMessage(""); setError("")
    const response = await fetch("/api/admin/exposure-policy", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(policy) })
    const data = await response.json()
    if (response.ok) { setPolicy(data.policy); setMessage("노출 정책이 저장됐습니다.") } else setError(data.error ?? "저장하지 못했어요")
    setSaving(false)
  }
  return <div className="max-w-4xl px-6 py-10">
    <p className="text-sm font-semibold text-rose-600">ADMIN CENTER</p><h1 className="mt-1 text-2xl font-bold">노출 우선순위 정책</h1>
    <p className="mt-2 text-sm text-stone-500">사용자에게 공개되지 않는 운영 정책입니다. 사용자가 선택한 인기순·최신순과 사주 적합도가 먼저 적용됩니다.</p>
    {message && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"><CheckCircle2 className="mr-2 inline" size={16}/>{message}</p>}
    <div className="mt-7 space-y-5">
      <Section title="기본 운영 정책">
        <Toggle checked={policy.nonghyupPriorityEnabled} onChange={(value) => set("nonghyupPriorityEnabled", value)} title="농협 우선" detail="판매처명·상품명에 ‘농협’이 포함된 상품을 같은 조건에서 먼저 노출합니다."/>
        <Toggle checked={policy.adminPromotionsEnabled} onChange={(value) => set("adminPromotionsEnabled", value)} title="관리자 지정 상품 우선" detail="상품 현황에서 지정한 우선노출 및 0~100 우선순위를 반영합니다."/>
        <Toggle checked={policy.sellerPoliciesEnabled} onChange={(value) => set("sellerPoliciesEnabled", value)} title="판매자 내부 정책 허용" detail="같은 판매자의 상품끼리 판매자가 정한 우선노출과 정렬 방식을 반영합니다."/>
      </Section>
      <Section title="재고 정책">
        <select value={policy.inventoryMode} onChange={(event) => set("inventoryMode", event.target.value as Policy["inventoryMode"])} className="h-11 w-full rounded-xl border bg-white px-3 text-sm">
          <option value="NONE">재고량으로 순서를 바꾸지 않음</option><option value="HIGH_STOCK">재고 많은 상품 우선</option><option value="LOW_STOCK">재고 적은 상품 우선</option>
        </select>
      </Section>
      <Section title="우선 판매처">
        <p className="mb-3 text-xs text-stone-500">선택 순서대로 우선합니다. 선택하지 않은 판매처는 그 다음에 표시됩니다.</p>
        <div className="grid gap-2 sm:grid-cols-2">{sellers.map((seller) => <label key={seller.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={policy.preferredSellerIds.includes(seller.id)} onChange={() => toggleSeller(seller.id)} className="accent-rose-500"/><span className="flex-1">{seller.marketName}</span>{policy.preferredSellerIds.includes(seller.id) && <span className="text-xs font-bold text-rose-600">{policy.preferredSellerIds.indexOf(seller.id) + 1}순위</span>}</label>)}</div>
      </Section>
    </div>
    {error && <p className="mt-5 text-sm text-red-600">{error}</p>}
    <Button onClick={save} disabled={saving} className="mt-5 bg-rose-600 text-white"><Save size={16}/>{saving ? "저장 중..." : "정책 저장"}</Button>
  </div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border bg-white p-6"><h2 className="mb-4 flex items-center gap-2 font-bold"><SlidersHorizontal size={17} className="text-rose-500"/>{title}</h2><div className="space-y-3">{children}</div></section> }
function Toggle({ checked, onChange, title, detail }: { checked: boolean; onChange: (value: boolean) => void; title: string; detail: string }) { return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-stone-50 p-4"><span><strong className="block text-sm">{title}</strong><span className="text-xs text-stone-500">{detail}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-rose-500"/></label> }

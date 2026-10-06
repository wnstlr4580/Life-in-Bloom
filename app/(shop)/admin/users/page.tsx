"use client"

import { useEffect, useState } from "react"

type SellerInfo = { marketName: string; status: string; roadAddress: string }
type UserRow = { id: string; email: string; name: string | null; role: string; status: string; city: string | null; points: number; suspendedReason: string | null; passwordResetRequired: boolean; createdAt: string; Seller: SellerInfo | SellerInfo[] | null }
const ROLE: Record<string, string> = { ADMIN: "관리자", SELLER: "판매자", CUSTOMER: "일반 사용자" }
const STATUS: Record<string, string> = { ACTIVE: "사용 중", SUSPENDED: "이용 정지", WITHDRAWN: "탈퇴" }
const SELLER_STATUS: Record<string, string> = { PENDING: "심사 대기", UNDER_REVIEW: "검토 중", APPROVED: "운영 중", REJECTED: "반려", SUSPENDED: "판매 중지" }
const REGIONS = ["ALL", "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구"]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const initialFilters = { q: "", role: "ALL", status: "ALL", region: "ALL" }
  const [filters, setFilters] = useState(initialFilters)
  const [reason, setReason] = useState<Record<string, string>>({})
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const load = async () => {
    setLoading(true); setError("")
    const params = new URLSearchParams(filters)
    try { const response = await fetch(`/api/admin/users?${params}`); const data = await response.json(); if (!response.ok) throw new Error(data.error); setUsers(data.users ?? []) }
    catch (e) { setError(e instanceof Error ? e.message : "사용자 목록을 불러오지 못했어요") } finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const action = async (userId: string, type: string) => {
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action: type, reason: reason[userId] }) })
    const data = await response.json(); if (!response.ok) return alert(data.error)
    if (data.temporaryPassword) setMessage(`임시 비밀번호: ${data.temporaryPassword} — 이 화면을 벗어나면 다시 확인할 수 없습니다.`)
    load()
  }
  return <div className="p-6 sm:p-10">
    <h1 className="text-2xl font-bold">사용자 관리</h1><p className="mt-2 text-sm text-stone-500">조건별로 사용자를 검색하고 계정 상태를 관리합니다.</p>
    {message && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}
    <form onSubmit={(e) => { e.preventDefault(); load() }} className="mt-6 rounded-2xl border bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="이름 또는 이메일" className="h-10 rounded-xl border px-3 text-sm xl:col-span-2" />
        <Select value={filters.role} onChange={(role) => setFilters({ ...filters, role })} options={[["ALL", "모든 권한"], ["ADMIN", "관리자"], ["SELLER", "판매자"], ["CUSTOMER", "일반 사용자"]]} />
        <Select value={filters.status} onChange={(status) => setFilters({ ...filters, status })} options={[["ALL", "모든 상태"], ["ACTIVE", "사용 중"], ["SUSPENDED", "이용 정지"]]} />
        <Select value={filters.region} onChange={(region) => setFilters({ ...filters, region })} options={REGIONS.map((region) => [region, region === "ALL" ? "모든 지역" : region])} />
      </div>
      <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => { setFilters(initialFilters); location.reload() }} className="h-9 rounded-lg border px-4 text-xs">초기화</button><button className="h-9 rounded-lg bg-stone-900 px-5 text-xs text-white">검색</button></div>
    </form>
    {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
    <div className="mt-5 overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full sm:min-w-[900px] table-fixed max-sm:block max-sm:[&_thead]:hidden max-sm:[&_tbody]:block max-sm:[&_tr]:block max-sm:[&_tr]:border-b max-sm:[&_tr]:py-2 max-sm:[&_td]:block max-sm:[&_td]:py-1.5 text-left text-sm"><thead className="bg-stone-50 text-xs text-stone-500"><tr><Th>사용자</Th><Th>권한·상태</Th><Th>지역·판매처</Th><Th>가입·포인트</Th><Th>관리</Th></tr></thead>
        <tbody className="divide-y">{users.map((u) => { const seller = Array.isArray(u.Seller) ? u.Seller[0] : u.Seller; return <tr key={u.id} className="align-top hover:bg-stone-50/60"><Td><strong>{u.name || "이름 없음"}</strong><p className="mt-1 break-all text-xs text-stone-400">{u.email}</p></Td><Td><div className="flex flex-wrap gap-1"><Badge tone={u.role === "ADMIN" ? "rose" : u.role === "SELLER" ? "amber" : "stone"}>{ROLE[u.role] ?? u.role}</Badge><Badge tone={u.status === "SUSPENDED" ? "rose" : "green"}>{STATUS[u.status] ?? u.status}</Badge></div>{u.suspendedReason && <p className="mt-2 text-[11px] text-rose-500">{u.suspendedReason}</p>}</Td><Td>{seller ? <><strong>{seller.marketName}</strong><p className="mt-1 break-words text-xs text-stone-400">{seller.roadAddress}</p><p className="mt-1 text-[11px] text-emerald-700">{SELLER_STATUS[seller.status] ?? seller.status}</p></> : <span className="text-stone-400">{u.city || "지역 미입력"}</span>}</Td><Td><p>{new Date(u.createdAt).toLocaleDateString("ko-KR")}</p><p className="mt-1 text-xs text-stone-500">{u.points.toLocaleString()}P</p></Td><Td><div className="space-y-2"><input value={reason[u.id] ?? ""} onChange={(e) => setReason((r) => ({ ...r, [u.id]: e.target.value }))} placeholder="차단 사유" className="h-8 w-full rounded-lg border px-2 text-xs" /><div className="flex flex-wrap gap-1">{u.status === "SUSPENDED" ? <Action onClick={() => action(u.id, "ACTIVATE")}>차단 해제</Action> : <Action danger onClick={() => action(u.id, "SUSPEND")}>계정 차단</Action>}<Action onClick={() => action(u.id, "RESET_PASSWORD")}>비밀번호 초기화</Action></div></div></Td></tr> })}</tbody>
      </table>
      {!loading && users.length === 0 && <p className="p-16 text-center text-sm text-stone-400">조건에 맞는 사용자가 없습니다.</p>}
      {loading && <p className="p-16 text-center text-sm text-stone-400">사용자 목록을 불러오는 중...</p>}
    </div>
  </div>
}
function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-xl border bg-white px-3 text-sm">{options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select> }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 font-semibold">{children}</th> }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-4">{children}</td> }
function Badge({ children, tone }: { children: React.ReactNode; tone: string }) { const color: Record<string, string> = { rose: "bg-rose-100 text-rose-700", amber: "bg-amber-100 text-amber-700", green: "bg-emerald-100 text-emerald-700", stone: "bg-stone-100 text-stone-600" }; return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${color[tone]}`}>{children}</span> }
function Action({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) { return <button onClick={onClick} className={`h-8 rounded-lg border px-2 text-[11px] ${danger ? "text-rose-600" : "text-stone-600"}`}>{children}</button> }

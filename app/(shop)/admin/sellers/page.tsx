"use client"

import { Fragment, useEffect, useState } from "react"

type Seller = { id: string; status: string; marketName: string; legalBusinessName: string; businessNumber: string; representativeName: string; managerName: string; managerPhone: string; publicPhone: string | null; roadAddress: string; sellerType: string; submittedAt: string; approvedAt: string | null; sellsFinishedProducts: boolean; offersCustomBouquet: boolean; offersDiyFlowers: boolean; User: { email: string } | { email: string }[] | null }
type Detail = { seller: Record<string, unknown>; reviews: Array<{ id: string; fromStatus: string | null; toStatus: string; reason: string | null; createdAt: string; User?: { name: string | null; email: string } | null }> }
const STATUS: Record<string, string> = { PENDING: "신청", UNDER_REVIEW: "검토 중", APPROVED: "운영 중", REJECTED: "반려", SUSPENDED: "사용 중지" }
const REGIONS = ["ALL", "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구"]
const DELIVERY_REGIONS = ["서울", "경기", "인천", "강원", "대전", "세종", "충북", "충남", "광주", "전북", "전남", "대구", "경북", "부산", "울산", "경남", "제주"]

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [filters, setFilters] = useState({ q: "", status: "ALL", region: "ALL", sellerType: "ALL", service: "ALL" })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, Detail>>({})
  const [reason, setReason] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const load = async () => {
    const params = new URLSearchParams(filters)
    const response = await fetch(`/api/admin/sellers?${params}`, { cache: "no-store" }); const data = await response.json()
    if (!response.ok) return setError(data.error); setSellers(data.sellers ?? []); setError("")
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const open = async (id: string) => {
    if (expanded === id) return setExpanded(null)
    setExpanded(id); if (details[id]) return
    const response = await fetch(`/api/admin/sellers/${id}`); const data = await response.json()
    if (response.ok) setDetails((current) => ({ ...current, [id]: data })); else alert(data.error)
  }
  useEffect(() => {
    const sellerId = new URLSearchParams(window.location.search).get("open")
    if (sellerId) open(sellerId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const changeStatus = async (id: string, status: string) => {
    const response = await fetch("/api/admin/sellers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sellerId: id, status, reason: reason[id] }) })
    const data = await response.json(); if (!response.ok) return alert(data.error)
    setDetails((current) => { const next = { ...current }; delete next[id]; return next }); setExpanded(null); load()
  }
  return <div className="p-6 sm:p-10">
    <h1 className="text-2xl font-bold">판매처 관리</h1><p className="mt-2 text-sm text-stone-500">판매처명·연락처·대표자·지역·서비스 조건으로 검색하고 심사 및 운영 상태를 관리합니다.</p>
    <form onSubmit={(e) => { e.preventDefault(); load() }} className="mt-6 rounded-2xl border bg-white p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="판매처·전화·대표자·담당자·이메일" className="h-10 rounded-xl border px-3 text-sm xl:col-span-2" />
      <Select value={filters.status} set={(status) => setFilters({ ...filters, status })} options={[["ALL", "모든 상태"], ...Object.entries(STATUS)]} />
      <Select value={filters.region} set={(region) => setFilters({ ...filters, region })} options={REGIONS.map((r) => [r, r === "ALL" ? "모든 지역" : r])} />
      <Select value={filters.sellerType} set={(sellerType) => setFilters({ ...filters, sellerType })} options={[["ALL", "모든 판매처 유형"], ["WHOLESALE", "공판장·도매"], ["RETAIL", "꽃집·소매"], ["FARM", "농가·생산자"]]} />
      <Select value={filters.service} set={(service) => setFilters({ ...filters, service })} options={[["ALL", "모든 서비스"], ["FINISHED", "완제품"], ["CUSTOM", "주문 제작"], ["DIY", "DIY 재료"]]} />
    </div><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setFilters({ q: "", status: "ALL", region: "ALL", sellerType: "ALL", service: "ALL" })} className="h-9 rounded-lg border px-4 text-xs">초기화</button><button className="h-9 rounded-lg bg-stone-900 px-5 text-xs text-white">검색</button></div></form>
    {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
    <div className="mt-5 overflow-hidden rounded-2xl border bg-white"><table className="w-full table-fixed text-left text-sm [&_th:last-child]:pr-8 [&_td:last-child]:pr-8 [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden [&_th:nth-child(4)]:hidden [&_td:nth-child(4)]:hidden [&_th:nth-child(7)]:hidden [&_td:nth-child(7)]:hidden"><thead className="bg-stone-50 text-xs text-stone-500"><tr><Th>판매처</Th><Th>대표·담당자</Th><Th>연락처</Th><Th>지역</Th><Th>서비스</Th><Th>상태</Th><Th>신청·승인일</Th><Th>상세·관리</Th></tr></thead><tbody className="divide-y">
      {sellers.map((seller) => { const user = Array.isArray(seller.User) ? seller.User[0] : seller.User; return <Fragment key={seller.id}>
        <tr className="align-top hover:bg-stone-50/60"><Td><strong>{seller.marketName}</strong><p className="mt-1 text-xs text-stone-400">{seller.legalBusinessName}</p><p className="mt-1 text-[11px] text-stone-400">{seller.businessNumber}</p></Td><Td>대표 {seller.representativeName}<p className="mt-1 text-xs text-stone-400">담당 {seller.managerName}</p></Td><Td>{seller.publicPhone || seller.managerPhone}<p className="mt-1 text-xs text-stone-400">{user?.email}</p></Td><Td><span className="block max-w-40 text-xs leading-5">{seller.roadAddress}</span></Td><Td><div className="flex max-w-40 flex-wrap gap-1">{seller.sellsFinishedProducts && <Tag>완제품</Tag>}{seller.offersCustomBouquet && <Tag>주문 제작</Tag>}{seller.offersDiyFlowers && <Tag>DIY</Tag>}</div></Td><Td><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${seller.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : seller.status === "SUSPENDED" || seller.status === "REJECTED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{STATUS[seller.status]}</span></Td><Td><p className="text-xs">신청 {new Date(seller.submittedAt).toLocaleDateString("ko-KR")}</p><p className="mt-1 text-xs text-stone-400">{seller.approvedAt ? `승인 ${new Date(seller.approvedAt).toLocaleString("ko-KR")}` : "미승인"}</p></Td><Td><div className="w-52 space-y-2"><button onClick={() => open(seller.id)} className="h-8 w-full rounded-lg border text-xs font-semibold">신청 상세 확인</button>{seller.status === "APPROVED" && <><input value={reason[seller.id] ?? ""} onChange={(e) => setReason((r) => ({ ...r, [seller.id]: e.target.value }))} placeholder="중지 사유" className="h-8 w-full rounded-lg border px-2 text-xs" /><button onClick={() => changeStatus(seller.id, "SUSPENDED")} className="h-8 w-full rounded-lg border text-xs text-rose-600">판매처 사용 중지</button></>}{seller.status === "SUSPENDED" && <button onClick={() => changeStatus(seller.id, "APPROVED")} className="h-8 w-full rounded-lg border text-xs text-emerald-700">재활성화</button>}{["PENDING", "UNDER_REVIEW"].includes(seller.status) && <><input value={reason[seller.id] ?? ""} onChange={(e) => setReason((r) => ({ ...r, [seller.id]: e.target.value }))} placeholder="반려 시 사유 입력" className="h-8 w-full rounded-lg border px-2 text-xs" /><div className="flex gap-1"><button onClick={() => changeStatus(seller.id, "APPROVED")} className="h-8 flex-1 rounded-lg bg-emerald-600 text-xs text-white">승인</button><button onClick={() => changeStatus(seller.id, "REJECTED")} className="h-8 flex-1 rounded-lg border text-xs text-rose-600">반려</button></div></>}</div></Td></tr>
      </Fragment> })}
    </tbody></table>{sellers.length === 0 && <p className="p-16 text-center text-sm text-stone-400">조건에 맞는 판매처가 없습니다.</p>}</div>
    {expanded && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setExpanded(null)}><div onMouseDown={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-[#f8f8f6] shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-7 py-5"><div><p className="text-xs font-semibold text-rose-500">SELLER APPLICATION</p><h2 className="mt-1 text-xl font-bold">{sellers.find((seller) => seller.id === expanded)?.marketName ?? "판매처 신청 상세"}</h2></div><button onClick={() => setExpanded(null)} className="rounded-xl border px-4 py-2 text-sm">닫기</button></div><div className="p-6"><SellerDetail detail={details[expanded]} sellerId={expanded} /></div></div></div>}
  </div>
}
function SellerDetail({ detail, sellerId }: { detail?: Detail; sellerId: string }) {
  if (!detail) return <p className="text-sm text-stone-400">상세 정보를 불러오는 중...</p>
  const seller = detail.seller
  const sections = [
    { title: "사업자 정보", fields: [["사업자 상호", seller.legalBusinessName], ["대표자", seller.representativeName], ["사업자등록번호", seller.businessNumber], ["통신판매업 신고번호", seller.mailOrderNumber], ["업태", seller.businessType], ["종목", seller.businessCategory]] },
    { title: "판매처·담당자", fields: [["노출 상호명", seller.marketName], ["판매처 유형", seller.sellerType], ["담당자", seller.managerName], ["담당자 연락처", seller.managerPhone], ["고객 문의 전화", seller.publicPhone], ["로그인 이메일", Array.isArray(seller.User) ? (seller.User as Array<{email?: string}>)[0]?.email : (seller.User as {email?: string} | undefined)?.email]] },
    { title: "사업장 주소", fields: [["우편번호", seller.postalCode], ["도로명주소", seller.roadAddress], ["상세주소", seller.detailAddress], ["위도·경도", `${seller.latitude ?? "-"}, ${seller.longitude ?? "-"}`]] },
    { title: "정산 정보", fields: [["은행", seller.settlementBank], ["계좌번호", seller.settlementAccount], ["예금주", seller.settlementHolder]] },
    { title: "서비스·동의", fields: [["완제품 판매", seller.sellsFinishedProducts ? "사용" : "미사용"], ["주문 제작", seller.offersCustomBouquet ? "사용" : "미사용"], ["DIY 꽃 판매", seller.offersDiyFlowers ? "사용" : "미사용"], ["약관 버전", seller.termsVersion], ["신청일", seller.submittedAt ? new Date(String(seller.submittedAt)).toLocaleString("ko-KR") : "-"], ["승인일", seller.approvedAt ? new Date(String(seller.approvedAt)).toLocaleString("ko-KR") : "-"]] },
  ]
  return <div className="space-y-5">
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]"><section className="overflow-hidden rounded-2xl border bg-white">{sections.map((section, index) => <div key={section.title} className={index ? "border-t p-6" : "p-6"}><h3 className="border-l-4 border-rose-400 pl-3 font-bold">{section.title}</h3><dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">{section.fields.map(([label, value]) => <div key={String(label)}><dt className="text-xs text-stone-400">{String(label)}</dt><dd className="mt-1 min-h-6 break-words rounded-lg bg-stone-50 px-3 py-2 text-sm font-medium">{String(value || "-")}</dd></div>)}</dl></div>)}</section>
      <div className="space-y-4"><section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">사업자등록증</h3>{seller.businessLicenseUrl ? <><div className="mt-4 overflow-hidden rounded-xl border bg-stone-50"><iframe src={String(seller.businessLicenseUrl)} title="사업자등록증" className="h-80 w-full" /></div><a href={String(seller.businessLicenseUrl)} target="_blank" rel="noreferrer" className="mt-3 block rounded-xl bg-stone-900 px-4 py-3 text-center text-sm font-semibold text-white">새 창에서 원본 보기</a></> : <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">등록된 사업자등록증 파일이 없습니다.</p>}</section>
      <section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">심사 이력</h3><div className="mt-4 space-y-4">{detail.reviews.length === 0 && <p className="text-sm text-stone-400">아직 심사 이력이 없습니다.</p>}{detail.reviews.map((review) => { const actor = Array.isArray(review.User) ? review.User[0] : review.User; return <div key={review.id} className="border-l-2 border-rose-200 pl-3 text-xs"><strong>{STATUS[review.fromStatus ?? ""] || "신규"} → {STATUS[review.toStatus]}</strong><p className="mt-1">{actor?.name || "시스템"} · {actor?.email || "계정 없음"}</p><p className="mt-1 text-stone-400">{review.reason || "사유 없음"} · {new Date(review.createdAt).toLocaleString("ko-KR")}</p></div>})}</div></section></div>
    </div><DeliveryEditor sellerId={sellerId} seller={seller} /><section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">판매처 소개</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{String(seller.introduction || "등록된 소개가 없습니다.")}</p></section>
  </div>
}
function DeliveryEditor({ sellerId, seller }: { sellerId: string; seller: Record<string, unknown> }) {
  const initialScope = (value: unknown) => ["NONE", "NATIONWIDE", "REGIONAL"].includes(String(value)) ? String(value) : "NATIONWIDE"
  const initialRegions = (value: unknown) => Array.isArray(value) ? value.map(String) : []
  const [customScope, setCustomScope] = useState(initialScope(seller.customDeliveryScope))
  const [customRegions, setCustomRegions] = useState(initialRegions(seller.customDeliveryRegions))
  const [productScope, setProductScope] = useState(initialScope(seller.productDeliveryScope))
  const [productRegions, setProductRegions] = useState(initialRegions(seller.productDeliveryRegions))
  const [saving, setSaving] = useState(false)
  const toggle = (regions: string[], setRegions: (regions: string[]) => void, region: string) => setRegions(regions.includes(region) ? regions.filter((item) => item !== region) : [...regions, region])
  const save = async () => {
    setSaving(true)
    const response = await fetch("/api/admin/sellers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "UPDATE_DELIVERY", sellerId, customDeliveryScope: customScope, customDeliveryRegions: customRegions, productDeliveryScope: productScope, productDeliveryRegions: productRegions }) })
    const data = await response.json(); setSaving(false); alert(response.ok ? "배송 범위를 저장했습니다." : data.error)
  }
  const Scope = ({ title, scope, setScope, regions, setRegions }: { title: string; scope: string; setScope: (value: string) => void; regions: string[]; setRegions: (value: string[]) => void }) => <div className="rounded-2xl bg-stone-50 p-4"><h4 className="text-sm font-bold">{title}</h4><div className="mt-3 grid gap-2 sm:grid-cols-3">{[["NATIONWIDE", "전국 배송"], ["REGIONAL", "지역 제한"], ["NONE", "배송 안 함"]].map(([value, label]) => <button type="button" key={value} onClick={() => setScope(value)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${scope === value ? "border-rose-400 bg-white text-rose-600" : "border-stone-200 text-stone-500"}`}>{label}</button>)}</div>{scope === "REGIONAL" && <div className="mt-3 flex flex-wrap gap-2">{DELIVERY_REGIONS.map((region) => <button type="button" key={region} onClick={() => toggle(regions, setRegions, region)} className={`rounded-full px-3 py-1.5 text-xs ${regions.includes(region) ? "bg-rose-500 text-white" : "border bg-white text-stone-600"}`}>{region}</button>)}</div>}</div>
  return <section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">배송 범위 관리</h3><p className="mt-1 text-xs text-stone-500">결제 주소는 나중에 입력되므로, 검색 화면에는 전국배송 여부와 선택 지역을 미리 안내합니다.</p><div className="mt-4 grid gap-4 lg:grid-cols-2"><Scope title="나만의 꽃다발 주문제작" scope={customScope} setScope={setCustomScope} regions={customRegions} setRegions={setCustomRegions}/><Scope title="완제품 꽃다발" scope={productScope} setScope={setProductScope} regions={productRegions} setRegions={setProductRegions}/></div><div className="mt-4 flex justify-end"><button onClick={save} disabled={saving} className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "저장 중..." : "배송 범위 저장"}</button></div></section>
}
function Select({ value, set, options }: { value: string; set: (v: string) => void; options: string[][] }) { return <select value={value} onChange={(e) => set(e.target.value)} className="h-10 rounded-xl border bg-white px-3 text-sm">{options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select> }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 font-semibold">{children}</th> }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-4">{children}</td> }
function Tag({ children }: { children: React.ReactNode }) { return <span className="rounded bg-emerald-50 px-1.5 py-1 text-[10px] text-emerald-700">{children}</span> }

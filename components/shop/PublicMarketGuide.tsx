"use client"

import { useState } from "react"
import { demoPurchaseQuote } from "@/lib/publicMarketDemo"
import { NonghyupMark } from "@/components/brand/NonghyupMark"
import { purchaseLine, type auctionReference } from "@/lib/publicMarketPricing"
import type { MarketDirectory } from "@/lib/publicMarketDirectory"

type FlowerPlan = {
  id: string; name: string; quantity: number; group: string
  stemsPerBundle: number | null; bundleCount?: number | null; spareStems?: number | null
  averageBundlePrice?: number | null; referenceTotal?: number | null
  reference?: ReturnType<typeof auctionReference>
}
export type PublicMarketView = MarketDirectory & {
  sellerId: string; distanceKm: number | null; diyComplete: boolean; customComplete: boolean
  flowers?: FlowerPlan[]; auctionReferenceTotal?: number | null
  basisDate?: string | null; oldestBasisDate?: string | null; dataStatus?: string
  marketInfoUrl?: string; auctionInfoUrl?: string
}
const won = (value: number) => `${value.toLocaleString()}원`

function MarketCard({ market, flowers, onFocus }: { market: PublicMarketView; flowers: FlowerPlan[]; onFocus: (id: string) => void }) {
  const demo = market.auctionReferenceTotal == null ? demoPurchaseQuote(flowers) : null
  const [quotes, setQuotes] = useState<Record<string, string>>({})
  const [packs, setPacks] = useState<Record<string, string>>({})
  const [extra, setExtra] = useState("")
  const [copyStatus, setCopyStatus] = useState("")
  const items = flowers.map(flower => {
    const example = demo?.items.find(item => item.id === flower.id)
    const pack = packs[flower.id] === undefined ? (example?.stemsPerBundle ?? flower.stemsPerBundle) : Number(packs[flower.id])
    const price = quotes[flower.id] === undefined ? (example?.bundlePrice ?? null) : quotes[flower.id] ? Number(quotes[flower.id]) : null
    return { ...flower, pack, price, ...purchaseLine(flower.quantity, pack, price) }
  })
  const complete = items.length > 0 && items.every(item => item.total !== null)
  const extraCost = Number(extra || 0)
  const total = complete && Number.isFinite(extraCost) && extraCost >= 0 ? items.reduce((sum, item) => sum + item.total!, 0) + extraCost : null
  const mapUrl = market.marketInfoUrl ?? `https://map.naver.com/p/search/${encodeURIComponent(`${market.marketName} ${market.roadAddress}`)}`
  const copy = async () => {
    const text = [`인생내꽃 ${demo ? "시연용 예시 구매 메모" : "방문 구매 메모"} · ${market.marketName}`, market.roadAddress,
      ...items.map(item => `${item.name} ${item.quantity}송이 필요 → ${item.bundles ?? "확인 필요"}속 (1속 ${item.pack || "확인 필요"}송이${item.price ? `, ${demo ? "시연 예시 단가" : "입력 단가"} ${won(item.price)}` : ", 매장 단가 문의"})`),
      total !== null ? `${demo ? "시연용 예시" : "입력 단가 기준"} 합계 ${won(total)} (추가비용 ${won(extraCost)} 포함)` : "구매예산: 매장에 속당 가격 확인 후 계산",
      "문의: 이 색상과 수량을 일반인도 구매할 수 있나요? 오늘 재고·판매단위·부가세 포함 총액·방문 가능한 시간을 알려주세요.",
      demo ? "시연용 가상 가격입니다. 실제 시세·매장 견적·재고와 무관합니다." : "경매 시세는 매장 판매가와 다릅니다.", mapUrl].join("\n")
    try { await navigator.clipboard.writeText(text); setCopyStatus("구매 메모를 복사했어요.") }
    catch { setCopyStatus("복사 권한이 없어요. 아래 구매 목록을 캡처해 주세요.") }
  }
  return <article id={`market-${market.id}`} className={`overflow-hidden rounded-2xl border bg-white ${market.isNonghyup ? "border-emerald-200" : "border-sky-200"}`}>
    <div className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {market.isNonghyup ? <NonghyupMark compact className="rounded-xl bg-emerald-50 p-3"/> : <span className="rounded-xl bg-sky-50 p-3" aria-label="공공 공판장">🏛️</span>}
        <div className="min-w-0 flex-1"><h3 className="font-bold text-stone-900">{market.marketName}</h3><p className="mt-1 text-xs text-stone-500">{market.isNonghyup ? "농협" : "aT"} · {market.distanceKm != null ? `직선 약 ${market.distanceKm}km` : "거리 확인 전"}</p></div>
        <button type="button" onClick={() => onFocus(market.sellerId)} className="shrink-0 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-emerald-700">지도에서 보기</button>
      </div>
      <p className="mt-3 text-sm text-stone-600">{market.roadAddress}</p>
      <div className="mt-4 rounded-xl bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium text-stone-600">{demo ? "시연용 예시 가격" : "경매 기준 참고액"}</span><strong className="text-lg text-stone-900">{won(demo?.total ?? market.auctionReferenceTotal!)}</strong></div>
        {demo ? <><span className="mt-2 inline-block rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">시연 데이터 · 실제 시세 아님</span><p className="mt-2 text-xs leading-5 text-stone-600">실제 연계 가격을 확보하지 못해 예시 단가로 계산했어요. 모든 공판장에 같은 예시 단가를 사용하며 실제 판매·재고를 뜻하지 않아요.</p><p className="mt-2 text-sm font-semibold text-emerald-800">{demo.items.map(item => `${flowers.find(f => f.id === item.id)?.name} ${item.bundles}속 × ${won(item.bundlePrice)}`).join(" + ")}</p></> : <><p className="mt-1 text-xs leading-5 text-stone-500">{market.oldestBasisDate ?? market.basisDate}~{market.basisDate} · 품목 전체 기준, 색상·등급 미반영</p><p className="mt-2 text-sm font-semibold text-emerald-800">방문 구매예산은 매장 판매가를 확인한 뒤 계산해요.</p></>}

      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {flowers.map(flower => <span key={flower.id} className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800">{flower.name} {flower.quantity}송이</span>)}
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-600">{market.visitNote ?? "일반인 구매 가능한 매장과 오늘 재고·영업시간을 방문 전에 확인해주세요."}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={mapUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">길찾기·매장정보 ↗</a>
        {market.publicPhone && <a href={`tel:${market.publicPhone}`} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold">전화 문의</a>}
        <button type="button" onClick={copy} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold">구매 메모 복사</button>
      </div>
      {copyStatus && <p role="status" className="mt-2 text-xs text-emerald-700">{copyStatus}</p>}
      <details className="mt-4 border-t border-stone-100 pt-3">
        <summary className="cursor-pointer text-sm font-bold text-stone-800">구매 수량·예산 계산</summary>
        <p className="mt-3 text-xs leading-5 text-stone-500">1속은 꽃 한 묶음이에요. 아래 본수는 참고값이므로 매장 판매단위로 바꿔주세요. 확인한 속당 단가를 모두 입력하면 남는 꽃과 합계를 계산합니다.</p>
        <div className="mt-3 space-y-3">{items.map(item => <div key={item.id} className="rounded-xl border border-stone-200 p-3">
          <p className="text-sm font-semibold">{item.name} · 필요 {item.quantity}송이</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="text-xs text-stone-600">1속 본수<input aria-label={`${market.marketName} ${item.name} 1속 본수`} type="number" min="1" max="200" step="1" value={packs[item.id] ?? item.pack ?? ""} onChange={event => setPacks(value => ({ ...value, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"/></label>
            <label className="text-xs text-stone-600">{demo ? "시연 예시 1속 가격 (원)" : "확인한 1속 가격 (원)"}<input aria-label={`${market.marketName} ${item.name} 1속 가격`} type="number" min="1" step="1" placeholder="매장에 문의한 가격" value={quotes[item.id] ?? item.price ?? ""} onChange={event => setQuotes(value => ({ ...value, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"/></label>
          </div>
          <p className="mt-2 text-xs text-stone-600">{item.bundles !== null ? `${item.bundles}속 구매 · 약 ${item.spareStems}송이 남음` : "판매단위 확인 필요"}{item.total !== null ? ` · ${won(item.total)}` : ""}</p>
        </div>)}</div>
        <label className="mt-3 block text-xs text-stone-600">포장·교통 등 추가비용 (원)<input aria-label={`${market.marketName} 추가비용`} type="number" min="0" value={extra} onChange={event => setExtra(event.target.value)} placeholder="0" className="ml-2 w-28 rounded-lg border p-2 text-sm"/></label>
        <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{total !== null ? `${demo ? "시연용 예시 구매예산" : "입력 단가 기준 구매예산"} ${won(total)}` : "모든 꽃의 본수와 매장 단가를 입력해주세요."}</p>
      </details>
      <details className="mt-3 border-t border-stone-100 pt-3 text-xs leading-5 text-stone-600">
        <summary className="cursor-pointer font-semibold">가격 근거·자료 확인</summary>
        {demo && <p className="mt-2 font-semibold text-amber-800">현재 금액은 발표·기능 테스트용 고정 예시 단가입니다. aT 수집값이나 실제 구매가 예측이 아니며, 검증된 실가격을 확보하면 경매 참고액으로 전환됩니다.</p>}
        <p className="mt-2">aT 공식 경매자료 중 절화·속 단위가 확인된 자료만 사용합니다. 최근 7일 중 거래량이 충분한 최대 3일의 거래량 가중평균이며, 매장 마진·품종·색상·등급·재고는 반영하지 않습니다. 소비자 구매가격의 예측 정확도는 아직 검증되지 않았습니다.</p>
        {flowers.map(flower => <div key={flower.id} className="mt-2 border-t border-stone-100 pt-2"><strong>{flower.name}</strong>{flower.reference?.average != null ? <p>1속 평균 {won(flower.reference.average)} · {flower.reference.dates.length}일 / {flower.reference.volume.toLocaleString()}속<br/>관측 일평균 범위 {won(flower.reference.low!)}~{won(flower.reference.high!)} (미래 구매가 범위 아님)</p> : <p>계산 가능한 검증 자료 없음</p>}{flower.reference?.sources.map(source => <p key={`${source.date}-${source.url}`}>{source.date} 거래 · {new Date(source.fetchedAt).toLocaleDateString("ko-KR")} 수집</p>)}</div>)}
        <div className="mt-3 flex flex-wrap gap-4"><a href={market.auctionInfoUrl ?? `/api/diy/public-markets/${market.id}/at`} target="_blank" rel="noreferrer" className="font-semibold text-sky-700 underline">이 공판장 aT 원자료 ↗</a>{market.visitSourceUrl && <a href={market.visitSourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">공식 방문 안내 ↗</a>}</div>
        <p className="mt-2">지도 좌표는 위치 참고용입니다. 정확한 출입구는 길찾기에서 확인해주세요.</p>
      </details>
    </div>
  </article>
}

export function PublicMarketGuide({ markets, flowers, onFocus }: { markets: PublicMarketView[]; flowers: FlowerPlan[]; onFocus: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false)
  const sorted = [...markets].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  return <section className="mt-6 border-t border-stone-200 pt-6" aria-label="공판장 방문 구매 안내">
    <h2 className="text-lg font-bold text-stone-900">가까운 공판장·방문 구매 안내</h2>
    <p className="mt-1 text-sm leading-6 text-stone-600">위치를 고르고, 구매할 꽃을 확인하고, 매장에 가격을 문의하세요. 가격 자료가 없는 공판장도 가까운 순서로 보여드려요.</p>
    <div className="mt-4 space-y-4">{(showAll ? sorted : sorted.slice(0, 3)).map(market => <MarketCard key={`${market.id}-${flowers.map(f => `${f.id}:${f.quantity}`).join(",")}`} market={market} flowers={market.flowers ?? flowers} onFocus={onFocus}/>)}</div>
    {markets.length > 3 && <button type="button" onClick={() => setShowAll(value => !value)} className="mt-4 w-full rounded-xl border border-stone-200 bg-white py-3 text-sm font-semibold">{showAll ? "가까운 3곳만 보기" : `전국 공판장 ${markets.length}곳 보기`}</button>}
  </section>
}

"use client"

import { useState } from "react"
import { NonghyupMark } from "@/components/brand/NonghyupMark"
import { estimatedMarketPurchase, purchaseLine, RETAIL_PLANNING, type auctionReference } from "@/lib/publicMarketPricing"
import type { MarketDirectory } from "@/lib/publicMarketDirectory"

type FlowerPlan = { id: string; name: string; quantity: number; group: string; stemsPerBundle: number | null; bundleCount?: number | null; spareStems?: number | null; averageBundlePrice?: number | null; referenceTotal?: number | null; reference?: ReturnType<typeof auctionReference> }
export type PublicMarketView = MarketDirectory & { sellerId: string; distanceKm: number | null; diyComplete: boolean; customComplete: boolean; flowers?: FlowerPlan[]; auctionReferenceTotal?: number | null; basisDate?: string | null; oldestBasisDate?: string | null; dataStatus?: string; marketInfoUrl?: string; auctionInfoUrl?: string }
type NearbyStore = { marketName: string; diyComplete: boolean; diyPrice: number | null; distanceKm: number | null }
const won = (value: number) => `${value.toLocaleString()}원`
const notCut = (id: string) => ["kflower-gwacheon", "kflower-eumseong", "kflower-goyang"].includes(id)
const priceSource = "https://flower.at.or.kr/yfmc/front/stat/aucPrice.do?menuId=23"

// 1속을 칸으로 나눠 필요한 줄기(채움)와 남는 줄기(빈칸)를 한눈에 보여준다
function BundleBlocks({ bundles, stemsPerBundle, needed }: { bundles: number; stemsPerBundle: number; needed: number }) {
  if (bundles > 4) return null
  return <span className="inline-flex gap-0.5" aria-hidden>{Array.from({ length: bundles }, (_, b) => <span key={b} className="inline-flex gap-px rounded p-px ring-1 ring-emerald-200">{Array.from({ length: stemsPerBundle }, (_, i) => <span key={i} className={`h-2.5 w-1 rounded-sm ${b * stemsPerBundle + i < needed ? "bg-emerald-500" : "bg-stone-200"}`}/>)}</span>)}</span>
}

function MarketCard({ market, flowers, wrappingPrice, nearest, onFocus }: { market: PublicMarketView; flowers: FlowerPlan[]; wrappingPrice: number; nearest?: NearbyStore; onFocus: (id: string) => void }) {
  const prediction = estimatedMarketPurchase(flowers, wrappingPrice)
  const mapUrl = market.marketInfoUrl ?? `https://map.naver.com/p/search/${encodeURIComponent(`${market.marketName} ${market.roadAddress}`)}`
  const shopTotal = nearest?.diyPrice ?? null
  // 범위 막대 위 중심값 위치 (%)
  const marker = prediction && prediction.high > prediction.low ? Math.min(100, Math.max(0, (prediction.estimate - prediction.low) / (prediction.high - prediction.low) * 100)) : 50
  return <article id={`market-${market.id}`} className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onFocus(market.sellerId)} title="지도에서 위치 보기" className="text-left font-bold text-stone-900 hover:underline">{market.marketName}</button>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">{market.isNonghyup ? <NonghyupMark compact className="rounded-full bg-white"/> : "🏛️"} 화훼공판장</span>
        </div>
        <p className="mt-1 text-xs text-stone-500">{market.roadAddress} · <a href={mapUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-emerald-700">길찾기 ↗</a></p>
        {market.distanceKm != null && <p className="mt-1 text-xs font-semibold text-emerald-700">현재 위치에서 약 {market.distanceKm}km</p>}
      </div>
      <div className="w-40 shrink-0 text-right text-xs text-stone-500 sm:w-48">
        {prediction ? <>
          <p>예상 구매예산 <strong className="text-base text-emerald-700">약 {won(prediction.estimate)}</strong></p>
          <div className="relative ml-auto mt-2 h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-200 via-emerald-400 to-amber-300"><span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-800 shadow" style={{ left: `${marker}%` }}/></div>
          <p className="mt-1 flex justify-between text-[10px]"><span>{won(prediction.low)}</span><span>{won(prediction.high)}</span></p>
          <p className="mt-1">꽃 {won(prediction.estimate - prediction.wrappingPrice)} + 포장 {won(prediction.wrappingPrice)}</p>
          <p>{prediction.purchased}줄기 구매 · {prediction.spare}줄기 남음</p>
        </> : <p className="leading-5">{market.auctionReferenceTotal != null ? `경매 참고액 ${won(market.auctionReferenceTotal)} · 매장 구매예산 분석 준비 중` : "선택 품목 자료 미확보 · 전체 구성의 합계는 산정할 수 없어요."}</p>}
      </div>
    </div>

    <div className="mt-3 flex flex-wrap gap-1.5">{flowers.map(f => {
      const plan = purchaseLine(f.quantity, f.stemsPerBundle, f.reference?.average ?? null)
      const storePrice = plan.total != null ? Math.round(plan.total * RETAIL_PLANNING.midpointMultiplier / 100) * 100 : null
      return <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[11px] text-stone-600">
        {f.name} {f.quantity}송이
        {plan.bundles != null && f.stemsPerBundle ? <><span className="text-stone-300">→</span><BundleBlocks bundles={plan.bundles} stemsPerBundle={f.stemsPerBundle} needed={f.quantity}/><strong className="text-emerald-800">{plan.bundles}속</strong></> : <span className="text-stone-400">· 묶음 매장 확인</span>}
        {storePrice != null && <span className="text-stone-400">약 {won(storePrice)}</span>}
      </span>})}</div>
    <p className="mt-1.5 text-[10px] text-stone-400"><span className="mr-1 inline-block h-2 w-1 rounded-sm bg-emerald-500 align-middle"/>쓰는 줄기 <span className="ml-1.5 mr-1 inline-block h-2 w-1 rounded-sm bg-stone-200 align-middle"/>남는 줄기 · 묶음(속) 단위로만 살 수 있어 남는 꽃이 생겨요</p>

    {shopTotal != null && prediction && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-stone-600"><strong className="text-stone-800">가까운 꽃 매장과 비교</strong> · {nearest!.marketName} {won(shopTotal)} — {shopTotal > prediction.high ? `공판장이 약 ${won(shopTotal - prediction.estimate)} 저렴하지만 ${prediction.spare}줄기가 남아요.` : shopTotal < prediction.low ? `필요한 만큼만 사는 꽃 매장이 약 ${won(prediction.estimate - shopTotal)} 저렴해요.` : "비슷한 가격대예요. 거리와 남는 꽃을 함께 비교하세요."}</p>}
    <details className="mt-3 text-xs text-stone-500"><summary className="cursor-pointer font-semibold">이 금액의 경매자료 보기</summary><p className="mt-2">{market.oldestBasisDate ?? market.basisDate ?? "최근 자료 없음"}{market.basisDate ? ` ~ ${market.basisDate}` : ""} · 해당 공판장 품목 전체 기준</p>{flowers.map(f => <p key={f.id} className="mt-1">{f.name}: {f.reference?.average != null ? `1속 ${won(f.reference.average)} · ${f.reference.dates.length}거래일 / ${f.reference.volume.toLocaleString()}속` : "계산 가능한 자료 없음"}</p>)}{market.publicPhone && <a href={`tel:${market.publicPhone}`} className="mt-2 block">매장 안내 문의 {market.publicPhone}</a>}<a href={market.auctionInfoUrl ?? `/api/diy/public-markets/${market.id}/at`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-emerald-700 underline">공식 원자료 ↗</a></details>
  </article>
}

export function PublicMarketGuide({ markets, flowers, onFocus, wrappingPrice = 0, nearbyStores = [] }: { markets: PublicMarketView[]; flowers: FlowerPlan[]; onFocus: (id: string) => void; wrappingPrice?: number; nearbyStores?: NearbyStore[] }) {
  const [showAll, setShowAll] = useState(false)
  const sorted = markets.filter(m => !notCut(m.id)).sort((a,b) => Number(b.auctionReferenceTotal != null) - Number(a.auctionReferenceTotal != null) || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  const nearest = [...nearbyStores].filter(s => s.diyComplete && s.diyPrice != null && s.distanceKm != null).sort((a,b) => a.distanceKm! - b.distanceKm!)[0]
  return <section className="mt-6 border-t border-stone-200 pt-6" aria-label="공판장 방문 구매 안내">
    <h2 className="text-lg font-bold">공판장 주변에서 사면 얼마나 들까요?</h2>
    <p className="mt-2 text-sm leading-6 text-stone-600">필요 수량을 묶음 단위로 올림해, 남는 꽃까지 포함한 구매예산을 자동 분석합니다. 실제 절화 경매자료가 있는 가까운 곳부터 비교하세요.</p>
    <aside className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-stone-700" aria-label="꽃시장 이용 안내">
      <h3 className="font-bold text-emerald-900">꽃시장 처음이라면, 이것만 확인하세요</h3>
      <p className="mt-2"><strong>공판장은 경매가 열리는 유통시설입니다.</strong> 경매 참여는 자격을 갖춘 중도매인 등의 절차가 필요해요. 일반 방문객은 경매에 바로 참여하는 대신 생화 도매시장 입점 매장에서 구매하는 경로를 이용하세요.</p>
      <p className="mt-2"><strong>1속(1단)은 꽃 한 묶음, 1본은 줄기 하나예요.</strong> 모든 꽃이 10송이인 것은 아닙니다. 표의 본수는 계산용 기준이며 매장·품종별로 달라요. 여러 꽃이 달린 백합·스프레이 장미는 꽃머리 개수와 줄기 수가 다릅니다.</p>
      <p className="mt-2"><strong>예산은 경매 낙찰가에 꽃시장 매장 가산율을 반영한 금액입니다.</strong> 최근 7일의 유효 경매 최대 3일을 거래량으로 가중평균하고, 양재는 월·수·금 본경매만 반영해요. 색상·등급과 당일 재고는 매장에서 확인하세요.</p>
      <details className="mt-3 border-t border-emerald-200 pt-2"><summary className="cursor-pointer font-semibold">예측 기준과 공식 안내</summary><p className="mt-2">매장 가산율은 꽃시장 구매 후기의 1단 구매가를 같은 시기 aT 경락가와 비교해 정했어요(약 1.1~1.45배). 중심값은 경매 평균 × {RETAIL_PLANNING.midpointMultiplier}, 범위는 관측 일평균 최저 × {RETAIL_PLANNING.lowMultiplier} ~ 최고 × {RETAIL_PLANNING.highMultiplier}에 구매 속수를 곱하고 선택 포장비를 더합니다. 교통비는 제외합니다.</p><div className="mt-2 flex flex-wrap gap-x-4"><a className="underline" href={priceSource} target="_blank" rel="noreferrer">aT 경매 단위·시세 안내 ↗</a><a className="underline" href="https://flower.at.or.kr/yfmc/front/market/list.do?menuId=13&tyGroupCode=3" target="_blank" rel="noreferrer">aT 생화 판매점 ↗</a><a className="underline" href="https://flower.at.or.kr/yfmc/front/board/bbsView.do?articleId=952&boardId=6&menuId=9" target="_blank" rel="noreferrer">중도매인 모집·자격 안내 ↗</a></div></details>
    </aside>
    <div className="mt-4 space-y-4">{(showAll ? sorted : sorted.slice(0,3)).map(market => <MarketCard key={market.id} market={market} flowers={market.flowers ?? flowers} wrappingPrice={wrappingPrice} nearest={nearest} onFocus={onFocus}/>)}</div>
    {sorted.length > 3 && <button type="button" onClick={() => setShowAll(v=>!v)} className="mt-4 w-full rounded-xl border bg-white py-3 text-sm font-semibold">{showAll ? "가까운 추천 3곳만 보기" : `절화 공판장 ${sorted.length}곳 전체 보기`}</button>}
    <details className="mt-4 rounded-xl bg-stone-50 p-4 text-sm leading-6"><summary className="cursor-pointer font-semibold">과천·음성·고양은 왜 꽃다발 가격 비교에서 빠졌나요?</summary><p className="mt-2">한국화훼농협 공식 안내상 과천은 난, 음성은 난·관엽, 고양은 난 경매를 운영합니다. 꽃다발용 절화 경매장과 구분해야 해요.</p><p className="mt-2">2026-10-15 확인: 7월 17일~10월 15일의 aT 공개 파일 목록에서 과천은 0건, 음성은 21건, 고양은 11건이었습니다. 음성에는 장미 이름이 들어간 행도 있었지만 분화·난·관엽 거래자료이므로 절화 장미 시세로 사용하지 않습니다. 과천에 경매가 없다는 뜻은 아닙니다.</p><a href="https://kflower.nonghyup.com/kflower/99791/subview.do" target="_blank" rel="noreferrer" className="text-sky-700 underline">한국화훼농협 경매사업 안내 ↗</a></details>
  </section>
}

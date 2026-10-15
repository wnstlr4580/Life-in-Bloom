"use client"

import { useState } from "react"
import { NonghyupMark } from "@/components/brand/NonghyupMark"
import { estimatedMarketPurchase, purchaseLine, type auctionReference } from "@/lib/publicMarketPricing"
import type { MarketDirectory } from "@/lib/publicMarketDirectory"

type FlowerPlan = { id: string; name: string; quantity: number; group: string; stemsPerBundle: number | null; bundleCount?: number | null; spareStems?: number | null; averageBundlePrice?: number | null; referenceTotal?: number | null; reference?: ReturnType<typeof auctionReference> }
export type PublicMarketView = MarketDirectory & { sellerId: string; distanceKm: number | null; diyComplete: boolean; customComplete: boolean; flowers?: FlowerPlan[]; auctionReferenceTotal?: number | null; basisDate?: string | null; oldestBasisDate?: string | null; dataStatus?: string; marketInfoUrl?: string; auctionInfoUrl?: string }
type NearbyStore = { marketName: string; diyComplete: boolean; diyPrice: number | null; distanceKm: number | null }
const won = (value: number) => `${value.toLocaleString()}원`
const notCut = (id: string) => ["kflower-gwacheon", "kflower-eumseong", "kflower-goyang"].includes(id)
const priceSource = "https://flower.at.or.kr/yfmc/front/stat/aucPrice.do?menuId=23"

function MarketCard({ market, flowers, wrappingPrice, nearest, onFocus }: { market: PublicMarketView; flowers: FlowerPlan[]; wrappingPrice: number; nearest?: NearbyStore; onFocus: (id: string) => void }) {
  const prediction = estimatedMarketPurchase(flowers, wrappingPrice)
  const mapUrl = market.marketInfoUrl ?? `https://map.naver.com/p/search/${encodeURIComponent(`${market.marketName} ${market.roadAddress}`)}`
  const shopTotal = nearest?.diyPrice != null ? nearest.diyPrice + wrappingPrice : null
  return <article id={`market-${market.id}`} className="overflow-hidden rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5">
    <div className="flex items-start gap-3">
      {market.isNonghyup ? <NonghyupMark compact className="rounded-xl bg-emerald-50 p-3"/> : <span className="rounded-xl bg-sky-50 p-3">🏛️</span>}
      <div className="min-w-0 flex-1"><h3 className="font-bold">{market.marketName}</h3><p className="mt-1 text-sm text-stone-600">{market.distanceKm != null ? `직선 약 ${market.distanceKm}km · ` : ""}주변 생화 판매점 구매 기준</p></div>
      <button type="button" onClick={() => onFocus(market.sellerId)} className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold text-emerald-700">지도에서 보기</button>
    </div>
    <p className="mt-2 text-sm text-stone-500">{market.roadAddress}</p>
    <div className="mt-4 rounded-xl bg-emerald-50 p-4">
      <p className="text-sm font-semibold text-emerald-800">경매가 기반 예상 구매예산</p>
      {prediction ? <><p className="mt-1 text-2xl font-bold text-emerald-900">약 {won(prediction.estimate)}</p><p className="mt-1 text-sm text-emerald-900">예산 범위 {won(prediction.low)}~{won(prediction.high)}</p><p className="mt-2 text-sm text-stone-700">총 {prediction.purchased}줄기 구매 · 사용 후 약 {prediction.spare}줄기 남음</p><p className="mt-1 text-sm text-stone-600">포장 재료 {won(wrappingPrice)} 포함 · 제작·배송·교통비 제외</p></> : <p className="mt-2 text-sm">{market.auctionReferenceTotal != null ? `경매 참고액 ${won(market.auctionReferenceTotal)} · 매장 구매예산 분석 준비 중` : "선택 품목 자료 미확보 · 전체 구성의 합계는 산정할 수 없어요."}</p>}
      {prediction && <p className="mt-3 border-t border-emerald-200 pt-2 text-sm text-stone-700">초기 추정 범위 · 실제 매장 견적으로 정확도를 검증하기 전입니다.</p>}
    </div>
    <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-2 text-left font-bold">묶음 단위로 자동 계산한 구매량</caption><thead className="text-stone-500"><tr><th className="py-2">꽃 / 필요량</th><th>구매 단위 가정</th><th>구매 / 남음</th><th className="text-right">경매 기준</th></tr></thead><tbody>{flowers.map(f => { const plan = purchaseLine(f.quantity, f.stemsPerBundle, f.reference?.average ?? null); return <tr key={f.id} className="border-t border-stone-100"><td className="py-3 pr-2 font-medium">{f.name}<br/>{f.quantity}줄기</td><td>{f.stemsPerBundle ? `1속 ${f.stemsPerBundle}줄기` : "중량·묶음 규격 확인 필요"}</td><td>{plan.bundles != null ? `${plan.bundles}속 / ${plan.spareStems}줄기` : "산정 제외"}</td><td className="text-right">{plan.total != null ? won(plan.total) : "자료 없음"}</td></tr>})}</tbody></table></div>
    {shopTotal != null && <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm"><strong>가까운 꽃집과 비교</strong><p className="mt-1">{nearest!.marketName} · 필요한 수량만 구매 {won(shopTotal)}</p>{prediction && <p className="mt-1">{shopTotal > prediction.high ? `묶음 구매 예산의 상한보다 약 ${won(shopTotal - prediction.high)} 높아요.` : shopTotal < prediction.low ? `소량 구매는 꽃집이 예산 하한보다 약 ${won(prediction.low - shopTotal)} 저렴해요.` : "꽃집 가격이 예상 범위 안에 있어요. 거리와 남는 꽃을 함께 비교하세요."}</p>}<p className="mt-1 text-stone-500">꽃집은 등록 재료 단가, 공판장 주변은 추정값 · 두 금액 모두 선택 포장비 포함</p></div>}
    <div className="mt-4 flex flex-wrap gap-2"><a href={mapUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">주변 매장·길찾기 ↗</a>{market.publicPhone && <a href={`tel:${market.publicPhone}`} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">매장 안내 문의</a>}</div>
    <details className="mt-4 border-t pt-3 text-sm text-stone-600"><summary className="cursor-pointer font-semibold">이 금액의 경매자료 보기</summary><p className="mt-2">{market.oldestBasisDate ?? market.basisDate ?? "최근 자료 없음"}{market.basisDate ? ` ~ ${market.basisDate}` : ""} · 해당 공판장 품목 전체 기준</p>{flowers.map(f => <p key={f.id} className="mt-2">{f.name}: {f.reference?.average != null ? `1속 ${won(f.reference.average)} · ${f.reference.dates.length}거래일 / ${f.reference.volume.toLocaleString()}속` : "계산 가능한 자료 없음"}</p>)}<a href={market.auctionInfoUrl ?? `/api/diy/public-markets/${market.id}/at`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sky-700 underline">공식 원자료 ↗</a></details>
  </article>
}

export function PublicMarketGuide({ markets, flowers, onFocus, wrappingPrice = 0, nearbyStores = [] }: { markets: PublicMarketView[]; flowers: FlowerPlan[]; onFocus: (id: string) => void; wrappingPrice?: number; nearbyStores?: NearbyStore[] }) {
  const [showAll, setShowAll] = useState(false)
  const sorted = markets.filter(m => !notCut(m.id)).sort((a,b) => Number(b.auctionReferenceTotal != null) - Number(a.auctionReferenceTotal != null) || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  const nearest = [...nearbyStores].filter(s => s.diyComplete && s.diyPrice != null && s.distanceKm != null).sort((a,b) => a.distanceKm! - b.distanceKm!)[0]
  return <section className="mt-6 border-t border-stone-200 pt-6" aria-label="공판장 방문 구매 안내">
    <h2 className="text-lg font-bold">공판장 주변에서 사면 얼마나 들까요?</h2>
    <p className="mt-2 text-sm leading-6 text-stone-600">필요 수량을 묶음 단위로 올림해, 남는 꽃까지 포함한 구매예산을 자동 분석합니다. 실제 절화 경매자료가 있는 가까운 곳부터 비교하세요.</p>
    <aside className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-stone-700" aria-label="꽃시장 이용 안내">
      <h3 className="font-bold text-sky-900">꽃시장 처음이라면, 이것만 확인하세요</h3>
      <p className="mt-2"><strong>공판장은 경매가 열리는 유통시설입니다.</strong> 경매 참여는 자격을 갖춘 중도매인 등의 절차가 필요해요. 일반 방문객은 경매에 바로 참여하는 대신 생화 도매시장 입점 매장에서 구매하는 경로를 이용하세요.</p>
      <p className="mt-2"><strong>1속(1단)은 꽃 한 묶음, 1본은 줄기 하나예요.</strong> 모든 꽃이 10송이인 것은 아닙니다. 표의 본수는 계산용 기준이며 매장·품종별로 달라요. 여러 꽃이 달린 백합·스프레이 장미는 꽃머리 개수와 줄기 수가 다릅니다.</p>
      <p className="mt-2"><strong>예산은 경매 낙찰가에 매장 유통비를 더한 추정입니다.</strong> 최근 7일의 유효 경매 최대 3일을 거래량으로 가중평균합니다. 양재는 월·수·금 본경매만 반영해요. 색상·등급과 당일 재고는 아직 확인된 값이 아닙니다.</p>
      <details className="mt-3 border-t border-sky-200 pt-2"><summary className="cursor-pointer font-semibold">예측 기준과 공식 안내</summary><p className="mt-2">매장 가산율은 아직 실구매 영수증으로 보정하지 못한 초기 가정입니다. 중심값은 경매 평균 × 1.4, 범위는 관측 일평균 최저 × 1.2 ~ 최고 × 1.6에 구매 속수를 곱하고 선택 포장비를 더합니다. 통계적 신뢰구간이나 매장 확정 견적이 아닙니다. 제작비·배송비·교통비는 제외합니다.</p><div className="mt-2 flex flex-wrap gap-x-4"><a className="underline" href={priceSource} target="_blank" rel="noreferrer">aT 경매 단위·시세 안내 ↗</a><a className="underline" href="https://flower.at.or.kr/yfmc/front/market/list.do?menuId=13&tyGroupCode=3" target="_blank" rel="noreferrer">aT 생화 판매점 ↗</a><a className="underline" href="https://flower.at.or.kr/yfmc/front/board/bbsView.do?articleId=952&boardId=6&menuId=9" target="_blank" rel="noreferrer">중도매인 모집·자격 안내 ↗</a></div></details>
    </aside>
    <div className="mt-4 space-y-4">{(showAll ? sorted : sorted.slice(0,3)).map(market => <MarketCard key={market.id} market={market} flowers={market.flowers ?? flowers} wrappingPrice={wrappingPrice} nearest={nearest} onFocus={onFocus}/>)}</div>
    {sorted.length > 3 && <button type="button" onClick={() => setShowAll(v=>!v)} className="mt-4 w-full rounded-xl border bg-white py-3 text-sm font-semibold">{showAll ? "가까운 추천 3곳만 보기" : `절화 공판장 ${sorted.length}곳 전체 보기`}</button>}
    <details className="mt-4 rounded-xl bg-stone-50 p-4 text-sm leading-6"><summary className="cursor-pointer font-semibold">과천·음성·고양은 왜 꽃다발 가격 비교에서 빠졌나요?</summary><p className="mt-2">한국화훼농협 공식 안내상 과천은 난, 음성은 난·관엽, 고양은 난 경매를 운영합니다. 꽃다발용 절화 경매장과 구분해야 해요.</p><p className="mt-2">2026-10-15 확인: 7월 17일~10월 15일의 aT 공개 파일 목록에서 과천은 0건, 음성은 21건, 고양은 11건이었습니다. 음성에는 장미 이름이 들어간 행도 있었지만 분화·난·관엽 거래자료이므로 절화 장미 시세로 사용하지 않습니다. 과천에 경매가 없다는 뜻은 아닙니다.</p><a href="https://kflower.nonghyup.com/kflower/99791/subview.do" target="_blank" rel="noreferrer" className="text-sky-700 underline">한국화훼농협 경매사업 안내 ↗</a></details>
  </section>
}

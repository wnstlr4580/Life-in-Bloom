"use client"

import { useEffect, useRef, useState } from "react"
import { OFFICIAL_NONGHYUP_SYMBOL } from "@/components/brand/NonghyupMark"

type MapSeller = {
  sellerId: string
  marketName: string
  roadAddress?: string
  publicPhone?: string | null
  distanceKm?: number | null
  latitude: number | null
  longitude: number | null
  diyComplete: boolean
  customComplete: boolean
  marketType?: string
  auctionReferenceTotal?: number | null
  isNonghyup?: boolean
}

type NaverLatLng = object
type NaverMap = { fitBounds: (points: NaverLatLng[], options?: object) => void; setCenter: (point: NaverLatLng) => void; setZoom: (zoom: number) => void; destroy: () => void }
type NaverMaps = {
  LatLng: new (latitude: number, longitude: number) => NaverLatLng
  Map: new (container: HTMLElement, options: { center: NaverLatLng; zoom: number }) => NaverMap
  Marker: new (options: { map: NaverMap; position: NaverLatLng; title?: string; icon?: object }) => object
  Circle: new (options: { map: NaverMap; center: NaverLatLng; radius: number; strokeColor: string; strokeOpacity: number; strokeWeight: number; fillColor: string; fillOpacity: number }) => object
  InfoWindow: new (options: { content: HTMLElement; borderWidth?: number; backgroundColor?: string; anchorSize?: object; pixelOffset?: object }) => { open: (map: NaverMap, marker: object) => void; close: () => void }
  Event: { addListener: (target: object, eventName: string, listener: () => void) => void }
  Point: new (x: number, y: number) => object
  Size: new (width: number, height: number) => object
}

declare global {
  interface Window {
    naver?: { maps: NaverMaps }
  }
}

const naverSearchUrl = (seller: MapSeller) =>
  `https://map.naver.com/p/search/${encodeURIComponent(`${seller.marketName} ${seller.roadAddress ?? ""}`.trim())}`

function createInfoContent(seller: MapSeller) {
  const content = document.createElement("div")
  content.style.cssText = "min-width:220px;max-width:280px;padding:14px;font-family:system-ui,sans-serif;color:#292524"

  const title = document.createElement("strong")
  if (seller.isNonghyup) {
    const mark = document.createElement("img")
    mark.src = OFFICIAL_NONGHYUP_SYMBOL
    mark.alt = "농협 심벌"
    mark.style.cssText = "width:22px;height:22px;object-fit:contain;float:left;margin-right:6px"
    content.appendChild(mark)
  }
  title.textContent = seller.marketName
  title.style.cssText = `display:block;font-size:14px;margin-bottom:6px;${seller.isNonghyup ? "color:#047857" : ""}`
  content.appendChild(title)

  const details = document.createElement("p")
  const modes = seller.marketType ?? [seller.diyComplete ? "직접 만들기" : "", seller.customComplete ? "제작 주문" : ""].filter(Boolean).join(" · ")
  details.textContent = [seller.roadAddress, seller.publicPhone, seller.distanceKm != null ? `현재 위치에서 약 ${seller.distanceKm}km` : "", modes, seller.auctionReferenceTotal != null ? `경매 기준 참고액 ${seller.auctionReferenceTotal.toLocaleString()}원 · 매장 판매가 별도 확인` : seller.marketType ? "매장 판매가 문의 필요" : ""].filter(Boolean).join("\n")
  details.style.cssText = "margin:0 0 10px;white-space:pre-line;font-size:12px;line-height:1.55;color:#78716c"
  content.appendChild(details)

  const link = document.createElement("a")
  link.href = naverSearchUrl(seller)
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  link.textContent = "네이버지도 업체정보 · 길찾기"
  link.style.cssText = "display:block;padding:9px 10px;border-radius:8px;background:#03c75a;color:white;text-align:center;font-size:12px;font-weight:700;text-decoration:none"
  content.appendChild(link)
  return content
}

export function SellerMap({ latitude, longitude, radiusKm, sellers, focusSellerId, onClearFocus }: { latitude: number | null; longitude: number | null; radiusKm: number; sellers: MapSeller[]; focusSellerId?: string | null; onClearFocus?: () => void }) {
  const [view, setView] = useState<"nearby" | "all" | "me">("nearby")
  const mapRef = useRef<NaverMap | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState("")
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID

  useEffect(() => {
    if (!clientId || !containerRef.current) return

    let cancelled = false

    const draw = () => {
      if (cancelled || !containerRef.current || !window.naver?.maps) return
      try {
        setError("")
        const maps = window.naver.maps
        const hasLocation = latitude !== null && longitude !== null
        const currentPosition = new maps.LatLng(latitude ?? 36.5, longitude ?? 127.8)
        const zoom = radiusKm <= 1 ? 15 : radiusKm <= 2 ? 14 : radiusKm <= 3 ? 13 : radiusKm <= 5 ? 12 : 11
        // React 재실행 시 이전 지도의 DOM을 남기지 않는다.
        mapRef.current?.destroy()
        containerRef.current.replaceChildren()
        // Include the nearest markets even when they lie outside the shop-search radius.
        const map = new maps.Map(containerRef.current, { center: currentPosition, zoom })
        mapRef.current = map
        const markets = sellers.filter(seller => seller.marketType && seller.latitude != null && seller.longitude != null)
          .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
        const focused = sellers.find(seller => seller.sellerId === focusSellerId)
        if (focused?.latitude != null && focused.longitude != null) {
          map.setCenter(new maps.LatLng(focused.latitude, focused.longitude))
          map.setZoom(14)
        } else if (view !== "me" && markets.length) {
          const targets = view === "all" || !hasLocation ? markets : markets.slice(0, 3)
          map.fitBounds([...(hasLocation ? [currentPosition] : []), ...targets.map(seller => new maps.LatLng(seller.latitude!, seller.longitude!))], { top: 70, right: 60, bottom: 60, left: 60, maxZoom: 13 })
        }

        if (hasLocation) new maps.Circle({
        map,
        center: currentPosition,
        radius: radiusKm * 1000,
        strokeColor: "#059669",
        strokeOpacity: 0.75,
        strokeWeight: 2,
        fillColor: "#10b981",
        fillOpacity: 0.08,
      })

        if (hasLocation) new maps.Marker({
        map,
        position: currentPosition,
        title: "내 현재 위치",
        icon: {
          content: '<div style="display:flex;flex-direction:column;align-items:center;white-space:nowrap;transform:translate(-50%,-50%)"><span style="padding:4px 8px;border-radius:12px;background:#2563eb;color:#fff;font:700 11px system-ui;box-shadow:0 2px 8px #1d4ed866">현재 위치</span><span style="width:16px;height:16px;margin-top:3px;border:4px solid white;border-radius:50%;background:#2563eb;box-shadow:0 1px 6px #1d4ed8"></span></div>',
          anchor: new maps.Point(0, 0),
        },
      })

        let openedInfo: { close: () => void } | null = null
        sellers.filter((seller) => seller.latitude !== null && seller.longitude !== null).forEach((seller) => {
        if (seller.latitude === null || seller.longitude === null) return
        const position = new maps.LatLng(seller.latitude, seller.longitude)
        const icon = document.createElement("button")
        icon.type = "button"
        icon.setAttribute("aria-label", `${seller.marketName} 상세정보`)
        icon.style.cssText = "display:flex;align-items:center;gap:5px;padding:6px 9px;white-space:nowrap;transform:translate(-50%,-100%);border:2px solid white;border-radius:12px;background:#fff;box-shadow:0 2px 8px #0003;color:#047857;font:700 11px system-ui;cursor:pointer"
        if (seller.isNonghyup) {
          const symbol = document.createElement("img")
          symbol.src = OFFICIAL_NONGHYUP_SYMBOL
          symbol.alt = "농협"
          symbol.style.cssText = "width:21px;height:25px;object-fit:contain"
          icon.appendChild(symbol)
        }
        const label = document.createElement("span")
        label.textContent = seller.marketName
        icon.appendChild(label)
        const marker = new maps.Marker({
          map,
          position,
          title: seller.marketName,
          ...(seller.marketType ? { icon: { content: icon, anchor: new maps.Point(0, 0) } } : {}),
        })
        const info = new maps.InfoWindow({
          content: createInfoContent(seller),
          borderWidth: 0,
          backgroundColor: "white",
          anchorSize: new maps.Size(12, 8),
          pixelOffset: new maps.Point(0, -8),
        })
        if (seller.sellerId === focusSellerId) { info.open(map, marker); openedInfo = info }
        maps.Event.addListener(marker, "click", () => {
          openedInfo?.close()
          info.open(map, marker)
          openedInfo = info
        })
        })
      } catch (cause) {
        console.error("[SellerMap] Naver map initialization failed", cause)
        setError("네이버 지도 초기화에 실패했어요. 잠시 후 새로고침해 주세요.")
      }
    }

    const waitForSdk = () => {
      const startedAt = Date.now()
      const check = () => {
        if (cancelled) return
        if (window.naver?.maps?.Map) {
          draw()
          return
        }
        if (Date.now() - startedAt >= 5000) {
          setError("네이버 지도 SDK 초기화가 지연되고 있어요. Client ID와 Web 서비스 URL을 확인해 주세요.")
          return
        }
        window.setTimeout(check, 50)
      }
      check()
    }

    if (window.naver?.maps?.Map) { draw(); return () => { cancelled = true; mapRef.current?.destroy(); mapRef.current = null } }
    const existing = document.querySelector<HTMLScriptElement>('script[data-naver-map="true"]')
    if (existing) {
      waitForSdk()
      return () => { cancelled = true; mapRef.current?.destroy(); mapRef.current = null }
    }
    const script = document.createElement("script")
    script.dataset.naverMap = "true"
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`
    script.async = true
    script.onload = waitForSdk
    script.onerror = () => setError("네이버 지도를 불러오지 못했어요. Web Dynamic Map 사용 설정과 등록 URL을 확인해 주세요.")
    document.head.appendChild(script)
    return () => { cancelled = true; mapRef.current?.destroy(); mapRef.current = null }
  }, [clientId, latitude, longitude, radiusKm, sellers, view, focusSellerId])

  if (!clientId) return <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">네이버 지도 Client ID가 설정되지 않았어요.</p>
  return <div>
    {(latitude === null || longitude === null) && <p className="mb-2 text-xs text-stone-600">현재 좌표를 확인하지 못해 전국 공판장을 보여드려요. 카드의 ‘지도에서 보기’로 이동할 수 있어요.</p>}
    <div className="mb-2 flex flex-wrap gap-2" aria-label="지도 범위 선택">
      {([ ["nearby", "가까운 공판장 3곳"], ["all", "전국 공판장"], ["me", "내 주변 꽃집"] ] as const).map(([value, label]) => <button key={value} type="button" disabled={value === "me" && (latitude === null || longitude === null)} aria-pressed={view === value} onClick={() => { onClearFocus?.(); setView(value) }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${view === value ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-stone-200 bg-white text-stone-600"}`}>{label}</button>)}
    </div>
    {error && <p role="alert" className="mb-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-600">지도를 불러오지 못했어요. 아래 카드의 길찾기를 이용해주세요.</p>}
    <div ref={containerRef} className="h-96 w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100" aria-label="내 위치와 농협·공공 화훼공판장 지도" />
    <p className="mt-2 text-xs text-stone-500">파란 점: 내 위치 · 농협 심벌: 농협 공판장 · 거리: 직선거리 (이동거리는 길찾기에서 확인)</p>
  </div>
}

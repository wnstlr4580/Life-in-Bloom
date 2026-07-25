"use client"

import { useEffect, useRef, useState } from "react"

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
}

type NaverLatLng = object
type NaverMap = object
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
  title.textContent = seller.marketName
  title.style.cssText = "display:block;font-size:14px;margin-bottom:6px"
  content.appendChild(title)

  const details = document.createElement("p")
  const modes = [seller.diyComplete ? "직접 만들기" : "", seller.customComplete ? "제작 주문" : ""].filter(Boolean).join(" · ")
  details.textContent = [seller.roadAddress, seller.publicPhone, seller.distanceKm != null ? `현재 위치에서 약 ${seller.distanceKm}km` : "", modes].filter(Boolean).join("\n")
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

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = (value: number) => value * Math.PI / 180
  const dLat = radians(lat2 - lat1)
  const dLng = radians(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function SellerMap({ latitude, longitude, radiusKm, sellers }: { latitude: number | null; longitude: number | null; radiusKm: number; sellers: MapSeller[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState("")
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID

  useEffect(() => {
    if (!clientId || !containerRef.current || latitude === null || longitude === null) return

    const draw = () => {
      if (!containerRef.current || !window.naver?.maps) {
        setError("네이버 지도 SDK를 불러오지 못했어요. Client ID와 Web 서비스 URL을 확인해 주세요.")
        return
      }
      setError("")
      const maps = window.naver.maps
      const currentPosition = new maps.LatLng(latitude, longitude)
      const zoom = radiusKm <= 1 ? 15 : radiusKm <= 2 ? 14 : radiusKm <= 3 ? 13 : 12
      const map = new maps.Map(containerRef.current, { center: currentPosition, zoom })

      new maps.Circle({
        map,
        center: currentPosition,
        radius: radiusKm * 1000,
        strokeColor: "#059669",
        strokeOpacity: 0.75,
        strokeWeight: 2,
        fillColor: "#10b981",
        fillOpacity: 0.08,
      })

      new maps.Marker({
        map,
        position: currentPosition,
        title: "내 현재 위치",
        icon: {
          content: '<div style="display:flex;flex-direction:column;align-items:center;white-space:nowrap;transform:translate(-50%,-50%)"><span style="padding:4px 8px;border-radius:12px;background:#2563eb;color:#fff;font:700 11px system-ui;box-shadow:0 2px 8px #1d4ed866">현재 위치</span><span style="width:16px;height:16px;margin-top:3px;border:4px solid white;border-radius:50%;background:#2563eb;box-shadow:0 1px 6px #1d4ed8"></span></div>',
          anchor: new maps.Point(0, 0),
        },
      })

      let openedInfo: { close: () => void } | null = null
      sellers.filter((seller) => seller.latitude !== null && seller.longitude !== null
        && distanceKm(latitude, longitude, seller.latitude, seller.longitude) <= radiusKm)
        .forEach((seller) => {
        if (seller.latitude === null || seller.longitude === null) return
        const position = new maps.LatLng(seller.latitude, seller.longitude)
        const marker = new maps.Marker({ map, position, title: seller.marketName })
        const info = new maps.InfoWindow({
          content: createInfoContent(seller),
          borderWidth: 0,
          backgroundColor: "white",
          anchorSize: new maps.Size(12, 8),
          pixelOffset: new maps.Point(0, -8),
        })
        maps.Event.addListener(marker, "click", () => {
          openedInfo?.close()
          info.open(map, marker)
          openedInfo = info
        })
      })
    }

    if (window.naver?.maps) { draw(); return }
    const existing = document.querySelector<HTMLScriptElement>('script[data-naver-map="true"]')
    if (existing) {
      existing.addEventListener("load", draw, { once: true })
      return () => existing.removeEventListener("load", draw)
    }
    const script = document.createElement("script")
    script.dataset.naverMap = "true"
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`
    script.async = true
    script.onload = draw
    script.onerror = () => setError("네이버 지도를 불러오지 못했어요. Web Dynamic Map 사용 설정과 등록 URL을 확인해 주세요.")
    document.head.appendChild(script)
  }, [clientId, latitude, longitude, radiusKm, sellers])

  if (!clientId) return <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">네이버 지도 Client ID가 설정되지 않았어요.</p>
  if (latitude === null || longitude === null) return <p className="rounded-xl bg-stone-50 p-3 text-xs text-stone-500">위치를 확인하면 판매처 지도를 보여드려요.</p>
  if (error) return <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-600">{error}</p>
  return <div ref={containerRef} className="h-80 w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100" aria-label="네이버 지도에 표시한 내 위치와 판매처" />
}

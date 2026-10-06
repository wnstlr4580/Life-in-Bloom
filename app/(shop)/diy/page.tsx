"use client"

import Image from "next/image"
import { useCallback, useMemo, useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { nanoid } from "nanoid"
import { Check, ExternalLink, LocateFixed, MapPin, Minus, Plus, RefreshCw, RotateCcw, Search, Scissors, Sparkles, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildBouquetPrompt, COLOR_FILTER, COLOR_LABEL, FLOWERS, SIZES, WRAPPING } from "@/lib/customFlowers"
import { birthFlowerSelection, flowerBirthDates, flowerMeaning, flowerMonths, flowerOccasions, isMonthFlower, isOccasionFlower, OCCASIONS } from "@/lib/diyFlowerTags"
import { useCartStore } from "@/store/cartStore"
import { SellerMap } from "@/components/shop/SellerMap"
import { NonghyupMark } from "@/components/brand/NonghyupMark"

type LocationState = {
  address: string
  latitude: number | null
  longitude: number | null
  source: "gps" | "address" | null
}
type MatchItem = {
  id: string
  name: string
  requested: number
  available: number
  unitPrice: number | null
  subtotal: number | null
}
type Match = {
  sellerId: string
  marketName: string
  sellerType: string
  roadAddress: string
  detailAddress: string
  publicPhone: string | null
  distanceKm: number | null
  latitude: number | null
  longitude: number | null
  complete: boolean
  fulfilledCount: number
  requestedCount: number
  totalPrice: number | null
  items: MatchItem[]
  diyItems: MatchItem[]
  customItems: MatchItem[]
  diyComplete: boolean
  customComplete: boolean
  diyPrice: number | null
  customPrice: number | null
  preferred?: boolean
  customDeliveryScope: "NONE" | "NATIONWIDE" | "REGIONAL"
  customDeliveryRegions: string[]
}
type PublicMarket = {
  id: string
  sellerId: string
  marketName: string
  marketType: string
  roadAddress: string
  publicPhone: string
  latitude: number
  longitude: number
  distanceKm: number | null
  diyComplete: boolean
  customComplete: boolean
  sourceName: string
  sourceUrl: string
  dailyDataUrl?: string | null
  marketInfoUrl?: string
  auctionInfoUrl?: string
  isNonghyup?: boolean
  supportsRealtime: boolean
  flowers: { id: string; name: string; group?: string; quantity: number; bundleCount?: number; stemsPerBundle?: number | null; unitNote?: string; averageBundlePrice?: number | null; latestDate?: string | null; tradeCount?: number }[]
  checkedAt: string
  liveTradeCount: number
  expectedPrice: number | null
  minPrice: number | null
  maxPrice: number | null
  priceBasis: string
  basisDate?: string | null
  priceScope?: "TODAY_ONLY"
  todayDataAvailable?: boolean
  priceFreshness?: "LIVE_TODAY" | "LATEST_CONFIRMED" | "UNAVAILABLE"
  pricingScope?: "ITEM_ALL_VARIETIES_AND_GRADES"
  priceAvailability?: "NO_SELECTED_FLOWER_TRADE" | "NO_RECENT_MARKET_FILE"
}
type FilterMode = "all" | "ohaeng" | "color" | "meaning" | "month" | "birth" | "occasion"
type GpsStatus = "idle" | "checking" | "success" | "error"
type SpecialDate = { id: string; type: string; label: string; monthDay: string }

const OHAENG_STYLE: Record<string, { active: string; idle: string; dot: string }> = {
  목: { active: "border-emerald-500 bg-emerald-50 text-emerald-700", idle: "border-emerald-100 bg-emerald-50/40 text-emerald-700", dot: "bg-emerald-500" },
  화: { active: "border-rose-500 bg-rose-50 text-rose-700", idle: "border-rose-100 bg-rose-50/40 text-rose-700", dot: "bg-rose-500" },
  토: { active: "border-amber-500 bg-amber-50 text-amber-800", idle: "border-amber-100 bg-amber-50/40 text-amber-800", dot: "bg-amber-500" },
  금: { active: "border-slate-500 bg-slate-50 text-slate-700", idle: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400" },
  수: { active: "border-blue-500 bg-blue-50 text-blue-700", idle: "border-blue-100 bg-blue-50/40 text-blue-700", dot: "bg-blue-500" },
}

export default function DiyPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const addItem = useCartStore((state) => state.addItem)
  const [userEnergy, setUserEnergy] = useState<{ ohaeng: string | null; lacking: string | null } | null>(null)
  const [availableFlowerIds, setAvailableFlowerIds] = useState<Set<string> | null>(null)
  const [availabilityError, setAvailabilityError] = useState("")
  const [selectionMessage, setSelectionMessage] = useState("")
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([])
  const [size, setSize] = useState(SIZES[1])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [wrappingId, setWrappingId] = useState(WRAPPING[0].id)
  const [query, setQuery] = useState("")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [ohaengFilter, setOhaengFilter] = useState("전체")
  const [colorFilter, setColorFilter] = useState("전체")
  const [meaningQuery, setMeaningQuery] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1)
  const [occasionFilter, setOccasionFilter] = useState("wedding")
  const [location, setLocation] = useState<LocationState>({ address: "", latitude: null, longitude: null, source: null })
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle")
  const [locationMessage, setLocationMessage] = useState("")
  const [postcodeOpen, setPostcodeOpen] = useState(false)
  const postcodeRef = useRef<HTMLDivElement>(null)
  const [radiusKm, setRadiusKm] = useState(3)
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [publicMarkets, setPublicMarkets] = useState<PublicMarket[]>([])
  const [marketDirectoryInfo, setMarketDirectoryInfo] = useState<{ criteria: string; sourceUrl: string; coordinatesManagedManually: boolean } | null>(null)
  const [matching, setMatching] = useState(false)
  const [matchError, setMatchError] = useState("")
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState("")
  const [generateCount, setGenerateCount] = useState(0)
  const loadedReviewRef = useRef(false)
  const [preferredSellerId, setPreferredSellerId] = useState<string | null>(null)
  const [fulfillmentMode, setFulfillmentMode] = useState<"diy" | "custom">("custom")

  const selected = useMemo(
    () => Object.entries(quantities).filter(([, quantity]) => quantity > 0),
    [quantities],
  )
  const selectedCount = selected.reduce((sum, [, quantity]) => sum + quantity, 0)
  const monthDay = birthDate
  const birthSelection = monthDay ? birthFlowerSelection(monthDay) : null
  const filteredFlowers = FLOWERS.filter((flower) => {
    if (availableFlowerIds && !availableFlowerIds.has(flower.id)) return false
    const meaning = flowerMeaning(flower.name, flower.group)
    const keyword = query.trim().toLowerCase()
    if (keyword && !`${flower.name} ${flower.group} ${meaning}`.toLowerCase().includes(keyword)) return false
    if (filterMode === "ohaeng" && ohaengFilter !== "전체" && flower.ohaeng !== ohaengFilter) return false
    if (filterMode === "color" && colorFilter !== "전체" && flower.color !== colorFilter) return false
    if (filterMode === "meaning" && meaningQuery.trim() && !meaning.includes(meaningQuery.trim())) return false
    if (filterMode === "month" && !isMonthFlower(flower.id, monthFilter)) return false
    if (filterMode === "birth" && monthDay && !birthSelection?.recommendedIds.includes(flower.id)) return false
    if (filterMode === "occasion" && !isOccasionFlower(flower.id, occasionFilter)) return false
    return true
  })
  const wrapping = WRAPPING.find((item) => item.id === wrappingId) ?? WRAPPING[0]
  const guidePrice = selected.reduce((sum, [id, quantity]) => {
    const flower = FLOWERS.find((item) => item.id === id)
    return sum + (flower?.price ?? 0) * quantity
  }, wrapping.price)

  useEffect(() => {
    const reviewId = new URLSearchParams(window.location.search).get("review")
    if (!reviewId || loadedReviewRef.current) return
    loadedReviewRef.current = true
    fetch(`/api/bouquet-reviews?id=${encodeURIComponent(reviewId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok || !payload.reviews?.[0]) throw new Error("리뷰 조합을 불러오지 못했어요.")
        return payload.reviews[0]
      })
      .then((review) => {
        const composition = review.composition as { sizeId?: string; mainFlowerId?: string | null; additionalFlowerIds?: string[]; wrappingId?: string; flowers?: { id: string; quantity: number }[] }
        const reviewSize = SIZES.find((item) => item.id === composition?.sizeId) ?? SIZES[1]
        const validFlowers = Array.isArray(composition?.flowers)
          ? composition.flowers.filter((item) => FLOWERS.some((flower) => flower.id === item.id) && item.quantity > 0)
          : [composition?.mainFlowerId, ...(composition?.additionalFlowerIds ?? [])]
              .filter((id): id is string => Boolean(id) && FLOWERS.some((flower) => flower.id === id))
              .map((id, index, all) => ({ id, quantity: all.length === 1 ? reviewSize.stems : index === 0 ? reviewSize.mainStems : Math.floor((reviewSize.stems - reviewSize.mainStems) / (all.length - 1)) }))
        const nextQuantities: Record<string, number> = {}
        validFlowers.forEach((item) => { nextQuantities[item.id] = item.quantity })
        const assigned = Object.values(nextQuantities).reduce((sum, count) => sum + count, 0)
        if (validFlowers.length > 1 && assigned < reviewSize.stems) nextQuantities[validFlowers[1].id] += reviewSize.stems - assigned
        setSize(reviewSize)
        setQuantities(nextQuantities)
        if (WRAPPING.some((item) => item.id === composition?.wrappingId)) setWrappingId(composition.wrappingId!)
        if (review.previewImageUrl) setGeneratedImageUrl(review.previewImageUrl)
        const product = Array.isArray(review.product) ? review.product[0] : review.product
        const orderItem = Array.isArray(review.orderItem) ? review.orderItem[0] : review.orderItem
        const productSeller = product && (Array.isArray(product.seller) ? product.seller[0] : product.seller)
        const itemSeller = orderItem && (Array.isArray(orderItem.seller) ? orderItem.seller[0] : orderItem.seller)
        setPreferredSellerId(productSeller?.id ?? itemSeller?.id ?? null)
        setSelectionMessage("리뷰의 꽃·송이 수·포장 조합을 불러왔어요.")
        sessionStorage.setItem("bouquetSourceReview", reviewId)
      })
      .catch((error) => setSelectionMessage(error instanceof Error ? error.message : "리뷰 조합을 불러오지 못했어요."))
  }, [])

  useEffect(() => {
    fetch("/api/diy/available")
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setAvailableFlowerIds(new Set(data.flowerIds ?? []))
      })
      .catch((error) => setAvailabilityError(error instanceof Error ? error.message : "재고를 확인하지 못했어요."))
  }, [])

  useEffect(() => {
    if (!session?.user) return
    fetch("/api/saju/profile")
      .then((response) => response.ok ? response.json() : null)
      .then((profile) => {
        if (!profile) return
        setUserEnergy({ ohaeng: profile.ohaengType, lacking: profile.lackingOhaengType })
        if (profile.birthDate) setBirthDate((current) => current || profile.birthDate.slice(5))
      })
      .catch(() => {})
    fetch("/api/account/special-dates")
      .then((response) => response.json())
      .then((data) => setSpecialDates(data.dates ?? []))
      .catch(() => {})
  }, [session])

  useEffect(() => {
    if (!postcodeOpen) return
    type PostcodeData = { roadAddress?: string; jibunAddress?: string }
    const win = window as unknown as {
      daum?: {
        Postcode: new (opts: {
          oncomplete: (data: PostcodeData) => void
          width?: string
          height?: string
        }) => { embed: (element: HTMLElement) => void }
      }
    }
    const embed = () => {
      if (!win.daum || !postcodeRef.current) return
      postcodeRef.current.innerHTML = ""
      new win.daum.Postcode({
        oncomplete: (data) => {
          setLocation({
            address: data.roadAddress || data.jibunAddress || "",
            latitude: null,
            longitude: null,
            source: "address",
          })
          setGpsStatus("idle")
          setLocationMessage("입력한 주소 권역을 기준으로 판매처를 찾습니다.")
          setMatches(null)
          setPostcodeOpen(false)
        },
        width: "100%",
        height: "100%",
      }).embed(postcodeRef.current)
    }
    if (win.daum?.Postcode) embed()
    else {
      const script = document.createElement("script")
      script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
      script.onload = embed
      document.head.appendChild(script)
    }
  }, [postcodeOpen])

  const resetResults = () => {
    setMatches(null)
    setGeneratedImageUrl(null)
    setGenerateError("")
  }

  // 꽃을 탭하면 크기에 맞춰 송이를 자동 배분한다 — 첫 꽃이 메인, 나머지는 균등
  const distribute = (ids: string[], target: typeof SIZES[number]) => {
    const result: Record<string, number> = {}
    if (ids.length === 1) result[ids[0]] = target.stems
    if (ids.length < 2) return result
    result[ids[0]] = target.mainStems
    const rest = target.stems - target.mainStems
    const others = ids.slice(1)
    others.forEach((id, index) => { result[id] = Math.floor(rest / others.length) + (index < rest % others.length ? 1 : 0) })
    return result
  }

  const toggleFlower = (id: string) => {
    const ids = selected.map(([selectedId]) => selectedId)
    if (ids.includes(id)) {
      setSelectionMessage("")
      setQuantities(distribute(ids.filter((selectedId) => selectedId !== id), size))
    } else if (ids.length >= size.maxVarieties) {
      setSelectionMessage(`${size.name} 크기는 꽃·소재를 최대 ${size.maxVarieties}종까지 고를 수 있어요.`)
      return
    } else {
      setSelectionMessage("")
      setQuantities(distribute([...ids, id], size))
    }
    resetResults()
  }

  // 송이가 꽉 찼을 때 +를 누르면 가장 많은 다른 꽃에서 한 송이를 가져온다
  const donorFor = (id: string) => selected
    .filter(([otherId, quantity]) => otherId !== id && quantity > 1)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const updateQuantity = (id: string, delta: number) => {
    const addingNewVariety = delta > 0 && (quantities[id] ?? 0) === 0
    if (addingNewVariety && selected.length >= size.maxVarieties) {
      setSelectionMessage(`${size.name} 크기는 꽃·소재를 최대 ${size.maxVarieties}종까지 고를 수 있어요.`)
      return
    }
    const donor = delta > 0 && selectedCount >= size.stems ? donorFor(id) : null
    if (delta > 0 && selectedCount >= size.stems && !donor) return
    setSelectionMessage("")
    setQuantities((current) => {
      const next = { ...current, [id]: Math.max(0, Math.min(size.stems, (current[id] ?? 0) + delta)) }
      if (donor) next[donor] = (current[donor] ?? 0) - 1
      return next
    })
    resetResults()
  }

  const changeSize = (nextSize: typeof SIZES[number]) => {
    setSize(nextSize)
    setQuantities(distribute(selected.map(([id]) => id).slice(0, nextSize.maxVarieties), nextSize))
    resetResults()
  }

  const locateCurrentPosition = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsStatus("error")
      setLocationMessage("이 기기에서는 GPS 위치를 사용할 수 없어요. 도로명주소를 입력해주세요.")
      return
    }
    if (!window.isSecureContext) {
      setGpsStatus("error")
      setLocationMessage("현재 위치는 HTTPS 보안 연결에서만 사용할 수 있어요. 도로명주소를 입력해주세요.")
      return
    }
    try {
      const permission = await navigator.permissions?.query({ name: "geolocation" })
      if (permission?.state === "denied") {
        setGpsStatus("error")
        setLocationMessage("브라우저에서 위치 권한이 차단되어 있어요. 사이트 설정에서 위치 권한을 허용하거나 도로명주소를 입력해주세요.")
        return
      }
    } catch {
      // 일부 브라우저는 Permissions API를 지원하지 않아도 위치 요청은 가능하다.
    }
    setGpsStatus("checking")
    setLocationMessage("")
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const accuracyLabel = coords.accuracy >= 1000
          ? `오차 약 ${(coords.accuracy / 1000).toFixed(1)}km`
          : `오차 약 ${Math.round(coords.accuracy)}m`
        setLocation({
          address: "주소 확인 중...",
          latitude: coords.latitude,
          longitude: coords.longitude,
          source: "gps",
        })
        setGpsStatus("success")
        setLocationMessage(`브라우저가 추정한 위치예요 (${accuracyLabel}). 주소가 다르면 직접 수정해 주세요.`)
        setMatches(null)
        try {
          const response = await fetch(`/api/location/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`)
          const data = await response.json()
          if (!response.ok) throw new Error(data.error)
          setLocation((current) => ({ ...current, address: data.address }))
          setLocationMessage(`${data.address} · 브라우저 추정 위치 (${accuracyLabel})`)
        } catch {
          setLocation((current) => ({ ...current, address: "GPS로 확인한 현재 위치" }))
          setLocationMessage(`위치는 확인했지만 주소를 찾지 못했어요 (${accuracyLabel}). 도로명주소를 입력해 주세요.`)
        }
      },
      (error) => {
        setGpsStatus("error")
        const message = error.code === error.PERMISSION_DENIED
          ? "위치 권한이 거부됐어요. 브라우저 사이트 설정에서 위치를 허용하거나 도로명주소를 입력해주세요."
          : error.code === error.TIMEOUT
            ? "위치 확인 시간이 초과됐어요. GPS를 켜고 다시 시도하거나 도로명주소를 입력해주세요."
            : "현재 위치를 확인하지 못했어요. GPS 상태를 확인하거나 도로명주소를 입력해주세요."
        setLocationMessage(message)
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }, [])

  function hashCode(value: string) {
    let hash = 5381
    for (let index = 0; index < value.length; index++) hash = ((hash << 5) + hash) + value.charCodeAt(index)
    return Math.abs(hash)
  }

  const generateImage = async () => {
    if (selected.length === 0) return
    setGenerating(true)
    setGenerateError("")
    const prompt = buildBouquetPrompt(size, selected.map(([id, quantity]) => ({ flower: FLOWERS.find((item) => item.id === id)!, count: quantity })), wrapping)
    const key = `${size.id}|${selected.map(([id, quantity]) => `${id}:${quantity}`).join(",")}|${wrappingId}`
    try {
      const response = await fetch("/api/custom/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, seed: hashCode(key) + generateCount }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? "이미지 생성에 실패했어요.")
      }
      const blob = await response.blob()
      setGeneratedImageUrl(URL.createObjectURL(blob))
      setGenerateCount((count) => count + 1)
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "이미지 생성에 실패했어요.")
    } finally {
      setGenerating(false)
    }
  }

  const findMatches = async () => {
    if (selectedCount === 0) {
      setMatchError("먼저 원하는 꽃과 송이 수를 골라주세요.")
      return
    }
    if (fulfillmentMode === "diy" && !location.source) {
      setMatchError("현재 위치를 확인하거나 도로명주소를 입력해주세요.")
      return
    }
    setMatching(true)
    setMatchError("")
    try {
      const matchesRequest = fetch("/api/diy/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowers: selected.map(([id, quantity]) => ({ id, quantity })),
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          radiusKm,
          preferredSellerId,
          fulfillmentMode,
          sizeId: size.id,
        }),
      })
      const publicRequest = fulfillmentMode === "diy"
        ? fetch("/api/diy/public-markets", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flowers: selected.map(([id, quantity]) => ({ id, quantity })), latitude: location.latitude, longitude: location.longitude }) })
        : Promise.resolve(null)
      const [response, publicResponse] = await Promise.all([matchesRequest, publicRequest])
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "재고를 확인하지 못했어요.")
      setMatches(data.matches)
      if (publicResponse?.ok) {
        const publicData = await publicResponse.json()
        setPublicMarkets((publicData.markets ?? []).map((market: PublicMarket) => market.id === "busan-eomgung" ? { ...market, isNonghyup: true, marketType: "농협 화훼공판장" } : market))
        setMarketDirectoryInfo({ criteria: publicData.directoryCriteria ?? "aT 공식 공판장 목록", sourceUrl: publicData.directorySourceUrl ?? "https://flower.at.or.kr/real/real2.do", coordinatesManagedManually: publicData.coordinatesManagedManually === true })
      } else {
        setPublicMarkets([])
        setMarketDirectoryInfo(null)
      }
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : "재고를 확인하지 못했어요.")
    } finally {
      setMatching(false)
    }
  }

  const chooseSeller = (match: Match, mode: "diy" | "custom") => {
    if (!session?.user) {
      router.push("/login")
      return
    }
    if (session.user.role !== "CUSTOMER") {
      setMatchError("꽃 구매와 장바구니는 일반회원만 이용할 수 있어요.")
      return
    }
    const basePrice = mode === "diy" ? match.diyPrice : match.customPrice
    if (basePrice === null) return
    const price = basePrice + wrapping.price
    const flowerIds = selected.map(([id]) => id)
    const productId = `${mode}_${match.sellerId}_${nanoid(6)}`
    addItem({
      id: nanoid(), productId, quantity: 1,
      composition: { sizeId: size.id, mainFlowerId: flowerIds[0] ?? null, additionalFlowerIds: flowerIds.slice(1), wrappingId },
      fulfillment: { sellerId: match.sellerId, sellerName: match.marketName, orderMode: mode, supportsPickup: true, supportsDelivery: mode === "custom", deliveryScope: mode === "custom" ? match.customDeliveryScope : "NONE", deliveryRegions: mode === "custom" ? match.customDeliveryRegions : [] },
      previewImageUrl: generatedImageUrl ?? undefined,
      product: {
        id: productId,
        name: `${match.marketName} · ${mode === "diy" ? "직접 만들기 재료" : "꽃다발 제작 주문"}`,
        price,
        images: generatedImageUrl ? [generatedImageUrl] : [],
        stock: 1,
      },
    })
    router.push("/cart")
  }

  const requestRestock = async (match: Match) => {
    if (!session?.user) { router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`); return }
    if (session.user.role !== "CUSTOMER") { setMatchError("재입고 알림은 일반회원만 신청할 수 있어요."); return }
    const modeItems = fulfillmentMode === "diy" ? match.diyItems : match.customItems
    const missing = modeItems.filter((item) => item.available < item.requested).map((item) => item.id)
    const response = await fetch("/api/restock-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sellerId: match.sellerId, flowerCodes: missing }) })
    const data = await response.json(); if (response.ok) alert(data.duplicate ? "이미 재입고 알림을 신청한 조합이에요." : "재입고 알림을 신청했어요."); else setMatchError(data.error ?? "재입고 알림 신청에 실패했어요.")
  }

  const visibleMatches = matches?.filter((match) => fulfillmentMode === "diy" ? match.diyComplete || match.preferred : match.customComplete || match.preferred) ?? []
  const completeMatches = visibleMatches.filter((match) => fulfillmentMode === "diy" ? match.diyComplete : match.customComplete)

  return (
    <div className="min-h-screen bg-[#fbfaf7]">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-28 sm:px-6 sm:py-12 lg:pb-12">
        <div className="mb-8 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-rose-50 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <Scissors size={23} />
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-emerald-700">FLOWER BOUQUET DIY</p>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">나만의 꽃다발 만들기·주문</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500 sm:text-base">
                직접 만들 재료를 찾거나 같은 화면에서 꽃집 제작을 주문하세요. 현재 판매 가능한 꽃만 보여드려요.
              </p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-semibold sm:max-w-xl sm:text-sm">
            <div className="rounded-xl bg-white px-2 py-3 text-emerald-700 shadow-sm">1. 꽃 고르기</div>
            <div className="rounded-xl bg-white px-2 py-3 text-stone-500 shadow-sm">2. 위치 확인</div>
            <div className="rounded-xl bg-white px-2 py-3 text-stone-500 shadow-sm">3. 재고·가격 확인</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
              <h2 className="font-bold text-stone-900">① 꽃다발 크기</h2>
              <p className="mt-1 text-sm text-stone-500">완성 폭을 기준으로 하고, 꽃 크기가 달라 송이 수는 최대 참고치로 안내해요.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SIZES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => changeSize(item)}
                    className={`rounded-2xl border-2 px-3 py-4 text-center transition ${
                      size.id === item.id ? "border-emerald-500 bg-emerald-50" : "border-stone-100 hover:border-emerald-200"
                    }`}
                  >
                    <span className="block text-2xl">{item.emoji}</span>
                    <span className="mt-1 block text-sm font-bold text-stone-800">{item.name}</span>
                    <span className="text-xs text-stone-400">{item.desc}</span>
                    <span className="mt-1 block text-[10px] font-medium text-emerald-700">최대 {item.maxVarieties}종</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-bold text-stone-900">② 원하는 꽃 선택</h2>
                  <p className="mt-1 text-sm text-stone-500">현재 판매처에 재고가 있는 꽃만 골라볼 수 있어요.</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="꽃 이름 검색"
                    className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 sm:w-48"
                  />
                </div>
              </div>
              {availabilityError && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{availabilityError} 임시 목록을 표시합니다.</p>}
              {specialDates.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <span className="font-semibold">저장한 기념일 추천</span>
                  {specialDates.map((date) => <button key={date.id} onClick={() => { setFilterMode("occasion"); setOccasionFilter("anniversary") }} className="rounded-full bg-white px-2.5 py-1">{date.label} · {date.monthDay.replace("-", "/")}</button>)}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3 text-sm">
                <span className="text-stone-500">선택한 꽃</span>
                <strong className={selectedCount === size.stems ? "text-emerald-700" : "text-stone-800"}>
                  {selectedCount} / 최대 {size.stems}송이{selectedCount === size.stems ? " · 선택 완료" : ""}
                </strong>
              </div>
              <p className="mt-2 text-xs text-stone-500">꽃 사진을 누르면 크기에 맞게 송이 수가 자동으로 나눠져요. +/−로 비율을 조정하세요.</p>
              {selected.length > 0 && selectedCount < size.stems && (
                <button onClick={() => { setQuantities(distribute(selected.map(([id]) => id), size)); resetResults() }} className="mt-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  남은 {size.stems - selectedCount}송이 자동으로 채우기
                </button>
              )}
              {selectionMessage && <p className="mt-2 text-xs font-medium text-amber-700">{selectionMessage}</p>}
              {selected.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{selected.map(([id, quantity]) => <span key={id} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">{FLOWERS.find((flower) => flower.id === id)?.name ?? id} × {quantity}송이</span>)}<span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">포장 · {wrapping.name}</span></div>}
              <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1">
                {([
                  ["all", "전체"],
                  ["ohaeng", "🔮 오행"],
                  ["color", "🎨 색상"],
                  ["meaning", "💌 꽃말"],
                  ["month", "🌼 이달의 꽃"],
                  ["birth", "🎂 탄생화"],
                  ["occasion", "🎁 특별한 날"],
                ] as [FilterMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      filterMode === mode ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {filterMode === "ohaeng" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {["전체", "목", "화", "토", "금", "수"].map((item) => (
                    <button key={item} onClick={() => setOhaengFilter(item)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition ${item === "전체" ? (ohaengFilter === item ? "border-stone-500 bg-stone-800 text-white" : "border-stone-200 bg-white text-stone-600") : (ohaengFilter === item ? OHAENG_STYLE[item].active : OHAENG_STYLE[item].idle)}`}>
                      {item !== "전체" && <span className={`h-1.5 w-1.5 rounded-full ${OHAENG_STYLE[item].dot}`} />}
                      {item}{item !== "전체" && item === userEnergy?.ohaeng ? " · 나의 기운" : item !== "전체" && item === userEnergy?.lacking ? " · 채움 추천" : ""}
                    </button>
                  ))}
                </div>
              )}
              {filterMode === "color" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {COLOR_FILTER.map((item) => (
                    <button key={item} onClick={() => setColorFilter(item)} className={`rounded-full border px-3 py-1.5 text-xs ${colorFilter === item ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-stone-200 text-stone-500"}`}>{COLOR_LABEL[item]}</button>
                  ))}
                </div>
              )}
              {filterMode === "meaning" && (
                <input value={meaningQuery} onChange={(event) => setMeaningQuery(event.target.value)} placeholder="예: 사랑, 감사, 새로운 시작" className="mt-3 h-10 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-emerald-400" />
              )}
              {filterMode === "month" && (
                <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-12">
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <button key={month} onClick={() => setMonthFilter(month)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${monthFilter === month ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-stone-200 text-stone-500"}`}>
                      {month}월
                    </button>
                  ))}
                </div>
              )}
              {filterMode === "birth" && (
                <div className="mt-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="text-xs font-semibold text-stone-600">탄생화 추천에는 태어난 연도 없이 월·일만 필요해요</label>
                    <div className="flex items-center gap-1">
                      <select aria-label="생일 월" value={birthDate.slice(0, 2)} onChange={(event) => setBirthDate(`${event.target.value}-${birthDate.slice(3, 5) || "01"}`)} className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm">
                        <option value="">월</option>{Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((month) => <option key={month} value={month}>{Number(month)}월</option>)}
                      </select>
                      <select aria-label="생일 일" value={birthDate.slice(3, 5)} onChange={(event) => setBirthDate(`${birthDate.slice(0, 2) || "01"}-${event.target.value}`)} className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm">
                        <option value="">일</option>{Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0")).map((day) => <option key={day} value={day}>{Number(day)}일</option>)}
                      </select>
                    </div>
                  </div>
                  {birthSelection && (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                      {monthDay.replace("-", "월 ")}일 탄생화는 <strong>{birthSelection.name}</strong>이에요.
                      {!birthSelection.exactId && " 현재 DIY 판매 목록에 없어 같은 색감의 구매 가능한 꽃을 함께 추천해요."}
                    </div>
                  )}
                </div>
              )}
              {filterMode === "occasion" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {OCCASIONS.map((occasion) => (
                    <button key={occasion.id} onClick={() => setOccasionFilter(occasion.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${occasionFilter === occasion.id ? "border-rose-400 bg-rose-50 text-rose-600" : "border-stone-200 text-stone-500"}`}>
                      {occasion.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 grid max-h-[520px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                {filteredFlowers.map((flower) => {
                  const quantity = quantities[flower.id] ?? 0
                  return (
                    <div key={flower.id} className={`overflow-hidden rounded-2xl border ${quantity ? "border-emerald-400 ring-1 ring-emerald-100" : "border-stone-100"}`}>
                      <button type="button" onClick={() => toggleFlower(flower.id)} aria-pressed={quantity > 0} aria-label={`${flower.name} ${quantity ? "선택 해제" : "선택"}`} className="relative block aspect-[4/3] w-full bg-stone-100">
                        <Image src={flower.img} alt={flower.name} fill sizes="(max-width: 640px) 45vw, 220px" className="object-cover" />
                        {quantity > 0 ? (
                          <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold text-white">
                            {quantity}
                          </span>
                        ) : (
                          <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-stone-600">+ 담기</span>
                        )}
                      </button>
                      <div className="p-3">
                        <p className="truncate text-sm font-bold text-stone-800">{flower.name}</p>
                        {flowerMeaning(flower.name, flower.group) && <p className="mt-0.5 truncate text-[11px] text-rose-500">{flowerMeaning(flower.name, flower.group)}</p>}
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${OHAENG_STYLE[flower.ohaeng]?.idle ?? "border-stone-200 bg-stone-50 text-stone-600"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${OHAENG_STYLE[flower.ohaeng]?.dot ?? "bg-stone-400"}`} />
                            {flower.ohaeng} 기운{flower.ohaeng === userEnergy?.lacking ? " · 채움 추천" : flower.ohaeng === userEnergy?.ohaeng ? " · 나의 기운" : ""}
                          </span>
                          {flowerMonths(flower.id).map((month) => <span key={month} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-700">{month}월의 꽃</span>)}
                          {flowerBirthDates(flower.id).length > 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] text-amber-700">탄생화</span>}
                          {flowerOccasions(flower.id).slice(0, 2).map((occasion) => <span key={occasion} className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] text-rose-600">{occasion}</span>)}
                        </div>
                        <p className="mt-0.5 text-xs text-stone-400">참고가 {flower.price.toLocaleString()}원/송이</p>
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-stone-50 p-1">
                          <button aria-label={`${flower.name} 한 송이 빼기`} onClick={() => updateQuantity(flower.id, -1)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white disabled:opacity-30" disabled={!quantity}>
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-bold">{quantity}송이</span>
                          <button aria-label={`${flower.name} 한 송이 추가`} onClick={() => updateQuantity(flower.id, 1)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white disabled:opacity-30" disabled={selectedCount >= size.stems && !donorFor(flower.id)}>
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {filteredFlowers.length === 0 && (
                <div className="py-10 text-center text-sm text-stone-400">해당 조건과 일치하는 꽃이 없어요. 다른 태그를 선택해주세요.</div>
              )}
            </section>

            <section id="diy-find" className="scroll-mt-28 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
              <h2 className="font-bold text-stone-900">③ 수령 방법과 판매처 찾기</h2>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1.5">
                <button onClick={() => { setFulfillmentMode("custom"); setMatches(null); setMatchError("") }} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${fulfillmentMode === "custom" ? "bg-white text-rose-600 shadow-sm" : "text-stone-500"}`}>🚚 주문제작·전국 배송</button>
                <button onClick={() => { setFulfillmentMode("diy"); setMatches(null); setMatchError(""); if (gpsStatus === "idle" && !location.source) void locateCurrentPosition() }} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${fulfillmentMode === "diy" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500"}`}>✂️ 직접 만들기·근처 픽업</button>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-500">{fulfillmentMode === "diy" ? "직접 만들기는 방문 가능한 거리 안에서 모든 꽃을 픽업할 수 있는 판매처를 찾아요." : "주문제작은 거리와 관계없이 전국 배송 가능한 판매처의 제작 재고를 확인해요."}</p>
              {fulfillmentMode === "diy" && <><div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button onClick={locateCurrentPosition} disabled={gpsStatus === "checking"} className="h-11 gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                  {gpsStatus === "checking" ? <RefreshCw size={17} className="animate-spin" /> : <LocateFixed size={17} />}
                  {gpsStatus === "checking" ? "현재 위치 확인 중..." : gpsStatus === "success" ? "현재 위치 다시 확인" : "현재 위치 사용"}
                </Button>
                <button onClick={() => setPostcodeOpen(true)} className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-stone-200 px-4 text-left text-sm text-stone-600 hover:border-emerald-300">
                  <MapPin size={17} className="shrink-0 text-emerald-600" />
                  <span className="truncate">{location.address || "도로명주소 검색·수정"}</span>
                  <span className="ml-auto shrink-0 text-xs font-semibold text-emerald-700">{location.address ? "수정" : "검색"}</span>
                </button>
              </div>
              {locationMessage && (
                <div className={`mt-3 rounded-xl border px-3 py-2.5 text-xs leading-5 ${
                  gpsStatus === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : gpsStatus === "error" ? "border-rose-200 bg-rose-50 text-rose-600"
                      : "border-stone-200 bg-stone-50 text-stone-600"
                }`}>
                  {gpsStatus === "success" && <Check size={14} className="mr-1 inline" />}
                  {locationMessage}
                </div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <label htmlFor="radius" className="text-sm font-medium text-stone-600">검색 거리</label>
                <select id="radius" value={radiusKm} onChange={(event) => { setRadiusKm(Number(event.target.value)); setMatches(null) }} className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm">
                  <option value={1}>1km</option>
                  <option value={3}>3km</option>
                  <option value={5}>5km</option>
                </select>
                {location.source === "address" && <span className="text-xs text-amber-600">주소 입력 시 권역순으로 표시</span>}
              </div></>}
              <Button onClick={findMatches} disabled={matching} className="mt-5 h-12 w-full gap-2 bg-stone-900 text-white hover:bg-stone-800">
                <Store size={17} /> {matching ? "판매처 재고 확인 중..." : "가능한 판매처·가격 확인"}
              </Button>
              {matchError && <p className="mt-3 text-sm text-rose-600">{matchError}</p>}
            </section>

            {matches && (
              <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                <div className="mb-5">
                  {fulfillmentMode === "diy" ? <><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-stone-900">현재 위치 중심 꽃집·공판장 지도</h2><Button variant="outline" onClick={locateCurrentPosition} disabled={gpsStatus === "checking"} className="h-8 text-xs"><LocateFixed size={13}/>{gpsStatus === "checking" ? "위치 확인 중" : "내 위치로 다시 맞추기"}</Button></div><SellerMap latitude={location.latitude} longitude={location.longitude} radiusKm={radiusKm} sellers={[...visibleMatches, ...publicMarkets]} /><p className="mt-2 text-[11px] text-stone-400">파란 ‘현재 위치’가 지도 중심입니다. 전국 공판장 마커는 지도 범위 밖에 있을 수 있어요.</p></> : <div className="rounded-2xl bg-rose-50 p-4"><h2 className="font-bold text-rose-700">🚚 전국 배송 제작처</h2><p className="mt-1 text-sm text-stone-600">거리순이 아닌 제작 가능 여부와 원 리뷰 판매처를 우선으로 보여드려요.</p></div>}
                </div>
                {visibleMatches.length > 0 ? (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={20} /></span>
                      <div>
                        <h2 className="font-bold text-stone-900">{completeMatches.length > 0 ? "이 구성이 가능한 판매처" : "원 리뷰 판매처에 재고를 요청해보세요"}</h2>
                        <p className="text-sm text-stone-500">{fulfillmentMode === "diy" ? "직접 만들기는 반경 안 한 판매처에서 전부 픽업할 수 있어야 해요." : "주문제작은 전국 배송 가능한 꽃집을 거리 제한 없이 확인해요."}</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {visibleMatches.slice(0, 8).map((match) => {
                        const modeComplete = fulfillmentMode === "diy" ? match.diyComplete : match.customComplete
                        const modeItems = fulfillmentMode === "diy" ? match.diyItems : match.customItems
                        const hasMissing = modeItems.some((item) => item.available < item.requested)
                        return (
                        <article key={match.sellerId} className={`rounded-2xl border p-4 ${modeComplete ? "border-emerald-200 bg-emerald-50/40" : match.preferred ? "border-violet-200 bg-violet-50/30" : "border-stone-200"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-stone-900">{match.marketName}</h3>{match.preferred && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">리뷰 구매처 · 우선 확인</span>}
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${modeComplete ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-500"}`}>
                                  {modeComplete ? (fulfillmentMode === "diy" ? "전부 픽업 가능" : "전국 배송 제작 가능") : "재고 부족"}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-stone-500">{match.roadAddress}</p>
                              {fulfillmentMode === "custom" && <p className={`mt-1 text-xs font-semibold ${match.customDeliveryScope === "NATIONWIDE" ? "text-rose-600" : "text-amber-700"}`}>{match.customDeliveryScope === "NATIONWIDE" ? "🚚 전국 배송 가능" : match.customDeliveryScope === "REGIONAL" ? `🚚 배송 가능 지역 · ${match.customDeliveryRegions.join(", ") || "판매처 문의"}` : "배송 불가"}</p>}
                              {match.distanceKm !== null && <p className="mt-1 text-xs font-semibold text-emerald-700">현재 위치에서 약 {match.distanceKm}km</p>}
                            </div>
                            <div className="shrink-0 text-right text-xs text-stone-500">
                              {match.diyPrice !== null && <p>DIY 약 <strong className="text-base text-emerald-700">{(match.diyPrice + wrapping.price).toLocaleString()}원</strong></p>}
                              {match.customPrice !== null && <p>제작 약 <strong className="text-base text-rose-600">{(match.customPrice + wrapping.price).toLocaleString()}원</strong></p>}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {modeItems.map((item) => (
                              <span key={item.id} className={`rounded-full px-2 py-1 text-[11px] ${item.available >= item.requested ? "bg-white text-stone-600" : "bg-rose-50 text-rose-600"}`}>
                                {FLOWERS.find((flower) => flower.id === item.id)?.name ?? item.name} {item.requested}송이
                              </span>
                            ))}
                          </div>
                          {match.publicPhone && <p className="mt-3 text-xs text-stone-500">방문 전 재고 확인: {match.publicPhone}</p>}
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {fulfillmentMode === "diy" && match.diyComplete && <Button onClick={() => chooseSeller(match, "diy")} className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700">✂️ 여기서 재료 전부 픽업</Button>}
                            {fulfillmentMode === "custom" && match.customComplete && <Button onClick={() => chooseSeller(match, "custom")} className="h-11 w-full bg-rose-500 text-white hover:bg-rose-600">💐 이 꽃집에 전국배송 주문</Button>}
                            {!modeComplete && match.preferred && hasMissing && <Button onClick={() => requestRestock(match)} variant="outline" className="h-11 w-full border-violet-200 text-violet-700 hover:bg-violet-50">🔔 이 판매처에 재입고 알림 신청</Button>}
                            {!modeComplete && match.preferred && !hasMissing && fulfillmentMode === "diy" && <p className="self-center text-xs text-stone-500">재고는 있지만 설정한 픽업 반경 밖이에요. 주문제작·전국 배송을 확인해보세요.</p>}
                          </div>
                        </article>
                      )})}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-rose-50 p-5 text-center">
                    <p className="text-2xl">💐</p>
                    <h2 className="mt-2 font-bold text-stone-900">이 구성을 한 곳에서 준비할 판매처가 없어요</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                      {preferredSellerId ? "원 리뷰 판매처 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요." : "꽃 수량을 줄이거나 다른 꽃으로 바꾼 뒤 다시 확인해 주세요."}
                    </p>
                  </div>
                )}
                {fulfillmentMode === "diy" && publicMarkets.length > 0 && <div className="mt-6 border-t border-stone-200 pt-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">🏛️</span>
                    <div><h2 className="font-bold text-stone-900">최근 가격을 확인할 수 있는 화훼공판장</h2><p className="mt-1 text-sm text-stone-500">최근 7일 내 경매파일이 있는 공판장만 가까운 순서로 보여주며, 당일 실시간가가 없으면 최근 확정 경매가로 예상가격을 계산해요.</p></div>
                  </div>
                  <details className="mt-3 rounded-xl border border-sky-100 bg-white px-4 py-3 text-xs text-stone-600">
                    <summary className="cursor-pointer font-bold text-sky-800">‘속’이란 무엇인가요?</summary>
                    <p className="mt-2 leading-5">속은 절화를 묶어 경매·유통하는 구매 단위예요. 예를 들어 미니 꽃다발에 장미 7송이가 필요해도 공판장에서는 낱송이 7개가 아니라 장미 1속을 사야 할 수 있어요. 품목·품종·등급·시장에 따라 한 속의 본수가 달라 화면에서는 장미 1속을 약 10본으로 환산하며, 실제 구매단위와 일반인 구매 가능 여부는 공판장 또는 중도매인에게 확인해야 합니다.</p>
                    <a href="https://www.naqs.go.kr/hp/contents/contents.do?menuId=MN40332" target="_blank" rel="noreferrer" className="mt-2 inline-flex font-bold text-sky-700 underline">농산물 표준규격 확인</a>
                  </details>
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><strong>예상가격 안내</strong><p className="mt-1">aT 경매자료에는 꽃 색상이 일관된 항목으로 제공되지 않아, 선택한 색상의 가격이 아닌 해당 품목 전체의 품종·등급을 거래량으로 가중평균합니다. 실제 구매가를 확정하는 값이 아니라 공판장 방문 전 예산을 잡기 위한 단순 참고용 데이터예요.</p></div>
                  {marketDirectoryInfo && <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] leading-5 text-stone-600"><strong>목록 기준:</strong> {marketDirectoryInfo.criteria}. {marketDirectoryInfo.coordinatesManagedManually && "지도 좌표는 공식 주소를 기준으로 서비스에서 관리합니다."} <a href={marketDirectoryInfo.sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-sky-700 underline">aT 원문 확인</a></div>}
                  <div className="mt-4 space-y-3">{publicMarkets.map((market) => <article key={market.id} className={`rounded-2xl border p-4 ${market.isNonghyup ? "border-[#8bc7aa] bg-gradient-to-br from-[#f1faf5] to-[#fff8dc] ring-1 ring-[#d9eadf]" : "border-sky-200 bg-sky-50/40"}`}>
                    <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2">{market.isNonghyup && <NonghyupMark compact className="rounded-full bg-white p-1.5 shadow-sm"/>}<h3 className="font-bold text-stone-900">{market.marketName}</h3><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${market.isNonghyup ? "bg-[#007a4d]" : "bg-sky-600"}`}>{market.marketType}</span>{market.priceFreshness === "LIVE_TODAY" && market.liveTradeCount > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-sky-700">오늘 집계 행 {market.liveTradeCount}건</span>}{market.priceFreshness === "LATEST_CONFIRMED" && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-amber-700">최근 확정 경매가</span>}</div><p className="mt-1 text-xs text-stone-500">{market.roadAddress}{market.distanceKm !== null ? ` · 현재 위치에서 약 ${market.distanceKm}km` : ""}</p></div><div className="shrink-0 text-right"><p className="text-[11px] text-stone-400">{market.basisDate ? `${market.basisDate} 거래 기준` : "가격 기준일 없음"}</p>{market.expectedPrice !== null ? <><strong className={`text-lg ${market.isNonghyup ? "text-[#007a4d]" : "text-sky-700"}`}>예상가격 {market.expectedPrice.toLocaleString()}원</strong>{market.minPrice !== null && market.maxPrice !== null && <p className="text-[10px] text-stone-400">경매가 범위 {market.minPrice.toLocaleString()}~{market.maxPrice.toLocaleString()}원</p>}</> : <strong className={`block max-w-52 text-sm ${market.isNonghyup ? "text-[#007a4d]" : "text-stone-400"}`}>이 공판장의 최근 자료에 선택한 꽃 거래 없음</strong>}</div></div>
                    <div className="mt-3 flex flex-wrap gap-1.5">{market.flowers.map((flower) => <span key={flower.id} className="rounded-full bg-white px-2 py-1 text-[11px] text-stone-600">필요 {flower.name} {flower.quantity}송이 → 공판장 구매 약 {flower.bundleCount ?? 1}속 ({flower.unitNote ?? "포장 규격 확인 필요"}){flower.averageBundlePrice ? ` · ${flower.group} 전체 품종·등급 1속 평균 ${Math.round(flower.averageBundlePrice).toLocaleString()}원` : ""}</span>)}</div>
                    <p className="mt-3 text-[11px] leading-5 text-stone-500">{market.priceBasis}. 실제 등급·포장단위·당일 물량에 따라 달라질 수 있어요.</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-stone-400">방문 전 문의 {market.publicPhone || "공판장 확인"} · {market.sourceName}</p><div className="flex flex-wrap gap-2">{market.marketInfoUrl && <a href={market.marketInfoUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs font-bold ${market.isNonghyup ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-sky-200 text-sky-700 hover:bg-sky-50"}`}>이 공판장 위치·정보 <ExternalLink size={13}/></a>}<a href={`/api/diy/public-markets/${market.id}/at`} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs font-bold ${market.isNonghyup ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-sky-200 text-sky-700 hover:bg-sky-50"}`}>이 공판장 aT 경매자료 바로 보기 <ExternalLink size={13}/></a></div></div>
                  </article>)}</div>
                  <p className="mt-3 text-[11px] leading-5 text-stone-400">예상가격은 aT 당일 실시간가 또는 공판장별 최근 확정 경매가를 사용합니다. 경매가는 소매 판매가가 아니며 낱송이 구매를 보장하지 않습니다. 실제 속당 본수·포장 규격·일반인 구매 가능 여부는 공판장 또는 중도매인에게 확인해 주세요.</p>
                </div>}
              </section>
            )}
          </div>

          <aside id="diy-preview" className="scroll-mt-28 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-stone-100 bg-white lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              <div className="relative flex min-h-64 flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
                {generatedImageUrl && !generating ? (
                  <div className="w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={generatedImageUrl} alt="AI로 생성한 DIY 꽃다발 예상 이미지" className="aspect-square w-full object-cover" />
                    <p className="px-4 py-2 text-center text-[10px] leading-4 text-stone-400">AI 예상 이미지예요. 꽃 종류·색감·크기 느낌을 참고해 주세요. 송이 수는 실제와 다를 수 있어요.</p>
                  </div>
                ) : generating ? (
                  <div className="p-6 text-center">
                    <div className="text-4xl animate-pulse">💐</div>
                    <p className="mt-3 text-xs text-stone-500">AI가 예상 꽃다발을 만들고 있어요...</p>
                    <div className="mx-auto mt-3 h-8 w-8 animate-spin rounded-full border-2 border-rose-300 border-t-rose-500" />
                    <p className="mt-2 text-[10px] text-stone-400">보통 30~60초 정도 걸려요</p>
                  </div>
                ) : generateError ? (
                  <div className="p-6 text-center">
                    <p className="text-3xl">😢</p>
                    <p className="mt-2 text-xs text-rose-500">{generateError}</p>
                  </div>
                ) : selected.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-4xl opacity-30">💐</p>
                    <p className="mt-2 text-xs text-stone-400">꽃을 선택해 주세요</p>
                  </div>
                ) : (
                  <div className="w-full p-6 text-center">
                    <div className="flex flex-wrap justify-center gap-2">
                      {selected.map(([id, quantity]) => {
                        const flower = FLOWERS.find((item) => item.id === id)!
                        return (
                          <div key={id} className="flex flex-col items-center">
                            <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white shadow-sm">
                              <Image src={flower.img} alt={flower.name} fill sizes="48px" className="object-cover" />
                            </div>
                            <span className="text-[10px] text-stone-500">×{quantity}</span>
                          </div>
                        )
                      })}
                    </div>
                    <p className="mt-3 text-xs text-stone-500">{wrapping.emoji} {wrapping.name}</p>
                    <p className="mt-1 text-xs text-stone-400">{size.name} · {selectedCount}/{size.stems}송이</p>
                  </div>
                )}
              </div>

              <div className="border-t border-stone-100 px-4 pb-2 pt-3">
                <p className="mb-2 text-[10px] font-medium text-stone-400">포장 방식</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {WRAPPING.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setWrappingId(item.id); setGeneratedImageUrl(null); setGenerateError("") }}
                      className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border-2 px-2.5 py-2 transition ${
                        wrappingId === item.id ? "border-rose-400 bg-rose-50" : "border-stone-100 hover:border-stone-200"
                      }`}
                    >
                      <span>{item.emoji}</span>
                      <span className="whitespace-nowrap text-[10px] text-stone-600">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-5 pt-4">
                <Button onClick={generateImage} disabled={selected.length === 0 || generating} variant="outline" className="h-10 w-full gap-1.5 border-rose-200 text-sm font-medium text-rose-500 hover:bg-rose-50 disabled:opacity-40">
                  {generating ? <><RefreshCw size={14} className="animate-spin" /> 생성 중...</> : generatedImageUrl ? <><RefreshCw size={14} /> 이미지 재생성</> : <><Sparkles size={14} /> 꽃다발 이미지 생성하기</>}
                </Button>
                {selected.length > 0 && (
                  <button
                    onClick={() => { setQuantities({}); setGeneratedImageUrl(null); setGenerateError(""); setMatches(null) }}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 py-2 text-xs text-stone-400 transition hover:border-rose-200 hover:text-rose-400"
                  >
                    <RotateCcw size={12} /> 선택 초기화
                  </button>
                )}
              </div>

              <div className="space-y-3 p-5">
                <div className="space-y-1.5 text-sm text-stone-600">
                  {selected.map(([id, quantity]) => {
                    const flower = FLOWERS.find((item) => item.id === id)!
                    return <div key={id} className="flex justify-between"><span>{flower.emoji} {flower.name} ×{quantity}</span><span>{(flower.price * quantity).toLocaleString()}원</span></div>
                  })}
                  <div className="flex justify-between"><span>{wrapping.emoji} {wrapping.name}</span><span>{wrapping.price.toLocaleString()}원</span></div>
                </div>
                <div className="flex items-end justify-between border-t border-stone-100 pt-3">
                  <div>
                    <p className="text-sm font-bold text-stone-800">기본 참고가</p>
                    <p className="text-[10px] text-stone-400">실제 판매처 가격과 달라요</p>
                  </div>
                  <strong className="text-lg text-rose-500">약 {guidePrice.toLocaleString()}원</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 모바일 — 꽃을 고르는 중에도 참고가와 다음 단계로 바로 이동 */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] text-stone-500">{size.name} · {selectedCount}/{size.stems}송이</p>
              <p className="font-bold text-rose-500">약 {guidePrice.toLocaleString()}원</p>
            </div>
            <Button variant="outline" onClick={() => document.getElementById("diy-preview")?.scrollIntoView({ behavior: "smooth" })} className="h-11 shrink-0 border-rose-200 px-3 text-rose-500">
              <Sparkles size={15} /> 미리보기
            </Button>
            <Button onClick={() => document.getElementById("diy-find")?.scrollIntoView({ behavior: "smooth" })} className="h-11 shrink-0 gap-1.5 bg-stone-900 px-3 text-white hover:bg-stone-800">
              <Store size={15} /> 판매처 찾기
            </Button>
          </div>
        </div>
      )}

      {postcodeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="도로명주소 검색">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-bold text-stone-900">도로명주소 검색</h2>
                <p className="text-xs text-stone-500">판매처를 찾을 기준 위치를 선택해주세요.</p>
              </div>
              <button onClick={() => setPostcodeOpen(false)} className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100">닫기</button>
            </div>
            <div ref={postcodeRef} className="h-[440px]" />
          </div>
        </div>
      )}
    </div>
  )
}

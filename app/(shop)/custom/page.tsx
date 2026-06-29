"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useCartStore } from "@/store/cartStore"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Sparkles, RefreshCw, Star, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { nanoid } from "nanoid"
import Image from "next/image"

const SIZES = [
  { id: "mini",  name: "미니",  emoji: "🌷", stems: 7,  mainStems: 4,  maxAdditional: 3,  desc: "약 7송이",  engVolume: "tiny petite hand-tied bouquet with only a few stems, minimal and delicate, small enough to hold in one hand" },
  { id: "basic", name: "기본",  emoji: "💐", stems: 12, mainStems: 6,  maxAdditional: 6,  desc: "약 12송이", engVolume: "medium-sized hand-tied bouquet with moderate fullness, classic everyday bouquet size" },
  { id: "full",  name: "풍성",  emoji: "🌸", stems: 18, mainStems: 9,  maxAdditional: 9,  desc: "약 18송이", engVolume: "large lush full bouquet with abundant blooms densely packed, voluminous and impressive" },
  { id: "large", name: "대형",  emoji: "🌺", stems: 25, mainStems: 12, maxAdditional: 13, desc: "약 25송이", engVolume: "grand oversized premium bouquet with dramatic volume, extremely full and lavish with blooms overflowing" },
]

const FLOWERS = [
  // 장미
  { id: "rose-red",             group: "장미",     name: "빨간 장미",   engDesc: "red roses with deep velvety petals",                            emoji: "🌹", img: "/flowers/red_rose.jpg",               color: "red",    price: 3000, ohaeng: "화" },
  { id: "rose-pink",            group: "장미",     name: "핑크 장미",   engDesc: "soft pink roses with delicate petals",                          emoji: "🌸", img: "/flowers/pink_rose.jpg",              color: "pink",   price: 3000, ohaeng: "화" },
  { id: "rose-white",           group: "장미",     name: "흰 장미",     engDesc: "white roses with pure pristine petals",                         emoji: "🤍", img: "/flowers/white_rose.jpg",             color: "white",  price: 3000, ohaeng: "금" },
  { id: "rose-yellow",          group: "장미",     name: "노란 장미",   engDesc: "bright yellow roses with cheerful petals",                      emoji: "💛", img: "/flowers/yellow_rose.jpg",            color: "yellow", price: 3000, ohaeng: "토" },
  // 튤립
  { id: "tulip-pink",           group: "튤립",     name: "핑크 튤립",   engDesc: "pink tulips with smooth cup-shaped blooms",                     emoji: "🌷", img: "/flowers/pink_tulip.jpg",             color: "pink",   price: 2500, ohaeng: "목" },
  { id: "tulip-white",          group: "튤립",     name: "흰 튤립",     engDesc: "white tulips with elegant cup-shaped blooms",                   emoji: "🤍", img: "/flowers/white_tulip.jpg",            color: "white",  price: 2500, ohaeng: "금" },
  { id: "tulip-purple",         group: "튤립",     name: "보라 튤립",   engDesc: "purple tulips with rich velvety cup-shaped blooms",             emoji: "💜", img: "/flowers/purple_tulip.jpg",           color: "purple", price: 2500, ohaeng: "수" },
  { id: "tulip-orange",         group: "튤립",     name: "주황 튤립",   engDesc: "orange tulips with vibrant warm cup-shaped blooms",             emoji: "🧡", img: "/flowers/orange_tulip.jpg",           color: "orange", price: 2500, ohaeng: "화" },
  { id: "tulip-yellow",         group: "튤립",     name: "노란 튤립",   engDesc: "yellow tulips with bright sunny cup-shaped blooms",             emoji: "💛", img: "/flowers/yellow_tulip.jpg",           color: "yellow", price: 2500, ohaeng: "토" },
  // 백합
  { id: "lily-white",           group: "백합",     name: "흰 백합",     engDesc: "white oriental lilies with large open blooms",                  emoji: "🤍", img: "/flowers/white_lily.jpg",             color: "white",  price: 3500, ohaeng: "금" },
  { id: "lily-pink",            group: "백합",     name: "핑크 백합",   engDesc: "pink oriental lilies with large open blooms",                   emoji: "🌸", img: "/flowers/pink_lily.jpg",              color: "pink",   price: 3500, ohaeng: "화" },
  // 수국
  { id: "hydrangea-blue",       group: "수국",     name: "파란 수국",   engDesc: "blue hydrangea clusters with tiny mophead florets",             emoji: "💙", img: "/flowers/blue_hydrangea.jpg",         color: "blue",   price: 4000, ohaeng: "수" },
  { id: "hydrangea-pink",       group: "수국",     name: "핑크 수국",   engDesc: "pink hydrangea clusters with soft mophead florets",             emoji: "🌸", img: "/flowers/pink_hydrangea.jpg",         color: "pink",   price: 4000, ohaeng: "화" },
  // 카네이션
  { id: "carnation-pink",       group: "카네이션", name: "핑크 카네이션", engDesc: "pink carnations with ruffled fringed petals",                 emoji: "🌸", img: "/flowers/pink_carnation.jpg",         color: "pink",   price: 2000, ohaeng: "화" },
  { id: "carnation-red",        group: "카네이션", name: "빨간 카네이션", engDesc: "red carnations with ruffled fringed petals",                  emoji: "🌹", img: "/flowers/red_carnation.jpg",          color: "red",    price: 2000, ohaeng: "화" },
  { id: "carnation-purple",     group: "카네이션", name: "보라 카네이션", engDesc: "purple carnations with ruffled fringed petals",               emoji: "💜", img: "/flowers/purple_carnation.jpg",       color: "purple", price: 2000, ohaeng: "수" },
  { id: "carnation-white",      group: "카네이션", name: "흰 카네이션",  engDesc: "white carnations with ruffled fringed petals",                 emoji: "🤍", img: "/flowers/white_carnation.jpg",        color: "white",  price: 2000, ohaeng: "금" },
  // 작약
  { id: "peony-pink",           group: "작약",     name: "핑크 작약",   engDesc: "pink peonies with lush full ruffled blooms",                    emoji: "🌸", img: "/flowers/pink_paeonia.jpg",           color: "pink",   price: 5000, ohaeng: "화" },
  { id: "peony-red",            group: "작약",     name: "빨간 작약",   engDesc: "red peonies with lush full ruffled blooms",                     emoji: "🌹", img: "/flowers/red_paeonia.jpg",            color: "red",    price: 5000, ohaeng: "화" },
  { id: "peony-purple",         group: "작약",     name: "보라 작약",   engDesc: "purple peonies with lush full ruffled blooms",                  emoji: "💜", img: "/flowers/purple_paeonia.jpg",         color: "purple", price: 5000, ohaeng: "수" },
  { id: "peony-white",          group: "작약",     name: "흰 작약",     engDesc: "white peonies with lush full ruffled blooms",                   emoji: "🤍", img: "/flowers/white_paeonia.jpg",          color: "white",  price: 5000, ohaeng: "금" },
  { id: "peony-orange",         group: "작약",     name: "주황 작약",   engDesc: "orange peonies with lush full ruffled blooms",                  emoji: "🧡", img: "/flowers/orange_paeonia.jpg",         color: "orange", price: 5000, ohaeng: "화" },
  // 거베라
  { id: "gerbera-orange",       group: "거베라",   name: "주황 거베라",  engDesc: "bright orange gerbera daisies with bold circular blooms",       emoji: "🧡", img: "/flowers/orange_gerbera.jpg",         color: "orange", price: 2500, ohaeng: "화" },
  { id: "gerbera-pink",         group: "거베라",   name: "핑크 거베라",  engDesc: "pink gerbera daisies with bold circular blooms",                emoji: "🌸", img: "/flowers/pink_gerbera.jpg",           color: "pink",   price: 2500, ohaeng: "화" },
  { id: "gerbera-red",          group: "거베라",   name: "빨간 거베라",  engDesc: "red gerbera daisies with bold circular blooms",                 emoji: "🌹", img: "/flowers/red_gerbera.jpg",            color: "red",    price: 2500, ohaeng: "화" },
  { id: "gerbera-yellow",       group: "거베라",   name: "노란 거베라",  engDesc: "yellow gerbera daisies with bold circular blooms",              emoji: "💛", img: "/flowers/yellow_gerbera.jpg",         color: "yellow", price: 2500, ohaeng: "토" },
  // 아네모네
  { id: "anemone-blue",         group: "아네모네", name: "파란 아네모네", engDesc: "blue anemones with dark button centers and silky petals",      emoji: "💙", img: "/flowers/blue_anemone.jpg",           color: "blue",   price: 3000, ohaeng: "수" },
  { id: "anemone-pink",         group: "아네모네", name: "핑크 아네모네", engDesc: "pink anemones with dark button centers and silky petals",      emoji: "🌸", img: "/flowers/pink_anemone.jpg",           color: "pink",   price: 3000, ohaeng: "화" },
  { id: "anemone-purple",       group: "아네모네", name: "보라 아네모네", engDesc: "purple anemones with dark button centers and silky petals",    emoji: "💜", img: "/flowers/purple_anemone.jpg",         color: "purple", price: 3000, ohaeng: "수" },
  { id: "anemone-red",          group: "아네모네", name: "빨간 아네모네", engDesc: "red anemones with dark button centers and silky petals",       emoji: "🌹", img: "/flowers/red_anemone.jpg",            color: "red",    price: 3000, ohaeng: "화" },
  // 국화
  { id: "mum-white",            group: "국화",     name: "흰 국화",     engDesc: "white chrysanthemums with layered petals",                      emoji: "🤍", img: "/flowers/white_mum.jpg",              color: "white",  price: 2000, ohaeng: "금" },
  { id: "mum-pink",             group: "국화",     name: "핑크 국화",   engDesc: "pink chrysanthemums with layered petals",                       emoji: "🌸", img: "/flowers/pink_mum.jpg",               color: "pink",   price: 2000, ohaeng: "화" },
  { id: "mum-yellow",           group: "국화",     name: "노란 국화",   engDesc: "yellow chrysanthemums with layered petals",                     emoji: "💛", img: "/flowers/yellow_mum.jpg",             color: "yellow", price: 2000, ohaeng: "토" },
  // 스위트피
  { id: "sweetpea-pink",        group: "스위트피", name: "핑크 스위트피", engDesc: "pink sweet pea flowers with delicate butterfly-shaped petals", emoji: "🌸", img: "/flowers/pink_sweatpea.jpg",          color: "pink",   price: 2500, ohaeng: "목" },
  { id: "sweetpea-white",       group: "스위트피", name: "흰 스위트피",  engDesc: "white sweet pea flowers with delicate butterfly-shaped petals", emoji: "🤍", img: "/flowers/white_sweatpea.jpg",         color: "white",  price: 2500, ohaeng: "금" },
  // 안개꽃
  { id: "babysbreath-white",    group: "안개꽃",   name: "흰 안개꽃",   engDesc: "white baby's breath with tiny cloud-like clusters",             emoji: "🤍", img: "/flowers/white_baby%27s_breath.jpg",  color: "white",  price: 1500, ohaeng: "금" },
  { id: "babysbreath-pink",     group: "안개꽃",   name: "핑크 안개꽃", engDesc: "pink baby's breath with tiny cloud-like clusters",              emoji: "🌸", img: "/flowers/pink_baby%27s_breath.jpg",   color: "pink",   price: 1500, ohaeng: "화" },
  { id: "babysbreath-purple",   group: "안개꽃",   name: "보라 안개꽃", engDesc: "purple baby's breath with tiny cloud-like clusters",            emoji: "💜", img: "/flowers/purple_baby%27s_breath.jpg", color: "purple", price: 1500, ohaeng: "수" },
  // 칼라
  { id: "calla-pink",           group: "칼라",     name: "핑크 칼라",   engDesc: "pink calla lilies with elegant trumpet-shaped blooms",          emoji: "🌸", img: "/flowers/pink_calla.jpg",             color: "pink",   price: 3500, ohaeng: "화" },
  { id: "calla-red",            group: "칼라",     name: "빨간 칼라",   engDesc: "red calla lilies with elegant trumpet-shaped blooms",           emoji: "🌹", img: "/flowers/red_calla.jpg",              color: "red",    price: 3500, ohaeng: "화" },
  { id: "calla-white",          group: "칼라",     name: "흰 칼라",     engDesc: "white calla lilies with elegant trumpet-shaped blooms",         emoji: "🤍", img: "/flowers/white_calla.jpg",            color: "white",  price: 3500, ohaeng: "금" },
  // 단일 색 꽃
  { id: "sunflower",            group: "해바라기", name: "해바라기",    engDesc: "bright yellow sunflowers with dark centers",                    emoji: "🌻", img: "/flowers/yellow_sunflower.jpg",       color: "yellow", price: 2000, ohaeng: "토" },
  { id: "lavender",             group: "라벤더",   name: "라벤더",      engDesc: "purple lavender sprigs with delicate florets",                  emoji: "💜", img: "/flowers/purple_lavender.jpg",        color: "purple", price: 2500, ohaeng: "수" },
  { id: "daisy",                group: "데이지",   name: "데이지",      engDesc: "white daisy flowers with yellow button centers",                emoji: "🌼", img: "/flowers/white_daisy.jpg",            color: "white",  price: 1500, ohaeng: "토" },
  { id: "freesia",              group: "프리지아", name: "프리지아",    engDesc: "yellow freesia with fragrant tubular blooms",                   emoji: "🌼", img: "/flowers/yellow_freesia.jpg",         color: "yellow", price: 2000, ohaeng: "토" },
  { id: "chamomile",            group: "카모마일", name: "카모마일",    engDesc: "white chamomile flowers with yellow centers and daisy-like petals", emoji: "🌼", img: "/flowers/white_chamomile.jpg",     color: "white",  price: 1500, ohaeng: "토" },
  { id: "eucalyptus",           group: "유칼립투스", name: "유칼립투스", engDesc: "green eucalyptus sprigs with silvery round leaves",            emoji: "🌿", img: "/flowers/green_eucalyptus.jpg",       color: "green",  price: 2000, ohaeng: "목" },
]

const WRAPPING = [
  { id: "kraft",       name: "크라프트지",   emoji: "📦", price: 1500, engStyle: "lower half of bouquet wrapped in rustic brown kraft paper secured with natural twine bow at the stems" },
  { id: "cellophane",  name: "투명 셀로판",  emoji: "✨", price: 2000, engStyle: "flowers wrapped in transparent clear cellophane film tied with a thin satin ribbon, flowers fully visible through wrapping" },
  { id: "linen",       name: "린넨 천 포장", emoji: "🌿", price: 2500, engStyle: "bouquet stems wrapped in natural beige linen fabric tied with a simple cotton ribbon" },
  { id: "newspaper",   name: "신문지 빈티지", emoji: "📰", price: 1500, engStyle: "bouquet wrapped in vintage newspaper pages secured with rustic twine string, retro style" },
  { id: "hanji",       name: "한지 포장",    emoji: "🏮", price: 3000, engStyle: "bouquet wrapped in multiple layers of pastel-colored Korean hanji tissue paper in soft pink, mint, lavender, and cream tones, creating a ruffled layered paper wrapping with delicate texture, tied with a thin ribbon" },
  { id: "bouquet",     name: "부케 스타일",  emoji: "💍", price: 5000, engStyle: "professional wedding bouquet style, stems tightly bound with white satin ribbon wrapped spirally down the handle, elegant formal presentation" },
]

const COLOR_FILTER = ["전체", "red", "pink", "white", "yellow", "purple", "orange", "blue", "green"]
const COLOR_LABEL: Record<string, string> = {
  전체: "전체", red: "레드", pink: "핑크", white: "화이트",
  yellow: "옐로우", purple: "퍼플", orange: "오렌지", blue: "블루", green: "그린",
}

export default function CustomPage() {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)

  const [size, setSize] = useState(SIZES[1])
  const [mainFlowerId, setMainFlowerId] = useState<string | null>(null)
  const [additionalFlowerIds, setAdditionalFlowerIds] = useState<Set<string>>(new Set())
  const [wrapping, setWrapping] = useState(WRAPPING[0])
  const [colorFilter, setColorFilter] = useState("전체")

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (generating) {
      setElapsed(0)
      elapsedRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current) }
  }, [generating])

  // 크기별 송이 배분: 메인 꽃 고정 배분 + 추가 꽃 균등 배분
  const stemDist = useMemo<Record<string, number>>(() => {
    if (!mainFlowerId) return {}
    const addIds = [...additionalFlowerIds]
    if (addIds.length === 0) return { [mainFlowerId]: size.stems }
    const remaining = size.stems - size.mainStems
    const perFlower = Math.floor(remaining / addIds.length)
    const leftover = remaining % addIds.length
    const dist: Record<string, number> = { [mainFlowerId]: size.mainStems }
    addIds.forEach((id, i) => { dist[id] = perFlower + (i < leftover ? 1 : 0) })
    return dist
  }, [mainFlowerId, additionalFlowerIds, size])

  const BASE_PRICE = 10000
  const flowerTotal = Object.entries(stemDist).reduce((sum, [id, count]) => {
    const flower = FLOWERS.find((f) => f.id === id)
    return sum + (flower?.price ?? 0) * count
  }, 0)
  const totalPrice = BASE_PRICE + flowerTotal + wrapping.price
  const hasSelection = !!mainFlowerId || additionalFlowerIds.size > 0

  const resetImage = () => { setGeneratedImageUrl(null); setGenerateError(null) }

  const toggleFlower = (flowerId: string) => {
    resetImage()
    if (flowerId === mainFlowerId) {
      // 메인 해제 → 첫 번째 추가 꽃을 메인으로 승격
      const [first, ...rest] = [...additionalFlowerIds]
      setMainFlowerId(first ?? null)
      setAdditionalFlowerIds(new Set(rest))
    } else if (additionalFlowerIds.has(flowerId)) {
      setAdditionalFlowerIds((prev) => { const next = new Set(prev); next.delete(flowerId); return next })
    } else {
      if (!mainFlowerId) {
        setMainFlowerId(flowerId)
      } else {
        if (additionalFlowerIds.size >= size.maxAdditional) return
        setAdditionalFlowerIds((prev) => new Set([...prev, flowerId]))
      }
    }
  }

  const promoteToMain = (flowerId: string) => {
    if (flowerId === mainFlowerId) return
    resetImage()
    const oldMain = mainFlowerId
    setMainFlowerId(flowerId)
    setAdditionalFlowerIds((prev) => {
      const next = new Set(prev)
      next.delete(flowerId)
      if (oldMain) next.add(oldMain)
      return next
    })
  }

  const handleGenerate = async () => {
    if (!mainFlowerId) return
    setGenerating(true)
    setGeneratedImageUrl(null)
    setGenerateError(null)

    const mainFlower = FLOWERS.find((f) => f.id === mainFlowerId)!
    const mainCount = stemDist[mainFlowerId] ?? size.stems
    const mainDesc = `${mainCount} ${mainFlower.engDesc}`
    const additionalDescs = [...additionalFlowerIds]
      .filter((id) => (stemDist[id] ?? 0) > 0)
      .map((id) => {
        const flower = FLOWERS.find((f) => f.id === id)!
        return `${stemDist[id]} ${flower.engDesc}`
      })

    const prompt = [
      `Professional Korean florist bouquet photograph,`,
      `${size.engVolume},`,
      `${mainDesc} placed prominently at the center as the dominant focal point of the bouquet,`,
      additionalDescs.length > 0 ? `surrounded by ${additionalDescs.join(", ")} as accent flowers,` : "",
      `${wrapping.engStyle},`,
      `studio lighting, pure white background, top-down flat lay angle,`,
      `sharp focus, highly detailed, photorealistic`,
    ].filter(Boolean).join(" ")
    const negative = "cartoon, illustration, painting, text, watermark, people, hands, vase, blurry, extra flowers not mentioned"

    try {
      const res = await fetch("/api/custom/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, negative }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "이미지 생성에 실패했어요.")
      }
      const blob = await res.blob()
      setGeneratedImageUrl(URL.createObjectURL(blob))
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : "이미지 생성에 실패했어요. 재생성 버튼을 눌러 다시 시도해 주세요.")
    } finally {
      setGenerating(false)
    }
  }

  const handleOrder = () => {
    if (!hasSelection) return
    const allItems = [
      ...(mainFlowerId ? [mainFlowerId] : []),
      ...[...additionalFlowerIds].filter((id) => (stemDist[id] ?? 0) > 0),
    ]
    const name = `커스텀 꽃다발 ${size.name} (${allItems.map((id) => {
      const f = FLOWERS.find((fl) => fl.id === id)!
      return `${f.emoji}×${stemDist[id]}`
    }).join(", ")})`
    addItem({
      id: nanoid(),
      productId: `custom_${nanoid(8)}`,
      quantity: 1,
      product: {
        id: `custom_${nanoid(8)}`,
        name,
        price: totalPrice,
        images: generatedImageUrl ? [generatedImageUrl] : [],
        stock: 99,
      },
    })
    setAdded(true)
    setTimeout(() => { setAdded(false); router.push("/cart") }, 800)
  }

  const filtered = colorFilter === "전체" ? FLOWERS : FLOWERS.filter((f) => f.color === colorFilter)
  const groups = filtered.reduce<Record<string, typeof FLOWERS>>((acc, flower) => {
    if (!acc[flower.group]) acc[flower.group] = []
    acc[flower.group].push(flower)
    return acc
  }, {})

  const canGenerate = !!mainFlowerId
  const remainingSlots = size.maxAdditional - additionalFlowerIds.size

  const FlowerCard = ({ flower }: { flower: typeof FLOWERS[0] }) => {
    const isMain = mainFlowerId === flower.id
    const isAdditional = additionalFlowerIds.has(flower.id)
    const isSelected = isMain || isAdditional
    const stems = stemDist[flower.id] ?? 0

    return (
      <div
        onClick={() => toggleFlower(flower.id)}
        className={`bg-white rounded-2xl overflow-hidden border-2 transition-all cursor-pointer select-none ${
          isMain
            ? "border-amber-400 shadow-md"
            : isSelected
            ? "border-rose-300 shadow-sm"
            : "border-stone-100 hover:border-rose-200"
        }`}
      >
        <div className="relative aspect-square">
          <Image src={flower.img} alt={flower.name} fill sizes="150px" className="object-cover" />
          {isMain && (
            <div className="absolute top-2 left-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <Star size={9} fill="white" /> 메인
            </div>
          )}
          {isSelected && stems > 0 && (
            <div className={`absolute top-2 right-2 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isMain ? "bg-amber-400" : "bg-rose-400"}`}>
              {stems}
            </div>
          )}
          {!isSelected && (
            <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-end justify-center pb-2 opacity-0 hover:opacity-100">
              <span className="bg-white/90 text-stone-600 text-[10px] px-2 py-0.5 rounded-full">+ 추가</span>
            </div>
          )}
        </div>
        <div className="p-3 text-center">
          <p className="text-sm font-semibold text-stone-800">{flower.name}</p>
          <p className="text-xs text-stone-400 mt-0.5">{flower.price.toLocaleString()}원/송이</p>
          <div className="mt-1.5 flex justify-center gap-1">
            <span className="text-[10px] bg-rose-50 text-rose-400 px-1.5 py-0.5 rounded-full">{flower.ohaeng}</span>
            {isAdditional && (
              <button
                onClick={(e) => { e.stopPropagation(); promoteToMain(flower.id) }}
                className="text-[10px] bg-stone-50 text-stone-400 hover:bg-amber-50 hover:text-amber-500 px-1.5 py-0.5 rounded-full transition-colors"
              >
                ⭐ 메인
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 사이드바 미리보기용: 꽃 종류별 1개씩, 송이 수 뱃지
  const previewItems = [
    ...(mainFlowerId ? [{ id: mainFlowerId, isMain: true }] : []),
    ...[...additionalFlowerIds].filter((id) => (stemDist[id] ?? 0) > 0).map((id) => ({ id, isMain: false })),
  ]

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
          <Sparkles size={22} className="text-rose-400" /> 나만의 꽃다발 만들기
        </h1>
        <p className="text-stone-400 text-sm mt-1">크기를 선택하고 마음에 드는 꽃을 골라보세요. AI가 꽃다발 이미지를 만들어 드려요.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* 왼쪽 — 꽃 선택 */}
        <div className="flex-1 space-y-6">

          {/* 1단계: 크기 선택 */}
          <section className="bg-white rounded-2xl p-5 border border-stone-100">
            <h2 className="font-semibold text-stone-800 mb-3 text-sm">① 꽃다발 크기</h2>
            <div className="grid grid-cols-4 gap-3">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSize(s); resetImage() }}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-colors ${
                    size.id === s.id
                      ? "border-rose-400 bg-rose-50"
                      : "border-stone-100 hover:border-stone-200 bg-white"
                  }`}
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <span className={`text-sm font-semibold ${size.id === s.id ? "text-rose-500" : "text-stone-700"}`}>{s.name}</span>
                  <span className="text-[10px] text-stone-400">{s.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 2단계: 꽃 선택 */}
          <section>
            <h2 className="font-semibold text-stone-800 mb-3 text-sm">② 꽃 선택</h2>

            {/* 색상 필터 */}
            <div className="flex gap-2 flex-wrap mb-4">
              {COLOR_FILTER.map((c) => (
                <button
                  key={c}
                  onClick={() => setColorFilter(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    colorFilter === c
                      ? "bg-rose-400 border-rose-400 text-white"
                      : "bg-white border-stone-200 text-stone-600 hover:border-rose-300"
                  }`}
                >
                  {COLOR_LABEL[c]}
                </button>
              ))}
            </div>

            {/* 안내 메시지 */}
            {!mainFlowerId && (
              <p className="text-xs text-rose-400 bg-rose-50 rounded-xl px-4 py-2.5 border border-rose-100 mb-4">
                ⭐ 꽃 카드를 클릭해 추가하세요. 처음 선택한 꽃이 메인 꽃이 됩니다.
              </p>
            )}
            {mainFlowerId && remainingSlots > 0 && (
              <p className="text-xs text-stone-400 bg-stone-50 rounded-xl px-4 py-2.5 border border-stone-100 mb-4">
                추가 꽃을 <span className="font-semibold text-rose-400">{remainingSlots}종</span> 더 선택할 수 있어요. (메인 {stemDist[mainFlowerId]}송이 + 추가 {size.stems - size.mainStems}송이 배분)
              </p>
            )}
            {mainFlowerId && remainingSlots === 0 && (
              <p className="text-xs text-stone-400 bg-stone-50 rounded-xl px-4 py-2.5 border border-stone-100 mb-4">
                {size.name} 크기 최대 구성이에요. 꽃을 눌러 선택을 해제할 수 있어요.
              </p>
            )}

            {/* 그룹별 꽃 목록 */}
            <div className="space-y-6">
              {Object.entries(groups).map(([groupName, flowers]) => (
                <div key={groupName}>
                  <h3 className="text-xs font-semibold text-stone-500 mb-2 flex items-center gap-1">
                    <span className="w-3 h-px bg-stone-300 inline-block" />
                    {groupName}
                    {flowers.length > 1 && <span className="text-stone-300 font-normal">({flowers.length}가지 색상)</span>}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {flowers.map((flower) => <FlowerCard key={flower.id} flower={flower} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3단계: 포장 선택 */}
          <section className="bg-white rounded-2xl p-5 border border-stone-100">
            <h2 className="font-semibold text-stone-800 mb-3 text-sm">③ 포장 방식</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {WRAPPING.map((w) => (
                <label
                  key={w.id}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    wrapping.id === w.id ? "border-rose-400 bg-rose-50" : "border-stone-100 hover:border-stone-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="wrapping"
                    value={w.id}
                    checked={wrapping.id === w.id}
                    onChange={() => { setWrapping(w); resetImage() }}
                    className="sr-only"
                  />
                  <span className="text-2xl">{w.emoji}</span>
                  <span className="text-xs font-medium text-stone-700 text-center">{w.name}</span>
                  <span className="text-xs text-stone-400">+{w.price.toLocaleString()}원</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* 오른쪽 — 미리보기 & 요약 */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-2xl border border-stone-100 sticky top-24 overflow-hidden">
            {/* 미리보기 */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 min-h-56 flex flex-col items-center justify-center relative">
              {generatedImageUrl && !generating ? (
                <div className="w-full aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={generatedImageUrl} alt="생성된 꽃다발" className="w-full h-full object-cover" />
                </div>
              ) : generateError ? (
                <div className="p-6 text-center space-y-2">
                  <p className="text-3xl">😢</p>
                  <p className="text-xs text-red-400 leading-relaxed">{generateError}</p>
                </div>
              ) : generating ? (
                <div className="p-6 text-center space-y-3">
                  <div className="text-4xl animate-pulse">💐</div>
                  <p className="text-xs text-stone-500">AI가 꽃다발을 그리고 있어요...</p>
                  <div className="w-8 h-8 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin mx-auto" />
                  <p className="text-[10px] text-stone-400">{elapsed}초 경과 · 보통 30~60초 소요됩니다</p>
                </div>
              ) : previewItems.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <p className="text-4xl opacity-30">💐</p>
                  <p className="text-xs text-stone-400">꽃을 선택해 주세요</p>
                </div>
              ) : (
                <div className="p-6 text-center space-y-3 w-full">
                  <div className="flex flex-wrap justify-center gap-2">
                    {previewItems.map(({ id, isMain }) => {
                      const flower = FLOWERS.find((f) => f.id === id)!
                      const count = stemDist[id] ?? 0
                      return (
                        <div key={id} className="flex flex-col items-center gap-0.5">
                          <div className={`w-12 h-12 rounded-full overflow-hidden border-2 shadow-sm ${isMain ? "border-amber-400" : "border-white"}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={flower.img} alt={flower.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[10px] text-stone-500">×{count}</span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-stone-500">{wrapping.emoji} {wrapping.name}</p>
                  <p className="text-xs text-stone-400">총 {size.stems}송이 · {size.name} 꽃다발</p>
                </div>
              )}
            </div>

            {/* 이미지 생성 버튼 */}
            <div className="px-5 pt-4">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                variant="outline"
                className="w-full h-10 border-rose-200 text-rose-500 hover:bg-rose-50 text-sm font-medium gap-1.5 disabled:opacity-40"
              >
                {generating ? (
                  <><RefreshCw size={14} className="animate-spin" /> 생성 중...</>
                ) : generatedImageUrl ? (
                  <><RefreshCw size={14} /> 이미지 재생성</>
                ) : (
                  <><Sparkles size={14} /> 꽃다발 이미지 생성하기</>
                )}
              </Button>
              {!mainFlowerId && (
                <p className="text-[10px] text-stone-400 text-center mt-1.5">꽃을 먼저 선택해 주세요</p>
              )}
              {hasSelection && (
                <button
                  onClick={() => { setMainFlowerId(null); setAdditionalFlowerIds(new Set()); resetImage() }}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs text-stone-400 hover:text-rose-400 border border-stone-200 hover:border-rose-200 py-2 rounded-xl transition-colors"
                >
                  <RotateCcw size={12} /> 선택 초기화
                </button>
              )}
            </div>

            {/* 가격 요약 */}
            <div className="p-5 space-y-3">
              <div className="space-y-1.5 text-sm text-stone-600">
                <div className="flex justify-between"><span>기본 포장재</span><span>{BASE_PRICE.toLocaleString()}원</span></div>
                {mainFlowerId && (() => {
                  const f = FLOWERS.find((fl) => fl.id === mainFlowerId)!
                  const count = stemDist[mainFlowerId] ?? 0
                  return (
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1">
                        <Star size={10} className="text-amber-400 fill-amber-400" />
                        {f.emoji} {f.name} ×{count}
                      </span>
                      <span>{(f.price * count).toLocaleString()}원</span>
                    </div>
                  )
                })()}
                {[...additionalFlowerIds].filter((id) => (stemDist[id] ?? 0) > 0).map((id) => {
                  const f = FLOWERS.find((fl) => fl.id === id)!
                  const count = stemDist[id]
                  return (
                    <div key={id} className="flex justify-between">
                      <span>{f.emoji} {f.name} ×{count}</span>
                      <span>{(f.price * count).toLocaleString()}원</span>
                    </div>
                  )
                })}
                <div className="flex justify-between"><span>{wrapping.emoji} {wrapping.name}</span><span>{wrapping.price.toLocaleString()}원</span></div>
              </div>
              <div className="border-t border-stone-100 pt-3 flex justify-between font-bold text-stone-800">
                <span>합계</span>
                <span className="text-rose-500 text-lg">{totalPrice.toLocaleString()}원</span>
              </div>
              <Button
                onClick={handleOrder}
                disabled={!hasSelection || added}
                className={`w-full h-11 font-semibold gap-2 disabled:opacity-50 ${generatedImageUrl ? "bg-amber-400 hover:bg-amber-500 text-white" : "bg-rose-400 hover:bg-rose-500 text-white"}`}
              >
                <ShoppingCart size={16} />
                {added ? "담겼어요! 🌸" : generatedImageUrl ? "이 꽃다발로 주문하기" : "장바구니 담기"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

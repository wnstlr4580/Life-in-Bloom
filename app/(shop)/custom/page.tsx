"use client"

import { useState, useMemo, useEffect, useRef, Suspense } from "react"
import { useCartStore } from "@/store/cartStore"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Sparkles, RefreshCw, Star, RotateCcw, Camera } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { nanoid } from "nanoid"
import Image from "next/image"
import { SIZES, FLOWERS, WRAPPING, COLOR_FILTER, COLOR_LABEL } from "@/lib/customFlowers"

interface Composition {
  sizeId: string
  mainFlowerId: string | null
  additionalFlowerIds: string[]
  wrappingId: string
}

function CustomContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
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

  // 후기 작성 폼
  const [postOpen, setPostOpen] = useState(false)
  const [postFile, setPostFile] = useState<File | null>(null)
  const [postContent, setPostContent] = useState("")
  const [postSaving, setPostSaving] = useState(false)
  const [postMessage, setPostMessage] = useState("")

  // 후기 갤러리의 "이 조합 그대로 만들기"로 들어온 경우 조합을 불러온다
  const loadedPostRef = useRef(false)
  useEffect(() => {
    const postId = searchParams.get("post")
    if (!postId || loadedPostRef.current) return
    loadedPostRef.current = true
    fetch(`/api/bouquet-posts/${postId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((post) => {
        const c = post.composition as Composition
        const s = SIZES.find((x) => x.id === c.sizeId)
        const w = WRAPPING.find((x) => x.id === c.wrappingId)
        if (s) setSize(s)
        if (w) setWrapping(w)
        if (c.mainFlowerId && FLOWERS.some((f) => f.id === c.mainFlowerId)) setMainFlowerId(c.mainFlowerId)
        setAdditionalFlowerIds(new Set((c.additionalFlowerIds ?? []).filter((id) => FLOWERS.some((f) => f.id === id))))
        // 이 조합으로 주문이 완료되면 글쓴이에게 포인트가 적립되도록 기억해둔다
        sessionStorage.setItem("bouquetSourcePost", postId)
      })
      .catch(() => {})
  }, [searchParams])

  const currentComposition = (): Composition => ({
    sizeId: size.id,
    mainFlowerId,
    additionalFlowerIds: [...additionalFlowerIds],
    wrappingId: wrapping.id,
  })

  const handlePostSubmit = async () => {
    if (!postFile) { setPostMessage("꽃다발 사진을 골라주세요"); return }
    if (!mainFlowerId) { setPostMessage("꽃 조합을 먼저 선택해주세요"); return }
    setPostSaving(true)
    setPostMessage("")
    try {
      const form = new FormData()
      form.append("file", postFile)
      form.append("content", postContent)
      form.append("composition", JSON.stringify(currentComposition()))
      const res = await fetch("/api/bouquet-posts", { method: "POST", body: form })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? "후기 올리기에 실패했어요")
      setPostMessage("후기가 올라갔어요! 홈 화면에서 확인해보세요 🌸")
      setPostFile(null)
      setPostContent("")
      setPostOpen(false)
    } catch (e) {
      setPostMessage(e instanceof Error ? e.message : "후기 올리기에 실패했어요")
    } finally {
      setPostSaving(false)
    }
  }

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

              {/* 후기 올리기 — 받은 꽃다발 사진 자랑 + 포인트 안내 */}
              {hasSelection && session?.user && (
                <div className="border-t border-stone-100 pt-3">
                  {!postOpen ? (
                    <button
                      onClick={() => { setPostOpen(true); setPostMessage("") }}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-stone-500 hover:text-rose-500 border border-stone-200 hover:border-rose-200 py-2.5 rounded-xl transition-colors"
                    >
                      <Camera size={13} /> 받은 꽃다발 후기 올리기
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-stone-700">📸 이 조합으로 받은 꽃다발 자랑하기</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPostFile(e.target.files?.[0] ?? null)}
                        className="w-full text-xs text-stone-500 file:mr-2 file:rounded-lg file:border-0 file:bg-rose-50 file:text-rose-500 file:text-xs file:px-3 file:py-1.5"
                      />
                      <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="한마디 남겨주세요 (예: 프로포즈 대성공!)"
                        rows={2}
                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-rose-300"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handlePostSubmit} disabled={postSaving} className="flex-1 h-8 bg-rose-400 hover:bg-rose-500 text-white text-xs">
                          {postSaving ? "올리는 중..." : "올리기"}
                        </Button>
                        <Button variant="outline" onClick={() => setPostOpen(false)} className="h-8 text-xs border-stone-200 text-stone-500">취소</Button>
                      </div>
                      <p className="text-[10px] text-stone-400 leading-relaxed">
                        다른 분이 이 조합 그대로 구매하면 500포인트를 드려요
                      </p>
                    </div>
                  )}
                  {postMessage && <p className="text-[11px] text-rose-500 mt-1.5 text-center">{postMessage}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// useSearchParams()는 Suspense 경계 안에서 써야 한다
export default function CustomPage() {
  return (
    <Suspense fallback={null}>
      <CustomContent />
    </Suspense>
  )
}

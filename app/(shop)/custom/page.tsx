"use client"

import { useState, useMemo, useEffect, useRef, Suspense } from "react"
import { useCartStore } from "@/store/cartStore"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Sparkles, RefreshCw, Star, RotateCcw, Download, Share2 } from "lucide-react"
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
  const [filterMode, setFilterMode] = useState<"color" | "group" | "ohaeng">("ohaeng")
  const [colorFilter, setColorFilter] = useState("전체")
  const [groupFilter, setGroupFilter] = useState("전체")
  const [ohaengFilter, setOhaengFilter] = useState("전체")
  const [searchQuery, setSearchQuery] = useState("")

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [added, setAdded] = useState(false)
  const [generateCount, setGenerateCount] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [shareMessage, setShareMessage] = useState("")
  const [gallerySharing, setGallerySharing] = useState(false)
  const [galleryMessage, setGalleryMessage] = useState("")
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  // 후기 수정 폼
  const [postContent, setPostContent] = useState("")
  const [postMessage, setPostMessage] = useState("")

  // 내 후기 수정 모드 (?edit=ID)
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const [wrappingDescOpen, setWrappingDescOpen] = useState(false)

  // 나의 오행 분석 정보
  const [userOhaeng, setUserOhaeng] = useState<string | null>(null)
  const [userLackingOhaeng, setUserLackingOhaeng] = useState<string | null>(null)
  useEffect(() => {
    if (!session?.user) return
    fetch("/api/saju/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        setUserOhaeng(d.ohaengType ?? null)
        setUserLackingOhaeng(d.lackingOhaengType ?? null)
      })
      .catch(() => {})
  }, [session])

  // 후기 갤러리에서 진입: ?post=ID(그대로 만들기) 또는 ?edit=ID(내 후기 수정)
  const loadedPostRef = useRef(false)
  useEffect(() => {
    const postId = searchParams.get("post")
    const editId = searchParams.get("edit")
    const targetId = editId ?? postId
    if (!targetId || loadedPostRef.current) return
    loadedPostRef.current = true
    fetch(`/api/bouquet-posts/${targetId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((post) => {
        const c = post.composition as Composition
        const s = SIZES.find((x) => x.id === c.sizeId)
        const w = WRAPPING.find((x) => x.id === c.wrappingId)
        if (s) setSize(s)
        if (w) setWrapping(w)
        if (c.mainFlowerId && FLOWERS.some((f) => f.id === c.mainFlowerId)) setMainFlowerId(c.mainFlowerId)
        setAdditionalFlowerIds(new Set((c.additionalFlowerIds ?? []).filter((id) => FLOWERS.some((f) => f.id === id))))
        if (editId) {
          // 수정 모드 — 기존 한마디를 불러오고, 포인트 적립 대상이 아니므로 sourcePost는 기록하지 않는다
          setEditPostId(editId)
          setPostContent(post.content ?? "")
        } else if (postId) {
          // 이 조합으로 주문이 완료되면 글쓴이에게 포인트가 적립되도록 기억해둔다
          sessionStorage.setItem("bouquetSourcePost", postId)
        }
      })
      .catch(() => {})
  }, [searchParams])

  // 궁합 결과에서 진입: ?flowers=id1,id2 → 자동 선택
  const loadedFlowersRef = useRef(false)
  useEffect(() => {
    const postId = searchParams.get("post")
    const editId = searchParams.get("edit")
    const flowersParam = searchParams.get("flowers")
    if (!flowersParam || postId || editId || loadedFlowersRef.current) return
    loadedFlowersRef.current = true
    const ids = flowersParam.split(",").filter((id) => FLOWERS.some((f) => f.id === id))
    if (ids.length === 0) return
    const [first, ...rest] = ids
    setMainFlowerId(first)
    setAdditionalFlowerIds(new Set(rest.slice(0, size.maxAdditional)))
  }, [searchParams, size.maxAdditional])

  const isFromCompat = !!searchParams.get("flowers") && !searchParams.get("post") && !searchParams.get("edit")

  // 수정 저장 — 현재 화면의 조합과 한마디로 후기를 갱신
  const handleEditSave = async () => {
    if (!editPostId) return
    if (!mainFlowerId) { setPostMessage("꽃을 하나 이상 선택해주세요"); return }
    setEditSaving(true)
    setPostMessage("")
    try {
      const res = await fetch(`/api/bouquet-posts/${editPostId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ composition: currentComposition(), content: postContent }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? "수정에 실패했어요")
      router.push("/#bouquet-gallery")
    } catch (e) {
      setPostMessage(e instanceof Error ? e.message : "수정에 실패했어요")
    } finally {
      setEditSaving(false)
    }
  }

  const currentComposition = (): Composition => ({
    sizeId: size.id,
    mainFlowerId,
    additionalFlowerIds: [...additionalFlowerIds],
    wrappingId: wrapping.id,
  })

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

  const resetImage = () => { setGeneratedImageUrl(null); setGenerateError(null); setGenerateCount(0) }

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

  async function blobUrlToFile(blobUrl: string): Promise<File> {
    const res = await fetch(blobUrl)
    const blob = await res.blob()
    return new File([blob], "bouquet.jpg", { type: "image/jpeg" })
  }

  const handleDownload = () => {
    if (!generatedImageUrl) return
    const a = document.createElement("a")
    a.href = generatedImageUrl
    a.download = `인생내꽃_꽃다발_${size.name}.jpg`
    a.click()
  }

  const handleShare = async () => {
    if (!generatedImageUrl) return
    setSharing(true)
    setShareMessage("")
    try {
      const file = await blobUrlToFile(generatedImageUrl)
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "인생내꽃 — 나만의 꽃다발" })
        return
      }
      // 파일 공유 미지원 시 링크 공유
      const form = new FormData()
      form.append("file", file)
      form.append("composition", JSON.stringify(currentComposition()))
      const res = await fetch("/api/custom/share", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "공유 링크 생성 실패")
      const shareUrl = `${window.location.origin}/bouquet/share/${data.id}`
      if (navigator.share) {
        await navigator.share({ title: "인생내꽃 — 나만의 꽃다발", url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setShareMessage("링크가 복사됐어요! 🔗")
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        setShareMessage("공유에 실패했어요. 다시 시도해 주세요.")
      }
    } finally {
      setSharing(false)
    }
  }

  const doGalleryShare = async () => {
    if (!generatedImageUrl || !mainFlowerId) return
    setGallerySharing(true)
    setGalleryMessage("")
    try {
      const file = await blobUrlToFile(generatedImageUrl)
      const form = new FormData()
      form.append("file", file)
      form.append("composition", JSON.stringify(currentComposition()))
      form.append("isGalleryShare", "true")
      const res = await fetch("/api/bouquet-posts", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "갤러리 공유 실패")
      setGalleryMessage("갤러리에 등록됐어요! 🌸")
    } catch (e) {
      setGalleryMessage(e instanceof Error ? e.message : "갤러리 공유에 실패했어요.")
    } finally {
      setGallerySharing(false)
    }
  }

  const handleGalleryShare = () => {
    if (!session?.user) {
      setShowLoginModal(true)
      return
    }
    doGalleryShare()
  }

  const handleModalLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError("")
    try {
      const result = await signIn("credentials", {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      })
      if (result?.error) {
        setLoginError("이메일 또는 비밀번호가 올바르지 않아요")
      } else {
        setShowLoginModal(false)
        setLoginEmail("")
        setLoginPassword("")
        // 로그인 성공 후 자동 공유 (세션 갱신 대기)
        setTimeout(() => doGalleryShare(), 500)
      }
    } finally {
      setLoginLoading(false)
    }
  }

  function hashCode(str: string): number {
    let h = 5381
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i)
    return Math.abs(h)
  }

  const handleGenerate = async () => {
    if (!mainFlowerId) return
    setGenerating(true)
    setGeneratedImageUrl(null)
    setGenerateError(null)

    const mainFlower = FLOWERS.find((f) => f.id === mainFlowerId)!
    const mainCount = stemDist[mainFlowerId] ?? size.stems
    const additionalEntries = [...additionalFlowerIds]
      .filter((id) => (stemDist[id] ?? 0) > 0)
      .map((id) => ({ flower: FLOWERS.find((f) => f.id === id)!, count: stemDist[id] }))

    const accentLines = additionalEntries.map(({ flower, count }) =>
      `${count}x ${flower.engDesc} (color: ${flower.color})`
    )

    const prompt = [
      `Professional florist bouquet photograph, pure white seamless background,`,
      `EXACT FLOWERS ONLY - strictly no other flowers:`,
      `MAIN: ${mainCount}x ${mainFlower.engDesc} (color: ${mainFlower.color}) positioned at center,`,
      accentLines.length > 0 ? `ACCENT: ${accentLines.join(", ")},` : "",
      `${wrapping.engStyle},`,
      `top-down flat lay, studio lighting, sharp focus, photorealistic, 8k`,
    ].filter(Boolean).join(" ")
    const negative = "cartoon, illustration, painting, text, watermark, people, hands, vase, blurry, any flowers not listed, extra unlisted blooms, wrong colors, oversaturated, low quality"

    const compositionKey = [size.id, mainFlowerId, [...additionalFlowerIds].sort().join(","), wrapping.id].join("|")
    const seed = hashCode(compositionKey) + generateCount
    setGenerateCount((c) => c + 1)

    try {
      const res = await fetch("/api/custom/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, negative, seed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "이미지 생성에 실패했어요.")
      }
      const blob = await res.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      setGeneratedImageUrl(dataUrl)
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
    const customId = `custom_${nanoid(8)}`
    addItem({
      id: nanoid(),
      productId: customId,
      quantity: 1,
      composition: currentComposition(),
      product: {
        id: customId,
        name,
        price: totalPrice,
        images: generatedImageUrl ? [generatedImageUrl] : [],
        stock: 99,
      },
    })
    setAdded(true)
    setTimeout(() => { setAdded(false); router.push("/cart") }, 800)
  }

  const GROUPS = ["전체", ...Array.from(new Set(FLOWERS.map((f) => f.group)))]
  const OHAENG_LIST = ["전체", "목", "화", "토", "금", "수"] as const
  const OHAENG_STYLE: Record<string, string> = {
    목: "bg-green-100 text-green-700 border-green-300",
    화: "bg-red-100 text-red-700 border-red-300",
    토: "bg-yellow-100 text-yellow-700 border-yellow-300",
    금: "bg-gray-100 text-gray-700 border-gray-300",
    수: "bg-blue-100 text-blue-700 border-blue-300",
  }

  const filtered = (() => {
    let base = FLOWERS
    if (filterMode === "color"  && colorFilter  !== "전체") base = base.filter((f) => f.color  === colorFilter)
    if (filterMode === "group"  && groupFilter  !== "전체") base = base.filter((f) => f.group  === groupFilter)
    if (filterMode === "ohaeng" && ohaengFilter !== "전체") base = base.filter((f) => f.ohaeng === ohaengFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      base = base.filter((f) => f.name.toLowerCase().includes(q) || f.group.toLowerCase().includes(q))
    }
    return base
  })()
  const groupKey = (f: typeof FLOWERS[0]) => {
    if (filterMode === "ohaeng") return f.ohaeng
    if (filterMode === "color")  return f.color
    return f.group
  }
  const groups = filtered.reduce<Record<string, typeof FLOWERS>>((acc, flower) => {
    const key = groupKey(flower)
    if (!acc[key]) acc[key] = []
    acc[key].push(flower)
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
        {editPostId && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            ✏️ <span className="font-semibold">내 후기를 수정하고 있어요.</span> 꽃 조합과 한마디를 고친 뒤 오른쪽 아래
            <span className="font-semibold"> 수정 저장</span> 버튼을 눌러주세요.
          </div>
        )}
        {isFromCompat && (
          <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
            💕 <span className="font-semibold">궁합에서 추천된 꽃</span>이 자동으로 선택됐어요. 원하는 대로 바꿀 수 있어요!
          </div>
        )}
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-stone-800 text-sm">② 꽃 선택</h2>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="꽃 이름 검색..."
                  className="pl-7 pr-3 py-1.5 text-xs rounded-full border border-stone-200 focus:outline-none focus:border-rose-300 bg-white w-36 placeholder:text-stone-400"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                  >✕</button>
                )}
              </div>
            </div>

            {/* 필터 모드 탭 */}
            <div className="flex gap-1 mb-3 bg-stone-100 rounded-xl p-1">
              {(["ohaeng", "group", "color"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setFilterMode(mode)
                    setColorFilter("전체")
                    setGroupFilter("전체")
                    setOhaengFilter("전체")
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterMode === mode ? "bg-white shadow-sm text-stone-800" : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {mode === "ohaeng" ? "🔮 오행" : mode === "group" ? "🌸 꽃 종류" : "🎨 색상"}
                </button>
              ))}
            </div>

            {/* 모드별 필터 버튼 */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {filterMode === "color" && COLOR_FILTER.map((c) => (
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
              {filterMode === "group" && GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    groupFilter === g
                      ? "bg-rose-400 border-rose-400 text-white"
                      : "bg-white border-stone-200 text-stone-600 hover:border-rose-300"
                  }`}
                >
                  {g}
                </button>
              ))}
              {filterMode === "ohaeng" && OHAENG_LIST.map((o) => (
                <button
                  key={o}
                  onClick={() => setOhaengFilter(o)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    ohaengFilter === o
                      ? o === "전체"
                        ? "bg-rose-400 border-rose-400 text-white"
                        : `${OHAENG_STYLE[o]} border-current font-semibold`
                      : o === "전체"
                      ? "bg-white border-stone-200 text-stone-600 hover:border-rose-300"
                      : `bg-white ${OHAENG_STYLE[o]} opacity-60 hover:opacity-100`
                  }`}
                >
                  {o === "전체" ? "전체" : (
                    <>
                      {o}({o === "목" ? "🌿" : o === "화" ? "🔥" : o === "토" ? "🌾" : o === "금" ? "✨" : "💧"})
                      {userOhaeng === o && <span className="ml-1 text-[10px] font-bold text-amber-600">✨내기운</span>}
                      {userLackingOhaeng === o && <span className="ml-1 text-[10px] font-bold text-blue-500">💧보충</span>}
                    </>
                  )}
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
              {Object.entries(groups).map(([groupName, flowers]) => {
                const isOhaengGroup = filterMode === "ohaeng"
                const isColorGroup  = filterMode === "color"
                return (
                <div key={groupName}>
                  <h3 className="text-xs font-semibold text-stone-500 mb-2 flex items-center gap-1.5">
                    <span className="w-3 h-px bg-stone-300 inline-block" />
                    {isOhaengGroup ? (
                      <>
                        <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${OHAENG_STYLE[groupName] ?? "bg-stone-100 text-stone-600 border-stone-200"}`}>
                          {groupName}기운 ({groupName === "목" ? "🌿" : groupName === "화" ? "🔥" : groupName === "토" ? "🌾" : groupName === "금" ? "✨" : "💧"})
                        </span>
                        {userOhaeng === groupName && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                            ✨ 내 기운
                          </span>
                        )}
                        {userLackingOhaeng === groupName && (
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
                            💧 보충이 필요해요
                          </span>
                        )}
                      </>
                    ) : isColorGroup ? (COLOR_LABEL[groupName as keyof typeof COLOR_LABEL] ?? groupName) : groupName}
                    <span className="text-stone-300 font-normal">
                      {isOhaengGroup ? `${flowers.length}가지 꽃` : isColorGroup ? `${flowers.length}가지 꽃` : flowers.length > 1 ? `${flowers.length}가지 색상` : ""}</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {flowers.map((flower) => <FlowerCard key={flower.id} flower={flower} />)}
                  </div>
                </div>
                )})}
              {Object.keys(groups).length === 0 && (
                <p className="text-sm text-stone-400 text-center py-10">
                  검색 결과가 없어요. 다른 이름으로 검색해보세요.
                </p>
              )}
            </div>
          </section>

        </div>

        {/* 오른쪽 — 미리보기 & 요약 */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-2xl border border-stone-100 sticky top-24 overflow-y-auto max-h-[calc(100vh-7rem)]">
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
                  <p className="text-xs text-stone-500">AI가 꽃다발을 만들고 있어요...</p>
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

            {/* 포장 방식 선택 */}
            <div className="px-4 pt-3 pb-2 border-t border-stone-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-stone-400 font-medium">포장 방식</p>
                <button
                  onClick={() => setWrappingDescOpen((v) => !v)}
                  className="text-[10px] text-rose-400 hover:text-rose-500 transition-colors"
                >
                  {wrappingDescOpen ? "닫기 ▲" : "설명보기 ▼"}
                </button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {WRAPPING.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => { setWrapping(w); resetImage() }}
                    className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl border-2 shrink-0 transition-colors ${
                      wrapping.id === w.id ? "border-rose-400 bg-rose-50" : "border-stone-100 hover:border-stone-200"
                    }`}
                  >
                    <span className="text-base">{w.emoji}</span>
                    <span className="text-[10px] text-stone-600 whitespace-nowrap">{w.name}</span>
                  </button>
                ))}
              </div>
              {wrappingDescOpen && (
                <div className="mt-2 bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-100">
                  <p className="text-[11px] font-semibold text-stone-600 mb-0.5">{wrapping.emoji} {wrapping.name}</p>
                  <p className="text-[11px] text-stone-500 leading-relaxed">{wrapping.desc}</p>
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
              {generatedImageUrl && !generating && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs text-stone-500 hover:text-rose-500 border border-stone-200 hover:border-rose-200 py-2 rounded-xl transition-colors"
                  >
                    <Download size={13} /> 저장
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs text-stone-500 hover:text-rose-500 border border-stone-200 hover:border-rose-200 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <Share2 size={13} /> {sharing ? "공유 중..." : "공유"}
                  </button>
                </div>
              )}
              {shareMessage && <p className="text-[11px] text-rose-500 text-center mt-1">{shareMessage}</p>}
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

              {/* 후기 수정 모드 — 조합·한마디를 고쳐 저장 */}
              {editPostId && (
                <div className="border-t border-stone-100 pt-3 space-y-2">
                  <p className="text-xs font-semibold text-stone-700">✏️ 후기 수정</p>
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="한마디를 남겨주세요"
                    rows={2}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-rose-300"
                  />
                  <Button onClick={handleEditSave} disabled={editSaving} className="w-full h-9 bg-amber-400 hover:bg-amber-500 text-white text-xs font-semibold">
                    {editSaving ? "저장 중..." : "수정 저장"}
                  </Button>
                  {postMessage && <p className="text-[11px] text-rose-500 text-center">{postMessage}</p>}
                </div>
              )}

              {/* 갤러리 공유 — AI 생성 이미지를 갤러리에 등록 */}
              {!editPostId && generatedImageUrl && !generating && (
                <div className="border-t border-stone-100 pt-3">
                  <button
                    onClick={handleGalleryShare}
                    disabled={gallerySharing || !!galleryMessage}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-stone-500 hover:text-rose-500 border border-stone-200 hover:border-rose-200 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    🖼️ {gallerySharing ? "등록 중..." : galleryMessage || "갤러리에 공유하기"}
                  </button>
                  {galleryMessage && (
                    <p className="text-[11px] text-rose-400 text-center mt-1.5">
                      <a href="/gallery" className="underline underline-offset-2">갤러리 보기 →</a>
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-stone-800">🌸 로그인 후 공유할 수 있어요</p>
              <p className="text-xs text-stone-400">로그인하면 갤러리에 바로 등록돼요</p>
            </div>
            <form onSubmit={handleModalLogin} className="space-y-3">
              <input
                type="email"
                placeholder="이메일"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-300"
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-300"
              />
              {loginError && <p className="text-xs text-red-500 text-center">{loginError}</p>}
              <Button type="submit" disabled={loginLoading} className="w-full h-11 bg-rose-400 hover:bg-rose-500 text-white font-semibold">
                {loginLoading ? "로그인 중..." : "로그인 후 공유하기"}
              </Button>
            </form>
            <div className="text-center space-y-2 border-t border-stone-100 pt-3">
              <a href="/login" className="block text-xs text-stone-400 hover:text-rose-500">
                다른 방법으로 로그인 →
              </a>
              <button onClick={() => setShowLoginModal(false)} className="text-xs text-stone-300 hover:text-stone-500">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
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

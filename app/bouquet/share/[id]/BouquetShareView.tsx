"use client"

import { useState } from "react"
import Link from "next/link"
import { Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FLOWERS, SIZES, WRAPPING } from "@/lib/customFlowers"

interface Composition {
  sizeId: string
  mainFlowerId: string | null
  additionalFlowerIds: string[]
  wrappingId: string
}

interface Post {
  id: string
  authorName: string | null
  imageUrl: string
  composition: Composition
  content: string | null
}

function compositionSummary(c: Composition): string {
  const size = SIZES.find((s) => s.id === c.sizeId)
  const wrap = WRAPPING.find((w) => w.id === c.wrappingId)
  const flowers = [c.mainFlowerId, ...(c.additionalFlowerIds ?? [])]
    .filter(Boolean)
    .map((id) => FLOWERS.find((f) => f.id === id))
    .filter(Boolean)
    .map((f) => `${f!.emoji} ${f!.name}`)
  return [
    size ? `${size.name} 사이즈` : null,
    ...flowers.slice(0, 3),
    flowers.length > 3 ? `외 ${flowers.length - 3}종` : null,
    wrap?.name,
  ].filter(Boolean).join(" · ")
}

export default function BouquetShareView({ post }: { post: Post }) {
  const [saving, setSaving] = useState(false)
  const summary = compositionSummary(post.composition)

  const handleDownload = async () => {
    setSaving(true)
    try {
      const res = await fetch(post.imageUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `인생내꽃_꽃다발.jpg`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async () => {
    const shareUrl = window.location.href
    if (navigator.share) {
      await navigator.share({ title: "인생내꽃 — 꽃다발 공유", url: shareUrl })
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert("링크가 복사됐어요!")
    }
  }

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-5">
        <div className="rounded-3xl overflow-hidden w-full bg-stone-100 aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt="AI 생성 꽃다발" className="w-full h-full object-cover" />
        </div>

        <div className="bg-white rounded-2xl p-4 space-y-1 border border-stone-100">
          <p className="text-xs text-stone-400">꽃 조합</p>
          <p className="text-sm text-stone-700 font-medium leading-relaxed">{summary}</p>
          {post.content && <p className="text-xs text-stone-500 italic">"{post.content}"</p>}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleDownload} disabled={saving} variant="outline" className="flex-1 gap-2 h-12">
            <Download size={16} />
            {saving ? "저장 중..." : "저장하기"}
          </Button>
          <Button onClick={handleShare} className="flex-1 gap-2 h-12 bg-rose-400 hover:bg-rose-500 text-white">
            <Share2 size={16} />
            공유하기
          </Button>
        </div>

        <Link
          href={`/custom?post=${post.id}`}
          className="block w-full text-center py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
        >
          💐 나도 이 꽃으로 만들기
        </Link>
      </div>
    </div>
  )
}

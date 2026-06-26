"use client"

import { useRef, useState } from "react"
import { Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Ohaeng, OhaengProfile } from "@/lib/saju"

const OHAENG_GRADIENT: Record<Ohaeng, string> = {
  목: "from-green-400 to-emerald-600",
  화: "from-rose-400 to-red-600",
  토: "from-yellow-400 to-amber-600",
  금: "from-slate-300 to-gray-500",
  수: "from-blue-400 to-indigo-600",
}

const OHAENG_EMOJI: Record<Ohaeng, string> = {
  목: "🌿", 화: "🔥", 토: "🌾", 금: "✨", 수: "💧",
}

interface Props {
  ohaeng: Ohaeng
  profile: OhaengProfile
  birthYear: number
  name?: string
}

export function ShareCard({ ohaeng, profile, birthYear, name }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  const downloadCard = async () => {
    if (!cardRef.current) return
    setSaving(true)
    try {
      const { default: html2canvas } = await import("html2canvas")
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      })
      const url = canvas.toDataURL("image/png")
      const a = document.createElement("a")
      a.href = url
      a.download = `인생내꽃_${ohaeng}기운_${birthYear}.png`
      a.click()
    } finally {
      setSaving(false)
    }
  }

  const shareToWeb = async () => {
    const text = `나의 오행은 ${ohaeng}(${OHAENG_EMOJI[ohaeng]})!\n${profile.description}\n\n인생내꽃에서 나의 꽃을 찾아보세요 🌸`
    if (navigator.share) {
      await navigator.share({ title: "인생내꽃 — 나의 오행 결과", text, url: window.location.href })
    } else {
      await navigator.clipboard.writeText(text + "\n" + window.location.href)
      alert("링크가 복사됐어요!")
    }
  }

  return (
    <div className="space-y-4">
      {/* 카드 */}
      <div
        ref={cardRef}
        className={`relative w-72 aspect-[9/16] rounded-3xl bg-gradient-to-br ${OHAENG_GRADIENT[ohaeng]} p-6 flex flex-col justify-between text-white overflow-hidden select-none`}
      >
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 right-8 text-[120px] leading-none">{OHAENG_EMOJI[ohaeng]}</div>
          <div className="absolute bottom-12 left-4 text-[80px] leading-none rotate-12">🌸</div>
        </div>

        {/* 상단 */}
        <div className="relative z-10">
          <p className="text-xs font-medium opacity-75 tracking-widest uppercase">인생내꽃</p>
          <p className="text-xs opacity-60 mt-0.5">{name ? `${name} · ` : ""}{birthYear}년생</p>
        </div>

        {/* 중앙 */}
        <div className="relative z-10 text-center space-y-3">
          <p className="text-6xl">{OHAENG_EMOJI[ohaeng]}</p>
          <div>
            <p className="text-4xl font-bold tracking-tight">{ohaeng}(五行)</p>
            <p className="text-sm opacity-80 mt-1">{profile.season} 기운</p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-2">
            {profile.keywords.slice(0, 4).map((k) => (
              <span key={k} className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full">{k}</span>
            ))}
          </div>
        </div>

        {/* 하단 */}
        <div className="relative z-10 space-y-2">
          <p className="text-xs leading-relaxed opacity-80 text-center">{profile.description}</p>
          <div className="flex gap-1 justify-center flex-wrap">
            {profile.flowerKeywords.slice(0, 3).map((f) => (
              <span key={f} className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full">🌸 {f}</span>
            ))}
          </div>
          <p className="text-[10px] opacity-50 text-center pt-1">insaeng-naekot.vercel.app</p>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 w-72">
        <Button onClick={downloadCard} disabled={saving} variant="outline" className="flex-1 gap-2 border-stone-200 text-stone-600">
          <Download size={15} />
          {saving ? "저장 중..." : "이미지 저장"}
        </Button>
        <Button onClick={shareToWeb} className="flex-1 gap-2 bg-rose-400 hover:bg-rose-500 text-white">
          <Share2 size={15} />
          공유하기
        </Button>
      </div>
    </div>
  )
}

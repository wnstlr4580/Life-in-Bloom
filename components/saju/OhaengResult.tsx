"use client"

import type { Ohaeng, OhaengProfile } from "@/lib/saju"

const OHAENG_EMOJI: Record<Ohaeng, string> = {
  목: "🌿",
  화: "🔥",
  토: "🌾",
  금: "✨",
  수: "💧",
}

const OHAENG_BG: Record<Ohaeng, string> = {
  목: "from-green-50 to-emerald-50 border-green-200",
  화: "from-red-50 to-orange-50 border-red-200",
  토: "from-yellow-50 to-amber-50 border-yellow-200",
  금: "from-gray-50 to-slate-50 border-gray-200",
  수: "from-blue-50 to-indigo-50 border-blue-200",
}

const OHAENG_BADGE: Record<Ohaeng, string> = {
  목: "bg-green-100 text-green-700",
  화: "bg-red-100 text-red-700",
  토: "bg-yellow-100 text-yellow-700",
  금: "bg-gray-100 text-gray-700",
  수: "bg-blue-100 text-blue-700",
}

interface Props {
  ohaeng: Ohaeng
  profile: OhaengProfile
}

export function OhaengResult({ ohaeng, profile }: Props) {
  return (
    <div className={`rounded-2xl border-2 bg-gradient-to-br p-6 ${OHAENG_BG[ohaeng]}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">{OHAENG_EMOJI[ohaeng]}</span>
        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-1 ${OHAENG_BADGE[ohaeng]}`}>
            {ohaeng}(木火土金水)
          </span>
          <p className="text-xs text-stone-500">나의 오행 기운</p>
        </div>
      </div>

      <p className="text-stone-700 text-sm leading-relaxed mb-4">{profile.description}</p>

      <div className="flex flex-wrap gap-2">
        {profile.keywords.map((kw) => (
          <span key={kw} className="px-2 py-1 bg-white/70 rounded-full text-xs text-stone-600">
            #{kw}
          </span>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/50">
        <p className="text-xs text-stone-500 mb-2">어울리는 꽃</p>
        <p className="text-sm font-medium text-stone-700">{profile.flowerKeywords.join("  ·  ")}</p>
      </div>
    </div>
  )
}

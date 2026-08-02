"use client"

import type { PillarInfo, Ohaeng } from "@/lib/saju"

const OHAENG_COLOR: Record<Ohaeng, { bg: string; border: string; badge: string; accent: string }> = {
  목: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", accent: "text-emerald-600" },
  화: { bg: "bg-rose-50",    border: "border-rose-200",    badge: "bg-rose-100 text-rose-700",       accent: "text-rose-500"   },
  토: { bg: "bg-amber-50",   border: "border-amber-200",   badge: "bg-amber-100 text-amber-700",     accent: "text-amber-600"  },
  금: { bg: "bg-slate-50",   border: "border-slate-200",   badge: "bg-slate-100 text-slate-700",     accent: "text-slate-600"  },
  수: { bg: "bg-blue-50",    border: "border-blue-200",    badge: "bg-blue-100 text-blue-700",       accent: "text-blue-600"   },
}

const OHAENG_NAME: Record<Ohaeng, string> = {
  목: "나무(목)",
  화: "불(화)",
  토: "흙(토)",
  금: "금(금)",
  수: "물(수)",
}

const PILLAR_LABEL: Record<string, string> = {
  연주: "어린 시절",
  월주: "청년 시절",
  일주: "지금 나",
  시주: "노년기",
}

interface Props {
  pillars: PillarInfo[]
  mainOhaeng: Ohaeng
  name?: string
  /** 생년월일에서 나온 개인 정보 — 추천 가점에도 쓰인다 */
  birthFlower?: { name: string; color: string | null; meaning: string | null } | null
  birthColor?: { name: string } | null
}

export function OhaengResult({ pillars, mainOhaeng, name, birthFlower, birthColor }: Props) {
  const mainColor = OHAENG_COLOR[mainOhaeng]
  const dayPillar = pillars.find((p) => p.pillar === "일주")

  return (
    <div className="space-y-6">
      {/* 헤더 — 나의 대표 기운 */}
      <div className={`rounded-2xl border-2 p-5 ${mainColor.bg} ${mainColor.border}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{dayPillar?.metaphorEmoji ?? "🌸"}</span>
          <div>
            <p className="text-xs text-stone-500 mb-0.5">
              {name ? `${name}님의 ` : ""}나의 대표 기운
            </p>
            <span className={`font-bold text-lg ${mainColor.accent}`}>
              {OHAENG_NAME[mainOhaeng]} — {dayPillar?.stemName} 기운
            </span>
          </div>
        </div>
        <p className="text-sm text-stone-600 mt-3 leading-relaxed">
          {dayPillar?.description}
        </p>
        <p className={`text-xs mt-2 font-medium ${mainColor.accent}`}>
          🌸 나를 닮은 꽃 — {dayPillar?.flower}
        </p>
      </div>

      {/* 4주 타임라인 */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-stone-600 flex items-center gap-2">
          <span>내 인생의 흐름</span>
          <span className="text-stone-400 font-normal">뿌리 → 줄기 → 꽃 → 열매</span>
        </p>

        {pillars.map((p, i) => {
          const c = OHAENG_COLOR[p.stemOhaeng]
          return (
            <div key={p.pillar} className="flex gap-3">
              {/* 타임라인 선 */}
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 border-2 border-stone-200 bg-white shadow-sm">
                  {p.metaphorEmoji}
                </div>
                {i < pillars.length - 1 && (
                  <div className="w-0.5 flex-1 bg-stone-200 my-1" />
                )}
              </div>

              {/* 카드 */}
              <div className="flex-1 rounded-xl border border-stone-100 bg-white p-4 mb-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${c.badge}`}>
                      {OHAENG_NAME[p.stemOhaeng]}
                    </span>
                    <span className="text-xs text-stone-400">{p.lifeStage}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-bold text-stone-700">{p.metaphor}</p>
                    <p className="text-xs text-stone-400">{PILLAR_LABEL[p.pillar]} ({p.pillar})</p>
                  </div>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed mb-2">{p.description}</p>

                <div className={`text-xs flex items-center gap-1 ${c.accent} font-medium`}>
                  🌸 {p.flower}
                  <span className="text-stone-400 font-normal ml-1">— {p.flowerDesc}</span>
                </div>

                {/* 하늘·땅 기운 뱃지 */}
                <div className="flex gap-1.5 mt-2">
                  <span className="text-[10px] bg-white/80 border border-stone-200 px-1.5 py-0.5 rounded text-stone-500">
                    하늘 기운 {p.stemName}({p.stemChar}) · {p.stemOhaeng}
                  </span>
                  <span className="text-[10px] bg-white/80 border border-stone-200 px-1.5 py-0.5 rounded text-stone-500">
                    땅 기운 {p.branchName}({p.branchChar}) · {p.branchOhaeng}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {(birthFlower || birthColor) && (
          <div className="mt-1 rounded-xl bg-stone-50/80 border border-stone-100 px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {birthFlower && (
              <p className="text-xs text-stone-600">
                🌸 나의 탄생화 <span className="font-bold text-stone-800">{birthFlower.name}</span>
                {birthFlower.meaning && (
                  <span className="text-stone-400"> — &lsquo;{birthFlower.meaning}&rsquo;</span>
                )}
              </p>
            )}
            {birthColor && (
              <p className="text-xs text-stone-600">
                🎨 나의 탄생색 <span className="font-bold text-stone-800">{birthColor.name}</span>
              </p>
            )}
          </div>
        )}

        {pillars.length < 4 && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-dashed border-stone-200 shrink-0">
              <span className="text-base">🍎</span>
            </div>
            <div className="flex-1 rounded-xl border border-dashed border-stone-200 p-4 mb-3 text-center">
              <p className="text-xs text-stone-400">열매 기운 (노년기)</p>
              <p className="text-xs text-stone-300 mt-1">태어난 시간을 입력하면 노년기 기운도 볼 수 있어요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

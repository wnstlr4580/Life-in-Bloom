"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Ohaeng } from "@/lib/saju"
import type { SajuProduct } from "@/types/saju"

const ORDER: Ohaeng[] = ["목", "화", "토", "금", "수"]

const ANGLE: Record<Ohaeng, number> = { 목: 90, 화: 18, 토: -54, 금: -126, 수: 162 }

const COLOR: Record<Ohaeng, { hex: string; bar: string; text: string }> = {
  목: { hex: "#10b981", bar: "bg-emerald-400", text: "text-emerald-700" },
  화: { hex: "#f43f5e", bar: "bg-rose-400",    text: "text-rose-600"    },
  토: { hex: "#f59e0b", bar: "bg-amber-400",   text: "text-amber-700"   },
  금: { hex: "#94a3b8", bar: "bg-slate-400",   text: "text-slate-600"   },
  수: { hex: "#3b82f6", bar: "bg-blue-400",    text: "text-blue-700"    },
}

const EMOJI: Record<Ohaeng, string> = { 목: "🌿", 화: "🔥", 토: "🌾", 금: "✨", 수: "💧" }

const CX = 130, CY = 130, R = 95
const GRID_SCALES = [1 / 3, 2 / 3, 1]
/** 값이 0이어도 도트가 중심에 뭉치지 않게 하는 최소 반경. before/after 동일 규칙이어야 이동량이 안 깎인다. */
const MIN_SCALE = 0.04

function vertex(o: Ohaeng, scale: number) {
  const a = (ANGLE[o] * Math.PI) / 180
  return { x: CX + R * scale * Math.cos(a), y: CY - R * scale * Math.sin(a) }
}

function toPath(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + "Z"
}

interface Props {
  /** 현재 오행 분포(%) — API가 계산한 값. 여기서 다시 계산하지 않는다. */
  pct: Record<Ohaeng, number>
  /** 오행 균형 추천 꽃 */
  flowers: SajuProduct[]
}

export function OhaengBalance({ pct, flowers }: Props) {
  const [selectedId, setSelectedId] = useState(flowers[0]?.id ?? null)
  const selected = flowers.find((f) => f.id === selectedId) ?? flowers[0]
  const after = selected?.pctAfter

  // 분모는 현재 분포 + 후보 전부를 한 번에 훑어 고정한다.
  // 선택한 꽃마다 다시 잡으면 기준선("지금" 폴리곤)이 같이 움직여 비교가 무의미해진다.
  const denom = Math.max(
    ...ORDER.flatMap((o) => [pct[o], ...flowers.map((f) => f.pctAfter?.[o] ?? 0)]),
    1,
  )
  const scale = (v: number) => Math.max(v / denom, MIN_SCALE)

  const beforePts = ORDER.map((o) => vertex(o, scale(pct[o])))
  const afterPts = after ? ORDER.map((o) => vertex(o, scale(after[o]))) : null
  const shown = after ?? pct

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-bold text-stone-800">이 꽃이 채워주는 오행 균형</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            {flowers.length > 0 ? "꽃을 누르면 차트가 어떻게 바뀌는지 보여드려요" : "다섯 가지 기운 분포"}
          </p>
        </div>
        {selected?.balanceAfter != null && (
          <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full shrink-0">
            균형 {selected.balanceBefore} → {selected.balanceAfter}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* 왼쪽 — 추천 꽃 썸네일 */}
        {flowers.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-2 gap-2 sm:w-44 shrink-0 self-start">
            {flowers.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedId(f.id)}
                aria-pressed={f.id === selected?.id}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  f.id === selected?.id
                    ? "border-rose-300 shadow-sm"
                    : "border-stone-100 hover:border-rose-200 opacity-70 hover:opacity-100"
                }`}
              >
                {f.images[0] ? (
                  <Image src={f.images[0]} alt={f.name} fill sizes="(max-width: 640px) 22vw, 80px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl bg-stone-50">🌸</div>
                )}
                <span className="absolute bottom-0 inset-x-0 bg-black/45 text-white text-[10px] font-bold py-0.5">
                  {f.score}점
                </span>
              </button>
            ))}
          </div>
        )}

        {/* 오른쪽 — 차트 + 오행 막대 */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 items-center">
          <div className="shrink-0 w-full max-w-[240px]">
            <svg viewBox="0 0 260 260" className="w-full h-auto">
              {GRID_SCALES.map((s) => (
                <polygon
                  key={s}
                  points={ORDER.map((o) => { const v = vertex(o, s); return `${v.x},${v.y}` }).join(" ")}
                  fill="none"
                  stroke={s === 1 ? "#cbd5e1" : "#e2e8f0"}
                  strokeWidth={s === 1 ? "1.5" : "1"}
                  strokeDasharray={s === 1 ? "none" : "3,2"}
                />
              ))}
              {ORDER.map((o) => {
                const v = vertex(o, 1)
                return <line key={o} x1={CX} y1={CY} x2={v.x} y2={v.y} stroke="#e2e8f0" strokeWidth="1" />
              })}

              {/* 지금 — 꽃을 골라도 움직이지 않는 기준선 */}
              {afterPts && (
                <path d={toPath(beforePts)} fill="none" stroke="#cbd5e1" strokeWidth="1.5"
                  strokeDasharray="4,3" strokeLinejoin="round" />
              )}
              {/* 이 꽃을 더하면 (꽃이 없으면 현재 분포) */}
              <path d={toPath(afterPts ?? beforePts)} fill="rgba(251,113,133,0.13)"
                stroke="rgba(244,63,94,0.5)" strokeWidth="2" strokeLinejoin="round" />

              {(afterPts ?? beforePts).map((p, i) => (
                <circle key={ORDER[i]} cx={p.x} cy={p.y} r={shown[ORDER[i]] > 0 ? 5 : 3}
                  fill={COLOR[ORDER[i]].hex} opacity={shown[ORDER[i]] > 0 ? 1 : 0.25} />
              ))}
              {ORDER.map((o) => {
                const lv = vertex(o, 1.26)
                return (
                  <text key={o} x={lv.x} y={lv.y} textAnchor="middle" dominantBaseline="middle"
                    fontSize="12" fontWeight="700" fill={COLOR[o].hex}>
                    {EMOJI[o]}{o}
                  </text>
                )
              })}
              <circle cx={CX} cy={CY} r="2" fill="#cbd5e1" />
            </svg>
            {afterPts && (
              <p className="text-[10px] text-stone-400 text-center mt-1">
                <span className="text-stone-400">┈ 지금</span> · <span className="text-rose-400">▨ 이 꽃을 더하면</span>
              </p>
            )}
          </div>

          {/* 오행 막대 — 막대는 "더한 후", 세로 틱이 "지금" */}
          <div className="flex-1 w-full space-y-3">
            {ORDER.map((o) => {
              const delta = after ? after[o] - pct[o] : 0
              return (
                <div key={o}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-stone-600">{EMOJI[o]} {o}</span>
                    <span className={`text-xs font-bold ${shown[o] === 0 ? "text-stone-300" : COLOR[o].text}`}>
                      {shown[o]}%
                      {delta !== 0 && (
                        <span className={`ml-1 font-semibold ${delta > 0 ? "text-emerald-600" : "text-stone-400"}`}>
                          {delta > 0 ? "+" : ""}{delta}%p
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-3 bg-stone-100 rounded-full overflow-hidden relative">
                    <div className={`h-full rounded-full ${COLOR[o].bar}`} style={{ width: `${shown[o]}%` }} />
                    {after && (
                      <div className="absolute inset-y-0 w-0.5 bg-stone-400/70" style={{ left: `${pct[o]}%` }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 하단 — 선택한 꽃과 추천 근거 */}
      {selected && (
        <div className="border-t border-stone-100 pt-5 space-y-3">
          <Link
            href={`/products/${selected.id}`}
            className="flex items-baseline justify-between gap-3 group"
          >
            <span className="text-sm font-bold text-stone-800 group-hover:text-rose-500 transition-colors line-clamp-1">
              {selected.name}
            </span>
            <span className="text-sm font-bold text-rose-500 shrink-0">
              {selected.price.toLocaleString()}원 →
            </span>
          </Link>
          {selected.flowerMeaning && (
            <p className="text-xs text-stone-400">{selected.flowerMeaning}</p>
          )}
          <ul className="bg-stone-50/70 rounded-xl p-3 space-y-2">
            {(selected.reasons ?? []).map((r, i) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="text-base leading-none mt-0.5">{r.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-stone-700">{r.title}</p>
                  <p className="text-[11px] text-stone-400 leading-tight">{r.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Ohaeng } from "@/lib/saju"
import type { SajuFlower } from "@/types/saju"
import { flowerBuyHref } from "@/lib/sajuFlowerLink"

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
/** 축을 잘랐을 때 최솟값이 갖는 반경. 0이면 그 축이 중심에 뭉쳐 오각형이 안 보인다. */
const ZOOMED_FLOOR = 0.18
/** 축을 안 잘랐을 때(최솟값이 0) 도트가 중심에 겹치지 않을 최소 반경. */
const BASE_FLOOR = 0.04

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
  flowers: SajuFlower[]
  /** 지금 주문 가능한 꽃 id — 없으면 배지를 그리지 않는다 */
  availableIds?: Set<string>
}

export function OhaengBalance({ pct, flowers, availableIds }: Props) {
  const [selectedId, setSelectedId] = useState(flowers[0]?.id ?? null)
  const selected = flowers.find((f) => f.id === selectedId) ?? flowers[0]
  const after = selected?.pctAfter

  // 눈금 범위는 현재 분포 + 후보 전부를 한 번에 훑어 고정한다.
  // 선택한 꽃마다 다시 잡으면 기준선("지금" 폴리곤)이 같이 움직여 비교가 무의미해진다.
  const shownValues = ORDER.flatMap((o) => [pct[o], ...flowers.map((f) => f.pctAfter?.[o] ?? pct[o])])
  const axisMax = Math.max(...shownValues, 1)
  // 축 확대 — 0%부터 그리지 않고 실제로 나타나는 값 범위만 펼친다.
  // 변화가 잘 보이는 대신 축이 잘린 그래프이므로 눈금을 반드시 표기한다.
  const axisMin = Math.min(...shownValues)
  const zoomed = axisMin > 0
  // 최솟값이 0이면 자를 축이 없다. 이때 안쪽 여백을 크게 잡으면 오히려 이동량만 깎인다.
  const floor = zoomed ? ZOOMED_FLOOR : BASE_FLOOR
  const span = axisMax - axisMin || 1
  const scale = (v: number) =>
    Math.min(1, Math.max(floor, floor + (1 - floor) * ((v - axisMin) / span)))

  const beforePts = ORDER.map((o) => vertex(o, scale(pct[o])))
  const afterPts = after ? ORDER.map((o) => vertex(o, scale(after[o]))) : null
  const shown = after ?? pct

  const beforeD = toPath(beforePts)
  const afterD = afterPts ? toPath(afterPts) : beforeD
  // 두 폴리곤의 대칭차 = 바뀐 영역. evenodd라 한쪽에만 덮인 부분만 칠해진다.
  const bandD = `${beforeD} ${afterD}`

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
        {/* 왼쪽 — 선택한 꽃을 크게, 아래에 나머지 후보 썸네일 */}
        {selected && (
          <div className="sm:w-56 shrink-0 space-y-3 self-start">
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-stone-100 bg-stone-50">
              {selected.img ? (
                <Image src={selected.img} alt={selected.name} fill
                  sizes="(max-width: 640px) 90vw, 224px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">{selected.emoji}</div>
              )}
              <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-rose-500 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                {selected.score}점
              </span>
              {availableIds?.has(selected.id) && (
                <span className="absolute top-2 left-2 bg-emerald-500/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  지금 살 수 있어요
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-stone-800 mt-2.5 leading-snug">
              {selected.emoji} {selected.name}
            </p>
            {selected.flowerMeaning && (
              <p className="text-xs text-stone-400 mt-1 line-clamp-2">{selected.flowerMeaning}</p>
            )}
            {/* 가격은 싣지 않는다 — 카탈로그의 값은 송이 단가라 완제품 가격으로 오해된다 */}
            <Link
              href={flowerBuyHref(selected)}
              className="block text-center text-xs font-semibold rounded-xl bg-rose-400 hover:bg-rose-500 text-white py-2.5 transition-colors"
            >
              {selected.productCount > 0 ? `🛒 ${selected.species} 상품 보기` : "💐 이 꽃으로 꽃다발 만들기"}
            </Link>

            {flowers.length > 1 && (
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {flowers.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedId(f.id)}
                    aria-pressed={f.id === selected.id}
                    aria-label={`${f.name} 추천 근거 보기`}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      f.id === selected.id
                        ? "border-rose-400"
                        : "border-transparent opacity-55 hover:opacity-100"
                    }`}
                  >
                    {f.img ? (
                      <Image src={f.img} alt="" fill sizes="52px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg bg-stone-50">{f.emoji}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 오른쪽 — 차트 + 오행 막대 */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 items-center">
          <div className="shrink-0 w-full max-w-[280px]">
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

              {/* 바뀐 영역 — 지금과 더한 후의 차이. 없던 상태에서 자라나듯 재생된다. */}
              {afterPts && (
                <path key={`band-${selected?.id}`} d={bandD} fillRule="evenodd"
                  fill="rgba(244,63,94,0.22)" stroke="none">
                  <animate attributeName="d" from={`${beforeD} ${beforeD}`} to={bandD}
                    dur="0.6s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
                </path>
              )}

              {/* 이 꽃을 더하면 — 지금 모양에서 출발해 변형된다 */}
              <path key={`after-${selected?.id}`} d={afterD} fill="rgba(251,113,133,0.10)"
                stroke="rgba(244,63,94,0.6)" strokeWidth="2" strokeLinejoin="round">
                {afterPts && (
                  <animate attributeName="d" from={beforeD} to={afterD}
                    dur="0.6s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
                )}
              </path>

              {/* 지금 — 꽃을 골라도 움직이지 않는 기준선 */}
              {afterPts && (
                <path d={beforeD} fill="none" stroke="#94a3b8" strokeWidth="1.5"
                  strokeDasharray="4,3" strokeLinejoin="round" />
              )}

              {(afterPts ?? beforePts).map((p, i) => (
                <circle key={`${ORDER[i]}-${selected?.id}`}
                  cx={p.x} cy={p.y} r={shown[ORDER[i]] > 0 ? 5 : 3}
                  fill={COLOR[ORDER[i]].hex} opacity={shown[ORDER[i]] > 0 ? 1 : 0.25}>
                  {afterPts && (
                    <>
                      <animate attributeName="cx" from={beforePts[i].x} to={p.x}
                        dur="0.6s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
                      <animate attributeName="cy" from={beforePts[i].y} to={p.y}
                        dur="0.6s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
                    </>
                  )}
                </circle>
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
              <div className="text-center mt-1.5 space-y-0.5">
                <p className="text-[10px] text-stone-400">
                  <span>┈ 지금</span> · <span className="text-rose-400">▨ 이 꽃을 더하면 (색칠된 부분이 바뀐 만큼)</span>
                </p>
                {/* 축이 잘린 그래프라는 사실을 반드시 밝힌다 — 안 그러면 "목이 절반이네" 같은 오독이 생긴다 */}
                {zoomed && (
                  <p className="text-[10px] text-stone-300">
                    눈금 {axisMin}%~{axisMax}% · 변화가 잘 보이게 0%부터 그리지 않았어요
                  </p>
                )}
              </div>
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

      {/* 하단 — 꽃말 스토리 + 추천 근거 */}
      {selected && (selected.story ?? []).length > 0 && (
        <div className="border-t border-stone-100 pt-5">
          <div className="rounded-xl bg-gradient-to-br from-rose-50/60 to-stone-50/60 border border-rose-100/70 p-4 space-y-1.5">
            {(selected.story ?? []).map((line, i) => (
              <p key={i} className="text-[13px] text-stone-600 leading-relaxed">{line}</p>
            ))}
          </div>
        </div>
      )}

      {selected && (selected.reasons ?? []).length > 0 && (
        <div className="border-t border-stone-100 pt-5">
          <p className="text-sm font-bold text-stone-700 mb-3">
            왜 <span className="text-rose-500">{selected.name}</span>일까요?
          </p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {(selected.reasons ?? []).map((r, i) => (
              <li key={i} className="flex gap-2.5 items-start bg-stone-50/70 rounded-xl p-3">
                <span className="text-lg leading-none mt-0.5">{r.icon}</span>
                <div>
                  <p className="text-xs font-bold text-stone-700">{r.title}</p>
                  <p className="text-[11px] text-stone-400 leading-snug mt-0.5">{r.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

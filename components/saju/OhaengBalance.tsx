"use client"

import Image from "next/image"
import Link from "next/link"
import type { PillarInfo, Ohaeng } from "@/lib/saju"

const ORDER: Ohaeng[] = ["목", "화", "토", "금", "수"]

const ANGLE: Record<Ohaeng, number> = { 목: 90, 화: 18, 토: -54, 금: -126, 수: 162 }

const COLOR: Record<Ohaeng, { hex: string; bar: string; light: string; text: string; border: string }> = {
  목: { hex: "#10b981", bar: "bg-emerald-400", light: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  화: { hex: "#f43f5e", bar: "bg-rose-400",    light: "bg-rose-50",     text: "text-rose-600",    border: "border-rose-200"    },
  토: { hex: "#f59e0b", bar: "bg-amber-400",   light: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200"   },
  금: { hex: "#94a3b8", bar: "bg-slate-400",   light: "bg-slate-50",    text: "text-slate-600",   border: "border-slate-200"   },
  수: { hex: "#3b82f6", bar: "bg-blue-400",    light: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200"    },
}

const EMOJI: Record<Ohaeng, string> = { 목: "🌿", 화: "🔥", 토: "🌾", 금: "✨", 수: "💧" }

const FLOWER_NAME: Record<Ohaeng, string> = {
  목: "튤립 · 수선화",
  화: "빨간 장미 · 거베라",
  토: "국화 · 프리지아",
  금: "백합 · 카네이션",
  수: "수국 · 라벤더",
}

const FLOWER_DESC: Record<Ohaeng, string> = {
  목: "성장과 생명력을 채워드립니다",
  화: "열정과 활력을 불어넣어 줍니다",
  토: "안정과 포용력을 더해드립니다",
  금: "순수함과 결실의 기운을 드립니다",
  수: "지혜와 유연함을 보충해 줍니다",
}

const CX = 130, CY = 130, R = 95

// 격자 비율: 33% / 66% / 100%
const GRID_SCALES = [1 / 3, 2 / 3, 1]
const GRID_LABELS = ["33%", "66%", "100%"]

function vertex(o: Ohaeng, scale: number) {
  const a = (ANGLE[o] * Math.PI) / 180
  return { x: CX + R * scale * Math.cos(a), y: CY - R * scale * Math.sin(a) }
}

function toPath(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + "Z"
}

interface Product {
  id: string
  name: string
  price: number
  images: string[]
  flowerMeaning: string | null
  category: string
}

interface LackingEntry {
  ohaeng: Ohaeng
  products: Product[]
}

interface Props {
  pillars: PillarInfo[]
  lackingProducts?: LackingEntry[]
}

export function OhaengBalance({ pillars, lackingProducts = [] }: Props) {
  const raw: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  pillars.forEach(p => { raw[p.stemOhaeng]++; raw[p.branchOhaeng]++ })
  const total = Object.values(raw).reduce((a, b) => a + b, 0)
  const pct = Object.fromEntries(
    ORDER.map(o => [o, total > 0 ? Math.round((raw[o] / total) * 100) : 0])
  ) as Record<Ohaeng, number>

  const needFlower = ORDER.filter(o => pct[o] < 20)

  // 최댓값 기준 상대 스케일 — 가장 강한 기운이 외곽에 닿도록
  const maxPct = Math.max(...ORDER.map(o => pct[o]), 1)
  const relScale = (o: Ohaeng) => pct[o] === 0 ? 0.03 : Math.max(pct[o] / maxPct, 0.05)

  const valuePts = ORDER.map(o => vertex(o, relScale(o)))

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-6">
      <div>
        <h3 className="font-bold text-stone-800">다섯 가지 기운 분포</h3>
        <p className="text-xs text-stone-400 mt-0.5">
          사주 {pillars.length}개 기둥 기준
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-center">
        {/* 오각형 레이더 차트 */}
        <div className="shrink-0">
          <svg viewBox="0 0 260 260" width="220" height="220">
            {/* 격자 오각형 + 라벨 */}
            {GRID_SCALES.map((s) => (
              <polygon
                key={s}
                points={ORDER.map(o => { const v = vertex(o, s); return `${v.x},${v.y}` }).join(" ")}
                fill="none"
                stroke={s === 1 ? "#cbd5e1" : "#e2e8f0"}
                strokeWidth={s === 1 ? "1.5" : "1"}
                strokeDasharray={s === 1 ? "none" : "3,2"}
              />
            ))}
            {/* 축 선 */}
            {ORDER.map(o => {
              const v = vertex(o, 1)
              return <line key={o} x1={CX} y1={CY} x2={v.x} y2={v.y} stroke="#e2e8f0" strokeWidth="1" />
            })}
            {/* 실제 값 채움 */}
            <path
              d={toPath(valuePts)}
              fill="rgba(251,113,133,0.13)"
              stroke="rgba(244,63,94,0.5)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* 꼭짓점 도트 */}
            {ORDER.map((o, i) => (
              <circle
                key={o}
                cx={valuePts[i].x} cy={valuePts[i].y}
                r={pct[o] > 0 ? 5 : 3}
                fill={COLOR[o].hex}
                opacity={pct[o] > 0 ? 1 : 0.25}
              />
            ))}
            {/* 오행 라벨 */}
            {ORDER.map(o => {
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
        </div>

        {/* 퍼센트 바 */}
        <div className="flex-1 w-full space-y-3">
          {ORDER.map(o => (
            <div key={o}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-stone-600">{EMOJI[o]} {o}</span>
                <span className={`text-xs font-bold ${pct[o] === 0 ? "text-stone-300" : COLOR[o].text}`}>
                  {pct[o]}%{pct[o] === 0 && <span className="font-normal ml-1 text-stone-300">없음</span>}
                </span>
              </div>
              <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${COLOR[o].bar}`}
                  style={{ width: `${pct[o]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 부족한 기운 + 상품 추천 */}
      {needFlower.length > 0 ? (
        <div className="border-t border-stone-100 pt-5 space-y-4">
          <p className="text-sm font-bold text-stone-700">🌸 부족한 기운 채워줄 꽃</p>
          {needFlower.map(o => {
            const entry = lackingProducts.find(lp => lp.ohaeng === o)
            const products = entry?.products ?? []
            return (
              <div key={o} className={`rounded-xl border p-4 space-y-3 ${COLOR[o].light} ${COLOR[o].border}`}>
                {/* 헤더 */}
                <div className="flex items-center gap-2">
                  <span className="text-xl">{EMOJI[o]}</span>
                  <div>
                    <span className={`text-sm font-bold ${COLOR[o].text}`}>{o} 기운이 부족해요</span>
                    <span className={`ml-2 text-[11px] px-1.5 py-0.5 rounded-full bg-white/70 ${COLOR[o].text}`}>
                      {pct[o] === 0 ? "전혀 없어요" : `${pct[o]}% — 조금 부족`}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-stone-500">
                  <span className="font-medium">{FLOWER_NAME[o]}</span>
                  {" — "}{FLOWER_DESC[o]}
                </p>

                {/* 상품 카드 */}
                {products.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {products.map(p => (
                      <Link
                        key={p.id}
                        href={`/products/${p.id}`}
                        className="group bg-white rounded-xl overflow-hidden border border-white hover:border-stone-200 hover:shadow-md transition-all"
                      >
                        <div className="aspect-square relative overflow-hidden bg-stone-50">
                          {p.images[0] ? (
                            <Image
                              src={p.images[0]} alt={p.name} fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🌸</div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-[11px] font-medium text-stone-700 line-clamp-2 leading-tight">{p.name}</p>
                          <p className={`text-xs font-bold mt-1 ${COLOR[o].text}`}>
                            {p.price.toLocaleString()}원
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 text-center py-2">
                    관련 상품 준비 중이에요 🌱
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="border-t border-stone-100 pt-4 text-center py-3">
          <p className="text-sm text-stone-500">⚖️ 다섯 가지 기운이 고르게 퍼져 있어요!</p>
        </div>
      )}
    </div>
  )
}

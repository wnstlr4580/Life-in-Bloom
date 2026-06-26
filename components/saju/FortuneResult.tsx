"use client"

import type { FortuneResult, FortuneScores } from "@/lib/fortune"

const SCORE_ITEMS: { key: keyof Omit<FortuneScores, "총운">; label: string; emoji: string; color: string; bar: string }[] = [
  { key:"애정", label:"사랑 · 인간관계", emoji:"💕", color:"text-rose-500",   bar:"bg-rose-400"   },
  { key:"재물", label:"돈 · 재물",       emoji:"💰", color:"text-amber-600",  bar:"bg-amber-400"  },
  { key:"일",   label:"일 · 공부",       emoji:"💼", color:"text-blue-600",   bar:"bg-blue-400"   },
  { key:"건강", label:"건강 · 활력",     emoji:"🌿", color:"text-emerald-600",bar:"bg-emerald-400"},
]

// 점수 등급
function scoreGrade(s: number): { label: string; color: string } {
  if (s >= 85) return { label:"매우 좋아요",  color:"text-rose-500"    }
  if (s >= 70) return { label:"좋아요",       color:"text-amber-500"   }
  if (s >= 55) return { label:"보통이에요",   color:"text-stone-500"   }
  if (s >= 40) return { label:"조심하세요",   color:"text-blue-500"    }
  return                { label:"쉬는 날이에요", color:"text-violet-500" }
}

// 총운 → 꽃 추천 한마디
function totalComment(s: number): string {
  if (s >= 85) return "오늘은 정말 좋은 날이에요! 중요한 일은 오늘 해보세요 🌸"
  if (s >= 70) return "전반적으로 괜찮은 날이에요. 자신 있게 움직이세요 🌿"
  if (s >= 55) return "평범한 하루예요. 무리하지 말고 차분하게 지내세요 🌾"
  if (s >= 40) return "조금 조심스러운 날이에요. 큰 결정은 내일로 미루세요 🍂"
  return "오늘은 쉬는 게 최고예요. 재충전하면 내일이 더 좋아져요 💧"
}

// 반원 게이지 SVG
function HalfGauge({ score, color }: { score: number; color: string }) {
  const R = 48
  const stroke = 10
  const cx = 60, cy = 58
  // 반원: 180도 = Math.PI * R ≈ 150.8
  const C_HALF = Math.PI * R
  const fill = (score / 100) * C_HALF
  return (
    <svg width="120" height="70" viewBox="0 0 120 70">
      {/* 배경 반원 */}
      <path
        d={`M ${cx-R},${cy} A ${R},${R} 0 0 1 ${cx+R},${cy}`}
        fill="none" stroke="#f1f5f9" strokeWidth={stroke} strokeLinecap="round"
      />
      {/* 값 반원 */}
      <path
        d={`M ${cx-R},${cy} A ${R},${R} 0 0 1 ${cx+R},${cy}`}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${fill} ${C_HALF}`}
      />
      {/* 점수 텍스트 */}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="700" fill="#1c1917">{score}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#78716c">점</text>
    </svg>
  )
}

// 총운 큰 원형 게이지
function TotalRing({ score }: { score: number }) {
  const R = 52, C = 2 * Math.PI * R
  const fill = (score / 100) * C
  const grade = scoreGrade(score)
  const ringColor = score >= 70 ? "#f43f5e" : score >= 50 ? "#f59e0b" : "#94a3b8"
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={R} fill="none" stroke="#f1f5f9" strokeWidth="11" />
        <circle cx="65" cy="65" r={R} fill="none" stroke={ringColor} strokeWidth="11"
          strokeDasharray={`${fill} ${C}`} strokeLinecap="round"
          transform="rotate(-90 65 65)" />
        <text x="65" y="60" textAnchor="middle" dominantBaseline="middle"
          fontSize="24" fontWeight="800" fill="#1c1917">{score}</text>
        <text x="65" y="76" textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fill="#78716c">점</text>
      </svg>
      <p className={`text-sm font-bold ${grade.color}`}>{grade.label}</p>
    </div>
  )
}

interface Props { fortune: FortuneResult; name?: string }

export function FortuneResult({ fortune, name }: Props) {
  const { scores, iljin, sipseong, sibiUnseong, sinsal, todayDate } = fortune

  const OHAENG_EMOJI: Record<string,string> = { 목:"🌿", 화:"🔥", 토:"🌾", 금:"✨", 수:"💧" }
  const OHAENG_NAME:  Record<string,string> = { 목:"나무", 화:"불", 토:"흙", 금:"금속", 수:"물" }

  const gaugeColors: Record<string, string> = {
    애정:"#f43f5e", 재물:"#f59e0b", 일:"#3b82f6", 건강:"#10b981"
  }

  return (
    <div className="space-y-4 text-center">
      {/* 섹션 제목 */}
      <div className="flex items-center justify-center gap-2">
        <h3 className="font-bold text-stone-800">오늘의 운세</h3>
        <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{todayDate}</span>
      </div>

      {/* 총운 + 4가지 점수 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-5">
        {/* 총운 */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-stone-400">{name ? `${name}님의 ` : ""}오늘 전체 운세</p>
          <TotalRing score={scores.총운} />
          <p className="text-xs text-stone-500 leading-relaxed px-4">
            {totalComment(scores.총운)}
          </p>
        </div>

        {/* 4가지 반원 게이지 */}
        <div className="grid grid-cols-2 gap-3">
          {SCORE_ITEMS.map(({ key, label, emoji }) => {
            const s = scores[key]
            const g = scoreGrade(s)
            return (
              <div key={key} className="flex flex-col items-center bg-stone-50 rounded-xl p-3">
                <p className="text-xs font-medium text-stone-600 mb-1">{emoji} {label}</p>
                <HalfGauge score={s} color={gaugeColors[key]} />
                <p className={`text-[11px] font-semibold mt-1 ${g.color}`}>{g.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 오늘의 기운 (일진) */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5">
        <p className="text-sm font-bold text-stone-700 mb-3">오늘의 하늘·땅 기운</p>
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <span className="inline-flex flex-col items-center bg-stone-800 text-white rounded-xl px-4 py-2">
              <span className="text-[10px] opacity-60">하늘</span>
              <span className="text-lg font-bold">{iljin.stemChar}</span>
              <span className="text-[10px]">{iljin.stemName} · {OHAENG_EMOJI[iljin.stemOhaeng]}{OHAENG_NAME[iljin.stemOhaeng]}</span>
            </span>
            <span className="inline-flex flex-col items-center bg-stone-700 text-white rounded-xl px-4 py-2">
              <span className="text-[10px] opacity-60">땅</span>
              <span className="text-lg font-bold">{iljin.branchChar}</span>
              <span className="text-[10px]">{iljin.branchName} · {OHAENG_EMOJI[iljin.branchOhaeng]}{OHAENG_NAME[iljin.branchOhaeng]}</span>
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-stone-800">{iljin.combined}</p>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">{iljin.desc}</p>
          </div>
        </div>
      </div>

      {/* 오늘 기운이 나에게 어떤 역할 (십성) */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5">
        <p className="text-sm font-bold text-stone-700 mb-3">오늘 기운이 나에게 어떤 역할?</p>
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl">{sipseong.emoji}</span>
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-sm font-bold text-stone-800">{sipseong.title}</span>
              <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">{sipseong.name}</span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">{sipseong.fortune}</p>
          </div>
        </div>
      </div>

      {/* 오늘 내 기운의 단계 (십이운성) */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5">
        <p className="text-sm font-bold text-stone-700 mb-3">오늘 내 기운의 단계</p>
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl">{sibiUnseong.emoji}</span>
          <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{sibiUnseong.name}</span>
          {/* 활력 바 */}
          <div className="w-full flex items-center gap-2 mt-1">
            <span className="text-xs text-stone-400 shrink-0">활력</span>
            <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  sibiUnseong.vitality >= 75 ? "bg-emerald-400" :
                  sibiUnseong.vitality >= 50 ? "bg-amber-400" : "bg-rose-300"
                }`}
                style={{ width: `${sibiUnseong.vitality}%` }}
              />
            </div>
            <span className="text-xs font-bold text-stone-600 shrink-0">{sibiUnseong.vitality}%</span>
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">{sibiUnseong.desc}</p>
        </div>

        {/* 12단계 미니 타임라인 */}
        <div className="mt-3 flex gap-0.5">
          {["장생","목욕","관대","건록","제왕","쇠","병","사","묘","절","태","양"].map(stage => (
            <div
              key={stage}
              className={`flex-1 h-1.5 rounded-sm ${
                stage === sibiUnseong.name ? "bg-rose-400 scale-y-150" : "bg-stone-200"
              }`}
              title={stage}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-stone-300 mt-0.5 px-0.5">
          <span>장생</span><span>제왕</span><span>양</span>
        </div>
      </div>

      {/* 오늘의 특별한 기운 (신살) */}
      {sinsal.length > 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <p className="text-sm font-bold text-stone-700 mb-3">오늘의 특별한 기운</p>
          <div className="space-y-3">
            {sinsal.map(s => (
              <div
                key={s.name}
                className={`flex items-start gap-3 rounded-xl p-3 ${
                  s.type === "길" ? "bg-amber-50 border border-amber-100" : "bg-slate-50 border border-slate-100"
                }`}
              >
                <span className="text-2xl shrink-0">{s.emoji}</span>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-bold text-stone-800">{s.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      s.type === "길" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                    }`}>{s.name} · {s.type}신</span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-stone-50 rounded-xl border border-stone-100 p-4 text-center">
          <p className="text-xs text-stone-400">오늘은 특별한 기운이 없어요. 평범하지만 안정적인 하루예요 🌿</p>
        </div>
      )}
    </div>
  )
}

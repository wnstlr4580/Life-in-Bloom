"use client"

import { useState } from "react"
import { calculateSaju } from "@/lib/saju"
import { calcCompat, gradeLabel } from "@/lib/compat"
import type { PersonSaju, CompatScore } from "@/lib/compat"

// ─── helpers ────────────────────────────────────────────────
const CHEONGAN = ["갑","을","병","정","무","기","경","신","임","계"]
const JIJI = ["자","축","인","묘","진","사","오","미","신","유","술","해"]

function buildPerson(
  name: string,
  year: string, month: string, day: string,
  ampm: string, hour: string, min: string, timeKnown: boolean,
): PersonSaju | null {
  if (!year || !month || !day) return null
  const date = new Date(`${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}`)
  if (isNaN(date.getTime())) return null
  // 분을 고르지 않았으면 00분으로 계산 (시간 전체가 무시되지 않도록)
  const birthHour = timeKnown && hour
    ? `${ampm === "오후" && hour !== "12" ? +hour + 12 : ampm === "오전" && hour === "12" ? 0 : +hour}:${min || "00"}`
    : "unknown"
  const saju = calculateSaju(date, birthHour)
  const dayPillar = saju.pillars.find(p => p.pillar === "일주")
  if (!dayPillar) return null
  return {
    name,
    pillars: saju.pillars,
    mainOhaeng: saju.mainOhaeng,
    dayStemIdx: CHEONGAN.indexOf(dayPillar.stemName),
    dayBranchIdx: JIJI.indexOf(dayPillar.branchName),
  }
}

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function getDays(year: string, month: string) {
  if (!year || !month) return 31
  return new Date(+year, +month, 0).getDate()
}

// ─── PersonForm ──────────────────────────────────────────────
interface FormState {
  name: string; gender: "female" | "male"
  year: string; month: string; day: string
  ampm: string; hour: string; min: string; timeKnown: boolean
}

function emptyForm(): FormState {
  return { name: "", gender: "female", year: "", month: "", day: "", ampm: "오전", hour: "", min: "", timeKnown: false }
}

function PersonForm({ label, color, form, onChange }: {
  label: string; color: string
  form: FormState; onChange: (f: FormState) => void
}) {
  const s = (k: keyof FormState, v: string | boolean) => onChange({ ...form, [k]: v })
  const days = Array.from({ length: getDays(form.year, form.month) }, (_, i) => i + 1)

  return (
    <div className={`rounded-2xl border-2 p-5 space-y-4 ${color}`}>
      <p className="text-sm font-bold text-stone-700">{label}</p>

      {/* 이름 */}
      <input
        type="text" placeholder="이름"
        value={form.name} onChange={e => s("name", e.target.value)}
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-rose-300"
      />

      {/* 성별 */}
      <div className="flex gap-2">
        {(["female", "male"] as const).map((v) => (
          <button key={v} type="button" onClick={() => s("gender", v)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              form.gender === v ? "bg-rose-400 border-rose-400 text-white" : "bg-white border-stone-200 text-stone-600"
            }`}>
            {v === "female" ? "여성" : "남성"}
          </button>
        ))}
      </div>

      {/* 생년월일 */}
      <div>
        <p className="text-xs text-stone-500 mb-1.5">생년월일</p>
        <div className="flex gap-1.5">
          <select value={form.year} onChange={e => s("year", e.target.value)}
            className="flex-[2] rounded-lg border border-stone-200 px-1.5 py-2 text-xs text-stone-700 bg-white focus:outline-none focus:border-rose-300">
            <option value="">년도</option>
            {YEARS.map(y => <option key={y} value={String(y)}>{y}년</option>)}
          </select>
          <select value={form.month} onChange={e => onChange({ ...form, month: e.target.value, day: "" })}
            className="flex-1 rounded-lg border border-stone-200 px-1.5 py-2 text-xs text-stone-700 bg-white focus:outline-none focus:border-rose-300">
            <option value="">월</option>
            {MONTHS.map(m => <option key={m} value={String(m)}>{m}월</option>)}
          </select>
          <select value={form.day} onChange={e => s("day", e.target.value)}
            className="flex-1 rounded-lg border border-stone-200 px-1.5 py-2 text-xs text-stone-700 bg-white focus:outline-none focus:border-rose-300">
            <option value="">일</option>
            {days.map(d => <option key={d} value={String(d)}>{d}일</option>)}
          </select>
        </div>
      </div>

      {/* 시간 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-stone-500">태어난 시간 (선택)</span>
          <button type="button"
            onClick={() => s("timeKnown", !form.timeKnown)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              form.timeKnown ? "bg-rose-50 border-rose-300 text-rose-500" : "bg-stone-50 border-stone-200 text-stone-400"
            }`}>
            {form.timeKnown ? "입력 중" : "모름"}
          </button>
        </div>
        {form.timeKnown && (
          <div className="flex gap-1.5">
            <select value={form.ampm} onChange={e => s("ampm", e.target.value)}
              className="rounded-lg border border-stone-200 px-1.5 py-1.5 text-xs text-stone-700 bg-white focus:outline-none focus:border-rose-300">
              <option>오전</option><option>오후</option>
            </select>
            <select value={form.hour} onChange={e => s("hour", e.target.value)}
              className="flex-1 rounded-lg border border-stone-200 px-1.5 py-1.5 text-xs text-stone-700 bg-white focus:outline-none focus:border-rose-300">
              <option value="">시</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={String(h)}>{h}시</option>)}
            </select>
            <select value={form.min} onChange={e => s("min", e.target.value)}
              className="flex-1 rounded-lg border border-stone-200 px-1.5 py-1.5 text-xs text-stone-700 bg-white focus:outline-none focus:border-rose-300">
              <option value="">분</option>
              {Array.from({ length: 60 }, (_, i) => i).map(m => <option key={m} value={String(m).padStart(2,"0")}>{String(m).padStart(2,"0")}분</option>)}
            </select>
          </div>
        )}
        {!form.timeKnown && (
          <p className="text-[11px] text-stone-400 mt-1">시간을 모르면 건너뛰어도 괜찮아요</p>
        )}
      </div>
    </div>
  )
}

// ─── ScoreRing SVG ───────────────────────────────────────────
function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const R = 42, C = 2 * Math.PI * R
  const fill = (score / 100) * C
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={R} fill="none" stroke="#f1f5f9" strokeWidth="9" />
        <circle cx="52" cy="52" r={R} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${fill} ${C}`} strokeLinecap="round"
          transform="rotate(-90 52 52)" />
        <text x="52" y="48" textAnchor="middle" dominantBaseline="middle"
          fontSize="18" fontWeight="700" fill="#1c1917">{score}</text>
        <text x="52" y="64" textAnchor="middle" dominantBaseline="middle"
          fontSize="10" fill="#78716c">점</text>
      </svg>
      <p className="text-xs text-stone-500 font-medium text-center">{label}</p>
    </div>
  )
}

// ─── DimCard ─────────────────────────────────────────────────
const DIM_COLORS: Record<string, { hex: string; bg: string; text: string; bar: string }> = {
  기질: { hex: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-400" },
  생각: { hex: "#f59e0b", bg: "bg-amber-50",   text: "text-amber-700",   bar: "bg-amber-400"   },
  생활: { hex: "#ec4899", bg: "bg-pink-50",    text: "text-pink-600",    bar: "bg-pink-400"    },
  역할: { hex: "#8b5cf6", bg: "bg-violet-50",  text: "text-violet-700",  bar: "bg-violet-400"  },
}

function DimCard({ dim, score, subtitle, body, tags }: {
  dim: string; score: number; subtitle: string; body: string; tags?: string[]
}) {
  const c = DIM_COLORS[dim]
  return (
    <div className={`rounded-xl p-4 border border-stone-100 ${c.bg} space-y-2`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${c.text}`}>{dim}</span>
        <span className={`text-sm font-bold ${c.text}`}>{score}점</span>
      </div>
      <div className="h-2 bg-white/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${score}%` }} />
      </div>
      {subtitle && <p className="text-xs font-semibold text-stone-700">{subtitle}</p>}
      <p className="text-xs text-stone-500 leading-relaxed">{body}</p>
      {tags && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {tags.map(t => (
            <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full bg-white/70 ${c.text} font-medium`}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CompatResult ────────────────────────────────────────────
function CompatResult({ a, b, result }: { a: PersonSaju; b: PersonSaju; result: CompatScore }) {
  const grade = gradeLabel(result.total)

  const OHAENG_COLOR: Record<string, string> = { 목: "text-emerald-600", 화: "text-rose-500", 토: "text-amber-600", 금: "text-slate-600", 수: "text-blue-600" }
  const OHAENG_BG: Record<string, string>    = { 목: "bg-emerald-100",   화: "bg-rose-100",   토: "bg-amber-100",   금: "bg-slate-100",   수: "bg-blue-100"   }
  const OHAENG_EMOJI: Record<string, string> = { 목: "🌿", 화: "🔥", 토: "🌾", 금: "✨", 수: "💧" }
  const OHAENG_NAME: Record<string, string>  = { 목: "나무", 화: "불", 토: "흙", 금: "금", 수: "물" }

  // 기질 — 타고난 성격과 온도
  const ohaengDesc =
    result.ohaeng >= 70
      ? "같이 있으면 이유 없이 편안해요. 말하지 않아도 잘 통하는 느낌이에요."
      : result.ohaeng >= 50
      ? "어느 정도 잘 맞지만 '왜 저러지?' 하고 갸웃할 때가 가끔 있어요."
      : "성격과 온도가 꽤 달라요. 서로를 이해하려고 노력이 필요해요."

  // 생각 — 말과 가치관
  const stemDesc =
    result.stemRelation === "합"
      ? "대화가 잘 통해요! 말이 잘 맞고 가치관도 비슷해서 친구 같은 사이가 될 수 있어요."
      : result.stemRelation === "극"
      ? "한 명이 이끌고 한 명이 따르는 관계예요. 강한 끌림이 있지만 가끔 의견 충돌이 생겨요."
      : "가치관이 크게 부딪히거나 딱 맞지도 않는 무난한 사이예요."

  const stemSubtitle =
    result.stemRelation === "합" ? "💘 생각이 잘 맞아요" :
    result.stemRelation === "극" ? "⚔️ 생각이 부딪혀요" : "⚡ 보통이에요"

  // 생활 — 일상과 속궁합
  const branchSubtitle =
    result.branchHarmonyCount > 0
      ? `잘 맞는 기운 ${result.branchHarmonyCount}쌍${result.branchClashCount > 0 ? ` · 부딪히는 기운 ${result.branchClashCount}쌍` : ""}`
      : result.branchClashCount > 0 ? `부딪히는 기운 ${result.branchClashCount}쌍` : "보통이에요"

  const branchDesc =
    result.branchHarmonyCount > 0 && result.branchClashCount === 0
      ? "같이 있으면 정말 편해요. 껌딱지처럼 붙어 있고 싶은 느낌이에요."
      : result.branchHarmonyCount > 0 && result.branchClashCount > 0
      ? "편한 면도 있고 티격태격하는 면도 있어요. 자극적이고 지루하지 않은 관계예요."
      : result.branchClashCount > 0
      ? "자주 투닥거려요. 그래도 그만큼 강렬하게 끌리는 면이 있어요."
      : "크게 부딪히지도, 크게 끌리지도 않는 편안한 사이예요."

  // 역할 — 서로에게 어떤 존재인가 (양방향)
  const sipseongSubtitle =
    `${result.sipseong.icon} ${a.name}에게 ${b.name}은 ${result.sipseong.name} · ` +
    `${result.sipseongReverse.icon} ${b.name}에게 ${a.name}은 ${result.sipseongReverse.name}`

  const ringColor = result.total >= 70 ? "#f43f5e" : result.total >= 55 ? "#10b981" : "#f59e0b"

  return (
    <div className="space-y-6 mt-8">
      {/* 총점 헤더 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 text-center space-y-3">
        <div className="flex items-center justify-center gap-3 mb-1">
          <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${OHAENG_BG[a.mainOhaeng]} ${OHAENG_COLOR[a.mainOhaeng]}`}>
            {OHAENG_EMOJI[a.mainOhaeng]} {a.name} ({OHAENG_NAME[a.mainOhaeng]})
          </span>
          <span className="text-stone-300 text-lg">♥</span>
          <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${OHAENG_BG[b.mainOhaeng]} ${OHAENG_COLOR[b.mainOhaeng]}`}>
            {OHAENG_EMOJI[b.mainOhaeng]} {b.name} ({OHAENG_NAME[b.mainOhaeng]})
          </span>
        </div>

        <div className="flex justify-center">
          <ScoreRing score={result.total} label="전체 궁합 점수" color={ringColor} />
        </div>

        <div>
          <p className={`text-xl font-bold ${grade.color}`}>{grade.emoji} {grade.label}</p>
          <p className="text-xs text-stone-400 mt-1">성격 · 생활 · 생각 · 역할을 함께 분석한 점수예요</p>
        </div>
      </div>

      {/* 4차원 점수 링 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5">
        <p className="text-sm font-bold text-stone-700 mb-4">항목별 궁합</p>
        <div className="grid grid-cols-2 gap-4">
          <ScoreRing score={result.ohaeng}        label="기질 · 성격이 맞나요?"    color={DIM_COLORS.기질.hex} />
          <ScoreRing score={result.stem}          label="생각 · 가치관이 맞나요?"  color={DIM_COLORS.생각.hex} />
          <ScoreRing score={result.branch}        label="생활 · 일상이 잘 맞나요?" color={DIM_COLORS.생활.hex} />
          <ScoreRing score={result.sipseong.score} label="역할 · 서로에게 어떤 존재?" color={DIM_COLORS.역할.hex} />
        </div>
      </div>

      {/* 항목별 상세 설명 */}
      <div className="space-y-3">
        <DimCard dim="기질" score={result.ohaeng}
          subtitle={`${a.name}의 기운(${OHAENG_NAME[a.mainOhaeng]}) ✕ ${b.name}의 기운(${OHAENG_NAME[b.mainOhaeng]})`}
          body={ohaengDesc}
          tags={[result.ohaeng >= 70 ? "서로 도와주는 기운" : result.ohaeng >= 50 ? "무난한 기운" : "기운이 부딪혀요"]}
        />
        <DimCard dim="생각" score={result.stem}
          subtitle={stemSubtitle}
          body={stemDesc}
        />
        <DimCard dim="생활" score={result.branch}
          subtitle={branchSubtitle}
          body={branchDesc}
          tags={result.branchHarmonyCount > 0 ? ["껌딱지 케미"] : result.branchClashCount > 0 ? ["자극적인 관계"] : ["편안한 관계"]}
        />
        <DimCard dim="역할" score={result.sipseong.score}
          subtitle={sipseongSubtitle}
          body={result.sipseong.desc}
          tags={[result.sipseong.name, result.sipseong.label]}
        />
      </div>

      {/* 커플 꽃 */}
      <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-100 p-5 space-y-2">
        <p className="text-sm font-bold text-rose-700">💐 두 사람을 위한 꽃</p>
        <p className="text-base font-bold text-stone-800">{result.coupleFlower}</p>
        <p className="text-xs text-stone-500 leading-relaxed">{result.coupleDesc}</p>
      </div>

      {/* 안내 */}
      <div className="bg-stone-50 rounded-xl border border-stone-100 p-4">
        <p className="text-xs text-stone-500 leading-relaxed">
          📌 <span className="font-semibold">어떤 궁합이 중요할까요?</span><br />
          연인이라면 <span className="font-medium text-pink-600">기질(성격)과 생활(일상)</span>이 가장 중요해요.
          친구나 같이 일하는 사이라면 <span className="font-medium text-amber-600">생각(가치관)과 역할</span>을 더 봐야 해요.
          모든 점수가 다 높을 수는 없으니, 어떤 부분을 중요하게 생각하는지 먼저 정해보세요.
        </p>
        <p className="text-[11px] text-stone-400 mt-2">
          이 결과는 전통 명리 이론(천간합·지지합·충·원진·십성)을 바탕으로 계산한 참고용이에요. 재미있게 봐주세요 🙂
        </p>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────
export default function CompatPage() {
  const [formA, setFormA] = useState<FormState>(emptyForm())
  const [formB, setFormB] = useState<FormState>(emptyForm())
  const [result, setResult] = useState<{ a: PersonSaju; b: PersonSaju; score: CompatScore } | null>(null)
  const [error, setError] = useState("")

  const canCalc =
    formA.name.trim() && formA.year && formA.month && formA.day &&
    formB.name.trim() && formB.year && formB.month && formB.day

  function handleCalc() {
    setError("")
    const a = buildPerson(formA.name, formA.year, formA.month, formA.day, formA.ampm, formA.hour, formA.min, formA.timeKnown)
    const b = buildPerson(formB.name, formB.year, formB.month, formB.day, formB.ampm, formB.hour, formB.min, formB.timeKnown)
    if (!a || !b) { setError("날짜를 다시 확인해 주세요."); return }
    if (a.dayStemIdx < 0 || b.dayStemIdx < 0) { setError("계산 중 오류가 생겼어요. 날짜를 다시 확인해 주세요."); return }
    setResult({ a, b, score: calcCompat(a, b) })
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <p className="text-3xl">💕</p>
        <h1 className="text-2xl font-bold text-stone-800">궁합 보기</h1>
        <p className="text-sm text-stone-400">
          두 사람의 생일로 성격 · 생활 · 생각이 얼마나 잘 맞는지 알아봐요
        </p>
      </div>

      {/* 두 사람 입력 */}
      <div className="space-y-3">
        <PersonForm label="첫 번째 사람" color="border-rose-200 bg-rose-50/30" form={formA} onChange={setFormA} />
        <div className="text-center text-stone-300 text-xl font-bold">♥</div>
        <PersonForm label="두 번째 사람" color="border-violet-200 bg-violet-50/30" form={formB} onChange={setFormB} />
      </div>

      {error && <p className="text-sm text-center text-rose-500">{error}</p>}

      <button
        onClick={handleCalc}
        disabled={!canCalc}
        className="w-full py-3 rounded-xl bg-rose-400 hover:bg-rose-500 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        궁합 보기 💕
      </button>

      {result && (
        <CompatResult a={result.a} b={result.b} result={result.score} />
      )}
    </div>
  )
}

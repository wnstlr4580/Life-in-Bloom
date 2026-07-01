"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  onSubmit: (birthDate: string) => void
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

// 키오스크 전용 — 이름/시간/도시 없이 생년월일만 입력받아 오행만 산출한다.
// (`lib/saju.ts`의 `analyzeOhaeng()`은 생년월일만 있으면 되므로 상세 사주 입력은 생략)
export function BirthDateQuickForm({ onSubmit }: Props) {
  const [year, setYear] = useState("")
  const [month, setMonth] = useState("")
  const [day, setDay] = useState("")

  const days = year && month
    ? Array.from({ length: getDaysInMonth(+year, +month) }, (_, i) => i + 1)
    : Array.from({ length: 31 }, (_, i) => i + 1)

  const canSubmit = year !== "" && month !== "" && day !== ""

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 w-full">
      <div className="text-center space-y-2">
        <p className="text-5xl">🌱</p>
        <h1 className="text-2xl font-bold text-stone-800">생년월일을 알려주세요</h1>
        <p className="text-stone-500 text-sm">당신의 오행 기운에 어울리는 꽃 배경을 만들어 드려요</p>
      </div>

      <div className="flex gap-3">
        <select
          value={year}
          onChange={(e) => { setYear(e.target.value); setDay("") }}
          className="flex-[2] rounded-xl border border-stone-200 px-3 py-4 text-lg text-stone-700 bg-white focus:outline-none focus:border-rose-300"
        >
          <option value="">년도</option>
          {YEARS.map((y) => <option key={y} value={String(y)}>{y}년</option>)}
        </select>
        <select
          value={month}
          onChange={(e) => { setMonth(e.target.value); setDay("") }}
          className="flex-1 rounded-xl border border-stone-200 px-3 py-4 text-lg text-stone-700 bg-white focus:outline-none focus:border-rose-300"
        >
          <option value="">월</option>
          {MONTHS.map((m) => <option key={m} value={String(m)}>{m}월</option>)}
        </select>
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="flex-1 rounded-xl border border-stone-200 px-3 py-4 text-lg text-stone-700 bg-white focus:outline-none focus:border-rose-300"
        >
          <option value="">일</option>
          {days.map((d) => <option key={d} value={String(d)}>{d}일</option>)}
        </select>
      </div>

      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-14 text-base bg-rose-400 hover:bg-rose-500 text-white disabled:opacity-40"
      >
        다음 🌸
      </Button>
    </form>
  )
}

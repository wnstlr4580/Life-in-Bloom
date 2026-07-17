"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  onSubmit: (birthDate: string) => void
}

function getDaysInMonth(month: number) {
  // 윤년의 2월 29일도 탄생화 선택에 포함한다.
  return new Date(2000, month, 0).getDate()
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

// 탄생화는 월·일로만 정해지므로 태어난 연도는 받지 않는다.
export function BirthDateQuickForm({ onSubmit }: Props) {
  const [month, setMonth] = useState("")
  const [day, setDay] = useState("")

  const days = month
    ? Array.from({ length: getDaysInMonth(+month) }, (_, i) => i + 1)
    : Array.from({ length: 31 }, (_, i) => i + 1)

  const canSubmit = month !== "" && day !== ""

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit(`${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 w-full">
      <div className="text-center space-y-2">
        <p className="text-5xl">🌱</p>
        <h1 className="text-2xl font-bold text-stone-800">생일을 알려주세요</h1>
        <p className="text-stone-500 text-sm">월과 일만으로 당신의 탄생화를 찾아드려요</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          value={month}
          onChange={(e) => { setMonth(e.target.value); setDay("") }}
          className="w-full rounded-xl border border-rose-100 px-4 py-4 text-lg text-stone-700 bg-white/90 shadow-sm focus:outline-none focus:border-rose-300"
        >
          <option value="">월</option>
          {MONTHS.map((m) => <option key={m} value={String(m)}>{m}월</option>)}
        </select>
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="w-full rounded-xl border border-rose-100 px-4 py-4 text-lg text-stone-700 bg-white/90 shadow-sm focus:outline-none focus:border-rose-300"
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

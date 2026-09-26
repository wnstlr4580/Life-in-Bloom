"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Clock } from "lucide-react"

interface SubmitData {
  name: string
  gender: "male" | "female"
  birthDate: string
  birthHour: string
  city: string
  calendarType: string
}

interface DefaultValues {
  name?: string
  gender?: string
  birthDate?: string
  calendarType?: string
  birthHour?: string
  city?: string
}

interface Props {
  onSubmit: (data: SubmitData) => void
  loading: boolean
  defaultValues?: DefaultValues
  submitLabel?: string
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function BirthDateForm({ onSubmit, loading, defaultValues, submitLabel }: Props) {
  const [name, setName] = useState(defaultValues?.name ?? "")
  const [gender, setGender] = useState<"male" | "female">((defaultValues?.gender as "male" | "female") ?? "female")
  const [year, setYear] = useState(defaultValues?.birthDate?.slice(0, 4) ?? "")
  const [month, setMonth] = useState(defaultValues?.birthDate ? String(+defaultValues.birthDate.slice(5, 7)) : "")
  const [day, setDay] = useState(defaultValues?.birthDate ? String(+defaultValues.birthDate.slice(8, 10)) : "")
  const [calendarType, setCalendarType] = useState(defaultValues?.calendarType ?? "solar")
  const [timeKnown, setTimeKnown] = useState(
    !defaultValues?.birthHour || defaultValues.birthHour === "unknown" ? true : true
  )
  const [ampm, setAmpm] = useState(() => {
    if (!defaultValues?.birthHour || defaultValues.birthHour === "unknown") return "오전"
    const h = parseInt(defaultValues.birthHour)
    return h >= 12 ? "오후" : "오전"
  })
  const [timeHour, setTimeHour] = useState(() => {
    if (!defaultValues?.birthHour || defaultValues.birthHour === "unknown") return ""
    const h = parseInt(defaultValues.birthHour)
    if (h === 0) return "12"
    if (h > 12) return String(h - 12)
    return String(h)
  })
  const [timeMin, setTimeMin] = useState(() => {
    if (!defaultValues?.birthHour || defaultValues.birthHour === "unknown") return ""
    return defaultValues.birthHour.includes(":") ? defaultValues.birthHour.split(":")[1].padStart(2, "0") : ""
  })
  const days = year && month
    ? Array.from({ length: getDaysInMonth(+year, +month) }, (_, i) => i + 1)
    : Array.from({ length: 31 }, (_, i) => i + 1)

  const birthDate = year && month && day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : ""

  const canSubmit = name.trim().length > 0 && year !== "" && month !== "" && day !== ""

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      gender,
      birthDate,
      birthHour: timeKnown && timeHour && timeMin
        ? `${ampm === "오후" && timeHour !== "12" ? +timeHour + 12 : ampm === "오전" && timeHour === "12" ? 0 : +timeHour}:${timeMin}`
        : "unknown",
      city: "미입력",
      calendarType,
    })
  }

  return (
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 이름 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-stone-700">이름</Label>
          <input
            type="text"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-rose-300"
          />
        </div>

        {/* 성별 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-stone-700">성별</Label>
          <div className="flex gap-3">
            {([["female", "여성"], ["male", "남성"]] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setGender(val)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  gender === val
                    ? "bg-rose-400 border-rose-400 text-white"
                    : "bg-white border-stone-200 text-stone-600 hover:border-rose-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 생년월일 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-stone-700">생년월일</Label>
          <div className="flex gap-2">
            <select
              value={year}
              onChange={(e) => { setYear(e.target.value); setDay("") }}
              className="flex-[2] rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
            >
              <option value="">년도</option>
              {YEARS.map((y) => <option key={y} value={String(y)}>{y}년</option>)}
            </select>
            <select
              value={month}
              onChange={(e) => { setMonth(e.target.value); setDay("") }}
              className="flex-1 rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
            >
              <option value="">월</option>
              {MONTHS.map((m) => <option key={m} value={String(m)}>{m}월</option>)}
            </select>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="flex-1 rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
            >
              <option value="">일</option>
              {days.map((d) => <option key={d} value={String(d)}>{d}일</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-0.5">
            {["solar", "lunar"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCalendarType(type)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  calendarType === type
                    ? "bg-rose-400 border-rose-400 text-white"
                    : "bg-white border-stone-200 text-stone-500 hover:border-rose-300"
                }`}
              >
                {type === "solar" ? "양력" : "음력"}
              </button>
            ))}
          </div>
        </div>

        {/* 태어난 시간 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-stone-700">태어난 시간</Label>
            <button
              type="button"
              onClick={() => setTimeKnown((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                !timeKnown
                  ? "bg-rose-50 border-rose-300 text-rose-500"
                  : "bg-stone-50 border-stone-200 text-stone-400"
              }`}
            >
              <Clock size={11} />
              시간 모름
            </button>
          </div>
          {timeKnown ? (
            <div className="flex gap-2">
              <select
                value={ampm}
                onChange={(e) => setAmpm(e.target.value)}
                className="rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
              >
                <option value="오전">오전</option>
                <option value="오후">오후</option>
              </select>
              <select
                value={timeHour}
                onChange={(e) => setTimeHour(e.target.value)}
                className="flex-1 rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
              >
                <option value="">시</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={String(h)}>{h}시</option>
                ))}
              </select>
              <select
                value={timeMin}
                onChange={(e) => setTimeMin(e.target.value)}
                className="flex-1 rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
              >
                <option value="">분</option>
                {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                  <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}분</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-stone-400 bg-rose-50 rounded-lg px-3 py-2 text-center border border-rose-100">
              시간 모름 — 노년기 기운 분석이 제외됩니다
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full bg-rose-400 hover:bg-rose-500 text-white disabled:opacity-40"
        >
          {loading ? "저장 중..." : submitLabel ?? "나의 꽃 찾기 🌸"}
        </Button>
      </form>
  )
}

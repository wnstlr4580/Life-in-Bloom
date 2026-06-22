"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  onSubmit: (birthDate: string, calendarType: string) => void
  loading: boolean
}

export function BirthDateForm({ onSubmit, loading }: Props) {
  const [birthDate, setBirthDate] = useState("")
  const [calendarType, setCalendarType] = useState("solar")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (birthDate) onSubmit(birthDate, calendarType)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="birthDate" className="text-sm font-medium text-stone-700">
          생년월일
        </Label>
        <Input
          id="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          required
          className="border-stone-200 focus:border-rose-300 focus:ring-rose-200"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-stone-700">달력 유형</Label>
        <div className="flex gap-3">
          {["solar", "lunar"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setCalendarType(type)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                calendarType === type
                  ? "bg-rose-400 border-rose-400 text-white"
                  : "bg-white border-stone-200 text-stone-600 hover:border-rose-300"
              }`}
            >
              {type === "solar" ? "양력" : "음력"}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={!birthDate || loading}
        className="w-full bg-rose-400 hover:bg-rose-500 text-white"
      >
        {loading ? "분석 중..." : "나의 꽃 찾기"}
      </Button>
    </form>
  )
}

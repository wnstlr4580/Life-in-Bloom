"use client"

import { useState } from "react"
import { BirthDateForm } from "@/components/saju/BirthDateForm"
import { OhaengResult } from "@/components/saju/OhaengResult"
import { OhaengBalance } from "@/components/saju/OhaengBalance"
import { FortuneResult } from "@/components/saju/FortuneResult"
import { FlowerRecommendList } from "@/components/saju/FlowerRecommendList"
import { ShareCard } from "@/components/saju/ShareCard"
import type { Ohaeng, OhaengProfile, PillarInfo } from "@/lib/saju"
import type { FortuneResult as FortuneData } from "@/lib/fortune"

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

interface AnalyzeResult {
  ohaeng: Ohaeng
  profile: OhaengProfile
  pillars: PillarInfo[]
  hasHour: boolean
  name?: string
  lackingProducts: LackingEntry[]
  fortune: FortuneData
  recommendedFlowers: Product[]
  seasonalFlowers: Product[]
}

interface SubmitData {
  name: string
  gender: "male" | "female"
  birthDate: string
  birthHour: string
  city: string
  calendarType: string
}

export default function SajuPage() {
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [birthYear, setBirthYear] = useState<number | null>(null)
  const [userName, setUserName] = useState("")
  const [fortuneOpen, setFortuneOpen] = useState(false)

  const handleSubmit = async (data: SubmitData) => {
    setBirthYear(new Date(data.birthDate).getFullYear())
    setUserName(data.name)
    setLoading(true)
    setError("")
    setResult(null)
    setFortuneOpen(false)
    try {
      const res = await fetch("/api/saju/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      setResult(await res.json())
    } catch {
      setError("잠시 후 다시 시도해 주세요")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="max-w-xl mx-auto text-center mb-10">
        <p className="text-4xl mb-3">🔮</p>
        <h1 className="text-3xl font-bold text-stone-800">나의 꽃 찾기</h1>
        <p className="text-stone-500 mt-3 leading-relaxed">
          태어난 날짜로 나의 기운과 오늘의 운세를 알아보고, 나를 닮은 꽃을 추천해 드려요
        </p>
      </div>

      <div className="max-w-md mx-auto mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
          <BirthDateForm onSubmit={handleSubmit} loading={loading} />
          {error && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}
        </div>
      </div>

      {/* 오늘의 운세 — 접힘 패널 */}
      {result && (
        <div className="max-w-md mx-auto mb-12">
          <button
            onClick={() => setFortuneOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-100 hover:border-amber-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🔮</span>
              <span className="text-sm font-bold text-stone-700">오늘의 운세 보기</span>
              <span className="text-[11px] text-stone-400 bg-white/70 px-2 py-0.5 rounded-full">
                {result.fortune.todayDate}
              </span>
            </div>
            <span className={`text-stone-400 text-sm transition-transform duration-300 ${fortuneOpen ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              fortuneOpen ? "max-h-[3000px] opacity-100 mt-3" : "max-h-0 opacity-0"
            }`}
          >
            <FortuneResult fortune={result.fortune} name={userName} />
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-10">
          <div className="flex flex-col lg:flex-row gap-10 items-start justify-center">
            <div className="flex-1 max-w-2xl">
              <OhaengResult
                pillars={result.pillars}
                mainOhaeng={result.ohaeng}
                name={userName}
              />
            </div>
            {birthYear && (
              <div className="shrink-0">
                <p className="text-sm font-semibold text-stone-600 mb-3 text-center">📸 공유 카드</p>
                <ShareCard
                  ohaeng={result.ohaeng}
                  profile={result.profile}
                  birthYear={birthYear}
                  name={userName}
                />
              </div>
            )}
          </div>

          <OhaengBalance pillars={result.pillars} lackingProducts={result.lackingProducts} />

          {result.recommendedFlowers.length > 0 && (
            <FlowerRecommendList
              title={`${result.ohaeng} 기운에 어울리는 꽃`}
              products={result.recommendedFlowers}
            />
          )}

          {result.seasonalFlowers.length > 0 && (
            <FlowerRecommendList
              title="이 계절에 피어나는 꽃"
              products={result.seasonalFlowers}
            />
          )}

          {result.recommendedFlowers.length === 0 && result.seasonalFlowers.length === 0 && (
            <div className="text-center py-16 text-stone-400">
              아직 상품이 준비 중이에요 🌱
            </div>
          )}
        </div>
      )}
    </div>
  )
}

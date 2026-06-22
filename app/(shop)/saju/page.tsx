"use client"

import { useState } from "react"
import { BirthDateForm } from "@/components/saju/BirthDateForm"
import { OhaengResult } from "@/components/saju/OhaengResult"
import { FlowerRecommendList } from "@/components/saju/FlowerRecommendList"
import type { Ohaeng, OhaengProfile } from "@/lib/saju"

interface AnalyzeResult {
  ohaeng: Ohaeng
  profile: OhaengProfile
  recommendedFlowers: Product[]
  seasonalFlowers: Product[]
}

interface Product {
  id: string
  name: string
  price: number
  images: string[]
  flowerMeaning: string | null
  category: string
}

export default function SajuPage() {
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (birthDate: string, calendarType: string) => {
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/saju/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, calendarType }),
      })
      if (!res.ok) throw new Error("분석에 실패했습니다")
      setResult(await res.json())
    } catch {
      setError("잠시 후 다시 시도해 주세요")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <div className="max-w-md mx-auto px-4 py-10">

        {/* 헤더 */}
        <div className="text-center mb-8">
          <p className="text-2xl mb-2">🌸</p>
          <h1 className="text-2xl font-bold text-stone-800">나의 꽃을 찾아보세요</h1>
          <p className="text-sm text-stone-500 mt-2">
            생년월일로 오행을 분석하고<br />당신에게 어울리는 꽃을 추천해 드려요
          </p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 mb-6">
          <BirthDateForm onSubmit={handleSubmit} loading={loading} />
          {error && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}
        </div>

        {/* 결과 */}
        {result && (
          <div className="space-y-6">
            <OhaengResult ohaeng={result.ohaeng} profile={result.profile} />

            {result.recommendedFlowers.length > 0 && (
              <FlowerRecommendList
                title={`${result.ohaeng}(木火土金水) 기운에 어울리는 꽃`}
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
              <div className="text-center py-8 text-stone-400 text-sm">
                아직 상품이 준비 중이에요 🌱
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

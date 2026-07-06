"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
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

interface SavedProfile {
  name: string
  gender: string
  birthDate: string
  calendarType: string
  birthHour: string
  city: string
}

export default function SajuPage() {
  const { data: session } = useSession()
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [birthYear, setBirthYear] = useState<number | null>(null)
  const [userName, setUserName] = useState("")
  const [fortuneOpen, setFortuneOpen] = useState(false)
  const [savedProfile, setSavedProfile] = useState<SavedProfile | null>(null)
  const [loadKey, setLoadKey] = useState(0)
  const resultRef = useRef<HTMLDivElement>(null)

  // 분석 완료 시 결과로 부드럽게 스크롤
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [result])

  // 로그인 상태이면 저장된 프로필 불러오기
  useEffect(() => {
    if (!session?.user) return
    fetch("/api/saju/profile")
      .then(r => r.json())
      .then(data => { if (data) setSavedProfile(data) })
      .catch(() => {})
  }, [session])

  const handleSubmit = useCallback(async (data: SubmitData) => {
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

      // 로그인 상태이면 자동 저장
      if (session?.user) {
        fetch("/api/saju/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }).then(() => setSavedProfile(data)).catch(() => {})
      }
    } catch {
      setError("잠시 후 다시 시도해 주세요")
    } finally {
      setLoading(false)
    }
  }, [session])

  // 저장된 데이터로 불러오기
  const handleLoad = () => {
    if (!savedProfile) return
    setLoadKey(k => k + 1)
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
        {/* 불러오기 버튼 */}
        {session?.user && savedProfile && (
          <button
            onClick={handleLoad}
            className="w-full flex items-center justify-between px-5 py-3 mb-3 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🌸</span>
              <div className="text-left">
                <p className="text-sm font-bold text-rose-700">저장된 정보 불러오기</p>
                <p className="text-xs text-rose-400">
                  {savedProfile.name} · {savedProfile.birthDate}
                </p>
              </div>
            </div>
            <span className="text-xs text-rose-500 font-medium">불러오기</span>
          </button>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
          <BirthDateForm
            key={loadKey}
            onSubmit={handleSubmit}
            loading={loading}
            defaultValues={loadKey > 0 ? savedProfile ?? undefined : undefined}
          />
          {error && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}
        </div>

        {session?.user && result && (
          <p className="text-xs text-center text-stone-400 mt-2">✓ 정보가 저장됐어요</p>
        )}
      </div>

      {/* 오늘의 운세 — 접힘 패널 */}
      {result && (
        <div ref={resultRef} className="max-w-md mx-auto mb-12 scroll-mt-24">
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

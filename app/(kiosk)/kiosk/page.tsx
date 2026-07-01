"use client"

import { useCallback, useState } from "react"
import { BirthDateQuickForm } from "@/components/kiosk/BirthDateQuickForm"
import { CameraCapture } from "@/components/kiosk/CameraCapture"
import { ResultShare } from "@/components/kiosk/ResultShare"
import { analyzeOhaeng, type Ohaeng } from "@/lib/saju"
import { segmentPerson } from "@/lib/kiosk/segmentation"
import { compositePhoto } from "@/lib/kiosk/compositeCanvas"
import { pickBackground } from "@/lib/kiosk/backgrounds"

// 설계 문서 1번 항목 — 단계별로 별도 URL을 두지 않고
// 하나의 페이지 안에서 step 상태로 전체 플로우를 관리한다.
type Step = "intro" | "birth" | "capture" | "processing" | "result" | "error"

export default function KioskPage() {
  const [step, setStep] = useState<Step>("intro")
  const [ohaeng, setOhaeng] = useState<Ohaeng | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)

  const reset = useCallback(() => {
    setStep("intro")
    setOhaeng(null)
    setResultBlob(null)
  }, [])

  const handleBirthSubmit = (birthDate: string) => {
    setOhaeng(analyzeOhaeng(new Date(birthDate)))
    setStep("capture")
  }

  const handleCapture = async (image: ImageBitmap) => {
    if (!ohaeng) return
    setStep("processing")
    try {
      const mask = await segmentPerson(image)
      const canvas = document.createElement("canvas")
      const blob = await compositePhoto({
        personImage: image,
        mask,
        backgroundUrl: pickBackground(ohaeng),
        ohaeng,
        canvas,
      })
      setResultBlob(blob)
      setStep("result")
    } catch {
      setStep("error")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 py-8">
      {step === "intro" && (
        <div className="text-center space-y-8 max-w-sm">
          <div className="space-y-3">
            <p className="text-6xl">🌸</p>
            <h1 className="text-3xl font-bold text-stone-800">오행 포토부스</h1>
            <p className="text-stone-500 leading-relaxed">
              생년월일을 입력하고 사진을 찍으면<br />
              나의 오행 기운에 어울리는 꽃 배경으로<br />
              합성해 드려요
            </p>
          </div>
          <button
            onClick={() => setStep("birth")}
            className="w-full h-14 rounded-2xl bg-rose-400 hover:bg-rose-500 text-white text-lg font-semibold transition-colors"
          >
            시작하기
          </button>
        </div>
      )}

      {step === "birth" && (
        <div className="w-full max-w-sm">
          <BirthDateQuickForm onSubmit={handleBirthSubmit} />
        </div>
      )}

      {step === "capture" && ohaeng && (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-center text-sm text-stone-500">
            <span className="font-semibold text-rose-500">{ohaeng}</span> 기운에 어울리는 꽃 배경으로 촬영할게요
          </p>
          <CameraCapture onCapture={handleCapture} />
        </div>
      )}

      {step === "processing" && (
        <div className="text-center space-y-4">
          <div className="text-5xl animate-pulse">🌷</div>
          <p className="text-stone-500 text-sm">사진에 꽃 배경을 합성하고 있어요...</p>
        </div>
      )}

      {step === "result" && resultBlob && ohaeng && (
        <div className="w-full max-w-sm">
          <ResultShare
            imageBlob={resultBlob}
            ohaeng={ohaeng}
            onRetry={() => setStep("capture")}
            onRestart={reset}
          />
        </div>
      )}

      {step === "error" && (
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-4xl">😢</p>
          <p className="text-stone-500 text-sm">합성 중 문제가 발생했어요. 다시 시도해 주세요.</p>
          <button
            onClick={() => setStep("capture")}
            className="px-6 py-3 rounded-xl bg-stone-700 text-white text-sm font-medium"
          >
            다시 촬영하기
          </button>
        </div>
      )}
    </div>
  )
}

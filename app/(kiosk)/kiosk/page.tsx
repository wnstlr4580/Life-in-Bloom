"use client"

import { useCallback, useState } from "react"
import { BirthDateQuickForm } from "@/components/kiosk/BirthDateQuickForm"
import { CameraCapture } from "@/components/kiosk/CameraCapture"
import { ResultShare } from "@/components/kiosk/ResultShare"
import { type Ohaeng } from "@/lib/saju"
import { segmentPerson } from "@/lib/kiosk/segmentation"
import { compositeSingleCut, buildFourCutStrip } from "@/lib/kiosk/compositeCanvas"
import { pickFlowerPreset, type KioskFlowerPreset } from "@/lib/kiosk/backgrounds"

const TOTAL_CUTS = 4

// 설계 문서 1번 항목 — 단계별로 별도 URL을 두지 않고
// 하나의 페이지 안에서 step 상태로 전체 플로우를 관리한다.
type Step = "intro" | "birth" | "capture" | "processing" | "result" | "error"

export default function KioskPage() {
  const [step, setStep] = useState<Step>("intro")
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [ohaeng, setOhaeng] = useState<Ohaeng | null>(null)
  const [preset, setPreset] = useState<KioskFlowerPreset | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)

  const reset = useCallback(() => {
    setStep("intro")
    setBirthDate(null)
    setOhaeng(null)
    setPreset(null)
    setResultBlob(null)
    setProcessingProgress(0)
  }, [])

  const handleBirthSubmit = (date: string) => {
    setBirthDate(date)
    const result = pickFlowerPreset(new Date(date))
    setOhaeng(result.ohaeng)
    setPreset(result.preset)
    setStep("capture")
  }

  // 4컷을 순서대로 세그멘테이션 + 배경 합성한 뒤 하나의 스트립으로 조립한다.
  // 어떤 꽃이 나올지는 이 단계가 끝나고 결과 화면에서만 처음 공개된다.
  const handleCaptureComplete = async (images: ImageBitmap[]) => {
    if (!ohaeng || !preset) return
    setStep("processing")
    setProcessingProgress(0)
    try {
      const cuts: HTMLCanvasElement[] = []
      for (const image of images) {
        const mask = await segmentPerson(image)
        const cut = await compositeSingleCut(image, mask, preset.background)
        cuts.push(cut)
        setProcessingProgress((p) => p + 1)
      }
      const blob = await buildFourCutStrip(cuts, preset)
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
              생년월일을 입력하고 사진 4장을 찍으면<br />
              나의 오행 기운에 어울리는 꽃 배경 네컷을<br />
              만들어 드려요
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

      {step === "capture" && (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-center text-sm text-stone-500">어떤 꽃이 나올지 기대해주세요</p>
          <CameraCapture onComplete={handleCaptureComplete} />
        </div>
      )}

      {step === "processing" && (
        <div className="text-center space-y-4">
          <div className="text-5xl animate-pulse">🌷</div>
          <p className="text-stone-500 text-sm">
            두근두근, 꽃을 합성하고 있어요... ({processingProgress}/{TOTAL_CUTS})
          </p>
        </div>
      )}

      {step === "result" && resultBlob && ohaeng && preset && birthDate && (
        <div className="w-full max-w-sm">
          <ResultShare
            imageBlob={resultBlob}
            ohaeng={ohaeng}
            preset={preset}
            birthDate={birthDate}
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

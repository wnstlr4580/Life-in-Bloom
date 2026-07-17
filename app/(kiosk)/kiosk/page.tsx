"use client"

import { useCallback, useState } from "react"
import { BirthDateQuickForm } from "@/components/kiosk/BirthDateQuickForm"
import { CameraCapture } from "@/components/kiosk/CameraCapture"
import { ResultShare } from "@/components/kiosk/ResultShare"
import { segmentPerson } from "@/lib/kiosk/segmentation"
import { compositeSingleCut, buildFourCutStrip } from "@/lib/kiosk/compositeCanvas"
import {
  pickBirthFlower,
  pickTodayFlower,
  pickMonthFlower,
  type KioskFlowerPreset,
  type KioskMode,
} from "@/lib/kiosk/flowers"

const TOTAL_CUTS = 4

// ─── 테스트 모드 ───
const TEST_STRIP_URL = "/kiosk-test/strip.png"

// 테스트 스트립(SAY CHEESE 네컷, 867x2600)에서 사진 4칸만 비율로 잘라
// 실제 촬영 결과와 같은 ImageBitmap 4장을 만든다.
async function loadTestCuts(): Promise<ImageBitmap[]> {
  const res = await fetch(TEST_STRIP_URL)
  if (!res.ok) throw new Error(`test strip not found: ${TEST_STRIP_URL}`)
  const strip = await createImageBitmap(await res.blob())
  const x = Math.round(strip.width * 0.055)
  const w = Math.round(strip.width * 0.89)
  const h = Math.round(strip.height * 0.204)
  return Promise.all(
    [0, 1, 2, 3].map((i) =>
      createImageBitmap(strip, x, Math.round(strip.height * (0.02 + i * 0.2223)), w, h)
    )
  )
}

// 받침 유무에 맞는 서술격 조사
function withYeyo(name: string) {
  const code = name.charCodeAt(name.length - 1) - 0xac00
  const hasBatchim = code >= 0 && code < 11172 && code % 28 > 0
  return `${name}${hasBatchim ? "이에요" : "예요"}`
}

// 모드별 결과 헤드라인 — 사주오행 문구를 대체하는 감성 문구
function headlineFor(mode: KioskMode, preset: KioskFlowerPreset, birthDate: string | null): string {
  if (mode === "birth" && birthDate) {
    const [m, d] = birthDate.slice(-5).split("-")
    return `${+m}월 ${+d}일, 당신의 생일꽃은 ${withYeyo(preset.name)}`
  }
  if (mode === "month") return `${new Date().getMonth() + 1}월의 꽃, ${preset.name}이 당신과 함께해요`
  if (mode === "purchase") return `당신이 데려온 꽃은 ${withYeyo(preset.name)}`
  return `오늘 당신에게 찾아온 꽃은 ${withYeyo(preset.name)}`
}

// 설계 문서 참고 — 단계별로 별도 URL을 두지 않고
// 하나의 페이지 안에서 step 상태로 전체 플로우를 관리한다.
type Step = "intro" | "birth" | "capture" | "processing" | "result" | "error"

export default function KioskPage() {
  const [step, setStep] = useState<Step>("intro")
  const [mode, setMode] = useState<KioskMode>("today")
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [preset, setPreset] = useState<KioskFlowerPreset | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState("합성 중 문제가 발생했어요. 다시 시도해 주세요.")

  const reset = useCallback(() => {
    setStep("intro")
    setBirthDate(null)
    setPreset(null)
    setResultBlob(null)
    setProcessingProgress(0)
    setErrorMessage("합성 중 문제가 발생했어요. 다시 시도해 주세요.")
  }, [])

  // 생일꽃 — 탄생화 선정에 필요한 월·일만 입력받는다.
  const handleBirthSubmit = (date: string) => {
    setBirthDate(date)
    setPreset(pickBirthFlower(date))
    setStep("capture")
  }

  // 오늘의 꽃 / 이달의 꽃 — 입력 없이 바로 촬영으로
  const startWithFlower = (nextMode: KioskMode, picked: KioskFlowerPreset) => {
    setMode(nextMode)
    setBirthDate(null)
    setPreset(picked)
    setStep("capture")
  }

  // 4컷을 순서대로 세그멘테이션 + 배경 합성한 뒤 하나의 스트립으로 조립한다.
  // 어떤 꽃 배경인지는 결과 화면에서 공개된다.
  const composeCuts = async (images: ImageBitmap[], activePreset: KioskFlowerPreset) => {
    setStep("processing")
    setProcessingProgress(0)
    try {
      const cuts: HTMLCanvasElement[] = []
      for (const image of images) {
        const mask = await segmentPerson(image)
        const cut = await compositeSingleCut(image, mask, activePreset.background)
        cuts.push(cut)
        setProcessingProgress((p) => p + 1)
      }
      const blob = await buildFourCutStrip(cuts, activePreset)
      setResultBlob(blob)
      setStep("result")
    } catch (error) {
      console.error("[kiosk] photo composition failed:", error)
      setErrorMessage(
        error instanceof Error && error.message.includes("test strip not found")
          ? "테스트 사진을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
          : "합성 중 문제가 발생했어요. 다시 시도해 주세요."
      )
      setStep("error")
    }
  }

  const handleCaptureComplete = async (images: ImageBitmap[]) => {
    if (!preset) return
    await composeCuts(images, preset)
  }

  // 개발용 — 어떤 모드에서든 촬영 단계에서 카메라 대신 테스트 사진으로 합성
  const handleTestCapture = async () => {
    if (!preset) return
    setStep("processing")
    setProcessingProgress(0)
    try {
      const images = await loadTestCuts()
      await composeCuts(images, preset)
    } catch (error) {
      console.error("[kiosk] test photo composition failed:", error)
      setErrorMessage(
        error instanceof Error && error.message.includes("test strip not found")
          ? "테스트 사진을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
          : "합성 중 문제가 발생했어요. 다시 시도해 주세요."
      )
      setStep("error")
    }
  }

  const modeButton =
    "aspect-square rounded-[1.75rem] p-4 text-sm font-semibold transition-all flex flex-col items-center justify-center gap-3 shadow-[0_12px_30px_rgba(120,85,70,0.08)] border"

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 py-8">
      {step === "intro" && (
        <div className="text-center space-y-8 w-full max-w-lg">
          <div className="space-y-3">
            <p className="text-6xl">🌸</p>
            <h1 className="text-3xl font-bold text-stone-800">인생내꽃 포토부스</h1>
            <p className="text-stone-500 leading-relaxed">
              오늘의 나에게 어울리는 꽃 배경으로<br />
              인생네컷을 남겨보세요
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { setMode("birth"); setStep("birth") }}
              className={`${modeButton} bg-[#ff8fa5] hover:bg-[#ff7f99] border-rose-200 text-white`}
            >
              <span className="text-4xl" aria-hidden>🎂</span>
              <span>생일꽃으로 찍기</span>
            </button>
            <button
              onClick={() => startWithFlower("today", pickTodayFlower())}
              className={`${modeButton} bg-[#ffc85a] hover:bg-[#ffbd38] border-amber-200 text-[#684713]`}
            >
              <span className="text-4xl" aria-hidden>🌼</span>
              <span>오늘의 꽃으로 찍기</span>
            </button>
            <button
              onClick={() => startWithFlower("month", pickMonthFlower())}
              className={`${modeButton} bg-[#a996ea] hover:bg-[#9a85e4] border-violet-200 text-white`}
            >
              <span className="text-4xl" aria-hidden>🗓️</span>
              <span>이달의 꽃으로 찍기</span>
            </button>
            {/* 구매한 꽃 — 상품 바코드 스캔. 판매처 재고 등록에 바코드값이 붙은 뒤 활성화 */}
            <button
              disabled
              className={`${modeButton} bg-[#edf5e7] border-[#dcebd2] text-[#829276] cursor-not-allowed shadow-none`}
            >
              <span className="text-4xl opacity-70" aria-hidden>🛒</span>
              <span>구매한 꽃으로 찍기<small className="block mt-1 font-normal">준비 중</small></span>
            </button>
          </div>
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
          {/* 개발용 — 카메라 4컷 대신 테스트 사진으로 바로 합성. 배포 전 제거 */}
          <button
            onClick={handleTestCapture}
            className="w-full h-10 rounded-xl border border-dashed border-stone-300 text-stone-400 text-xs hover:bg-stone-50 transition-colors"
          >
            🧪 촬영 건너뛰고 테스트 사진으로 합성 (개발용)
          </button>
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

      {step === "result" && resultBlob && preset && (
        <div className="w-full max-w-sm">
          <ResultShare
            imageBlob={resultBlob}
            headline={headlineFor(mode, preset, birthDate)}
            preset={preset}
            birthDate={null}
            onRetry={() => setStep("capture")}
            onRestart={reset}
          />
        </div>
      )}

      {step === "error" && (
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-4xl">😢</p>
          <p className="text-stone-500 text-sm">{errorMessage}</p>
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

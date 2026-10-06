"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { KioskFlowerPreset } from "@/lib/kiosk/flowers"

interface Props {
  showSamples: boolean
  onFound: (preset: KioskFlowerPreset) => void
  onBack: () => void
}

// 시연용 바코드 — scripts/seed-demo-sellers.mjs 가 K플라워마트 재고에 넣는 값과 같다.
const SAMPLE_BARCODES = [
  ["2001000000012", "빨간 장미"],
  ["2001000000050", "핑크 튤립"],
  ["2001000000111", "해바라기"],
  ["2001000000081", "파란 수국"],
] as const

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type DetectorConstructor = new (options: { formats: string[] }) => Detector

// 매장 바코드 리더기는 키보드처럼 숫자를 입력하고 Enter를 보낸다 — 입력칸에 항상 포커스를 둔다.
// 카메라 스캔은 브라우저가 BarcodeDetector를 지원할 때만 보여준다(안드로이드 크롬 등).
export function BarcodeScan({ showSamples, onFound, onBack }: Props) {
  const [code, setCode] = useState("")
  const [message, setMessage] = useState("")
  const [checking, setChecking] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [cameraSupported] = useState(() => typeof window !== "undefined" && "BarcodeDetector" in window)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setScanning(false)
  }

  useEffect(() => stopCamera, [])

  const lookup = async (value: string) => {
    const barcode = value.replace(/\D/g, "")
    if (!barcode || checking) return
    setChecking(true)
    setMessage("")
    try {
      const response = await fetch(`/api/kiosk/barcode?code=${barcode}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "바코드를 확인하지 못했어요")
      stopCamera()
      setMessage(`${data.flowerName}${data.marketName ? ` · ${data.marketName}` : ""} 확인!`)
      setTimeout(() => onFound(data.preset), 700)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "바코드를 확인하지 못했어요")
      setCode("")
      inputRef.current?.focus()
    } finally {
      setChecking(false)
    }
  }

  const startCamera = async () => {
    const BarcodeDetector = (window as unknown as { BarcodeDetector: DetectorConstructor }).BarcodeDetector
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      streamRef.current = stream
      setScanning(true)
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "code_128"] })
      const tick = async () => {
        if (!streamRef.current) return
        const found = await detector.detect(video).catch(() => [])
        if (found[0]?.rawValue) return lookup(found[0].rawValue)
        requestAnimationFrame(tick)
      }
      tick()
    } catch {
      stopCamera()
      setMessage("카메라를 열지 못했어요. 바코드 리더기나 번호 입력을 이용해주세요")
    }
  }

  return (
    <div className="w-full space-y-6 text-center">
      <div className="space-y-2">
        <p className="text-5xl">🛒</p>
        <h1 className="text-2xl font-bold text-stone-800">구매한 꽃의 바코드를 찍어주세요</h1>
        <p className="text-sm text-stone-500">리더기에 꽃 포장지의 바코드를 대면 바로 시작해요</p>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); lookup(code) }} className="space-y-3">
        <input
          ref={inputRef}
          autoFocus
          inputMode="numeric"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="바코드 번호 13자리"
          className="w-full rounded-xl border border-emerald-100 bg-white/90 px-4 py-4 text-center text-lg tracking-widest text-stone-700 shadow-sm focus:border-emerald-300 focus:outline-none"
        />
        <Button type="submit" disabled={!code || checking} className="h-12 w-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
          {checking ? "확인 중..." : "확인"}
        </Button>
      </form>

      <video ref={videoRef} playsInline muted className={scanning ? "aspect-video w-full rounded-xl bg-black object-cover" : "hidden"} />
      {cameraSupported && (scanning
        ? <button type="button" onClick={stopCamera} className="text-xs text-stone-500 underline">카메라 끄기</button>
        : <button type="button" onClick={startCamera} className="w-full rounded-xl border border-stone-200 py-3 text-sm text-stone-600">📷 카메라로 스캔하기</button>)}

      {message && <p className={`text-sm font-medium ${message.endsWith("확인!") ? "text-emerald-700" : "text-rose-600"}`}>{message}</p>}

      {showSamples && (
        <div className="space-y-2 rounded-xl border border-dashed border-stone-300 p-3">
          <p className="text-xs text-stone-400">🧪 시연용 바코드 (K플라워마트 재고)</p>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLE_BARCODES.map(([barcode, name]) => (
              <button key={barcode} type="button" onClick={() => lookup(barcode)} className="rounded-lg bg-stone-50 px-2 py-2 text-xs text-stone-600">
                {name}<span className="block font-mono text-[10px] text-stone-400">{barcode}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={() => { stopCamera(); onBack() }} className="text-sm text-stone-400">← 처음으로</button>
    </div>
  )
}

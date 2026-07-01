"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RotateCw } from "lucide-react"
import { preloadSegmenter } from "@/lib/kiosk/segmentation"

interface Props {
  onCapture: (image: ImageBitmap) => void
}

type Status = "loading" | "ready" | "counting" | "denied" | "unsupported"

export function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<Status>("loading")
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [count, setCount] = useState<number | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startStream = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported")
      return
    }
    setStatus("loading")
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true // React가 video의 muted 속성을 안정적으로 반영하지 않아 직접 설정
        await videoRef.current.play()
      }
      setStatus("ready")
    } catch {
      setStatus("denied")
    }
  }, [facingMode, stopStream])

  useEffect(() => {
    startStream()
    preloadSegmenter() // 촬영 전 미리 모델을 받아 캡처 직후 지연을 줄인다
    return () => stopStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  const handleCapture = () => {
    if (status !== "ready") return
    setStatus("counting")
    setCount(3)
  }

  useEffect(() => {
    if (count === null) return
    if (count === 0) {
      captureFrame()
      setCount(null)
      return
    }
    const t = setTimeout(() => setCount((c) => (c ?? 1) - 1), 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  async function captureFrame() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    // 셀피 촬영은 좌우 반전해서 보여주므로, 캡처본도 동일하게 반전해 저장한다
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const bitmap = await createImageBitmap(canvas)
    stopStream()
    onCapture(bitmap)
  }

  return (
    <div className="w-full space-y-6">
      <div className="relative aspect-[9/16] w-full rounded-3xl overflow-hidden bg-stone-900">
        {(status === "ready" || status === "counting") && (
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
          />
        )}

        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
            카메라를 준비하고 있어요...
          </div>
        )}

        {status === "denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 text-white/90">
            <p className="text-3xl">🚫</p>
            <p className="text-sm leading-relaxed">
              카메라 권한이 필요해요.<br />브라우저 설정에서 카메라 접근을 허용해 주세요.
            </p>
            <Button onClick={startStream} variant="outline" className="border-white/30 text-white bg-transparent hover:bg-white/10">
              다시 시도
            </Button>
          </div>
        )}

        {status === "unsupported" && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6 text-white/90 text-sm">
            이 브라우저에서는 카메라를 사용할 수 없어요.
          </div>
        )}

        {status === "counting" && count !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="text-white text-8xl font-bold drop-shadow-lg">{count === 0 ? "📸" : count}</span>
          </div>
        )}

        {status === "ready" && (
          <button
            onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
            className="absolute top-4 right-4 bg-black/40 text-white rounded-full p-2.5"
            aria-label="카메라 전환"
          >
            <RotateCw size={18} />
          </button>
        )}
      </div>

      <Button
        onClick={handleCapture}
        disabled={status !== "ready"}
        className="w-full h-14 text-base bg-rose-400 hover:bg-rose-500 text-white disabled:opacity-40"
      >
        촬영하기 📷
      </Button>
    </div>
  )
}

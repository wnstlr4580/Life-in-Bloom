"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RotateCw } from "lucide-react"
import { preloadSegmenter } from "@/lib/kiosk/segmentation"
import { CUT_ASPECT } from "@/lib/kiosk/compositeCanvas"

const TOTAL_CUTS = 4
const AUTO_NEXT_DELAY_MS = 1200 // 컷 사이 포즈를 바꿀 시간

// 배포된 코드가 최신 수정사항을 포함하는지 콘솔에서 바로 확인하기 위한 빌드 마커.
// 새로 수정할 때마다 이 문자열을 바꿔서, 지금 보고 있는 화면이 실제로 그 수정을 반영한 빌드인지 헷갈리지 않게 한다.
console.log("[kiosk/camera] build marker: mobile-fov-fix-v4")

// 일부 안드로이드 기기는 줌이 1보다 크게 잡힌 채로 열린다. 지원하는 경우 최소 줌으로 되돌린다.
async function resetZoom(stream: MediaStream) {
  const track = stream.getVideoTracks()[0]
  if (!track?.getCapabilities) return
  try {
    const caps = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number } }
    if (caps.zoom && typeof caps.zoom.min === "number") {
      await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min } as MediaTrackConstraintSet] })
    }
  } catch (error) {
    console.warn("[kiosk/camera] zoom reset skipped:", error)
  }
}

// video에 실제 프레임이 준비될 때까지 기다린다.
// 이전엔 100ms씩 고정으로 재시도했는데, 배포 환경처럼 초기 디코딩이
// 더 오래 걸리는 경우를 대비해 loadeddata 이벤트를 직접 기다리는 방식으로 바꾼다
// (최대 3초, 그 안에 준비되면 바로 진행).
function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 3000): Promise<boolean> {
  if (video.videoWidth > 0 && video.videoHeight > 0) return Promise.resolve(true)
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      video.removeEventListener("loadeddata", onReady)
      resolve(video.videoWidth > 0 && video.videoHeight > 0)
    }, timeoutMs)
    function onReady() {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        clearTimeout(timer)
        video.removeEventListener("loadeddata", onReady)
        resolve(true)
      }
    }
    video.addEventListener("loadeddata", onReady)
  })
}

interface Props {
  onComplete: (images: ImageBitmap[]) => void
}

type Status = "loading" | "ready" | "counting" | "denied" | "unsupported"

// 인생네컷처럼 컷마다 카운트다운을 반복해 총 4장을 촬영한다.
// 이 컴포넌트는 촬영만 담당하고, 오행/꽃 배경 합성은 부모(kiosk/page.tsx)의
// processing 단계에서 처리한다 — 촬영 중에는 어떤 꽃이 나올지 알려주지 않는다.
export function CameraCapture({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<Status>("loading")
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [count, setCount] = useState<number | null>(null)
  const [cutIndex, setCutIndex] = useState(0) // 지금까지 촬영 완료한 컷 수
  const capturedRef = useRef<ImageBitmap[]>([])
  // 실제 카메라 프레임 비율. 메타데이터를 받기 전에는 네컷 칸 비율로 둔다.
  const [videoAspect, setVideoAspect] = useState<number>(CUT_ASPECT)
  // 미리보기 = 최종 결과에 담기는 영역.
  // - 세로 사진(휴대폰): 합성 시 잘리지 않고 전체가 들어가므로 프레임 비율 그대로
  // - 가로 사진(웹캠): 합성 시 칸 비율로 좌우가 잘리므로 칸 비율로 보여준다
  const previewAspect = Math.min(videoAspect, CUT_ASPECT)

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
      // 휴대폰 카메라 센서는 4:3이 기본 화각이다. 예전처럼 9:16(1080x1920)을 요청하면
      // 브라우저가 센서 좌우를 잘라낸 모드를 골라 기본 카메라보다 확대돼 보였다.
      // 화면 방향에 맞춘 4:3 해상도를 요청해 센서 전체 화각을 쓰도록 한다.
      const portrait = window.matchMedia?.("(orientation: portrait)").matches ?? false
      const stream = await navigator.mediaDevices.getUserMedia({
        video: portrait
          ? { facingMode, width: { ideal: 960 }, height: { ideal: 1280 } }
          : { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      await resetZoom(stream)
      // 원인 진단용 — 실제 트랙 상태를 콘솔에서 확인하기 위해 남겨둔다.
      console.log("[kiosk/camera] track settings:", stream.getVideoTracks()[0]?.getSettings())
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = () => {
          const v = videoRef.current
          if (v && v.videoWidth > 0 && v.videoHeight > 0) setVideoAspect(v.videoWidth / v.videoHeight)
        }
        videoRef.current.srcObject = stream
        videoRef.current.muted = true // React가 video의 muted 속성을 안정적으로 반영하지 않아 직접 설정
        await videoRef.current.play()
      }
      setStatus("ready")
    } catch (error) {
      console.error("[kiosk/camera] getUserMedia failed:", error)
      setStatus("denied")
    }
  }, [facingMode, stopStream])

  useEffect(() => {
    startStream()
    preloadSegmenter() // 촬영 전 미리 모델을 받아 처리 단계 지연을 줄인다
    return () => stopStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  const startCountdown = useCallback(() => {
    setStatus("counting")
    setCount(3)
  }, [])

  // 첫 컷은 사용자가 직접 시작, 이후 컷은 짧은 텀을 두고 자동으로 이어서 촬영
  useEffect(() => {
    if (status === "ready" && cutIndex > 0 && cutIndex < TOTAL_CUTS) {
      const t = setTimeout(() => startCountdown(), AUTO_NEXT_DELAY_MS)
      return () => clearTimeout(t)
    }
  }, [status, cutIndex, startCountdown])

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

    // 카메라가 막 켜진 직후에는 video의 실제 프레임이 아직 준비되지 않아
    // videoWidth/Height가 0일 수 있다 (배포 환경에서 더 자주 발생).
    // 0인 상태로 캡처하면 createImageBitmap이 에러를 던지므로 준비될 때까지 기다린다.
    const ready = await waitForVideoReady(video)
    if (!ready) {
      // 진단용 — 재시도해도 계속 0이면 여기서 멈추는 것이므로 원인 파악에 필요하다.
      console.warn("[kiosk/camera] capture skipped, video still not ready:", {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
      })
      // 카운트다운은 이미 끝났다. 다시 촬영할 수 있는 상태로 복구한다.
      setStatus("ready")
      return
    }

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) { setStatus("ready"); return }
    // 셀피 촬영은 좌우 반전해서 보여주므로, 캡처본도 동일하게 반전해 저장한다
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(canvas)
    } catch (error) {
      console.error("[kiosk/camera] capture failed:", error)
      setStatus("ready")
      return
    }
    console.log("[kiosk/camera] captured cut", capturedRef.current.length + 1, "of", TOTAL_CUTS)
    capturedRef.current.push(bitmap)

    const nextCount = capturedRef.current.length
    if (nextCount >= TOTAL_CUTS) {
      stopStream()
      onComplete(capturedRef.current)
    } else {
      setCutIndex(nextCount)
      setStatus("ready")
    }
  }

  return (
    <div className="w-full space-y-6">
      <div
        className="relative w-full mx-auto rounded-3xl overflow-hidden bg-stone-900"
        /* 세로로 긴 미리보기가 화면을 넘지 않도록, 높이 70vh에 맞춰 폭을 제한한다(비율 유지) */
        style={{ aspectRatio: previewAspect, maxWidth: `calc(70vh * ${previewAspect})` }}
      >
        {/* status와 상관없이 video 태그는 항상 DOM에 존재해야 한다.
            예전엔 ready/counting일 때만 렌더링했는데, getUserMedia가 오래 걸리는
            환경(배포 서버 등)에서는 그 사이 이 태그가 사라졌다 다시 생기면서
            videoRef.current가 null이 되어 스트림 연결이 조용히 실패했다.
            그래서 항상 렌더링해두고, 로딩/거부 상태일 땐 위에 안내문을 겹쳐 보여준다. */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
        />

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

        {(status === "ready" || status === "counting") && (
          <span className="absolute top-4 left-4 bg-black/40 text-white text-xs font-semibold px-3 py-1 rounded-full">
            {Math.min(cutIndex + 1, TOTAL_CUTS)} / {TOTAL_CUTS} 컷
          </span>
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

      <div className="flex gap-2 justify-center">
        {Array.from({ length: TOTAL_CUTS }, (_, i) => (
          <span
            key={i}
            className={`w-6 h-1.5 rounded-full ${i < cutIndex ? "bg-rose-400" : "bg-stone-200"}`}
          />
        ))}
      </div>

      {cutIndex === 0 && (
        <Button
          onClick={startCountdown}
          disabled={status !== "ready"}
          className="w-full h-14 text-base bg-rose-400 hover:bg-rose-500 text-white disabled:opacity-40"
        >
          촬영 시작 📷
        </Button>
      )}
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { RotateCcw, Home, ExternalLink } from "lucide-react"
import type { KioskFlowerPreset } from "@/lib/kiosk/flowers"
import { stampQrOnStrip } from "@/lib/kiosk/compositeCanvas"
import { KIOSK_RESULT_IDLE_MS } from "@/lib/kiosk/constants"

interface Props {
  imageBlob: Blob
  headline: string // 모드별 결과 문구 (예: "12월 1일, 당신의 생일꽃은 …")
  preset: KioskFlowerPreset
  birthDate: string | null // 생일꽃 모드에서만 존재 — QR 딥링크의 자동 사주분석에 사용
  onRetry: () => void
  onRestart: () => void
}

type UploadState = "uploading" | "done" | "error"

export function ResultShare({ imageBlob, headline, preset, birthDate, onRetry, onRestart }: Props) {
  const [previewUrl, setPreviewUrl] = useState(() => URL.createObjectURL(imageBlob))
  const [uploadState, setUploadState] = useState<UploadState>("uploading")
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const uploadedRef = useRef(false)
  // QR 스탬프 후 previewUrl이 바뀌므로, 언마운트 시점의 최신 URL을 해제하기 위한 ref
  const previewUrlRef = useRef(previewUrl)
  previewUrlRef.current = previewUrl

  useEffect(() => {
    if (uploadedRef.current) return
    uploadedRef.current = true
    upload()
    return () => URL.revokeObjectURL(previewUrlRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 결과 화면 유휴 상태가 길어지면 다음 방문객을 위해 자동으로 처음 화면으로 복귀
  useEffect(() => {
    const t = setTimeout(onRestart, KIOSK_RESULT_IDLE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function upload() {
    setUploadState("uploading")
    setErrorDetail(null)
    try {
      const form = new FormData()
      form.append("file", imageBlob, "kiosk-strip.jpg")
      form.append("flower", preset.name)
      const res = await fetch("/api/kiosk/photo", { method: "POST", body: form })
      if (!res.ok) {
        // 원인 진단용 — Vercel 로그 없이도 화면에서 바로 원인을 볼 수 있게 표시한다.
        const body = await res.json().catch(() => null)
        setErrorDetail(body?.detail ?? null)
        throw new Error()
      }
      const data: { id: string } = await res.json()

      // QR은 사진 다운로드 페이지가 아니라, 기존 /saju 페이지로 딥링크한다.
      // 생일꽃 모드면 생년월일을 실어 자동 사주분석까지 연결하고, 다른 모드는
      // /saju에서 직접 입력한다. kiosk 파라미터로 네컷 사진도 함께 보여준다.
      const url = new URL("/saju", window.location.origin)
      if (birthDate) url.searchParams.set("birthDate", birthDate)
      url.searchParams.set("kiosk", data.id)

      // QR을 별도 위젯 대신 네컷 프레임 하단 여백에 직접 박는다.
      // 실패해도 결과 자체는 유효하므로 원본 미리보기 + 링크 버튼으로 진행한다.
      try {
        const stamped = await stampQrOnStrip(imageBlob, url.toString())
        const stampedUrl = URL.createObjectURL(stamped)
        setPreviewUrl((prev) => {
          URL.revokeObjectURL(prev)
          return stampedUrl
        })
      } catch {}

      setShareUrl(url.toString())
      setUploadState("done")
    } catch {
      setUploadState("error")
    }
  }

  return (
    <div className="w-full space-y-5">
      <p className="text-center text-sm font-semibold text-rose-500">
        짠! {headline}
      </p>

      <div className="mx-auto w-[85%] max-w-[340px] rounded-2xl overflow-hidden shadow-md bg-stone-100">
        {/* QR이 프레임 안에 들어갔으므로 사진이 주인공 — 크게 보여준다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="합성된 네컷" className="w-full h-auto block" />
      </div>

      <p className="text-center text-sm font-semibold text-stone-700">
        {preset.name} · {preset.meaning}
      </p>

      <div className="text-center space-y-2">
        {uploadState === "uploading" && (
          <p className="text-sm text-stone-500">사진을 저장하고 있어요...</p>
        )}

        {uploadState === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-red-400">사진 저장에 실패했어요.</p>
            {errorDetail && (
              <p className="text-xs text-stone-400 break-all">({errorDetail})</p>
            )}
            <Button onClick={upload} variant="outline" className="w-full">다시 시도</Button>
          </div>
        )}

        {uploadState === "done" && shareUrl && (
          <>
            <p className="text-sm text-stone-600">
              사진 속 QR을 스캔하면 사진을 저장하고 오행 사주 분석도 할 수 있어요
            </p>
            {/* 실제 키오스크에서는 QR 스캔이 자연스럽지만, PC로 테스트할 땐
                폰 없이 바로 확인할 수 있도록 작은 링크만 둔다. */}
            <Button
              onClick={() => window.open(shareUrl, "_blank")}
              variant="ghost"
              className="h-8 gap-1 text-xs text-stone-400 hover:text-stone-600"
            >
              <ExternalLink size={13} /> 웹페이지 바로가기
            </Button>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={onRetry} variant="outline" className="flex-1 h-12 gap-1.5">
          <RotateCcw size={16} /> 다시 촬영
        </Button>
        <Button onClick={onRestart} className="flex-1 h-12 gap-1.5 bg-stone-700 hover:bg-stone-800 text-white">
          <Home size={16} /> 처음으로
        </Button>
      </div>
    </div>
  )
}

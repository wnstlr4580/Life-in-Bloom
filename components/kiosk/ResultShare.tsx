"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "react-qr-code"
import { Button } from "@/components/ui/button"
import { RotateCcw, Home } from "lucide-react"
import type { Ohaeng } from "@/lib/saju"
import { KIOSK_RESULT_IDLE_MS } from "@/lib/kiosk/constants"

interface Props {
  imageBlob: Blob
  ohaeng: Ohaeng
  onRetry: () => void
  onRestart: () => void
}

type UploadState = "uploading" | "done" | "error"

export function ResultShare({ imageBlob, ohaeng, onRetry, onRestart }: Props) {
  const [previewUrl] = useState(() => URL.createObjectURL(imageBlob))
  const [uploadState, setUploadState] = useState<UploadState>("uploading")
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const uploadedRef = useRef(false)

  useEffect(() => {
    if (uploadedRef.current) return
    uploadedRef.current = true
    upload()
    return () => URL.revokeObjectURL(previewUrl)
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
    try {
      const form = new FormData()
      form.append("file", imageBlob, "kiosk-photo.jpg")
      form.append("ohaeng", ohaeng)
      const res = await fetch("/api/kiosk/photo", { method: "POST", body: form })
      if (!res.ok) throw new Error()
      const data: { id: string } = await res.json()
      setShareUrl(`${window.location.origin}/p/${data.id}`)
      setUploadState("done")
    } catch {
      setUploadState("error")
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="rounded-3xl overflow-hidden aspect-[9/16] w-full bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="합성된 사진" className="w-full h-full object-cover" />
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 p-5 text-center space-y-3">
        {uploadState === "uploading" && (
          <p className="text-sm text-stone-500">사진을 저장하고 있어요...</p>
        )}

        {uploadState === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-red-400">사진 저장에 실패했어요.</p>
            <Button onClick={upload} variant="outline" className="w-full">다시 시도</Button>
          </div>
        )}

        {uploadState === "done" && shareUrl && (
          <>
            <p className="text-sm font-semibold text-stone-700">QR을 스캔해서 사진을 저장하세요</p>
            <div className="flex justify-center py-2">
              <div className="bg-white p-3 rounded-xl border border-stone-100">
                <QRCode value={shareUrl} size={180} />
              </div>
            </div>
            <p className="text-xs text-stone-400">사진은 48시간 동안만 보관돼요</p>
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

"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Photo {
  id: string
  ohaeng: string
  imageUrl: string
}

type LoadState = "loading" | "ready" | "expired"

// QR 스캔 후 방문객 개인 휴대폰에서 열리는 공개 다운로드 페이지.
// (kiosk) 레이아웃 밖의 일반 페이지 — 누구나 접근 가능, 로그인 불필요.
export default function KioskPhotoPage() {
  const { id } = useParams<{ id: string }>()
  const [state, setState] = useState<LoadState>("loading")
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/kiosk/photo/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data: Photo) => {
        setPhoto(data)
        setState("ready")
      })
      .catch(() => setState("expired"))
  }, [id])

  const downloadPhoto = async () => {
    if (!photo) return
    setSaving(true)
    try {
      const res = await fetch(photo.imageUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `인생내꽃_오행포토부스_${photo.ohaeng}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setSaving(false)
    }
  }

  const sharePhoto = async () => {
    if (!photo) return
    if (navigator.share) {
      await navigator.share({ title: "인생내꽃 — 오행 포토부스", url: photo.imageUrl })
    } else {
      await navigator.clipboard.writeText(photo.imageUrl)
      alert("링크가 복사됐어요!")
    }
  }

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col items-center justify-center px-6 py-10">
      {state === "loading" && (
        <p className="text-stone-400 text-sm">사진을 불러오고 있어요...</p>
      )}

      {state === "expired" && (
        <div className="text-center space-y-2">
          <p className="text-4xl">🥀</p>
          <p className="text-stone-500 text-sm">보관 기간이 지났거나 존재하지 않는 사진이에요.</p>
        </div>
      )}

      {state === "ready" && photo && (
        <div className="w-full max-w-sm space-y-5">
          <div className="rounded-3xl overflow-hidden aspect-[9/16] w-full bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.imageUrl} alt="오행 포토부스 결과" className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadPhoto} disabled={saving} variant="outline" className="flex-1 gap-2 h-12">
              <Download size={16} />
              {saving ? "저장 중..." : "사진 저장"}
            </Button>
            <Button onClick={sharePhoto} className="flex-1 gap-2 h-12 bg-rose-400 hover:bg-rose-500 text-white">
              <Share2 size={16} />
              공유하기
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

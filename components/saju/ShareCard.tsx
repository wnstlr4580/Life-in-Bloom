"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Download, RotateCw, Share2 } from "lucide-react"
import { Black_Han_Sans } from "next/font/google"
import { Button } from "@/components/ui/button"
import type { Ohaeng, PillarInfo } from "@/lib/saju"
import { BRANCH_IMAGE, ILJU_TYPES, STEM_IMAGE } from "@/lib/iljuTypes"
import { composeShareCard } from "./composeShareCard"

const blackHanSans = Black_Han_Sans({ subsets: ["latin"], weight: "400" })

const OHAENG_GRADIENT: Record<Ohaeng, string> = {
  목: "from-green-300 to-emerald-500",
  화: "from-rose-300 to-red-500",
  토: "from-yellow-300 to-amber-500",
  금: "from-slate-200 to-gray-400",
  수: "from-blue-300 to-indigo-500",
}

// 일주 60유형 전체 — 파일은 public/sns-card/{일주}.png (예: 정사.png).
// 포토부스(kiosk-backgrounds) 실제 꽃 사진으로 60장 모두 교체됨(2026-10-07).
const CARD_IMAGE_KEYS = new Set<string>([
  "갑자", "갑인", "갑진", "갑오", "갑신", "갑술",
  "을축", "을묘", "을사", "을미", "을유", "을해",
  "병자", "병인", "병진", "병오", "병신", "병술",
  "정축", "정묘", "정사", "정미", "정유", "정해",
  "무자", "무인", "무진", "무오", "무신", "무술",
  "기축", "기묘", "기사", "기미", "기유", "기해",
  "경자", "경인", "경진", "경오", "경신", "경술",
  "신축", "신묘", "신사", "신미", "신유", "신해",
  "임자", "임인", "임진", "임오", "임신", "임술",
  "계축", "계묘", "계사", "계미", "계유", "계해",
])

interface Props {
  /** 일간의 오행 — 뒷면 배경색 */
  ohaeng: Ohaeng
  pillars: PillarInfo[]
  birthYear: number
  name?: string
  /** 입력한 생년월일과 양·음력 — 카카오톡 인앱에서 외부 브라우저로 넘길 때 같은 결과를 다시 띄우는 데 쓴다 */
  birth?: { birthDate: string; calendarType: string } | null
}

export function ShareCard({ ohaeng, pillars, birthYear, name, birth }: Props) {
  // 화면에 보이는 앞면은 뒤집기 3D 변형 아래 있어서 html2canvas가 안정적으로 못 찍는다 —
  // 캡처 전용으로 변형 없는 사본을 화면 밖에 따로 둔다(그림이 있으면 이쪽은 아예 안 쓴다).
  const captureRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [flipped, setFlipped] = useState(false)

  const day = pillars.find((p) => p.pillar === "일주")!
  const key = `${day.stemName}${day.branchName}`
  const type = ILJU_TYPES[key]
  const imageSrc = CARD_IMAGE_KEYS.has(key) ? `/sns-card/${key}.png` : null
  const fileName = `인생내꽃_${type.name}_${birthYear}.${imageSrc ? "jpg" : "png"}`

  // 화면에는 꽃 사진만 보여 주고, 저장·공유할 때만 유형명·꽃·한 줄 의미를 합성한다(한 번 만들면 재사용).
  const composedRef = useRef<Blob | null>(null)
  const composedKeyRef = useRef<string | null>(null)

  /** 카드를 이미지 파일(Blob)로 만든다 — 그림이 있으면 합성 이미지, 없으면 뒷면 디자인을 캡처한다. */
  const getCardBlob = async (): Promise<Blob> => {
    if (imageSrc) {
      if (!composedRef.current || composedKeyRef.current !== key) {
        composedRef.current = await composeShareCard({
          imageSrc,
          ilju: key,
          typeName: type.name,
          flower: type.flower,
          reading: type.reading,
          titleFont: blackHanSans.style.fontFamily,
          bodyFont: getComputedStyle(document.body).fontFamily,
        })
        composedKeyRef.current = key
      }
      return composedRef.current
    }
    if (!captureRef.current) throw new Error("카드를 찾을 수 없어요")
    const { default: html2canvas } = await import("html2canvas-pro")
    const canvas = await html2canvas(captureRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    })
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("이미지 생성 실패"))), "image/png")
    })
  }

  const downloadCard = async () => {
    setSaving(true)
    try {
      const blob = await getCardBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("이미지 저장에 실패했어요. 다시 시도해 주세요.")
    } finally {
      setSaving(false)
    }
  }

  const shareToWeb = async () => {
    const text = `나는 [${type.name}] — 나의 꽃은 ${type.flower}!\n${type.reading}\n\n인생내꽃에서 나의 일주 유형을 확인해보세요 🌸`
    setSharing(true)
    try {
      // 이미지를 함께 공유하면 모바일 공유 시트에서 인스타그램 스토리/피드로 바로 보낼 수 있다.
      const blob = await getCardBlob()
      const file = new File([blob], fileName, { type: blob.type })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `인생내꽃 — 나는 ${type.name}`, text })
        return
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return // 사용자가 공유 시트를 닫음
    } finally {
      setSharing(false)
    }
    // 안드로이드 카카오톡 인앱 브라우저는 공유 기능(Web Share) 자체가 없다 — 외부 브라우저로 넘겨서 공유하게 한다.
    // (iOS 카카오톡 인앱은 공유를 지원해서 위에서 처리된다)
    if (!navigator.share && /KAKAOTALK/i.test(navigator.userAgent)) {
      if (confirm("카카오톡 안에서는 공유하기가 안 돼요.\n크롬 등 다른 브라우저로 열어서 공유할까요?")) {
        const url = new URL("/saju", window.location.origin)
        if (birth) {
          url.searchParams.set("birthDate", birth.birthDate)
          if (birth.calendarType === "lunar") url.searchParams.set("calendar", "lunar")
        }
        window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url.toString())}`
      }
      return
    }
    // 그 밖에 파일 공유를 못 하는 환경 — 글·링크만 공유하거나, 공유 기능이 없으면 이미지를 저장해 준다
    try {
      if (navigator.share) {
        await navigator.share({ title: `인생내꽃 — 나는 ${type.name}`, text, url: window.location.href })
      } else {
        await downloadCard()
        alert("이 브라우저는 공유하기를 지원하지 않아 카드 이미지를 저장했어요.\n인스타그램 스토리에서 저장한 이미지를 올려 주세요.")
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
    }
  }

  // 뒷면 — 일주가 뜻하는 이미지와 해석을 담는다. 그림이 없으면 앞면도 이 디자인을 쓴다.
  const descriptionFace = (
    <div
      className={`absolute inset-0 [backface-visibility:hidden] rounded-[32px] overflow-hidden bg-gradient-to-br ${OHAENG_GRADIENT[ohaeng]} p-6 flex flex-col justify-between text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.28)]`}
    >
      {/* 앞면 사진이 뒤에서 비쳐 보이듯 — 좌우 반전 + 흐림 + 낮은 투명도 */}
      {imageSrc && (
        <Image
          src={imageSrc}
          alt=""
          aria-hidden
          fill
          sizes="288px"
          className="object-cover -scale-x-100 blur-[2px] opacity-35 mix-blend-luminosity pointer-events-none"
        />
      )}
      {/* 필름 그레인 — 평면 그라데이션이 아니라 사진 느낌이 나도록 */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/></svg>\")",
        }}
      />
      {/* 글래스 블롭 */}
      <div aria-hidden className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/25 blur-2xl" />
      <div aria-hidden className="absolute bottom-16 -right-8 w-32 h-32 rounded-full bg-white/15 blur-2xl" />

      {/* 상단 */}
      <div className="relative z-10 flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase opacity-90">인생내꽃</p>
        <p className="text-[10.5px] opacity-75">{name ? `${name} · ` : ""}{birthYear}년생</p>
      </div>

      {/* 중앙 — 일주, 유형명, 나의 꽃, 의미와 해석 */}
      <div className="relative z-10 text-center">
        <p className="text-[11px] tracking-[0.2em] opacity-85">
          {day.stemChar}{day.branchChar} · {key}일주
        </p>
        <p className={`${blackHanSans.className} text-[26px] leading-[1.2] mt-1 drop-shadow-lg text-balance px-2`}>
          {type.name}
        </p>
        <p className="text-[11.5px] mt-1.5 opacity-90">나의 꽃 · {type.flower}</p>

        <div className="mt-3 space-y-0.5 text-[10.5px] opacity-85">
          <p>{day.stemChar} {STEM_IMAGE[day.stemName]}</p>
          <p>{day.branchChar} {BRANCH_IMAGE[day.branchName]}</p>
        </div>

        <div className="mt-3 bg-white/15 border border-white/25 backdrop-blur-sm rounded-2xl px-3.5 py-3">
          <p className="text-[11.5px] leading-relaxed text-left">{type.reading}</p>
        </div>
      </div>

      {/* 하단 */}
      <div className="relative z-10 text-center space-y-2">
        <p className="text-[10px] opacity-75">#일주 #사주 #{type.name.replace(/\s+/g, "")} #인생내꽃</p>
        <p className="text-[10.5px] font-semibold opacity-90">@LifeInBloom</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-4 max-w-full">
      {/* 제목 — 이 꽃이 어떻게 골라졌는지 */}
      <div className="text-center w-72 max-w-full">
        <p className="text-xl font-bold text-stone-700">📸 공유카드</p>
        <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
          태어난 날의 기운인 <span className="font-semibold text-stone-500">{key}일주</span>로 고른 꽃이에요
          <br />60가지 일주마다 꽃이 하나씩 정해져 있어요
        </p>
      </div>

      {/* 카드 — 클릭하면 옆으로 뒤집혀 일주의 의미와 해석이 나온다 */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "카드 그림으로 돌아가기" : "일주 의미와 해석 보기"}
        className="block w-72 max-w-full aspect-[9/16] [perspective:1200px] text-left"
      >
        <div
          className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* 앞면 */}
          <div className="absolute inset-0 [backface-visibility:hidden] rounded-[32px] overflow-hidden select-none shadow-2xl bg-stone-900">
            {imageSrc ? (
              <Image src={imageSrc} alt={type.name} fill sizes="288px" className="object-cover" />
            ) : (
              descriptionFace
            )}
          </div>

          {/* 뒷면 — 앞면이 그림일 때만 의미가 있다(그림이 없으면 앞뒤가 같다) */}
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-2xl">
            {descriptionFace}
          </div>
        </div>
      </button>
      <p className="text-center text-[11px] text-stone-400 -mt-2 flex items-center justify-center gap-1">
        <RotateCw size={11} /> 카드를 눌러 일주의 의미 보기
      </p>
      <p className="text-center text-base font-bold text-stone-600 -mt-2">{type.flower}</p>

      {/* 캡처 전용 사본 — 3D 변형이 없어야 html2canvas가 제대로 찍는다. 그림이 있으면 안 쓰인다. */}
      {!imageSrc && (
        <div
          ref={captureRef}
          aria-hidden
          className="fixed -left-[9999px] top-0 w-72 aspect-[9/16] rounded-[32px] overflow-hidden shadow-2xl"
        >
          {descriptionFace}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-2 w-72 max-w-full">
        <Button onClick={downloadCard} disabled={saving} variant="outline" className="flex-1 gap-2 border-stone-200 text-stone-600">
          <Download size={15} />
          {saving ? "저장 중..." : "이미지 저장"}
        </Button>
        <Button onClick={shareToWeb} disabled={sharing} className="flex-1 gap-2 bg-rose-400 hover:bg-rose-500 text-white">
          <Share2 size={15} />
          {sharing ? "공유 준비 중..." : "공유하기"}
        </Button>
      </div>
    </div>
  )
}

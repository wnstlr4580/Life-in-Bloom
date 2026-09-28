"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Download, RotateCw, Share2 } from "lucide-react"
import { Black_Han_Sans } from "next/font/google"
import { Button } from "@/components/ui/button"
import type { Ohaeng, OhaengProfile } from "@/lib/saju"

const blackHanSans = Black_Han_Sans({ subsets: ["latin"], weight: "400" })

const OHAENG_GRADIENT: Record<Ohaeng, string> = {
  목: "from-green-400 to-emerald-600",
  화: "from-rose-400 to-red-600",
  토: "from-yellow-400 to-amber-600",
  금: "from-slate-300 to-gray-500",
  수: "from-blue-400 to-indigo-600",
}

const OHAENG_EMOJI: Record<Ohaeng, string> = {
  목: "🌿", 화: "🔥", 토: "🌾", 금: "✨", 수: "💧",
}

type PairKey = `${Ohaeng}${Ohaeng}`

// 일간(주기운) × 부족한 기운 25가지 조합에 하나씩 지은 유형 이름 — "이 기운은 넘치는데
// 저 기운이 없으면 실제로 이런 사람"이라는 관찰에서 지었다. 기계적으로 단어를 이어붙이지 않는다.
const PAIR_TYPE_NAME: Record<PairKey, string> = {
  목목: "잡초근성형", 목화: "묵묵히 돌진형", 목토: "역마살 방랑형", 목금: "일단 저지르고 보는형", 목수: "마이웨이 폭주형",
  화목: "욱하고 귀찮형", 화화: "번아웃 직전형", 화토: "냄비근성형", 화금: "지름신 강림형", 화수: "기분파 롤러코스터형",
  토목: "돌다리 두드림형", 토화: "고구마 백개형", 토토: "완전 고집불통형", 토금: "우유부단 고집형", 토수: "눈치제로 우직형",
  금목: "완벽주의 귀차니즘형", 금화: "무표정 원칙주의형", 금토: "깐깐한 변덕형", 금금: "깐깐 끝판왕형", 금수: "팩폭 눈치제로형",
  수목: "생각만 많은형", 수화: "혼자 삭이는형", 수토: "작심삼일 몽상가형", 수금: "오지랖 결정장애형", 수수: "오지랖 뇌절형",
}

// 부족한 기운이 없는(균형 잡힌) 사주 — 오행마다 다른 만능형 이름
const BALANCED_TYPE_NAME: Record<Ohaeng, string> = {
  목: "성장판 만렙형", 화: "인싸 그 자체형", 토: "믿고 맡기는형", 금: "빈틈없는형", 수: "만능 재주꾼형",
}

/** 일간(주기운) × 부족한 기운 조합으로 유형 이름을 정한다 — 같은 오행이라도 사람마다 달라진다. */
function typeName(main: Ohaeng, lacking: Ohaeng[]): string {
  const weak = lacking[0]
  if (!weak) return BALANCED_TYPE_NAME[main]
  return PAIR_TYPE_NAME[`${main}${weak}` as PairKey]
}

// AI로 유형별 포토카드를 만드는 대로 여기 추가한다 — 파일은 public/sns-card/{key}.png,
// key는 "목목"처럼 일간+부족기운 조합, 균형(부족 없음)은 "목균형"처럼 짓는다.
const CARD_IMAGE_KEYS = new Set([
  "목목", "목화", "목토", "목금", "목수",
  "화목", "화화", "화토", "화금", "화수",
  "토목", "토화", "토토", "토금", "토수",
  // 금·수 조합은 아직 이미지가 없다 — 완성되는 대로 여기 추가
  "목균형", "화균형", "토균형", "금균형", "수균형",
])

function cardImageSrc(main: Ohaeng, lacking: Ohaeng[]): string | null {
  const weak = lacking[0]
  const key = weak ? `${main}${weak}` : `${main}균형`
  return CARD_IMAGE_KEYS.has(key) ? `/sns-card/${key}.png` : null
}

interface Props {
  ohaeng: Ohaeng
  profile: OhaengProfile
  birthYear: number
  /** 오행균형에서 부족한 기운 — 유형 이름을 개인화하는 재료 */
  lackingOhaeng: Ohaeng[]
  name?: string
}

export function ShareCard({ ohaeng, profile, birthYear, lackingOhaeng, name }: Props) {
  // 화면에 보이는 앞면은 뒤집기 3D 변형 아래 있어서 html2canvas가 안정적으로 못 찍는다 —
  // 캡처 전용으로 변형 없는 사본을 화면 밖에 따로 둔다(AI 포토카드가 있으면 이쪽은 아예 안 쓴다).
  const captureRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const type = typeName(ohaeng, lackingOhaeng)
  const weak = lackingOhaeng[0]
  const imageSrc = cardImageSrc(ohaeng, lackingOhaeng)
  const fileName = `인생내꽃_${type}_${birthYear}.png`

  /** 카드를 이미지 파일(Blob)로 만든다 — 포토카드가 있으면 원본 그대로, 없으면 뒷면 디자인을 캡처한다. */
  const getCardBlob = async (): Promise<Blob> => {
    if (imageSrc) {
      const res = await fetch(imageSrc)
      return res.blob()
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
    const text = `나는 [${type}]!\n${profile.description}\n\n인생내꽃에서 나의 유형을 확인해보세요 🌸`
    setSharing(true)
    try {
      // 이미지를 함께 공유하면 모바일 공유 시트에서 인스타그램 스토리/피드로 바로 보낼 수 있다.
      const blob = await getCardBlob()
      const file = new File([blob], fileName, { type: blob.type })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `인생내꽃 — 나는 ${type}`, text })
        return
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return // 사용자가 공유 시트를 닫음
    } finally {
      setSharing(false)
    }
    // 파일 공유를 지원하지 않으면 텍스트 공유나 링크 복사로 대체한다
    try {
      if (navigator.share) {
        await navigator.share({ title: `인생내꽃 — 나는 ${type}`, text, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(text + "\n" + window.location.href)
        alert("링크가 복사됐어요!")
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
    }
  }

  // 뒷면 — 카드와 같은 오행 그라데이션으로, 사주 설명을 담는다
  const descriptionFace = (
    <div
      className={`absolute inset-0 [backface-visibility:hidden] rounded-[32px] overflow-hidden bg-gradient-to-br ${OHAENG_GRADIENT[ohaeng]} p-6 flex flex-col justify-between text-white`}
    >
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

      {/* 중앙 — 유형 이름과 사주 설명 */}
      <div className="relative z-10 text-center">
        <p className="text-5xl drop-shadow-lg">{OHAENG_EMOJI[ohaeng]}</p>
        <p className={`${blackHanSans.className} text-[26px] leading-[1.2] mt-1 drop-shadow-lg text-balance px-2`}>
          {type}
        </p>
        <p className="text-[11px] opacity-85 mt-1">
          {ohaeng}({profile.season} 기운){weak && weak !== ohaeng ? ` · 부족한 ${weak} 기운` : ""}
        </p>

        <div className="mt-3 bg-white/15 border border-white/25 backdrop-blur-sm rounded-2xl px-3.5 py-3">
          <p className="text-[11.5px] leading-relaxed">{profile.description}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
          {profile.keywords.slice(0, 4).map((k) => (
            <span key={k} className="text-[10.5px] bg-white/20 border border-white/25 px-2.5 py-0.5 rounded-full">{k}</span>
          ))}
        </div>
      </div>

      {/* 하단 */}
      <div className="relative z-10 text-center space-y-2">
        <p className="text-[10px] opacity-75">#오행 #사주 #{type.replace(/\s+/g, "")} #인생내꽃</p>
        <span className="inline-flex items-center gap-1.5 bg-white/90 text-rose-600 text-[10.5px] font-bold pl-1.5 pr-3 py-1 rounded-full">
          <span aria-hidden className="w-4 h-4 rounded-full bg-gradient-to-br from-rose-400 to-red-600" />
          @insaengnaekkot
        </span>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* 카드 — 클릭하면 옆으로 뒤집혀 사주 설명이 나온다 */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "포토카드로 돌아가기" : "사주 설명 보기"}
        className="block w-72 aspect-[2/3] [perspective:1200px] text-left"
      >
        <div
          className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* 앞면 */}
          <div className="absolute inset-0 [backface-visibility:hidden] rounded-[32px] overflow-hidden select-none shadow-2xl bg-stone-900">
            {imageSrc ? (
              <Image src={imageSrc} alt={type} fill sizes="288px" className="object-cover" />
            ) : (
              descriptionFace
            )}
          </div>

          {/* 뒷면 — 앞면이 이미지일 때만 의미가 있다(이미지가 없으면 앞뒤가 같다) */}
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-2xl">
            {descriptionFace}
          </div>
        </div>
      </button>
      <p className="text-center text-[11px] text-stone-400 -mt-2 flex items-center justify-center gap-1">
        <RotateCw size={11} /> 카드를 눌러 사주 설명 보기
      </p>

      {/* 캡처 전용 사본 — 3D 변형이 없어야 html2canvas가 제대로 찍는다. 포토카드가 있으면 안 쓰인다. */}
      {!imageSrc && (
        <div
          ref={captureRef}
          aria-hidden
          className="fixed -left-[9999px] top-0 w-72 aspect-[2/3] rounded-[32px] overflow-hidden shadow-2xl"
        >
          {descriptionFace}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-2 w-72">
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

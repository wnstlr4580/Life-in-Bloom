// 오행 꽃 배경 + 인물 합성, 네컷 스트립 조립 (Canvas API)
// 설계 문서 참고. html2canvas는 DOM 캡처용이라 부적합하여
// 마스크 알파 합성을 직접 구현한다.

import QRCode from "qrcode"
import type { KioskFlowerPreset } from "@/lib/kiosk/flowers"

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** object-fit: cover 와 동일하게 이미지를 캔버스에 채워 그린다 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  width: number,
  height: number
) {
  const scale = Math.max(width / img.width, height / img.height)
  const drawWidth = img.width * scale
  const drawHeight = img.height * scale
  const dx = (width - drawWidth) / 2
  const dy = (height - drawHeight) / 2
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight)
}

/**
 * 한 컷(인물 + 오행 꽃 배경)을 합성한다.
 * 최종 네컷 스트립에 조립하기 전 단계라 뱃지/워터마크 없이 순수 합성만 한다.
 */
export async function compositeSingleCut(
  personImage: ImageBitmap,
  mask: Float32Array, // segmentPerson() 결과, 인물일 확률(0~1)
  backgroundUrl: string
): Promise<HTMLCanvasElement> {
  const width = personImage.width
  const height = personImage.height
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas context를 가져올 수 없습니다.")

  const bg = await loadImage(backgroundUrl)
  drawCover(ctx, bg, width, height)

  const personCanvas = document.createElement("canvas")
  personCanvas.width = width
  personCanvas.height = height
  const pctx = personCanvas.getContext("2d")
  if (!pctx) throw new Error("canvas context를 가져올 수 없습니다.")
  pctx.drawImage(personImage, 0, 0, width, height)
  const imageData = pctx.getImageData(0, 0, width, height)
  for (let i = 0; i < mask.length; i++) {
    imageData.data[i * 4 + 3] = Math.round(mask[i] * 255)
  }
  pctx.putImageData(imageData, 0, 0)

  ctx.drawImage(personCanvas, 0, 0)

  return canvas
}

// ── 카드 레이아웃 ─────────────────────────────────────────
// 실제 인생네컷 인화지 비율(2×6인치 = 1:3)에 맞춘 세로 스트립.
// 크림 카드 배경(꽃 장식 프레임 이미지) 위에 흰 사진 패널을 얹고,
// 하단 밴드에 날짜·구분선·꽃말·브랜드를 그린다. QR은 업로드 후
// stampQrOnStrip()이 하단 오른쪽에 얹는다.
// 프레임 이미지(kiosk-frames)는 이 비율(600×1800)로 생성해야 한다.
const CARD_W = 600
const CARD_H = 1800
const PANEL_X = 90 // 좌우 여백 — 프레임 꽃 장식이 보이도록 넉넉하게
const PANEL_Y = 60
const PANEL_W = CARD_W - PANEL_X * 2
const PANEL_PAD = 12
const CELL_W = PANEL_W - PANEL_PAD * 2
const CELL_H = 300
const CELL_GAP = 12
const PANEL_H = PANEL_PAD * 2 + CELL_H * 4 + CELL_GAP * 3 // = 1260, 패널 끝 y=1320

// 꽃 색(id 접미사)별 텍스트 색 — 파스텔 종이 프레임과 어울리는 톤.
// main: 꽃말·브랜드, soft: 날짜·구분선·영문 꽃말
const ACCENT_BY_COLOR: Record<string, { main: string; soft: string }> = {
  pink: { main: "#aa5c73", soft: "#c88e9e" },
  red: { main: "#a64d5c", soft: "#c4838e" },
  purple: { main: "#7b6aa8", soft: "#a394c4" },
  blue: { main: "#5c7ba6", soft: "#8ba3c4" },
  yellow: { main: "#a8853f", soft: "#c4a976" },
  orange: { main: "#b0714a", soft: "#c99a7c" },
  white: { main: "#6d7a55", soft: "#96a07c" }, // 아이보리 종이 + 올리브 그린
}
// 색 접미사가 없는 단일 품종 (generate-kiosk-backgrounds.mjs의 COLOR_BY_ID와 동일)
const COLOR_BY_ID: Record<string, string> = {
  chamomile: "white", daisy: "white", freesia: "yellow",
  lavender: "purple", sunflower: "yellow", eucalyptus: "white",
}
function accentFor(presetId: string) {
  const color = presetId.includes("-") ? presetId.split("-")[1] : COLOR_BY_ID[presetId]
  return ACCENT_BY_COLOR[color] ?? ACCENT_BY_COLOR.white
}

// 텍스트가 주어진 폭을 넘으면 폭에 맞게 폰트 크기를 줄여서 설정한다.
// (유칼립투스처럼 꽃말이 긴 프리셋이 텍스트 박스를 넘는 문제 방지)
function setFittedFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  basePx: number,
  style = ""
) {
  const font = (px: number) => `${style ? style + " " : ""}${px}px serif`
  ctx.font = font(basePx)
  const width = ctx.measureText(text).width
  if (width > maxWidth) {
    ctx.font = font(Math.max(15, Math.floor((basePx * maxWidth) / width)))
  }
}

/**
 * 합성된 네 컷을 카드 템플릿에 조립한다.
 * 프레임 이미지가 아직 없으면 크림 단색 배경으로 대체된다.
 */
export async function buildFourCutStrip(cuts: HTMLCanvasElement[], preset: KioskFlowerPreset): Promise<Blob> {
  if (cuts.length !== 4) throw new Error("네컷 스트립은 정확히 4장이 필요합니다.")

  const canvas = document.createElement("canvas")
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas context를 가져올 수 없습니다.")

  // 1. 카드 배경 — 꽃 장식 프레임 (경로는 배경과 같은 규칙: /kiosk-frames/{id}.jpg)
  ctx.fillStyle = "#f6f2e7"
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  try {
    const frame = await loadImage(`/kiosk-frames/${preset.id}.jpg`)
    drawCover(ctx, frame, CARD_W, CARD_H)
  } catch {
    // 프레임 미생성 시 크림 단색 유지 (generate-kiosk-backgrounds.mjs 실행 필요)
  }

  // 2. 흰 사진 패널 + 네 컷 (원본 비율 유지, 셀에 cover 크롭)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H)
  cuts.forEach((cut, i) => {
    const cx = PANEL_X + PANEL_PAD
    const cy = PANEL_Y + PANEL_PAD + i * (CELL_H + CELL_GAP)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.beginPath()
    ctx.rect(0, 0, CELL_W, CELL_H)
    ctx.clip()
    drawCover(ctx, cut, CELL_W, CELL_H)
    ctx.restore()
  })

  // 3. 하단 밴드 — 날짜, 구분선(♡), 꽃말, 브랜드
  //    프레임 꽃 장식 위에 글자가 바로 얹히면 안 보여서, 텍스트 블록 뒤에
  //    반투명 흰 라운드 배경을 깐다. (오른쪽 아래는 QR 자리라 비워둔다)
  const accent = accentFor(preset.id)
  const bottomCx = CARD_W / 2
  const bandTop = PANEL_Y + PANEL_H
  const now = new Date()
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`

  ctx.fillStyle = "rgba(255, 255, 255, 0.78)"
  ctx.beginPath()
  ctx.roundRect(PANEL_X, bandTop + 32, PANEL_W, 270, 18)
  ctx.fill()

  ctx.textAlign = "center"
  ctx.fillStyle = accent.soft
  ctx.font = "20px serif"
  ctx.fillText(dateStr, bottomCx, bandTop + 78)

  const lineY = bandTop + 112
  ctx.strokeStyle = accent.soft
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(bottomCx - 110, lineY)
  ctx.lineTo(bottomCx - 18, lineY)
  ctx.moveTo(bottomCx + 18, lineY)
  ctx.lineTo(bottomCx + 110, lineY)
  ctx.stroke()
  ctx.font = "16px serif"
  ctx.fillText("♡", bottomCx, lineY + 5)

  const meaningText = `${preset.name}의 꽃말 : ${preset.meaning}`
  ctx.fillStyle = accent.main
  setFittedFont(ctx, meaningText, PANEL_W - 36, 28, "bold")
  ctx.fillText(meaningText, bottomCx, lineY + 48)

  ctx.fillStyle = accent.soft
  setFittedFont(ctx, preset.meaningEn, PANEL_W - 36, 18, "italic")
  ctx.fillText(preset.meaningEn, bottomCx, lineY + 82)

  // 꽃말과 브랜드를 같은 반투명 카드 안에 묶어 하나의 정보 블록으로 읽히게 한다.
  ctx.fillStyle = accent.main
  ctx.font = "bold 30px serif"
  ctx.fillText("인생내꽃", bottomCx, bandTop + 255)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 생성에 실패했습니다."))),
      "image/jpeg",
      0.92
    )
  })
}

// ── QR 스탬프 ─────────────────────────────────────────────
// QR을 별도 위젯으로 보여주지 않고 카드 하단 오른쪽 여백에 직접 그린다.
// buildFourCutStrip() 시점에는 QR이 가리킬 URL(업로드 응답의 사진 id)이
// 아직 없으므로, ResultShare가 업로드 완료 후 이 함수로 다시 굽는다.
const QR_BOX = 120 // 흰 배경 포함 한 변 (600×1800 카드 기준)
const QR_PAD = 8

export async function stampQrOnStrip(stripBlob: Blob, url: string): Promise<Blob> {
  const strip = await createImageBitmap(stripBlob)
  const canvas = document.createElement("canvas")
  canvas.width = strip.width
  canvas.height = strip.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas context를 가져올 수 없습니다.")
  ctx.drawImage(strip, 0, 0)

  const qrCanvas = document.createElement("canvas")
  await QRCode.toCanvas(qrCanvas, url, { width: QR_BOX - QR_PAD * 2, margin: 1 })

  // 하단 밴드 오른쪽 아래 — 가운데 정렬된 텍스트·브랜드와 겹치지 않는 빈 공간
  const x = canvas.width - QR_BOX - 24
  const y = canvas.height - QR_BOX - 24
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(x, y, QR_BOX, QR_BOX)
  ctx.drawImage(qrCanvas, x + QR_PAD, y + QR_PAD, QR_BOX - QR_PAD * 2, QR_BOX - QR_PAD * 2)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("QR 합성에 실패했습니다."))),
      "image/jpeg",
      0.92
    )
  })
}

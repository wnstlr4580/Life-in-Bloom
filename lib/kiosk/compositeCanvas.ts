// 오행 꽃 배경 + 인물 합성, 네컷 스트립 조립 (Canvas API)
// 설계 문서 참고. html2canvas는 DOM 캡처용이라 부적합하여
// 마스크 알파 합성을 직접 구현한다.

import type { KioskFlowerPreset } from "@/lib/kiosk/backgrounds"

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

// ── 카드 레이아웃 (샘플 템플릿 기준) ─────────────────────────
// 크림 카드 배경(꽃 장식 프레임 이미지) 위에 흰 사진 패널을 얹고,
// 오른쪽 여백에 세로 "인생내꽃", 하단에 날짜·구분선·꽃말을 그린다.
// 프레임 이미지의 중앙부는 사진 패널로 덮이므로 여백 장식만 보인다.
const CARD_W = 1000
const CARD_H = 1500
const PANEL_X = 150 // 왼쪽 여백 (꽃 장식 노출 영역)
const PANEL_Y = 40
const PANEL_W = 710
const PANEL_PAD = 14
const CELL_W = PANEL_W - PANEL_PAD * 2
const CELL_H = 300
const CELL_GAP = 14
const PANEL_H = PANEL_PAD * 2 + CELL_H * 4 + CELL_GAP * 3

const INK = "#57534e" // stone-600
const INK_DARK = "#292524" // stone-800
const BRAND_GREEN = "#6d7a55" // 샘플의 올리브 그린

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

  // 3. 오른쪽 여백 — 세로 브랜드 텍스트
  const brandX = (PANEL_X + PANEL_W + CARD_W) / 2
  ctx.textAlign = "center"
  ctx.fillStyle = BRAND_GREEN
  ctx.font = "28px serif"
  const brand = "인생내꽃"
  const brandTop = CARD_H / 2 - ((brand.length - 1) * 46) / 2
  brand.split("").forEach((ch, i) => ctx.fillText(ch, brandX, brandTop + i * 46))

  // 4. 하단 — 날짜, 구분선(♡), 꽃말
  const bottomCx = PANEL_X + PANEL_W / 2
  const now = new Date()
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`

  ctx.fillStyle = INK
  ctx.font = "22px serif"
  ctx.fillText(dateStr, bottomCx, PANEL_Y + PANEL_H + 48)

  const lineY = PANEL_Y + PANEL_H + 78
  ctx.strokeStyle = INK
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(bottomCx - 140, lineY)
  ctx.lineTo(bottomCx - 20, lineY)
  ctx.moveTo(bottomCx + 20, lineY)
  ctx.lineTo(bottomCx + 140, lineY)
  ctx.stroke()
  ctx.font = "18px serif"
  ctx.fillText("♡", bottomCx, lineY + 6)

  ctx.fillStyle = INK_DARK
  ctx.font = "bold 34px serif"
  ctx.fillText(`${preset.name}의 꽃말 : ${preset.meaning}`, bottomCx, lineY + 52)

  ctx.fillStyle = BRAND_GREEN
  ctx.font = "italic 22px serif"
  ctx.fillText(preset.meaningEn, bottomCx, lineY + 88)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 생성에 실패했습니다."))),
      "image/jpeg",
      0.92
    )
  })
}

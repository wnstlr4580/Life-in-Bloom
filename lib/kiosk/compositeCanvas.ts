// 오행 꽃 배경 + 인물 합성, 네컷 스트립 조립 (Canvas API)
// 설계 문서 참고. html2canvas는 DOM 캡처용이라 부적합하여
// 마스크 알파 합성을 직접 구현한다.

import type { Ohaeng } from "@/lib/saju"
import { KIOSK_FLOWER_PRESETS } from "@/lib/kiosk/backgrounds"

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

const CELL_WIDTH = 400
const CELL_HEIGHT = 400
const CELL_GAP = 8
const FOOTER_HEIGHT = 130

/**
 * 합성된 네 컷을 세로 스트립 하나로 조립하고,
 * 하단에 꽃 이름·꽃말·오늘 날짜·"인생내꽃" 로고를 그려 넣는다.
 */
export async function buildFourCutStrip(cuts: HTMLCanvasElement[], ohaeng: Ohaeng): Promise<Blob> {
  if (cuts.length !== 4) throw new Error("네컷 스트립은 정확히 4장이 필요합니다.")
  const preset = KIOSK_FLOWER_PRESETS[ohaeng]

  const canvas = document.createElement("canvas")
  canvas.width = CELL_WIDTH + CELL_GAP * 2
  canvas.height = CELL_HEIGHT * 4 + CELL_GAP * 5 + FOOTER_HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas context를 가져올 수 없습니다.")

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  cuts.forEach((cut, i) => {
    const y = CELL_GAP + i * (CELL_HEIGHT + CELL_GAP)
    ctx.drawImage(cut, CELL_GAP, y, CELL_WIDTH, CELL_HEIGHT)
  })

  const footerTop = CELL_GAP * 5 + CELL_HEIGHT * 4
  const todayStr = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })

  ctx.textAlign = "center"
  ctx.fillStyle = "#292524" // stone-800
  ctx.font = "bold 26px sans-serif"
  ctx.fillText(`${preset.flowerName} · ${preset.meaning}`, canvas.width / 2, footerTop + 45)

  ctx.fillStyle = "#78716c" // stone-500
  ctx.font = "16px sans-serif"
  ctx.fillText(`${todayStr} · 인생내꽃`, canvas.width / 2, footerTop + 78)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 생성에 실패했습니다."))),
      "image/jpeg",
      0.92
    )
  })
}

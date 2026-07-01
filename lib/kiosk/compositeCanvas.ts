// 오행 꽃 배경 + 인물 합성 (Canvas API)
// 설계 문서 6-2 참고. html2canvas는 DOM 캡처용이라 부적합하여
// 마스크 알파 합성을 직접 구현한다.

import type { Ohaeng } from "@/lib/saju"

const OHAENG_LABEL: Record<Ohaeng, string> = {
  목: "목(木) 기운",
  화: "화(火) 기운",
  토: "토(土) 기운",
  금: "금(金) 기운",
  수: "수(水) 기운",
}

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

function drawBadge(ctx: CanvasRenderingContext2D, width: number, height: number, ohaeng: Ohaeng) {
  const label = OHAENG_LABEL[ohaeng]
  const padding = { x: 20, y: 12 }
  ctx.font = "bold 28px sans-serif"
  const textWidth = ctx.measureText(label).width
  const boxWidth = textWidth + padding.x * 2
  const boxHeight = 28 + padding.y * 2
  const x = (width - boxWidth) / 2
  const y = height - boxHeight - 32

  ctx.fillStyle = "rgba(0, 0, 0, 0.35)"
  ctx.beginPath()
  ctx.roundRect(x, y, boxWidth, boxHeight, 999)
  ctx.fill()

  ctx.fillStyle = "#fff"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(label, width / 2, y + boxHeight / 2)

  // 워터마크
  ctx.font = "14px sans-serif"
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
  ctx.fillText("인생내꽃", width / 2, height - 12)
}

interface CompositeOptions {
  personImage: ImageBitmap
  mask: Float32Array // segmentPerson() 결과, 인물일 확률(0~1)
  backgroundUrl: string
  ohaeng: Ohaeng
  canvas: HTMLCanvasElement
}

export async function compositePhoto({
  personImage,
  mask,
  backgroundUrl,
  ohaeng,
  canvas,
}: CompositeOptions): Promise<Blob> {
  const width = personImage.width
  const height = personImage.height
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas context를 가져올 수 없습니다.")

  // 1) 배경 이미지 (cover)
  const bg = await loadImage(backgroundUrl)
  drawCover(ctx, bg, width, height)

  // 2) 인물 레이어에 마스크를 알파 채널로 적용
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

  // 3) 배경 위에 인물 합성
  ctx.drawImage(personCanvas, 0, 0)

  // 4) 오행 뱃지 오버레이
  drawBadge(ctx, width, height, ohaeng)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 생성에 실패했습니다."))),
      "image/jpeg",
      0.92
    )
  })
}

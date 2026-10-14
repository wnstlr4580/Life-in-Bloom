// 공유카드 이미지 합성 — 인스타 스토리 크기(1080×1920)로 꽃 사진 위에 유형명·꽃·한 줄 의미를 그린다.
// 화면 앞면과 저장/공유 이미지가 같은 결과물이 되도록 이 함수 하나로 만든다.

const W = 1080
const H = 1920
const SIDE = 80 // 좌우 여백
const BODY_BOTTOM = 200 // 본문 하단선(아래에서)
const CTA_BOTTOM = 96
const HEAD_Y = 150 // 머리글 기준선(위에서)

export interface ShareCardContent {
  imageSrc: string
  ilju: string // 예: "정사"
  typeName: string // 예: "어둠을 밝히는 등불형"
  flower: string
  reading: string
  /** next/font가 붙인 실제 font-family 값 */
  titleFont: string
  bodyFont: string
}

/** 해설 첫 문장에서 "~처럼" 뒤만 남긴다 — "어둠 속에서도 길을 비추는 따뜻한 사람이에요." */
export function oneLineMeaning(reading: string): string {
  const first = reading.match(/^.*?요\./)?.[0] ?? reading
  const i = first.indexOf("처럼")
  return (i >= 0 ? first.slice(i + 2) : first).replace(/^[,\s]+/, "")
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("카드 사진을 불러오지 못했어요"))
    img.src = src
  })
}

/** 단어 단위(한국어는 띄어쓰기 기준)로 줄을 나눈다. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/** 자간을 준 한 줄 — ctx.letterSpacing을 지원하지 않는 브라우저도 있어 글자마다 그린다. */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: "left" | "right") {
  const widths = [...text].map((ch) => ctx.measureText(ch).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (widths.length - 1)
  let cx = align === "left" ? x : x - total
  ;[...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y)
    cx += widths[i] + spacing
  })
}

export async function composeShareCard(c: ShareCardContent): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`150px ${c.titleFont}`, c.typeName),
    document.fonts.load(`42px ${c.bodyFont}`, c.reading + c.flower + "너의 꽃은?인생내꽃"),
  ]).catch(() => {})
  const img = await loadImage(c.imageSrc)

  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d")!
  ctx.textBaseline = "alphabetic"

  // 사진 — 화면을 꽉 채우도록 잘라 그린다
  const scale = Math.max(W / img.width, H / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)

  // 위(머리글)와 아래(본문)를 어둡게 — 밝은 꽃 사진에서도 글자가 읽히도록
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, "rgba(15,6,10,0.7)")
  g.addColorStop(0.16, "rgba(15,6,10,0)")
  g.addColorStop(0.4, "rgba(15,6,10,0)")
  g.addColorStop(0.66, "rgba(15,6,10,0.6)")
  g.addColorStop(1, "rgba(15,6,10,0.92)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = "rgba(255,255,255,0.92)"
  ctx.shadowColor = "rgba(0,0,0,0.35)"
  ctx.shadowBlur = 12

  // 머리글
  ctx.font = `34px ${c.bodyFont}`
  spaced(ctx, "인생내꽃", SIDE, HEAD_Y, 8, "left")
  spaced(ctx, `${c.ilju} 일주`, W - SIDE, HEAD_Y, 8, "right")

  // 본문 — 아래에서부터 쌓는다
  const words = c.typeName.split(" ")
  const lead = words.slice(0, -1).join(" ")
  const tail = words[words.length - 1] // "○○형" — 분홍으로 강조
  const textW = W - SIDE * 2

  ctx.font = `150px ${c.titleFont}`
  const titleLines = [...(lead ? wrap(ctx, lead, textW) : []), tail]
  ctx.font = `42px ${c.bodyFont}`
  const meaning = wrap(ctx, oneLineMeaning(c.reading), textW)

  const TITLE_LH = 156
  const FLOWER_SIZE = 44
  const MEAN_LH = 61
  const blockH = titleLines.length * TITLE_LH + 36 + FLOWER_SIZE + 14 + meaning.length * MEAN_LH
  let y = H - BODY_BOTTOM - blockH

  ctx.font = `150px ${c.titleFont}`
  titleLines.forEach((line, i) => {
    y += TITLE_LH
    ctx.fillStyle = i === titleLines.length - 1 ? "#FF8FA6" : "#FFFFFF"
    ctx.fillText(line, SIDE - 4, y - 22)
  })

  y += 36 + FLOWER_SIZE
  ctx.font = `${FLOWER_SIZE}px ${c.bodyFont}`
  ctx.fillStyle = "#FFD0DA"
  ctx.fillText(`나의 꽃 · ${c.flower}`, SIDE, y)

  y += 14
  ctx.font = `42px ${c.bodyFont}`
  ctx.fillStyle = "rgba(255,255,255,0.95)"
  meaning.forEach((line) => {
    y += MEAN_LH
    ctx.fillText(line, SIDE, y - 14)
  })

  // 하단 문구
  ctx.font = `34px ${c.bodyFont}`
  ctx.fillStyle = "rgba(255,255,255,0.9)"
  ctx.textAlign = "left"
  ctx.fillText("너의 꽃은? — 인생내꽃", SIDE, H - CTA_BOTTOM)
  ctx.textAlign = "right"
  ctx.fillText("@LifeInBloom", W - SIDE, H - CTA_BOTTOM)

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 생성 실패"))), "image/jpeg", 0.92)
  })
}

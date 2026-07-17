// 날짜별 고유 배경을 1:3 인생네컷 엽서 프레임으로 정밀 재배치한다.
// 원격 세로 이미지 생성이 지연될 때도 366일 고유 프레임을 안정적으로 만든다.

import { access, mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const ROOT = path.resolve(import.meta.dirname, "..")
const PRESETS_JSON = path.join(ROOT, "lib", "kiosk", "birthFlowerPresets.json")
const ids = process.argv.slice(2).filter((arg) => !arg.startsWith("--"))
const force = process.argv.includes("--force")
const FOLIAGE_TINT_BY_COLOR = {
  pink: [242, 174, 201],
  red: [235, 160, 174],
  purple: [198, 180, 230],
  blue: [171, 204, 235],
  yellow: [241, 214, 145],
  orange: [244, 190, 151],
  white: [224, 216, 202],
}

const { presets } = JSON.parse(await readFile(PRESETS_JSON, "utf8"))
const selectedPresets = presets.filter(
  (preset) =>
    (!ids.length || ids.includes(preset.date.replace("-", "")) || ids.includes(preset.id))
)

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

for (const preset of selectedPresets) {
  const source = path.join(ROOT, "public", preset.background)
  const output = path.join(ROOT, "public", "kiosk-frames", `${preset.id}.jpg`)
  await mkdir(path.dirname(output), { recursive: true })
  if (!force && (await exists(output))) continue
  if (!(await exists(source))) {
    console.log(`${preset.date}: 배경 없음 — 건너뜀`)
    continue
  }

  const resized = await sharp(source)
    .resize(600, 450, { fit: "cover", position: "centre" })
    .modulate({ brightness: 1.05, saturation: 0.9 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const tint = FOLIAGE_TINT_BY_COLOR[preset.color] ?? [226, 203, 211]

  for (let index = 0; index < resized.data.length; index += 3) {
    const r = resized.data[index]
    const g = resized.data[index + 1]
    const b = resized.data[index + 2]
    const dominance = g - Math.max(r * 0.94, b)
    const saturation = Math.max(r, g, b) - Math.min(r, g, b)
    if (dominance < 3 || saturation < 12) continue
    const strength = Math.min(0.88, Math.max(0, dominance / 42) * 0.78 + saturation / 900)
    const luminanceScale = 0.72 + (r + g + b) / 2100
    resized.data[index] = Math.round(
      r * (1 - strength) + Math.min(255, tint[0] * luminanceScale) * strength
    )
    resized.data[index + 1] = Math.round(
      g * (1 - strength) + Math.min(255, tint[1] * luminanceScale) * strength
    )
    resized.data[index + 2] = Math.round(
      b * (1 - strength) + Math.min(255, tint[2] * luminanceScale) * strength
    )
  }

  const panel = await sharp(resized.data, {
    raw: { width: resized.info.width, height: resized.info.height, channels: 3 },
  })
    .modulate({ brightness: 1.04, saturation: 1.05 })
    .jpeg({ quality: 95 })
    .toBuffer()

  const softPaper = {
    input: Buffer.from(
      `<svg width="600" height="1800">
        <rect width="600" height="1800" fill="rgba(255,252,248,.18)"/>
        <rect x="78" y="42" width="444" height="1320" rx="4"
          fill="rgba(255,255,255,.12)"/>
        <rect x="72" y="1370" width="456" height="330" rx="24"
          fill="rgba(255,255,255,.22)"/>
      </svg>`
    ),
    top: 0,
    left: 0,
  }

  await sharp({
    create: { width: 600, height: 1800, channels: 3, background: "#fffaf6" },
  })
    .composite([
      { input: panel, top: 0, left: 0 },
      { input: panel, top: 450, left: 0 },
      { input: panel, top: 900, left: 0 },
      { input: panel, top: 1350, left: 0 },
      softPaper,
    ])
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toFile(output)

  console.log(`${preset.date}: ${path.relative(ROOT, output)}`)
}

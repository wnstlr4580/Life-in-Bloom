import { mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const ROOT = path.resolve(import.meta.dirname, "..")
const OUTPUT_DIR = path.join(ROOT, "public", "kiosk-samples", "birth-flowers")
const { presets } = JSON.parse(
  await readFile(path.join(ROOT, "lib", "kiosk", "birthFlowerPresets.json"), "utf8")
)

await mkdir(OUTPUT_DIR, { recursive: true })

for (let month = 1; month <= 12; month++) {
  const prefix = String(month).padStart(2, "0")
  const monthPresets = presets.filter((preset) => preset.date.startsWith(`${prefix}-`))
  const columns = 6
  const cellWidth = 132
  const cellHeight = 428
  const rows = Math.ceil(monthPresets.length / columns)
  const composites = []

  for (const [index, preset] of monthPresets.entries()) {
    const frame = path.join(ROOT, "public", "kiosk-frames", `${preset.id}.jpg`)
    const thumbnail = await sharp(frame)
      .resize(120, 360, { fit: "cover" })
      .jpeg({ quality: 88 })
      .toBuffer()
    const x = (index % columns) * cellWidth + 6
    const y = Math.floor(index / columns) * cellHeight + 42
    composites.push({ input: thumbnail, left: x, top: y })
    composites.push({
      input: Buffer.from(
        `<svg width="120" height="38"><text x="60" y="25" text-anchor="middle"
          font-family="Arial, sans-serif" font-size="16" fill="#6d5963">${preset.date}</text></svg>`
      ),
      left: x,
      top: y - 36,
    })
  }

  const output = path.join(OUTPUT_DIR, `${prefix}.jpg`)
  await sharp({
    create: {
      width: columns * cellWidth,
      height: rows * cellHeight + 18,
      channels: 3,
      background: "#f8f3f1",
    },
  })
    .composite(composites)
    .jpeg({ quality: 91 })
    .toFile(output)
  console.log(path.relative(ROOT, output))
}


import { createHash } from "node:crypto"
import { access, readFile } from "node:fs/promises"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const { presets } = JSON.parse(
  await readFile(path.join(ROOT, "lib", "kiosk", "birthFlowerPresets.json"), "utf8")
)

const dates = new Set()
const ids = new Set()
const backgroundHashes = new Set()
const frameHashes = new Set()
const backgroundDatesByHash = new Map()
const frameDatesByHash = new Map()
const missing = []

async function hashFile(file) {
  try {
    await access(file)
    return createHash("sha256").update(await readFile(file)).digest("hex")
  } catch {
    return null
  }
}

for (const preset of presets) {
  dates.add(preset.date)
  ids.add(preset.id)
  const background = path.join(ROOT, "public", preset.background)
  const frame = path.join(ROOT, "public", "kiosk-frames", `${preset.id}.jpg`)
  const backgroundHash = await hashFile(background)
  const frameHash = await hashFile(frame)
  if (backgroundHash) backgroundHashes.add(backgroundHash)
  else missing.push(`배경 ${preset.date}: ${background}`)
  if (frameHash) frameHashes.add(frameHash)
  else missing.push(`프레임 ${preset.date}: ${frame}`)
  if (backgroundHash) {
    backgroundDatesByHash.set(backgroundHash, [
      ...(backgroundDatesByHash.get(backgroundHash) ?? []),
      preset.date,
    ])
  }
  if (frameHash) {
    frameDatesByHash.set(frameHash, [
      ...(frameDatesByHash.get(frameHash) ?? []),
      preset.date,
    ])
  }
}

const result = {
  rows: presets.length,
  uniqueDates: dates.size,
  uniqueIds: ids.size,
  uniqueBackgroundFiles: backgroundHashes.size,
  uniqueFrameFiles: frameHashes.size,
  duplicateBackgroundDates: [...backgroundDatesByHash.values()].filter(
    (datesForHash) => datesForHash.length > 1
  ),
  duplicateFrameDates: [...frameDatesByHash.values()].filter(
    (datesForHash) => datesForHash.length > 1
  ),
  missing,
}

console.log(JSON.stringify(result, null, 2))

if (
  presets.length !== 366 ||
  dates.size !== 366 ||
  ids.size !== 366 ||
  backgroundHashes.size !== 366 ||
  frameHashes.size !== 366 ||
  missing.length
) {
  process.exitCode = 1
}

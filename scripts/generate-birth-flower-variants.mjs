// birthFlowerPresets.json의 날짜 전용 변형(variant > 0) 배경·프레임을 생성한다.
// 사용법:
//   node scripts/generate-birth-flower-variants.mjs
//   node scripts/generate-birth-flower-variants.mjs --force
//   node scripts/generate-birth-flower-variants.mjs --frames-only
//   node scripts/generate-birth-flower-variants.mjs 0604 0721

import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const PRESETS_JSON = path.join(ROOT, "lib", "kiosk", "birthFlowerPresets.json")
const DELAY_MS = 1_000
const FORCE = process.argv.includes("--force")
const ids = process.argv.slice(2).filter((arg) => !arg.startsWith("--"))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const PAPER_BY_COLOR = {
  pink: "porcelain white with a whisper of blush",
  red: "porcelain white with a whisper of rose",
  purple: "porcelain white with a whisper of lavender",
  blue: "porcelain white with a whisper of cool blue",
  yellow: "clean warm ivory",
  orange: "porcelain white with a whisper of peach",
  white: "clean warm ivory",
}

const { presets } = JSON.parse(await readFile(PRESETS_JSON, "utf8"))
const variants = presets.filter(
  (preset) =>
    preset.variant > 0 &&
    (!ids.length || ids.includes(preset.date.replace("-", "")) || ids.includes(preset.id))
)

const ALL_TASKS = [
  {
    label: "배경",
    dir: path.join(ROOT, "public", "kiosk-backgrounds", "birth"),
    width: 1600,
    height: 1200,
    prompt: (preset) =>
      `Premium photorealistic Korean photo booth background for the birth flower ` +
      `date ${preset.date}, featuring ${preset.engFlower}. This must be a unique ` +
      `composition for this exact date: lush real flower clusters along the far ` +
      `left and right edges, bright clean warm-white center occupying at least ` +
      `55 percent for a portrait, luminous pastel ${preset.color} palette, ` +
      `high-key diffused daylight, elegant AI-perfect editorial flower ` +
      `photography, crisp petal detail, no people, no text, no logo, no ` +
      `watermark, no roots, no soil, no dark background, no gray cast, no blur`,
  },
  {
    label: "프레임",
    dir: path.join(ROOT, "public", "kiosk-frames", "birth"),
    width: 600,
    height: 1800,
    prompt: (preset) =>
      `Premium photorealistic flower postcard frame unique to birth flower date ` +
      `${preset.date}, featuring abundant real ${preset.engFlower}. Tall narrow ` +
      `1:3 card on ${PAPER_BY_COLOR[preset.color] ?? "clean warm ivory"} fine ` +
      `paper, lush overlapping clouds of large ${preset.engFlower} flower heads ` +
      `along the far left and right margins and lower corners; depict blossom ` +
      `heads only, never complete plants; crop every stem outside the canvas and ` +
      `hide the base of every flower head behind overlapping petals; macro blossoms ` +
      `at varied sizes with petals covering at least 85 percent of every decorated ` +
      `area; foliage is at most 5 percent, pale, short and hidden behind petals; ` +
      `exactly zero visible green stems, vines, branches or leaf walls; real ` +
      `flowers softly perfected by AI, luminous ` +
      `pastel Korean stationery aesthetic, central 72 percent completely empty ` +
      `for four photos, clean lower information zone and bottom-right QR safe ` +
      `zone, visually distinct arrangement for this exact date, flowers dominate ` +
      `over leaves, no greenery-dominant composition, no roots, no bulbs, no ` +
      `soil, no long bare stems, no people, ` +
      `no text, no logo, no watermark, no illustration, no watercolor, no inner ` +
      `rectangle, no border line, no harsh shadow`,
  },
]

const TASKS = process.argv.includes("--frames-only")
  ? ALL_TASKS.filter((task) => task.label === "프레임")
  : process.argv.includes("--backgrounds-only")
    ? ALL_TASKS.filter((task) => task.label === "배경")
    : ALL_TASKS

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function fetchWithRetry(url, attempts = 8) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) })
      if (res.ok || (res.status !== 429 && res.status < 500) || attempt === attempts) return res
      const waitMs = attempt * 20_000
      console.log(`서버 지연(${res.status}) — ${waitMs / 1000}초 후 재시도`)
      await sleep(waitMs)
    } catch (error) {
      if (attempt === attempts) throw error
      const waitMs = attempt * 20_000
      console.log(`응답 시간 초과 — ${waitMs / 1000}초 후 재시도`)
      await sleep(waitMs)
    }
  }
  throw new Error("unreachable")
}

for (const task of TASKS) {
  await mkdir(task.dir, { recursive: true })
  let done = 0
  let skipped = 0
  const failed = []

  console.log(`\n=== 날짜 전용 ${task.label} ${variants.length}종 ===`)
  for (const preset of variants) {
    const assetId = preset.id.replace("birth/", "")
    const file = path.join(task.dir, `${assetId}.jpg`)
    if (!FORCE && (await exists(file))) {
      skipped++
      continue
    }

    const seed = Number(preset.date.replace("-", "")) * 97 + preset.sourceId.length
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(task.prompt(preset))}` +
      `?width=${task.width}&height=${task.height}&nologo=true&seed=${seed}`

    process.stdout.write(`[${done + skipped + failed.length + 1}/${variants.length}] ${preset.date} ${preset.name} ... `)
    try {
      const res = await fetchWithRetry(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 10_000) throw new Error("응답이 너무 작음")
      await writeFile(file, buffer)
      console.log("저장됨")
      done++
    } catch (error) {
      console.log(`실패: ${error.message}`)
      failed.push(preset.date)
    }
    await sleep(DELAY_MS)
  }

  console.log(`${task.label}: 생성 ${done}, 건너뜀 ${skipped}, 실패 ${failed.length}`)
  if (failed.length) console.log(`실패 날짜: ${failed.join(", ")}`)
}

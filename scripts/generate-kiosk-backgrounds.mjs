// 인생내꽃 포토카드 이미지 일괄 생성 스크립트
// 사용법:  node scripts/generate-kiosk-backgrounds.mjs
//
// lib/kiosk/flowerPresets.json의 프리셋마다 2종을 생성한다:
//   1. 배경 (인물 뒤에 합성될 꽃밭)  → public/kiosk-backgrounds/{id}.jpg
//   2. 카드 프레임 (여백 꽃 장식)     → public/kiosk-frames/{id}.jpg
//      중앙부는 사진 패널로 덮이므로 가장자리 장식만 중요하다.
//
// 이미 파일이 있으면 건너뛴다 → 실사 사진으로 교체한 것은 다시 안 만든다.
// 특정 이미지만 다시 만들려면 해당 jpg를 지우고 재실행.

import { readFile, mkdir, writeFile, access } from "node:fs/promises"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const PRESETS = path.join(ROOT, "lib", "kiosk", "flowerPresets.json")
const DELAY_MS = 5000 // 무료 API 부하 방지

const TASKS = [
  {
    label: "배경",
    dir: path.join(ROOT, "public", "kiosk-backgrounds"),
    width: 1600,
    height: 1200,
    prompt: (engFlower) =>
      `Photorealistic lush garden completely filled with ${engFlower} in full bloom, ` +
      `dreamy warm pastel tones, soft natural morning light, shallow depth of field ` +
      `with slightly soft focus, abundant blooms framing left and right sides, ` +
      `gentle open space in the lower center of the frame, no people, no text, ` +
      `no logo, no watermark`,
  },
  {
    label: "프레임",
    dir: path.join(ROOT, "public", "kiosk-frames"),
    width: 1000,
    height: 1500,
    prompt: (engFlower) =>
      `Top-down flat lay photograph on a plain warm cream ivory paper background: ` +
      `fresh ${engFlower} with long stems and green leaves arranged loosely along ` +
      `the left and right edges and corners of the frame, a few scattered petals, ` +
      `large completely empty blank cream area in the center, soft natural light, ` +
      `minimal airy editorial style, no people, no text, no logo, no watermark`,
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

const { presets } = JSON.parse(await readFile(PRESETS, "utf8"))

for (const task of TASKS) {
  await mkdir(task.dir, { recursive: true })
  let done = 0, skipped = 0, failed = []
  console.log(`\n=== ${task.label} 생성 ===`)

  for (const p of presets) {
    const file = path.join(task.dir, `${p.id}.jpg`)
    if (await exists(file)) { skipped++; continue }

    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(task.prompt(p.engFlower))}` +
      `?width=${task.width}&height=${task.height}&nologo=true&seed=42`

    process.stdout.write(`[${done + skipped + failed.length + 1}/${presets.length}] ${p.name} ... `)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 10_000) throw new Error("응답이 너무 작음 (생성 실패 의심)")
      await writeFile(file, buf)
      console.log("저장됨")
      done++
    } catch (e) {
      console.log(`실패: ${e.message}`)
      failed.push(p.id)
    }
    await sleep(DELAY_MS)
  }

  console.log(`${task.label} 완료 ${done} / 건너뜀(이미 있음) ${skipped} / 실패 ${failed.length}`)
  if (failed.length) console.log("실패 목록 (재실행하면 이것만 다시 시도):", failed.join(", "))
}

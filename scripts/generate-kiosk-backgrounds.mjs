// 인생내꽃 포토카드 이미지 일괄 생성 스크립트
// 사용법:  node scripts/generate-kiosk-backgrounds.mjs            ← 전체 (없는 것만)
//         node scripts/generate-kiosk-backgrounds.mjs lily-pink  ← 특정 id만 (여러 개 가능)
//         node scripts/generate-kiosk-backgrounds.mjs --force lily-pink ← 기존 파일도 교체
//         node scripts/generate-kiosk-backgrounds.mjs --force --frames-only lily-pink
//         node scripts/generate-kiosk-backgrounds.mjs --active --force --frames-only
//         node scripts/generate-kiosk-backgrounds.mjs --active --force --frames-only --exclude=tulip-white,lily-pink
//         set SEED=7 && node scripts/generate-kiosk-backgrounds.mjs lily-pink  ← 다른 시드로
//
// lib/kiosk/kioskFlowers.json의 꽃마다 2종을 생성한다:
//   1. 배경 (인물 뒤에 합성될 꽃밭)  → public/kiosk-backgrounds/{id}.jpg
//   2. 카드 프레임 (여백 꽃 장식)     → public/kiosk-frames/{id}.jpg
//      중앙부는 사진 패널로 덮이므로 가장자리 장식만 중요하다.
//
// 이미 파일이 있으면 건너뛴다 → 실사 사진으로 교체한 것은 다시 안 만든다.
// 특정 이미지만 다시 만들려면 해당 jpg를 지우고 재실행.

import { readFile, mkdir, writeFile, access } from "node:fs/promises"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const FLOWERS_JSON = path.join(ROOT, "lib", "kiosk", "kioskFlowers.json")
const DELAY_MS = 1000 // 단일 순차 작업에서만 실행하므로 짧은 간격 사용
const SEED = process.env.SEED ?? "42" // 같은 프롬프트로 다른 그림을 원하면 SEED 변경

// 꽃 색(color 컬럼) → 종이/톤 문구. 프레임 종이색·배경 톤을 꽃색과 맞춘 파스텔로 만든다.
const PAPER_BY_COLOR = {
  pink: "very pale pink",
  red: "very pale blush pink",
  purple: "very pale lavender",
  blue: "very pale blue",
  yellow: "very pale cream yellow",
  orange: "very pale peach",
  white: "ivory white",
}
const paperFor = (color) => PAPER_BY_COLOR[color] ?? "soft ivory white"

// 프레임은 꽃과 종이가 확실히 구분되어야 하므로 색지를 쓰지 않고
// 거의 흰 종이에 색상 기운만 아주 옅게 남긴다.
const FRAME_PAPER_BY_COLOR = {
  pink: "porcelain white with only a whisper of cool blush",
  red: "porcelain white with only a whisper of blush",
  purple: "porcelain white with only a whisper of lavender",
  blue: "porcelain white with only a whisper of cool blue",
  yellow: "clean warm white with only a whisper of cream",
  orange: "porcelain white with only a whisper of peach",
  white: "very pale warm sage-ivory, visibly darker than white petals",
}
const framePaperFor = (color) => FRAME_PAPER_BY_COLOR[color] ?? "clean warm porcelain white"

const frameSpeciesRules = (p) => {
  if (p.id === "tulip-white") {
    return "white tulips must dominate with 22 to 28 softly closed or cup-shaped luminous creamy flower heads; use only a few tiny baby's-breath sprigs as subtle accents and never as a main mass; avoid sparse stems without flower heads, "
  }
  if (p.id === "lily-pink") {
    return "show lilies only from elegant side and three-quarter angles using closed buds, half-open trumpets and softly cupped flowers; entirely hide stamens, pistils, pollen, anthers, dark speckles and deep flower centers; never show a front-facing open lily throat, "
  }
  if (p.id === "calla-pink") {
    return "pink calla flowers must dominate with 22 to 28 overlapping blush-pink flower heads at varied natural sizes; reduce visible green foliage by 70 percent and keep only a few short pale sage leaves tucked behind blossoms; no tall leaf walls or long bare stems, "
  }
  return ""
}

const ALL_TASKS = [
  {
    label: "배경",
    dir: path.join(ROOT, "public", "kiosk-backgrounds"),
    width: 1600,
    height: 1200,
    // 인물 합성용 밝은 꽃 정원. 중앙 인물 영역은 단순하게 비우고,
    // 꽃은 양 가장자리 뒤쪽에만 두어 얼굴·몸과 경쟁하지 않게 한다.
    prompt: (p) =>
      `Premium Korean photo booth background, airy editorial flower garden, ` +
      `natural ${p.engFlower} blooms arranged only along the far left and far ` +
      `right edges, flowers remain behind the future portrait area, a spacious ` +
      `clean warm-white center occupying at least 55 percent of the image, ` +
      `bright soft daylight, fresh luminous true-to-life flower color, high-key ` +
      `${paperFor(p.color)} palette, delicate realistic petals and leaves, ` +
      `subtle depth without heavy blur, elegant restrained composition, ` +
      `no giant flowers, no flowers in the center, no dark background, no gray ` +
      `cast, no yellow cast, no oversaturation, no haze, no glow, no people, ` +
      `no objects, no text, no logo, no watermark`,
  },
  {
    // 카드가 실제 인생네컷 비율(1:3, compositeCanvas.ts의 600×1800)로 바뀌어
    // 프레임도 같은 비율로 생성한다. 사진 패널이 중앙 폭 대부분을 덮으므로
    // 장식은 얇은 좌우 가장자리와 하단 밴드 위주로 배치되게 프롬프트를 잡았다.
    label: "프레임",
    dir: path.join(ROOT, "public", "kiosk-frames"),
    width: 600,
    height: 1800,
    // 레퍼런스처럼 밝은 종이 위에 실제 꽃 사진을 AI로 예쁘게 정돈한 엽서 프레임.
    // 중앙 사진 패널과 하단 문구·QR 안전영역은 반드시 비운다.
    prompt: (p) =>
      `Premium photorealistic flower photography photo booth card frame on ` +
      `${framePaperFor(p.color)} handmade paper, tall narrow 1:3 composition, ` +
      frameSpeciesRules(p) +
      `abundant clearly visible ${p.engFlower} blossoms arranged as lush, ` +
      `overlapping, large-petal flower clouds along the far left and right ` +
      `margins and corners; depict blossom heads only, never complete plants; ` +
      `crop every stem outside the canvas and tuck the base of each flower head ` +
      `behind other petals; use macro close-up flower heads at varied sizes so petals ` +
      `occupy at least 85 percent of every decorated area; foliage may occupy ` +
      `at most 5 percent and must be pale, short and hidden behind blossoms; ` +
      `show exactly zero visible green stems, vines, branches or leaf walls; real natural ` +
      `petals softly idealized by AI, premium editorial ` +
      `flower photography, airy pastel Korean postcard aesthetic, bright ` +
      `diffused daylight, crisp high-resolution petal detail, flower colors ` +
      `clearly separated from the near-white paper, fresh luminous color, generous ` +
      `negative space, keep the central 72 percent completely empty from top ` +
      `through lower middle for four photos, keep a clean lower information ` +
      `area and bottom-right QR safe zone, no roots, no bulbs, no exposed soil, ` +
      `no greenery-dominant composition, no long bare stems, no grass-like ` +
      `leaves, no plant base, no cropped-off ` +
      `flower heads, no large central flower, no dense bouquet, no dark leaves, ` +
      `no gray cast, no yellow cast, no muddy color, no illustration, no ` +
      `watercolor, no drawing, no inner rectangle, no border line, no harsh ` +
      `shadow, no text, no logo, no watermark`,
  },
]

const TASKS = process.argv.includes("--frames-only")
  ? ALL_TASKS.filter((task) => task.label === "프레임")
  : process.argv.includes("--backgrounds-only")
    ? ALL_TASKS.filter((task) => task.label === "배경")
    : ALL_TASKS

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchWithRetry(url, attempts = 8) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) })
      if (res.ok || (res.status !== 429 && res.status < 500) || attempt === attempts) return res
      const waitMs = attempt * 25_000
      console.log(`서버 지연(${res.status}) — ${waitMs / 1000}초 후 재시도`)
      await sleep(waitMs)
    } catch (error) {
      if (attempt === attempts) throw error
      const waitMs = attempt * 25_000
      console.log(`응답 시간 초과 — ${waitMs / 1000}초 후 재시도`)
      await sleep(waitMs)
    }
  }
  throw new Error("unreachable")
}

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

const { flowers: presets } = JSON.parse(await readFile(FLOWERS_JSON, "utf8"))

// 인자로 id를 주면 그것만 생성 (프롬프트 튜닝용 미리보기)
const FORCE = process.argv.includes("--force")
const onlyIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"))
const excludeArg = process.argv.find((arg) => arg.startsWith("--exclude="))
const excludedIds = new Set(excludeArg?.slice("--exclude=".length).split(",").filter(Boolean) ?? [])
const pool = process.argv.includes("--active") ? presets.filter((p) => p.active) : presets
const selected = onlyIds.length ? pool.filter((p) => onlyIds.includes(p.id)) : pool
const targets = selected.filter((p) => !excludedIds.has(p.id))
if (onlyIds.length) console.log("대상 한정:", targets.map((p) => p.id).join(", ") || "(일치 없음)")
if (excludedIds.size) console.log("보호 대상:", [...excludedIds].join(", "))

for (const task of TASKS) {
  await mkdir(task.dir, { recursive: true })
  let done = 0, skipped = 0, failed = []
  console.log(`\n=== ${task.label} 생성 ===`)

  for (const p of targets) {
    const file = path.join(task.dir, `${p.id}.jpg`)
    if (!FORCE && await exists(file)) { skipped++; continue }

    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(task.prompt(p))}` +
      `?width=${task.width}&height=${task.height}&nologo=true&seed=${SEED}`

    process.stdout.write(`[${done + skipped + failed.length + 1}/${targets.length}] ${p.name} ... `)
    try {
      const res = await fetchWithRetry(url)
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

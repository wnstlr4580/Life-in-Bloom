// kioskFlowers.json의 366일 날짜 매핑을 날짜별 고유 프리셋 테이블로 확장한다.
// 한 꽃이 여러 날짜를 담당하면 첫 날짜는 기존 자산을 사용하고,
// 나머지는 birth/ 하위의 날짜 전용 이미지 자산을 가리킨다.

import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const SOURCE = path.join(ROOT, "lib", "kiosk", "kioskFlowers.json")
const OUTPUT = path.join(ROOT, "lib", "kiosk", "birthFlowerPresets.json")

const { flowers } = JSON.parse(await readFile(SOURCE, "utf8"))
const presets = []
const usedBaseBackgrounds = new Set()
// 서로 다른 레코드가 같은 원본 이미지를 공유하는 기존 별칭 자산도 날짜 전용으로 분리한다.
const duplicateAssetDates = new Set([
  "03-26",
  "12-07",
  "04-09",
  "06-25",
  "11-11",
  "08-01",
  "11-27",
])

for (const flower of flowers) {
  for (const [index, date] of flower.birthDates.entries()) {
    const suffix = date.replace("-", "")
    const isVariant =
      index > 0 ||
      usedBaseBackgrounds.has(flower.background) ||
      duplicateAssetDates.has(date)
    const assetId = isVariant ? `${flower.id}-${suffix}` : flower.id
    presets.push({
      date,
      id: isVariant ? `birth/${assetId}` : flower.id,
      sourceId: flower.id,
      variant: isVariant ? Math.max(index, 1) : 0,
      species: flower.species,
      color: flower.color,
      name: flower.name,
      engFlower: flower.engFlower,
      background: isVariant
        ? `/kiosk-backgrounds/birth/${assetId}.jpg`
        : flower.background,
    })
    usedBaseBackgrounds.add(flower.background)
  }
}

presets.sort((a, b) => a.date.localeCompare(b.date))

const dates = new Set(presets.map((preset) => preset.date))
const ids = new Set(presets.map((preset) => preset.id))
if (presets.length !== 366 || dates.size !== 366 || ids.size !== 366) {
  throw new Error(
    `탄생화 고유성 검사 실패: rows=${presets.length}, dates=${dates.size}, ids=${ids.size}`
  )
}

await writeFile(
  OUTPUT,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), presets }, null, 2)}\n`,
  "utf8"
)

console.log(`탄생화 고유 프리셋 ${presets.length}개 생성: ${OUTPUT}`)
console.log(`기존 자산 ${presets.filter((preset) => preset.variant === 0).length}개`)
console.log(`날짜 전용 변형 ${presets.filter((preset) => preset.variant > 0).length}개`)

import { calculateSaju, type Ohaeng } from "@/lib/saju"
import { FLOWERS } from "@/lib/customFlowers"
import presetData from "@/lib/kiosk/flowerPresets.json"

export interface KioskFlowerPreset {
  id: string
  name: string // 꽃 이름 (색 포함, 예: "흰 튤립")
  meaning: string // 색깔별 꽃말
  meaningEn: string
  background: string // /public 기준 배경 이미지 경로
}

const PRESET_BY_ID = new Map(presetData.presets.map((p) => [p.id, p]))

// 웹 사주분석(/api/saju/analyze)과 동일한 기준 — 일간 오행 — 으로 후보 꽃을 뽑고,
// 생년월일 해시로 그중 하나를 결정한다 (같은 생일 = 항상 같은 꽃).
// 꽃 후보는 /custom 페이지와 같은 customFlowers.FLOWERS의 오행 태깅을 재사용하므로
// 추천 알고리즘이 바뀌어도 결과 꽃 id로 flowerPresets.json만 조회하면 된다.
export function pickFlowerPreset(birthDate: Date): { ohaeng: Ohaeng; preset: KioskFlowerPreset } {
  const saju = calculateSaju(birthDate, "unknown")
  const candidates = FLOWERS.filter((f) => f.ohaeng === saju.mainOhaeng && PRESET_BY_ID.has(f.id))

  const seedStr = birthDate.toISOString().slice(0, 10)
  let seed = 0
  for (const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0

  const chosen = PRESET_BY_ID.get(candidates[seed % candidates.length].id)!
  return {
    ohaeng: saju.mainOhaeng,
    preset: {
      id: chosen.id,
      name: chosen.name,
      meaning: chosen.meaning,
      meaningEn: chosen.meaningEn,
      background: chosen.background,
    },
  }
}

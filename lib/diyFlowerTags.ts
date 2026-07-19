import { FLOWERS_BY_OHAENG } from "@/lib/flowers"
import kioskFlowerData from "@/lib/kiosk/kioskFlowers.json"
import birthFlowerData from "@/lib/kiosk/birthFlowerPresets.json"

type KioskFlower = {
  id: string
  birthDates?: string[]
  monthFlower?: number | null
}

const kioskFlowers = kioskFlowerData.flowers as KioskFlower[]

export const OCCASIONS = [
  { id: "wedding", label: "웨딩·프로포즈" },
  { id: "promotion", label: "승진·취임" },
  { id: "anniversary", label: "기념일" },
  { id: "teacher", label: "스승의 날" },
  { id: "parents", label: "어버이날" },
  { id: "birthday", label: "생일" },
  { id: "cheer", label: "응원·격려" },
] as const

const OCCASION_FLOWERS: Record<string, Set<string>> = {
  wedding: new Set(["rose-white", "rose-pink", "lily-white", "peony-pink", "peony-white", "calla-white", "calla-pink", "tulip-white", "babysbreath-white", "eucalyptus"]),
  promotion: new Set(["sunflower", "gerbera-yellow", "gerbera-orange", "rose-yellow", "lily-white", "freesia", "eucalyptus"]),
  anniversary: new Set(["rose-red", "rose-pink", "tulip-pink", "tulip-purple", "peony-pink", "anemone-red", "babysbreath-white"]),
  teacher: new Set(["carnation-red", "carnation-pink", "rose-pink", "freesia", "daisy", "eucalyptus"]),
  parents: new Set(["carnation-red", "carnation-pink", "carnation-white", "rose-red", "rose-pink", "lily-pink"]),
  birthday: new Set(["gerbera-pink", "gerbera-yellow", "tulip-pink", "rose-yellow", "freesia", "daisy", "sunflower"]),
  cheer: new Set(["sunflower", "gerbera-orange", "gerbera-yellow", "freesia", "chamomile", "daisy"]),
}

const COLOR_FALLBACKS: Record<string, string[]> = {
  white: ["babysbreath-white", "rose-white", "tulip-white", "lily-white", "daisy"],
  pink: ["rose-pink", "tulip-pink", "carnation-pink", "gerbera-pink", "peony-pink"],
  red: ["rose-red", "carnation-red", "gerbera-red", "anemone-red"],
  yellow: ["freesia", "sunflower", "gerbera-yellow", "rose-yellow"],
  purple: ["lavender", "tulip-purple", "anemone-purple", "carnation-purple"],
  blue: ["hydrangea-blue", "anemone-blue"],
  orange: ["gerbera-orange", "tulip-orange", "peony-orange"],
  green: ["eucalyptus"],
}

export function flowerMeaning(name: string, group: string) {
  const candidates = Object.values(FLOWERS_BY_OHAENG).flat()
  return candidates.find((item) =>
    name === item.name
    || name.includes(item.name)
    || item.name.includes(name)
    || group === item.name
    || item.name.includes(group),
  )?.meaning ?? ""
}

export function isMonthFlower(id: string, month: number) {
  return kioskFlowers.some((flower) => flower.id === id && flower.monthFlower === month)
}

export function flowerMonths(id: string) {
  return kioskFlowers.filter((flower) => flower.id === id && flower.monthFlower).map((flower) => flower.monthFlower as number)
}

export function isBirthFlower(id: string, monthDay: string) {
  return kioskFlowers.some((flower) => flower.id === id && flower.birthDates?.includes(monthDay))
}

export function hasBirthDate(id: string) {
  return kioskFlowers.some((flower) => flower.id === id && (flower.birthDates?.length ?? 0) > 0)
}

export function isOccasionFlower(id: string, occasion: string) {
  return OCCASION_FLOWERS[occasion]?.has(id) ?? false
}

export function flowerOccasions(id: string) {
  return OCCASIONS.filter((occasion) => isOccasionFlower(id, occasion.id)).map((occasion) => occasion.label)
}

export function flowerBirthDates(id: string) {
  return kioskFlowers.find((flower) => flower.id === id)?.birthDates ?? []
}

export function birthFlowerSelection(monthDay: string) {
  const preset = birthFlowerData.presets.find((item) => item.date === monthDay)
  if (!preset) return null
  const exact = kioskFlowers.find((flower) =>
    flower.id === preset.sourceId || flower.id === preset.id || flower.birthDates?.includes(monthDay),
  )
  const exactId = exact?.id ?? null
  return {
    name: preset.name,
    color: preset.color,
    exactId,
    recommendedIds: exactId ? [exactId] : (COLOR_FALLBACKS[preset.color] ?? []).slice(0, 5),
  }
}

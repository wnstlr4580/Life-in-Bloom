// 포토부스 전용 꽃 선택 — 사주오행과 무관하게 4가지 모드로 꽃을 정한다.
// (사주 분석은 QR로 연결되는 /saju 페이지의 역할)
//   birth   : 생일꽃 — 생년월일(MM-DD)의 탄생화
//   today   : 오늘의 꽃 — 날짜 기반 로테이션
//   month   : 이달의 꽃 — 영국식 birth month flower
//   purchase: 구매한 꽃 — 판매처 재고에 등록된 상품 바코드 스캔
// 데이터: kioskFlowers.json(꽃 테이블) + flowerMeanings.json(색깔별 꽃말)

import flowerData from "@/lib/kiosk/kioskFlowers.json"
import meaningData from "@/lib/kiosk/flowerMeanings.json"
import birthFlowerData from "@/lib/kiosk/birthFlowerPresets.json"

export type KioskMode = "birth" | "today" | "month" | "purchase"

export interface KioskFlowerPreset {
  id: string
  name: string // 꽃 이름 (색 포함, 예: "핑크 백합")
  meaning: string // 색깔별 꽃말
  meaningEn: string
  background: string // /public 기준 배경 이미지 경로
}

type FlowerRow = (typeof flowerData.flowers)[number]

const MEANING = new Map(meaningData.meanings.map((m) => [`${m.species}/${m.color}`, m]))

function toPreset(f: FlowerRow): KioskFlowerPreset {
  const m = MEANING.get(`${f.species}/${f.color}`)
  return {
    id: f.id,
    name: f.name,
    meaning: m?.meaning ?? "",
    meaningEn: m?.meaningEn ?? "",
    background: f.background,
  }
}

function hashPick(rows: FlowerRow[], seedStr: string): FlowerRow {
  let seed = 0
  for (const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  return rows[seed % rows.length]
}

// active=false 행은 탄생화 초안(이미지·꽃말 검수 전) — 모든 선택에서 제외해
// 이미지 없는 꽃이 노출되는 것을 막는다. 검수 후 active로 바꾸면 바로 반영된다.
const ACTIVE = flowerData.flowers.filter((f) => f.active)
const TODAY_POOL = ACTIVE.filter((f) => f.todayPool)
const BIRTH_PRESETS = new Map(birthFlowerData.presets.map((preset) => [preset.date, preset]))

/** 생일꽃 — 366일 모두 날짜별 고유 프리셋을 직접 조회한다. */
export function pickBirthFlower(birthday: string): KioskFlowerPreset {
  const mmdd = birthday.slice(-5)
  const exact = BIRTH_PRESETS.get(mmdd)
  if (!exact) throw new Error(`등록되지 않은 탄생화 날짜입니다: ${mmdd}`)
  const meaning = MEANING.get(`${exact.species}/${exact.color}`)
  return {
    id: exact.id,
    name: exact.name,
    meaning: meaning?.meaning ?? "",
    meaningEn: meaning?.meaningEn ?? "",
    background: exact.background,
  }
}

/** 오늘의 꽃 — 연중 일수 기반 로테이션 (같은 날 = 모두 같은 꽃) */
export function pickTodayFlower(now = new Date()): KioskFlowerPreset {
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  return toPreset(TODAY_POOL[dayOfYear % TODAY_POOL.length])
}

/** 이달의 꽃 — monthFlower 매칭, 미지정 달은 로테이션 대체 */
export function pickMonthFlower(now = new Date()): KioskFlowerPreset {
  const month = now.getMonth() + 1
  const exact = ACTIVE.find((f) => f.monthFlower === month)
  return toPreset(exact ?? hashPick(TODAY_POOL, `month-${month}`))
}

// 판매자가 입력하는 색상 표기 → 포토부스 꽃 이름의 색 접두어
const COLOR_WORD: Record<string, string> = {
  레드: "빨간", 빨강: "빨간", 빨간: "빨간", 핑크: "핑크", 분홍: "핑크", 화이트: "흰", 흰색: "흰", 흰: "흰",
  옐로: "노란", 노랑: "노란", 노란: "노란", 퍼플: "보라", 보라: "보라", 오렌지: "주황", 주황: "주황", 블루: "파란", 파랑: "파란", 파란: "파란",
}

/**
 * 구매한 꽃 — 바코드로 찾은 판매처 재고를 포토부스 꽃으로 연결한다.
 * 재고 flowerCode가 카탈로그 id(rose-red 등)면 그대로, 판매자가 직접 등록한 재고는 꽃명·색상으로 찾는다.
 */
export function pickPurchasedFlower(stock: { flowerCode: string; flowerName: string; color: string | null }): KioskFlowerPreset | null {
  const byId = ACTIVE.find((f) => f.id === stock.flowerCode)
  if (byId) return toPreset(byId)
  const name = stock.flowerName.trim()
  const exact = ACTIVE.find((f) => f.name === name || f.name === `${stock.color ?? ""} ${name}`.trim())
  if (exact) return toPreset(exact)
  const sameKind = ACTIVE.filter((f) => f.name.endsWith(name) || name.endsWith(f.name.split(" ").pop() ?? ""))
  if (!sameKind.length) return null
  const color = COLOR_WORD[(stock.color ?? "").trim()]
  return toPreset(sameKind.find((f) => color && f.name.startsWith(color)) ?? sameKind[0])
}

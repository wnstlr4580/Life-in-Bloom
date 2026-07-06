import type { Ohaeng } from "@/lib/saju"

export interface KioskFlowerPreset {
  flowerName: string
  color: string
  meaning: string // 꽃말
  backgroundImages: string[]
}

// 오행별 꽃/색/꽃말 프리셋 — 기존 lib/saju.ts의 FLOWER_BY_STAGE.일주,
// /custom 페이지의 꽃 오행 태깅과 동일한 조합을 재사용해 사이트 전체 톤을 맞춘다.
// 배경 이미지는 런타임에 AI로 생성하지 않고 사전 검수된 정적 이미지를 사용한다
// (키오스크는 속도·안정성이 우선 — 설계 문서 참고)
export const KIOSK_FLOWER_PRESETS: Record<Ohaeng, KioskFlowerPreset> = {
  목: { flowerName: "핑크 튤립", color: "pink", meaning: "사랑의 고백", backgroundImages: ["/kiosk-backgrounds/mok_1.jpg"] },
  화: { flowerName: "빨간 장미", color: "red", meaning: "열정적인 사랑", backgroundImages: ["/kiosk-backgrounds/hwa_1.jpg"] },
  토: { flowerName: "노란 국화", color: "yellow", meaning: "고결한 마음", backgroundImages: ["/kiosk-backgrounds/to_1.jpg"] },
  금: { flowerName: "흰 백합", color: "white", meaning: "순수한 사랑", backgroundImages: ["/kiosk-backgrounds/geum_1.jpg"] },
  수: { flowerName: "파란 수국", color: "blue", meaning: "진심", backgroundImages: ["/kiosk-backgrounds/su_1.jpg"] },
}

export function pickBackground(ohaeng: Ohaeng): string {
  const list = KIOSK_FLOWER_PRESETS[ohaeng].backgroundImages
  return list[Math.floor(Math.random() * list.length)]
}

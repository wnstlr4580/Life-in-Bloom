import type { Ohaeng } from "@/lib/saju"

// 오행별 사전 제작 배경 이미지 (정적 파일)
// 런타임에 AI로 생성하지 않는 이유: 키오스크는 속도·안정성이 우선이라
// 사전 검수된 정적 이미지를 사용한다 (설계 문서 참고)
export const KIOSK_BACKGROUNDS: Record<Ohaeng, string[]> = {
  목: ["/kiosk-backgrounds/mok_1.jpg"],
  화: ["/kiosk-backgrounds/hwa_1.jpg"],
  토: ["/kiosk-backgrounds/to_1.jpg"],
  금: ["/kiosk-backgrounds/geum_1.jpg"],
  수: ["/kiosk-backgrounds/su_1.jpg"],
}

export function pickBackground(ohaeng: Ohaeng): string {
  const list = KIOSK_BACKGROUNDS[ohaeng]
  return list[Math.floor(Math.random() * list.length)]
}

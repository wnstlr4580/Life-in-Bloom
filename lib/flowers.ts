import type { Ohaeng } from "./saju"

// 오행별 꽃 사전 — 상품(사진)이 없어도 다양한 꽃을 추천하기 위한 데이터
export interface FlowerInfo {
  name: string
  emoji: string
  meaning: string // 꽃말
  color: string // 대표 색
}

export const FLOWERS_BY_OHAENG: Record<Ohaeng, FlowerInfo[]> = {
  목: [
    { name: "튤립", emoji: "🌷", meaning: "새로운 시작, 사랑의 고백", color: "초록 · 연분홍" },
    { name: "수선화", emoji: "🌼", meaning: "새봄, 나를 사랑하는 마음", color: "노랑 · 흰색" },
    { name: "히아신스", emoji: "💠", meaning: "겸손한 사랑, 기쁨", color: "파랑 · 보라" },
    { name: "은방울꽃", emoji: "🔔", meaning: "행복이 다시 찾아와요", color: "흰색" },
    { name: "델피니움", emoji: "💙", meaning: "당신을 지켜줄게요", color: "파랑" },
    { name: "유칼립투스", emoji: "🌿", meaning: "추억, 다시 힘내는 마음", color: "초록" },
    { name: "스토크", emoji: "🪻", meaning: "변하지 않는 아름다움", color: "연보라 · 흰색" },
    { name: "그린 소국", emoji: "🍀", meaning: "밝고 순수한 마음", color: "초록" },
  ],
  화: [
    { name: "빨간 장미", emoji: "🌹", meaning: "뜨거운 사랑, 열정", color: "빨강" },
    { name: "거베라", emoji: "🌺", meaning: "언제나 밝은 마음", color: "주황 · 분홍" },
    { name: "달리아", emoji: "🌸", meaning: "화려한 매력, 감사", color: "빨강 · 주황" },
    { name: "작약", emoji: "🏵️", meaning: "수줍은 행복", color: "분홍 · 빨강" },
    { name: "아네모네", emoji: "🌷", meaning: "당신을 기다려요", color: "빨강 · 분홍" },
    { name: "글라디올러스", emoji: "🎺", meaning: "승리, 굳센 마음", color: "빨강 · 주황" },
    { name: "맨드라미", emoji: "🔥", meaning: "시들지 않는 사랑", color: "빨강" },
    { name: "포인세티아", emoji: "⭐", meaning: "축하해요, 축복해요", color: "빨강" },
  ],
  토: [
    { name: "노란 프리지아", emoji: "🌼", meaning: "새로운 출발을 응원해요", color: "노랑" },
    { name: "국화", emoji: "🏵️", meaning: "성실, 변함없는 마음", color: "노랑 · 흰색" },
    { name: "해바라기", emoji: "🌻", meaning: "당신만 바라봐요", color: "노랑" },
    { name: "메리골드", emoji: "🧡", meaning: "꼭 찾아올 행복", color: "주황 · 노랑" },
    { name: "미모사", emoji: "💛", meaning: "따뜻한 우정, 감사", color: "노랑" },
    { name: "유채꽃", emoji: "🌾", meaning: "명랑하고 쾌활한 마음", color: "노랑" },
    { name: "노란 튤립", emoji: "🌷", meaning: "밝은 미소, 희망", color: "노랑" },
    { name: "캐모마일", emoji: "🌼", meaning: "힘든 날을 이겨내는 힘", color: "흰색 · 노랑" },
  ],
  금: [
    { name: "백합", emoji: "🤍", meaning: "순수, 깨끗한 마음", color: "흰색" },
    { name: "흰 카네이션", emoji: "🌸", meaning: "순수한 사랑과 존경", color: "흰색" },
    { name: "안개꽃", emoji: "☁️", meaning: "맑은 마음, 약속", color: "흰색" },
    { name: "목련", emoji: "🕊️", meaning: "고귀함, 자연을 사랑하는 마음", color: "흰색" },
    { name: "마가렛", emoji: "🌼", meaning: "진실한 사랑, 마음속 비밀", color: "흰색" },
    { name: "흰 장미", emoji: "🥀", meaning: "존경, 순결한 사랑", color: "흰색" },
    { name: "카라", emoji: "🏳️", meaning: "순수한 아름다움", color: "흰색 · 크림" },
    { name: "스노우볼", emoji: "❄️", meaning: "풍성한 축복", color: "흰색 · 연두" },
  ],
  수: [
    { name: "수국", emoji: "💠", meaning: "진심, 한결같은 마음", color: "파랑 · 보라" },
    { name: "라벤더", emoji: "💜", meaning: "기다림, 침묵의 사랑", color: "보라" },
    { name: "아이리스", emoji: "🦋", meaning: "좋은 소식이 와요", color: "보라 · 파랑" },
    { name: "제비꽃", emoji: "🌂", meaning: "겸손, 소박한 사랑", color: "보라" },
    { name: "팬지", emoji: "🎨", meaning: "나를 생각해 주세요", color: "보라 · 남색" },
    { name: "무스카리", emoji: "🍇", meaning: "실망시키지 않을게요", color: "파랑 · 보라" },
    { name: "보라 리시안셔스", emoji: "🪻", meaning: "변하지 않는 사랑", color: "보라" },
    { name: "스타티스", emoji: "✨", meaning: "영원히 변치 않아요", color: "보라 · 파랑" },
  ],
}

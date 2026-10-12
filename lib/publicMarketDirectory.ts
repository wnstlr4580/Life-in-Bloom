export type MarketDirectory = {
  id: string
  marketName: string
  marketType: "공공 화훼공판장" | "농협 화훼공판장" | "꽃 도매상가"
  roadAddress: string
  publicPhone: string
  latitude: number
  longitude: number
  sourceUrl: string
  supportsRealtime: boolean
  visitNote?: string
  visitSourceUrl?: string
  isNonghyup: boolean
}


const AT_REALTIME_URL = "https://flower.at.or.kr/real/real2.do"
export const PUBLIC_MARKETS: MarketDirectory[] = [
  { id: "at-yangjae", marketName: "aT 화훼공판장", marketType: "공공 화훼공판장", roadAddress: "서울 서초구 강남대로 27 (양재동)", publicPhone: "02-579-8100", latitude: 37.4680, longitude: 127.0390, sourceUrl: AT_REALTIME_URL, supportsRealtime: true, isNonghyup: false },
  { id: "busan-eomgung", marketName: "부산화훼공판장", marketType: "농협 화훼공판장", roadAddress: "부산 사상구 강변대로 512", publicPhone: "", latitude: 35.1284, longitude: 128.9562, sourceUrl: AT_REALTIME_URL, supportsRealtime: true, isNonghyup: true },
  { id: "busan-gangdong", marketName: "부산경남화훼농협", marketType: "농협 화훼공판장", roadAddress: "부산 강서구 강동동", publicPhone: "", latitude: 35.2112, longitude: 128.9354, sourceUrl: AT_REALTIME_URL, supportsRealtime: false, isNonghyup: true },
  { id: "gwangju-pungam", marketName: "광주원예농협", marketType: "농협 화훼공판장", roadAddress: "광주 서구 매월1로 7", publicPhone: "", latitude: 35.1162269, longitude: 126.8547997, sourceUrl: AT_REALTIME_URL, supportsRealtime: true, isNonghyup: true },
  { id: "kflower-eumseong", marketName: "한국화훼농협 음성공판장", marketType: "농협 화훼공판장", roadAddress: "충북 음성군 금왕읍 대금로1278번길 40", publicPhone: "043-877-5959", latitude: 36.9403, longitude: 127.6905, sourceUrl: AT_REALTIME_URL, supportsRealtime: true, isNonghyup: true },
  { id: "kflower-gwacheon", marketName: "한국화훼농협 과천공판장", marketType: "농협 화훼공판장", roadAddress: "경기 과천시 주암동 59-2", publicPhone: "02-574-7801", latitude: 37.4292, longitude: 126.9876, sourceUrl: AT_REALTIME_URL, supportsRealtime: false, isNonghyup: true },
  { id: "kflower-goyang", marketName: "한국화훼농협 고양공판장", marketType: "농협 화훼공판장", roadAddress: "경기 고양시 덕양구 원당로458번길 45", publicPhone: "031-950-8100", latitude: 37.6893008, longitude: 126.8529668, sourceUrl: AT_REALTIME_URL, supportsRealtime: false, isNonghyup: true },
  { id: "yeongnam-gimhae", marketName: "영남화훼농협 김해공판장", marketType: "농협 화훼공판장", roadAddress: "경남 김해시 식만로 365", publicPhone: "", latitude: 35.2285, longitude: 128.8894, sourceUrl: AT_REALTIME_URL, supportsRealtime: false, isNonghyup: true },
]


export function publicMarketDirectory() {
  return PUBLIC_MARKETS.map(market => ({ ...market,
    visitNote: market.id === "at-yangjae" ? "꽃 구매는 생화 도매시장 입점 매장에 문의하세요. 경매 낙찰가격과 매장 판매가격은 달라요."
      : ["kflower-eumseong", "kflower-gwacheon"].includes(market.id) ? "공식 안내상 난·관엽 경매장입니다. 꽃다발용 절화 판매와 일반인 구매 가능 여부를 먼저 문의하세요."
      : "공판장과 일반인 판매장은 다를 수 있어요. 절화 판매 매장·재고·방문 가능한 시간을 먼저 문의하세요.",
    visitSourceUrl: market.id.startsWith("kflower-") ? "https://kflower.nonghyup.com/kflower/101092/subview.do" : market.id === "at-yangjae" ? "https://flower.at.or.kr/yfmc/front/market/list.do?menuId=13&tyGroupCode=3" : market.sourceUrl,
    sellerId: `public-${market.id}`, distanceKm: null as number | null, diyComplete: false, customComplete: false }))
}

export function marketsNear(latitude: number | null, longitude: number | null) {
  const rad = (value: number) => value * Math.PI / 180
  return publicMarketDirectory().map(market => {
    if (latitude === null || longitude === null) return market
    const a = Math.sin(rad(market.latitude - latitude) / 2) ** 2 + Math.cos(rad(latitude)) * Math.cos(rad(market.latitude)) * Math.sin(rad(market.longitude - longitude) / 2) ** 2
    return { ...market, distanceKm: Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10 }
  }).sort((a,b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
}

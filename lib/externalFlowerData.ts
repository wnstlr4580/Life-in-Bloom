export type ExternalFlowerSource = {
  id: string
  name: string
  baseUrl: string
  endpoint: string
  purpose: "trade" | "price" | "forecast" | "code"
  note: string
}

// 공공데이터포털 aT API를 한 곳에서 관리한다. 개별 API 활용신청 후 같은 서비스키를 서버에서 주입한다.
export const EXTERNAL_FLOWER_SOURCES: ExternalFlowerSource[] = [
  { id: "realtime-auction", name: "전국 공영도매시장 실시간 경매", baseUrl: "https://apis.data.go.kr/B552845/katRealTime2", endpoint: "/trades2", purpose: "trade", note: "최근 낙찰 품목·수량·가격" },
  { id: "settlement", name: "전국 공영도매시장 정산", baseUrl: "https://apis.data.go.kr/B552845/katSale", endpoint: "/trades", purpose: "trade", note: "최종 물량·최저/최고/평균가" },
  { id: "origin-market", name: "전국 산지공판장 거래", baseUrl: "https://apis.data.go.kr/B552845/originTrialHall", endpoint: "/dealings", purpose: "trade", note: "산지공판장 품목·품종·물량·낙찰가" },
  { id: "online-wholesale", name: "온라인 도매시장 거래", baseUrl: "https://apis.data.go.kr/B552845/katOnline", endpoint: "/trades", purpose: "trade", note: "온라인 도매 거래 신호" },
  { id: "shipment-forecast", name: "전자송품장 출하구매물량 예측", baseUrl: "https://apis.data.go.kr/B552845/katForecast", endpoint: "/electronicInvoiceShipments", purpose: "forecast", note: "최대 30일 출하 예측" },
  { id: "price-trend", name: "가격 추이", baseUrl: "https://apis.data.go.kr/B552845/priceSequel", endpoint: "/info", purpose: "price", note: "당일 및 1~4주 평균가격" },
  { id: "price-change", name: "가격 등락", baseUrl: "https://apis.data.go.kr/B552845/risesAndFalls", endpoint: "/info", purpose: "price", note: "전일·전주·전월·전년 대비 등락률" },
  { id: "shipment-trend", name: "출하량 추이", baseUrl: "https://apis.data.go.kr/B552845/shipmentSequel", endpoint: "/info", purpose: "forecast", note: "1~4주 평균 출하수량·출하량" },
  { id: "regional-price", name: "지역별 도·소매 가격", baseUrl: "https://apis.data.go.kr/B552845/perRegion", endpoint: "/info", purpose: "price", note: "지역별 중도매·소매 참고가" },
  { id: "monthly-price", name: "연월별 도·소매 가격", baseUrl: "https://apis.data.go.kr/B552845/perYearMonth", endpoint: "/info", purpose: "price", note: "월·연 평균/최고/최저가" },
  { id: "recent-price", name: "최근일자 도·소매 가격", baseUrl: "https://apis.data.go.kr/B552845/recent", endpoint: "/info", purpose: "price", note: "1일·1주·1개월·1년 전 가격" },
  { id: "goods-code", name: "농축수산물 품목 표준코드", baseUrl: "https://apis.data.go.kr/B552845/katCode", endpoint: "/goods", purpose: "code", note: "내부 꽃 ID 매핑" },
  { id: "market-code", name: "도매시장 표준코드", baseUrl: "https://apis.data.go.kr/B552845/katCode", endpoint: "/wholesaleMarkets", purpose: "code", note: "시장 위치·이름 매핑" },
  { id: "corp-code", name: "법인 표준코드", baseUrl: "https://apis.data.go.kr/B552845/katCode", endpoint: "/corps", purpose: "code", note: "공판장·법인 매핑" },
]

export const externalFlowerSource = (id: string) => EXTERNAL_FLOWER_SOURCES.find((source) => source.id === id)

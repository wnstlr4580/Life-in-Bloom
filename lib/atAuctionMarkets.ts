export type AtAuctionMarket = {
  id: string
  companyCode: string
  name: string
}
export const AT_AUCTION_MARKETS: AtAuctionMarket[] = [
  { id: "at-yangjae", companyCode: "0000000001", name: "aT 화훼공판장" },
  { id: "busan-eomgung", companyCode: "1508500020", name: "부산화훼공판장" },
  { id: "busan-gangdong", companyCode: "6068207466", name: "부산경남화훼농협" },
  { id: "gwangju-pungam", companyCode: "4108212335", name: "광주원예농협" },
  { id: "kflower-eumseong", companyCode: "3848200087", name: "한국화훼농협 음성공판장" },
  { id: "kflower-gwacheon", companyCode: "1288202296", name: "한국화훼농협 과천공판장" },
  { id: "kflower-goyang", companyCode: "7368200686", name: "한국화훼농협 고양공판장" },
  { id: "yeongnam-gimhae", companyCode: "6158209828", name: "영남화훼농협 김해공판장" },
]

const FLOWER_GROUP_ALIASES: Record<string, string[]> = {
  장미: ["장미"], 백합: ["백합", "나리"], 국화: ["국화"], 카네이션: ["카네이션"],
  튤립: ["튤립"], 거베라: ["거베라"], 프리지아: ["프리지아"], 칼라: ["칼라", "카라"],
  수국: ["수국"], 작약: ["작약"], 해바라기: ["해바라기"], 안개꽃: ["안개초", "안개꽃"],
  라벤더: ["라벤더"], 데이지: ["데이지"], 카모마일: ["카모마일"], 유칼립투스: ["유칼립투스"],
  아네모네: ["아네모네"],
}

export function matchesFlowerGroup(itemName: string, group: string) {
  return (FLOWER_GROUP_ALIASES[group] ?? [group]).some((alias) => itemName.includes(alias))
}

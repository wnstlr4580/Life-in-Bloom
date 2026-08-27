// 꽃 오행 프로필 — 상품 하나가 오행 5개에 대해 갖는 "독립 절대점수"(0~100).
//
// 각 축을 오행별 기여로 보고 가중합만 하므로 한 꽃이 여러 오행에 동시에 높을 수 있다
// (예: 해바라기가 형태로 화(火), 색으로 토(土)에 동시에 높음).
//
// 근거 축과 가중치(사용자 확정): 색상 45% · 형태 35% · 계절 20%.
// ※ 꽃말(flowerMeaning)은 오행 점수에서 제외한다 — 추천 이유/사용 목적/감성 스토리 생성 등
//    다른 용도로만 쓴다.
import type { Ohaeng } from "./saju"

const OHAENG_ORDER: Ohaeng[] = ["목", "화", "토", "금", "수"]

// 색상 → 오행 비율. 색상 출처는 (1) 꽃 이름에 색이 붙어 있으면 그 색(세부색 연/진 포함),
// (2) 없으면 상품 대표색(colorTags). 보라·핑크는 세부색(연/진)이 기본색보다 우선한다.
type ColorWeight = Partial<Record<Ohaeng, number>>

// 단색 — 이름/태그 키워드 → 오행. 여러 색이 섞이면 합산(복합 꽃다발).
// 색태그는 소스마다 한글/영어가 섞여 들어오므로(시드·SQL은 영어) 두 표기를 모두 받는다.
const SIMPLE_COLORS: [string[], ColorWeight][] = [
  [["빨강", "빨간", "레드", "red"], { 화: 1 }],
  [["노랑", "노란", "옐로", "yellow"], { 토: 1 }],
  [["초록", "연두", "그린", "green"], { 목: 1 }],
  [["파랑", "파란", "블루", "blue"], { 수: 1 }],
  [["흰", "하얀", "하양", "화이트", "white"], { 금: 1 }],
  [["주황", "오렌지", "orange"], { 화: 0.5, 토: 0.5 }],
]
// 보라 계열 — 세부(연/진) 우선, 계열당 한 번만.
const PURPLE_FAMILY: [string[], ColorWeight][] = [
  [["연보라"], { 수: 0.7, 화: 0.3 }],
  [["진보라"], { 화: 0.6, 수: 0.4 }],
  [["보라", "퍼플", "purple"], { 수: 0.6, 화: 0.4 }],
]
// 핑크 계열
const PINK_FAMILY: [string[], ColorWeight][] = [
  [["연핑크", "연분홍"], { 금: 0.5, 화: 0.5 }],
  [["진핑크", "진분홍"], { 화: 0.8, 금: 0.2 }],
  [["핑크", "분홍", "pink"], { 화: 0.7, 금: 0.3 }],
]
const ALL_COLOR_WORDS = [...SIMPLE_COLORS, ...PURPLE_FAMILY, ...PINK_FAMILY].flatMap(([words]) => words)

// 색태그 표기 통일 — 소스마다 한글/영어가 섞여 들어온다(시드·SQL은 영어, 판매자 UI는 한글).
// 상품 색태그를 표준 대표어로 모아, 오방색·탄생화 색 비교가 표기에 걸려 실패하지 않게 한다.
const COLOR_CANON: [string, string[]][] = [
  ["레드", ["빨강", "빨간", "레드", "red"]],
  ["옐로", ["노랑", "노란", "옐로", "yellow"]],
  ["그린", ["초록", "연두", "그린", "green"]],
  ["블루", ["파랑", "파란", "블루", "blue"]],
  ["화이트", ["흰", "하얀", "하양", "화이트", "white"]],
  ["오렌지", ["주황", "오렌지", "orange"]],
  ["퍼플", ["보라", "퍼플", "purple"]],
  ["핑크", ["핑크", "분홍", "pink"]],
]

/** 색태그 → 표준 대표어(레드·옐로·그린·블루·화이트·오렌지·퍼플·핑크). 대응 색이 없으면 null. */
export function normalizeColorTag(tag: string): string | null {
  const lower = (tag ?? "").toLowerCase()
  for (const [canon, words] of COLOR_CANON) {
    if (words.some((w) => lower.includes(w))) return canon
  }
  return null
}

// 꽃별 세부색 지정 — 상품 색태그는 보통 보라/핑크로만 등록되므로, 연/진 구분은 여기서 꽃별로 지정한다.
// 지정한 꽃이라도 이름/대표색이 실제로 보라(연보라·진보라)나 핑크(연핑크·진핑크) 계열일 때만 적용된다.
// (이름에 연/진이 직접 붙어 있으면 그게 우선.)
export const FLOWER_SHADE: Record<string, "연보라" | "진보라" | "연핑크" | "진핑크"> = {
  라벤더: "연보라",
  라일락: "연보라",
  스토크: "연보라",
  무스카리: "연보라",
  작약: "진핑크",
  벚꽃: "연핑크",
}

function addWeights(acc: Record<Ohaeng, number>, w: ColorWeight) {
  for (const o of OHAENG_ORDER) acc[o] += w[o] ?? 0
}

/** 색상 축 — 이름에 색이 있으면 그 색, 없으면 대표색(colorTags) 기준 오행 비율(각 최대 1).
 *  보라/핑크는 꽃별 세부색 지정(FLOWER_SHADE)이 있으면 연/진 비율을 적용한다. */
function colorAxis(name: string, colorTags: string[]): Record<Ohaeng, number> {
  const nameLower = (name ?? "").toLowerCase()
  const nameHasColor = ALL_COLOR_WORDS.some((w) => nameLower.includes(w.toLowerCase()))
  let text = nameHasColor ? nameLower : colorTags.join(" ").toLowerCase()

  // 꽃별 세부색 지정 적용 — 이름에 연/진이 이미 있으면 이름을 우선한다.
  const hasFine = ["연보라", "진보라", "연핑크", "진핑크"].some((k) => text.includes(k))
  if (!hasFine) {
    let shade: string | undefined
    for (const [flower, sh] of Object.entries(FLOWER_SHADE)) {
      if (nameLower.includes(flower.toLowerCase())) { shade = sh; break }
    }
    if ((shade === "연보라" || shade === "진보라") && /보라|퍼플/.test(text)) text = `${shade} ${text}`
    else if ((shade === "연핑크" || shade === "진핑크") && /핑크|분홍/.test(text)) text = `${shade} ${text}`
  }

  const acc = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<Ohaeng, number>
  for (const [words, w] of SIMPLE_COLORS) {
    if (words.some((k) => text.includes(k))) addWeights(acc, w)
  }
  for (const family of [PURPLE_FAMILY, PINK_FAMILY]) {
    for (const [words, w] of family) {
      if (words.some((k) => text.includes(k))) { addWeights(acc, w); break }
    }
  }
  for (const o of OHAENG_ORDER) acc[o] = Math.min(1, acc[o])
  return acc
}

// 형태/생육특성 — 색상처럼 "특성별로 해당 오행에 점수를 누적"한다. 한 꽃이 여러 형태 특성을
// 가지면 여러 오행에 점수가 쌓인다(예: 해바라기 = 큰꽃송이·태양형태(화) + 둥근형태(토)).
//
// (1) 특성 → 오행·점수 (사용자 정의 기준)
export type FormTrait =
  | "수직성장" | "잎풍성" | "가지확장" | "덩굴성" | "새순초록"
  | "큰꽃송이" | "선명한꽃잎" | "태양불꽃형태" | "위로활짝"
  | "화분분재" | "다육" | "둥근형태" | "오래키우는식물"
  | "흰꽃" | "좌우대칭" | "길고곧은형태" | "작은꽃정돈"
  | "둥글고풍성한꽃" | "아래로늘어짐" | "부드러운곡선" | "습지물연관"

export const FORM_TRAITS: Record<FormTrait, { ohaeng: Ohaeng; points: number }> = {
  수직성장: { ohaeng: "목", points: 40 }, 잎풍성: { ohaeng: "목", points: 30 },
  가지확장: { ohaeng: "목", points: 20 }, 덩굴성: { ohaeng: "목", points: 20 }, 새순초록: { ohaeng: "목", points: 10 },
  큰꽃송이: { ohaeng: "화", points: 40 }, 선명한꽃잎: { ohaeng: "화", points: 30 },
  태양불꽃형태: { ohaeng: "화", points: 20 }, 위로활짝: { ohaeng: "화", points: 10 },
  화분분재: { ohaeng: "토", points: 40 }, 다육: { ohaeng: "토", points: 30 },
  둥근형태: { ohaeng: "토", points: 20 }, 오래키우는식물: { ohaeng: "토", points: 10 },
  흰꽃: { ohaeng: "금", points: 30 }, 좌우대칭: { ohaeng: "금", points: 25 },
  길고곧은형태: { ohaeng: "금", points: 25 }, 작은꽃정돈: { ohaeng: "금", points: 20 },
  둥글고풍성한꽃: { ohaeng: "수", points: 30 }, 아래로늘어짐: { ohaeng: "수", points: 25 },
  부드러운곡선: { ohaeng: "수", points: 25 }, 습지물연관: { ohaeng: "수", points: 20 },
}

// 특성명은 점수 테이블 키라 붙여쓰기인데, 문장에 그대로 넣으면 "습지물연관을 가진 꽃"처럼 비문이 된다.
// 스토리텔링 문구용 자연어 라벨을 따로 둔다 (키 누락은 테스트가 잡는다).
export const FORM_TRAIT_LABEL: Record<FormTrait, string> = {
  수직성장: "곧게 뻗어 자라는 힘", 잎풍성: "풍성한 잎", 가지확장: "넓게 뻗는 가지",
  덩굴성: "감아 오르는 덩굴", 새순초록: "싱그러운 새순",
  큰꽃송이: "크고 시원한 꽃송이", 선명한꽃잎: "선명한 꽃잎",
  태양불꽃형태: "태양을 닮은 생김새", 위로활짝: "위를 향해 활짝 피는 모습",
  화분분재: "곁에 두고 기르는 화분", 다육: "도톰하게 물을 머금은 잎",
  둥근형태: "둥근 생김새", 오래키우는식물: "오래 함께하는 성질",
  흰꽃: "새하얀 꽃빛", 좌우대칭: "단정한 좌우 대칭",
  길고곧은형태: "길고 곧은 선", 작은꽃정돈: "작은 꽃이 단정히 모인 모습",
  둥글고풍성한꽃: "둥글고 풍성한 꽃", 아래로늘어짐: "부드럽게 늘어지는 선",
  부드러운곡선: "부드러운 곡선", 습지물연관: "물가에서 자라는 성질",
}

// (2) 꽃(이름 키워드) → 그 꽃이 가진 형태 특성. 주요 상업꽃 큐레이션.
export const FLOWER_FORM: Record<string, FormTrait[]> = {
  // 잎·줄기 위주(목 계열 형태)
  대나무: ["수직성장", "잎풍성", "새순초록"],
  유칼립투스: ["잎풍성", "가지확장", "새순초록"],
  라일락: ["잎풍성", "작은꽃정돈"],
  미모사: ["잎풍성", "가지확장", "작은꽃정돈"],
  유채꽃: ["수직성장", "가지확장", "작은꽃정돈"],
  // 수직 스파이크
  히아신스: ["수직성장", "작은꽃정돈"],
  무스카리: ["수직성장", "작은꽃정돈"],
  델피니움: ["수직성장", "작은꽃정돈"],
  글라디올러스: ["수직성장", "위로활짝"],
  금어초: ["수직성장", "위로활짝"],
  스토크: ["수직성장", "작은꽃정돈"],
  // 크고 화려한 꽃(화 계열)
  장미: ["큰꽃송이", "선명한꽃잎", "좌우대칭"],
  거베라: ["큰꽃송이", "태양불꽃형태", "좌우대칭"],
  해바라기: ["큰꽃송이", "태양불꽃형태", "위로활짝", "둥근형태"],
  달리아: ["큰꽃송이", "둥글고풍성한꽃", "좌우대칭"],
  작약: ["큰꽃송이", "둥글고풍성한꽃"],
  아네모네: ["선명한꽃잎", "태양불꽃형태"],
  맨드라미: ["큰꽃송이", "태양불꽃형태"],
  포인세티아: ["선명한꽃잎", "큰꽃송이"],
  튤립: ["위로활짝", "길고곧은형태", "수직성장"],
  // 둥근·풍성(토·수 계열)
  국화: ["둥글고풍성한꽃", "둥근형태", "좌우대칭"],
  소국: ["둥근형태", "새순초록"],
  메리골드: ["둥근형태", "둥글고풍성한꽃"],
  수국: ["둥글고풍성한꽃", "둥근형태"],
  동백: ["큰꽃송이", "좌우대칭", "둥근형태"],
  스노우볼: ["둥글고풍성한꽃", "둥근형태", "흰꽃"],
  // 정갈·흰꽃(금 계열)
  백합: ["큰꽃송이", "길고곧은형태", "좌우대칭"],
  카네이션: ["둥글고풍성한꽃", "좌우대칭"],
  안개꽃: ["작은꽃정돈", "흰꽃"],
  목련: ["큰꽃송이", "흰꽃", "위로활짝"],
  마가렛: ["태양불꽃형태", "좌우대칭", "흰꽃"],
  마거리트: ["태양불꽃형태", "좌우대칭", "흰꽃"],
  데이지: ["태양불꽃형태", "좌우대칭", "흰꽃"],
  카라: ["길고곧은형태", "부드러운곡선", "흰꽃"],
  칼라: ["길고곧은형태", "부드러운곡선", "흰꽃"], // 카라의 이표기
  캐모마일: ["태양불꽃형태", "좌우대칭"],
  카모마일: ["태양불꽃형태", "좌우대칭"], // 캐모마일의 이표기
  프리지아: ["가지확장", "위로활짝"],
  // 곡선·늘어짐(수 계열)
  라벤더: ["길고곧은형태", "부드러운곡선"],
  아이리스: ["길고곧은형태", "아래로늘어짐", "부드러운곡선"],
  제비꽃: ["작은꽃정돈", "부드러운곡선", "아래로늘어짐"],
  팬지: ["선명한꽃잎", "좌우대칭"],
  리시안셔스: ["둥글고풍성한꽃", "부드러운곡선"],
  스타티스: ["작은꽃정돈", "가지확장"],
  은방울꽃: ["아래로늘어짐", "부드러운곡선", "작은꽃정돈"],
  스위트피: ["부드러운곡선", "덩굴성"],
  수선화: ["좌우대칭", "길고곧은형태"],
  앵초: ["작은꽃정돈", "둥근형태"],
  // 화분·다육(토 계열)
  다육: ["다육", "오래키우는식물", "둥근형태"],
  선인장: ["다육", "오래키우는식물", "수직성장"],
  화분: ["화분분재", "오래키우는식물"],
  분재: ["화분분재", "오래키우는식물", "가지확장"],
  난초: ["부드러운곡선", "아래로늘어짐", "오래키우는식물"],
  수련: ["둥근형태", "습지물연관", "부드러운곡선"],
  // 가을 절화·소재
  과꽃: ["태양불꽃형태", "좌우대칭", "가지확장"],
  용담: ["수직성장", "위로활짝", "작은꽃정돈"],
  백일홍: ["둥글고풍성한꽃", "선명한꽃잎", "좌우대칭"],
  목화: ["흰꽃", "둥근형태", "가지확장"],
  에린지움: ["길고곧은형태", "태양불꽃형태", "가지확장"],
  갈대: ["수직성장", "아래로늘어짐", "부드러운곡선"],
  아마란서스: ["아래로늘어짐", "부드러운곡선", "선명한꽃잎"],
  아마란스: ["아래로늘어짐", "부드러운곡선", "선명한꽃잎"], // 아마란서스의 이표기
  // 겨울 절화·화분
  시클라멘: ["화분분재", "아래로늘어짐", "잎풍성"],
  크리스마스로즈: ["아래로늘어짐", "부드러운곡선", "오래키우는식물"],
  헬레보루스: ["아래로늘어짐", "부드러운곡선", "오래키우는식물"], // 크리스마스로즈의 이표기
  에리카: ["작은꽃정돈", "가지확장", "화분분재"],
  스노드롭: ["흰꽃", "작은꽃정돈", "아래로늘어짐"],
  납매: ["가지확장", "작은꽃정돈", "부드러운곡선"],
  매화: ["가지확장", "좌우대칭", "작은꽃정돈"],
  아마릴리스: ["큰꽃송이", "길고곧은형태", "위로활짝"],
}

// (3) 오행별 특성 점수 총합 — 정규화 분모(자동 계산)
// 정규화 분모 — "실제로 도달 가능한 최고점"(큐레이션된 꽃 중 그 오행 형태점이 가장 높은 값).
// 특성 점수 총합을 쓰면 어떤 꽃도 도달할 수 없는 분모가 되고, 특히 목은 특성이 5개라 120이 되어
// 다른 오행(100)보다 불리했다. 오행마다 "가장 그 형태다운 꽃"이 1.0을 받도록 맞춘다.
export const FORM_OHAENG_MAX: Record<Ohaeng, number> = Object.values(FLOWER_FORM).reduce(
  (acc, traits) => {
    const raw = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<Ohaeng, number>
    for (const t of traits) raw[FORM_TRAITS[t].ohaeng] += FORM_TRAITS[t].points
    for (const o of OHAENG_ORDER) acc[o] = Math.max(acc[o], raw[o])
    return acc
  },
  { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<Ohaeng, number>,
)

/** 텍스트에 등장하는 꽃들의 형태 특성 — 여러 꽃이 잡히면 합집합. */
export function formTraitsIn(text: string): FormTrait[] {
  const lower = text.toLowerCase()
  const traits = new Set<FormTrait>()
  for (const [flower, list] of Object.entries(FLOWER_FORM)) {
    if (lower.includes(flower.toLowerCase())) list.forEach((t) => traits.add(t))
  }
  return [...traits]
}

/** 형태 축 — 상품명(+카테고리·설명)에서 꽃을 찾아 그 형태 특성 점수를 오행별 합산 후 0~1 정규화. */
function formAxis(text: string): Record<Ohaeng, number> {
  const raw = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<Ohaeng, number>
  for (const t of formTraitsIn(text)) {
    const { ohaeng, points } = FORM_TRAITS[t]
    raw[ohaeng] += points
  }
  return Object.fromEntries(
    OHAENG_ORDER.map((o) => [o, FORM_OHAENG_MAX[o] > 0 ? Math.min(1, raw[o] / FORM_OHAENG_MAX[o]) : 0]),
  ) as Record<Ohaeng, number>
}

// ── 계절 축 — 꽃별 개화 적합도 등급 ──────────────────────────────
// "있다/없다"가 아니라 개화 적합도: 주개화기 100 · 보조 70 · 비수기 10 · 불가 0.
// 각 계절은 오행 하나에 대응(봄=목·여름=화·가을=금·겨울=수). 토(土)는 특정 계절이 아니라
// 환절기·중앙 기운이므로 "사계절 내내 유지되는 정도" = 4계절 등급의 최솟값으로 준다
// (recommendation.ts의 MONTH_TO_OHAENG도 1·4·7·10월 환절기를 토로 배정한다).
//
// ※ 이 축이 재는 것은 "자연 개화기·계절 상징성"이고, "지금 살 수 있는가"가 아니다.
//   유통 가능성은 stockScore(총점 10%)와 제철 리스트(seasonTags)가 이미 담당한다 — 계절축까지
//   유통을 재면 같은 신호를 3중 계상하고, 주요 절화 대부분이 연중 시설재배라 금·수가 소멸한다.
//   그래서 국화는 연중 유통이어도 main: ["autumn"]이다.
export type Season = "spring" | "summer" | "autumn" | "winter"
const SEASON_OHAENG: Record<Season, Ohaeng> = { spring: "목", summer: "화", autumn: "금", winter: "수" }
const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"]
const BLOOM = { 주: 100, 보조: 70, 비수기: 10, 불가: 0 } as const

// 계절 태그 표기 통일 — 판매자 UI는 영어(spring/summer/autumn/winter/all)를 고르게 하지만,
// 엑셀 대량등록(api/seller/products/bulk)의 "계절태그" 열은 검증 없는 자유 텍스트라 한글도 들어온다.
// 색태그(normalizeColorTag)와 달리 부분일치를 쓸 수 없다 — "fall"이 "all"을 포함해 사계절로 오인된다.
const SEASON_CANON: [Season | "all", string[]][] = [
  ["spring", ["spring", "봄"]],
  ["summer", ["summer", "여름"]],
  ["autumn", ["autumn", "fall", "가을"]],
  ["winter", ["winter", "겨울"]],
  ["all", ["all", "사계절", "연중"]],
]

/** 계절 태그 → 표준 계절 키(또는 사계절 "all"). 대응이 없으면 null. 정확일치만 인정한다. */
export function normalizeSeasonTag(tag: string): Season | "all" | null {
  const key = (tag ?? "").trim().toLowerCase()
  for (const [canon, words] of SEASON_CANON) {
    if (words.includes(key)) return canon
  }
  return null
}

interface FlowerSeason {
  main?: Season[]     // 주개화기 (100)
  sub?: Season[]      // 보조개화기 (70)
  never?: Season[]    // 불가 (0) — 지정 안 한 계절은 비수기(10). 위 "자연 개화기" 원칙에서는
                      // 비수기와 불가의 경계가 사실상 유통 개념이라 아직 쓰는 항목이 없다.
  foliage?: boolean   // 잎식물·상록 — 꽃이 없어 "개화"가 아니므로 4계절 보조(70)
  allSeason?: boolean // 사계절 개화 — 네 계절 모두가 주개화기이므로 4계절 주(100).
                      // 이 등급이 토(4계절 최솟값)의 상한 1.0을 실제로 채운다(거베라·카네이션).
}

// 꽃(이름 키워드)별 개화기 큐레이션 (한국 절화 기준).
export const FLOWER_SEASON: Record<string, FlowerSeason> = {
  // 봄 위주
  튤립: { main: ["spring"] },
  수선화: { main: ["spring", "winter"] }, // 제주 수선화는 12~2월에 핀다 — 겨울도 주개화기다
  히아신스: { main: ["spring"], sub: ["winter"] },
  은방울꽃: { main: ["spring"] },
  스토크: { main: ["spring"], sub: ["winter"] },
  아네모네: { main: ["spring"], sub: ["winter"] },
  프리지아: { main: ["spring"], sub: ["winter"] },
  유채꽃: { main: ["spring"] },
  미모사: { main: ["spring"], sub: ["winter"] },
  목련: { main: ["spring"] },
  마가렛: { main: ["spring"], sub: ["summer"] },
  마거리트: { main: ["spring"], sub: ["summer"] },
  데이지: { main: ["spring"], sub: ["summer"] },
  라일락: { main: ["spring"] },
  앵초: { main: ["spring"] },
  스위트피: { main: ["spring"], sub: ["winter"] },
  제비꽃: { main: ["spring"] },
  팬지: { main: ["spring"], sub: ["winter"] },
  무스카리: { main: ["spring"] },
  스노우볼: { main: ["spring"] },
  금어초: { main: ["spring"], sub: ["autumn"] },
  캐모마일: { main: ["spring"], sub: ["summer"] },
  카모마일: { main: ["spring"], sub: ["summer"] }, // 캐모마일의 이표기
  작약: { main: ["spring"], sub: ["summer"] },
  카라: { main: ["spring"], sub: ["summer"] },
  칼라: { main: ["spring"], sub: ["summer"] }, // 카라의 이표기
  아이리스: { main: ["spring"], sub: ["summer"] },
  델피니움: { main: ["summer"], sub: ["spring"] },
  // 여름 위주
  해바라기: { main: ["summer"] },
  수국: { main: ["summer"], sub: ["spring"] },
  라벤더: { main: ["summer"] },
  백합: { main: ["summer"], sub: ["spring"] },
  // 늦여름~가을이 성수기인 꽃들 — 가을도 주개화기로 본다
  달리아: { main: ["summer", "autumn"] },
  글라디올러스: { main: ["summer"] },
  맨드라미: { main: ["summer", "autumn"] },
  메리골드: { main: ["summer", "autumn"] },
  안개꽃: { main: ["summer"], sub: ["spring", "autumn"] },
  리시안셔스: { main: ["summer"], sub: ["autumn"] },
  스타티스: { main: ["summer"], sub: ["autumn"] },
  수련: { main: ["summer"] },
  // 가을 위주
  국화: { main: ["autumn"] },
  소국: { main: ["autumn"] },
  과꽃: { main: ["autumn"], sub: ["summer"] },
  용담: { main: ["autumn"] },
  백일홍: { main: ["summer", "autumn"] }, // 백일(百日) 동안 핀다 — 6~10월
  목화: { main: ["autumn"] },              // 꽃은 여름이지만 화훼로 쓰는 다래(솜)는 가을 수확 소재다
  에린지움: { main: ["summer", "autumn"] },
  갈대: { main: ["autumn"] },              // 이삭이 9~10월 — 가을 소재
  아마란서스: { main: ["summer", "autumn"] },
  아마란스: { main: ["summer", "autumn"] }, // 아마란서스의 이표기
  // 겨울 위주
  포인세티아: { main: ["winter"] },
  동백: { main: ["winter"], sub: ["spring"] },
  난초: { main: ["winter"], sub: ["spring"] },
  시클라멘: { main: ["winter"], sub: ["spring"] },
  크리스마스로즈: { main: ["winter"], sub: ["spring"] },
  헬레보루스: { main: ["winter"], sub: ["spring"] }, // 크리스마스로즈의 이표기
  에리카: { main: ["winter"] },
  스노드롭: { main: ["winter"], sub: ["spring"] },
  납매: { main: ["winter"] },
  매화: { main: ["winter"], sub: ["spring"] },        // 설 무렵 가지 절화로 유통된다
  아마릴리스: { main: ["winter"] },
  // 봄+가을 두 성수기
  장미: { main: ["spring", "autumn"], sub: ["summer", "winter"] },
  // 사계절 개화(연중 절화) → 4계절 주개화, 토(상시성) 상한 1.0을 채운다
  거베라: { allSeason: true },
  카네이션: { allSeason: true },
  // 잎식물 / 상록 → 4계절 보조
  유칼립투스: { foliage: true },
  대나무: { foliage: true },
  다육: { foliage: true },
  선인장: { foliage: true },
  화분: { foliage: true },
  분재: { foliage: true },
}

function seasonGrades(spec: FlowerSeason): Record<Season, number> {
  if (spec.allSeason) {
    return Object.fromEntries(SEASON_ORDER.map((s) => [s, BLOOM.주])) as Record<Season, number>
  }
  if (spec.foliage) {
    return Object.fromEntries(SEASON_ORDER.map((s) => [s, BLOOM.보조])) as Record<Season, number>
  }
  const main = new Set(spec.main ?? [])
  const sub = new Set(spec.sub ?? [])
  const never = new Set(spec.never ?? [])
  return Object.fromEntries(
    SEASON_ORDER.map((s) => {
      let g: number = BLOOM.비수기
      if (never.has(s)) g = BLOOM.불가
      if (sub.has(s)) g = BLOOM.보조
      if (main.has(s)) g = BLOOM.주
      return [s, g]
    }),
  ) as Record<Season, number>
}

// 주개화기(100)를 받는 꽃이 계절마다 몇 종인가 — 특정 계절로 쏠리면 계절축이 "그 계절이냐 아니냐"로
// 붕괴하고 반대편 오행은 색상축에만 의존하게 된다. 문서 표와 테스트가 같은 값을 보도록 코드에서 센다
// (손으로 세던 시절 문서에 "봄26"으로 잘못 적혀 있었다). allSeason은 4계절 전부 주개화로 계수한다.
export const SEASON_MAIN_COUNT: Record<Season, number> = Object.values(FLOWER_SEASON).reduce(
  (acc, spec) => {
    for (const s of spec.allSeason ? SEASON_ORDER : (spec.main ?? [])) acc[s] += 1
    return acc
  },
  { spring: 0, summer: 0, autumn: 0, winter: 0 } as Record<Season, number>,
)

// 오행별 계절축 도달 가능 최고점 — "상한이 균등한가"를 감시하는 관측값이다.
// 형태축의 FORM_OHAENG_MAX와 달리 정규화 분모로 쓰지 않는다. 분모로 쓰면 목·화·금·수는 이미 1.0이라
// 사실상 토만 ×1.43 보정하는 셈이고, 두 계절 성수기 꽃(장미, 최솟값 70)이 연중 개화 꽃과 동률 만점이
// 되어 "상시성"의 뜻이 깨진다. 게다가 토는 최솟값에서 파생되므로 4계절 주개화 꽃이 하나 늘면 분모가
// 뛰어 모든 상품의 토 계절점이 일괄 하락한다. 균등화는 allSeason 등급(주 100)으로 푼다.
export const SEASON_OHAENG_REACH: Record<Ohaeng, number> = Object.values(FLOWER_SEASON).reduce(
  (acc, spec) => {
    const g = seasonGrades(spec)
    for (const s of SEASON_ORDER) acc[SEASON_OHAENG[s]] = Math.max(acc[SEASON_OHAENG[s]], g[s] / 100)
    acc.토 = Math.max(acc.토, Math.min(...SEASON_ORDER.map((s) => g[s])) / 100)
    return acc
  },
  { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<Ohaeng, number>,
)

/** 이름에 걸리는 개화기 큐레이션 — 첫 매칭이 이긴다. 계절 축과 제철 판정이 이 lookup을 공유해야
 *  "제철 리스트엔 있는데 계절 점수는 0"인 꽃이 생기지 않는다. */
function lookupSeasonSpec(name: string): FlowerSeason | undefined {
  const lower = (name ?? "").toLowerCase()
  for (const [flower, spec] of Object.entries(FLOWER_SEASON)) {
    if (lower.includes(flower.toLowerCase())) return spec
  }
  return undefined
}

/** 지금이 이 꽃의 성수기인가 — 제철 추천 선정용. 큐레이션에 없으면 false.
 *  보조 개화기(70)는 제철이라 부르지 않는다. explainOhaeng이 "개화"라 부르는 경계와 일부러 다르다 —
 *  근거 문구는 보조도 개화로 인정하지만, "지금이 제철"은 주개화기만 해당한다. */
export function isPeakSeason(name: string, season: Season): boolean {
  const spec = lookupSeasonSpec(name)
  return spec ? seasonGrades(spec)[season] >= BLOOM.주 : false
}

/** 계절 축 — 꽃 개화기(FLOWER_SEASON)로 오행 점수(0~1). 미큐레이션이면 상품 seasonTags 폴백. */
function seasonAxis(name: string, seasonTags: string[]): Record<Ohaeng, number> {
  const spec = lookupSeasonSpec(name)

  let grades: Record<Season, number>
  if (spec) {
    grades = seasonGrades(spec)
  } else {
    // 폴백: 상품 seasonTags → 태그 계절=주개화기(100), 나머지는 큐레이션 경로와 같은 비수기(10).
    // 인식되는 태그가 하나도 없으면 "정보 없음"이라 4계절 전부 0 — 없는 정보로 점수를 만들지 않는다.
    // all/사계절은 판매자 등록 폼의 기본값이라 신뢰도가 낮다. 큐레이션 allSeason(주 100)과 달리 보조(70).
    const tags = (seasonTags ?? []).map(normalizeSeasonTag)
    if (tags.includes("all")) {
      grades = Object.fromEntries(SEASON_ORDER.map((s) => [s, BLOOM.보조])) as Record<Season, number>
    } else {
      const matched = SEASON_ORDER.filter((s) => tags.includes(s))
      grades = Object.fromEntries(
        SEASON_ORDER.map((s) => [
          s,
          matched.length === 0 ? BLOOM.불가 : matched.includes(s) ? BLOOM.주 : BLOOM.비수기,
        ]),
      ) as Record<Season, number>
    }
  }

  const result = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<Ohaeng, number>
  for (const s of SEASON_ORDER) result[SEASON_OHAENG[s]] = grades[s] / 100
  // 토 = 연중 상시성 (가장 약한 계절에도 남아 있는 만큼)
  result.토 = Math.min(...SEASON_ORDER.map((s) => grades[s])) / 100
  return result
}

/** 문장에 쓸 색 표현어 — 이름에 색이 있으면 그 색, 없으면 대표색. 꽃별 세부색(연보라 등)이 있으면 우선.
 *  점수 계산이 아니라 스토리텔링 문구용이다. */
export function flowerColorWord(name: string, colorTags: string[] = []): string | null {
  const lower = (name ?? "").toLowerCase()
  for (const fine of ["연보라", "진보라", "연핑크", "진핑크"]) {
    if (lower.includes(fine)) return fine
  }
  const canon = normalizeColorTag(lower) ?? colorTags.map((t) => normalizeColorTag(t)).find(Boolean) ?? null
  if (!canon) return null
  // 보라·핑크 계열은 꽃별 세부색 지정이 있으면 그쪽이 더 구체적이다
  if (canon === "퍼플" || canon === "핑크") {
    for (const [flower, shade] of Object.entries(FLOWER_SHADE)) {
      if (lower.includes(flower.toLowerCase())) return shade
    }
  }
  return { 레드: "붉은", 옐로: "노란", 그린: "초록", 블루: "푸른", 화이트: "흰", 오렌지: "주황", 퍼플: "보라", 핑크: "분홍" }[canon] ?? canon
}

/** 상품명에서 꽃 종(種) 키를 뽑는다 — 추천 다양성 판정용. 큐레이션에 없으면 null. */
export function flowerSpeciesKey(name: string): string | null {
  const lower = (name ?? "").toLowerCase()
  for (const flower of Object.keys(FLOWER_FORM)) {
    if (lower.includes(flower.toLowerCase())) return flower
  }
  return null
}

export const PROFILE_WEIGHT = { color: 0.45, form: 0.35, season: 0.20 }

/** 이 값 미만이면 "그 오행 꽃"이라고 부르지 않는다.
 *  색상 한 축만 잡혀도 최소 22.5점, 계절 태그 하나만 있어도 20점이므로 "신호 있음"의 경계.
 *  오행별 추천 리스트(topByOhaeng)와 상품 자동 태깅(classifyProductOhaeng)이 같은 값을 쓴다 —
 *  두 벌로 두면 "추천 리스트엔 없는데 오행 더보기엔 뜨는 꽃"이 생긴다. */
export const OHAENG_RELEVANCE_MIN = 20

export interface OhaengProfileInput {
  name?: string | null
  category?: string | null
  colorTags?: string[]
  seasonTags?: string[]
  description?: string | null
}

// ── 추천 이유 문구 ────────────────────────────────────────────
const COLOR_HINT: Record<Ohaeng, string> = { 목: "초록", 화: "붉은", 토: "노란", 금: "흰", 수: "푸른" }
const SEASON_HINT: Record<Ohaeng, string> = {
  목: "봄 개화", 화: "여름 개화", 금: "가을 개화", 수: "겨울 개화", 토: "연중 상시성",
}

/** "왜 이 꽃이 그 오행인가" 한 줄 — 그 오행 점수에 크게 기여한 축을 최대 2개까지.
 *  기여가 전혀 없으면 빈 문자열. 점수 계산과 같은 축 함수를 그대로 쓰므로 설명이 점수와 어긋나지 않는다. */
export function explainOhaeng(input: OhaengProfileInput, target: Ohaeng): string {
  const name = input.name ?? ""
  const formText = [input.name, input.category, input.description].filter(Boolean).join(" ")
  const color = colorAxis(name, input.colorTags ?? [])
  const form = formAxis(formText)
  const season = seasonAxis(name, input.seasonTags ?? [])

  // 형태는 근거가 되는 특성 이름을 그대로 보여준다 (예: 큰꽃송이, 둥근형태).
  // formAxis와 같은 텍스트를 훑어야 한다 — 상품명에 꽃 종이 없고 설명에만 있는 경우가 흔하다.
  const topTrait = formTraitsIn(formText)
    .filter((t) => FORM_TRAITS[t].ohaeng === target)
    .sort((a, b) => FORM_TRAITS[b].points - FORM_TRAITS[a].points)[0]

  // 비수기(10) 수준의 미미한 기여를 "개화"라고 부르면 거짓말이 된다 — 주/보조 개화기만 근거로 삼는다.
  const seasonWeight = season[target] >= BLOOM.보조 / 100 ? season[target] * PROFILE_WEIGHT.season : 0

  return [
    { weight: color[target] * PROFILE_WEIGHT.color, text: `${COLOR_HINT[target]} 색감` },
    { weight: topTrait ? form[target] * PROFILE_WEIGHT.form : 0, text: topTrait ?? "" },
    { weight: seasonWeight, text: SEASON_HINT[target] },
  ]
    .filter((p) => p.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((p) => p.text)
    .join(" · ")
}

/** 오행별 0~100 절대점수 프로필. 합이 100이 아니며, 한 꽃이 여러 오행에 높을 수 있다. */
export function flowerOhaengProfile(input: OhaengProfileInput): Record<Ohaeng, number> {
  const color = colorAxis(input.name ?? "", input.colorTags ?? [])
  const form = formAxis([input.name, input.category, input.description].filter(Boolean).join(" "))
  const season = seasonAxis(input.name ?? "", input.seasonTags ?? [])

  const result = {} as Record<Ohaeng, number>
  for (const o of OHAENG_ORDER) {
    result[o] = Math.round(
      100 * (color[o] * PROFILE_WEIGHT.color + form[o] * PROFILE_WEIGHT.form + season[o] * PROFILE_WEIGHT.season),
    )
  }
  return result
}

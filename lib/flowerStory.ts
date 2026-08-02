// 꽃말 기반 추천 스토리텔링 — "왜 이 꽃이 당신에게 어울리는가"를 2~3문장으로 서술한다.
//
// 점수 근거(buildReasons)와 역할이 다르다. 근거 카드는 점수식에 실제로 기여한 항만 보여주는 반면,
// 여기서는 꽃말도 쓴다 — ohaengProfile 헤더가 명시한 대로 꽃말은 점수에서 제외하되
// "추천 이유/감성 스토리" 용도로는 쓰기로 되어 있는 축이다.
import type { Ohaeng } from "./saju"
import { OHAENG_PROFILE } from "./saju"
import {
  FORM_TRAITS, FORM_TRAIT_LABEL, formTraitsIn, flowerSpeciesKey, flowerColorWord,
  normalizeColorTag, type OhaengProfileInput,
} from "./ohaengProfile"
import kioskFlowers from "./kiosk/kioskFlowers.json"
import flowerMeaningData from "./kiosk/flowerMeanings.json"

const OHAENG_HANJA: Record<Ohaeng, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" }

/** 표준 색 대표어 → 꽃말 사전의 영문 색 키 */
const COLOR_TO_EN: Record<string, string> = {
  레드: "red", 옐로: "yellow", 그린: "green", 블루: "blue",
  화이트: "white", 오렌지: "orange", 퍼플: "purple", 핑크: "pink",
}

// 한글 종 키(라벤더) ↔ 영문 species(lavender) 브리지.
// 손으로 테이블을 쓰지 않고 kioskFlowers의 name+species 쌍에서 유도한다 — 데이터가 늘면 자동으로 따라온다.
const SPECIES_BY_KOREAN: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const flower of kioskFlowers.flowers as { name?: string; species?: string }[]) {
    if (!flower.name || !flower.species) continue
    // 큐레이션 종 키(장미)와 사전 이름 그대로(브리오니아) 둘 다 등록한다.
    // 후자가 없으면 판매하지 않는 야생화 탄생화의 꽃말을 못 찾는다.
    const korean = flowerSpeciesKey(flower.name)
    if (korean && !map[korean]) map[korean] = flower.species
    if (!map[flower.name]) map[flower.name] = flower.species
  }
  return map
})()

const MEANINGS = flowerMeaningData.meanings as { species: string; color: string; meaning: string }[]

/** 꽃말 조회 — 같은 종이라도 색마다 꽃말이 다르므로 색을 먼저 맞춰보고, 없으면 그 종의 아무 색이나.
 *  이름 전체("노란 튤립")를 넘겨도 종 키로 해석한다. 색은 한글·영어 표기 모두 받는다. */
export function lookupFlowerMeaning(koreanName: string | null, colorTag: string | null): string | null {
  if (!koreanName) return null
  const species = SPECIES_BY_KOREAN[flowerSpeciesKey(koreanName) ?? koreanName]
  if (!species) return null
  const canon = colorTag ? normalizeColorTag(colorTag) : null
  const en = canon ? COLOR_TO_EN[canon] : null
  return (
    (en && MEANINGS.find((m) => m.species === species && m.color === en)?.meaning) ||
    MEANINGS.find((m) => m.species === species)?.meaning ||
    null
  )
}

/** 받침 여부 — 조사를 자연스럽게 붙이기 위해. */
function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}

const josa = (word: string, withBatchim: string, without: string) =>
  `${word}${hasBatchim(word) ? withBatchim : without}`

const ohaengWord = (o: Ohaeng) => `${o}(${OHAENG_HANJA[o]})`

export interface FlowerStoryInput extends OhaengProfileInput {
  /** DB에 값이 있으면 사전보다 우선한다 (판매자가 직접 쓴 문구) */
  flowerMeaning?: string | null
}

/** 추천 스토리 2~3문장. 재료가 없으면 그 문장을 통째로 건너뛴다 — 빈칸이 보이는 문장은 만들지 않는다. */
export function flowerStory(
  input: FlowerStoryInput,
  target: Ohaeng,
  opts: { lacking?: Ohaeng | null; excess?: Ohaeng | null } = {},
): string[] {
  const name = input.name ?? ""
  const species = flowerSpeciesKey(name) ?? name.trim()
  if (!species) return []

  const colorWord = flowerColorWord(name, input.colorTags ?? [])
  const canonColor =
    normalizeColorTag(name) ?? (input.colorTags ?? []).map((t) => normalizeColorTag(t)).find(Boolean) ?? null

  const topTrait = formTraitsIn([input.name, input.category, input.description].filter(Boolean).join(" "))
    .filter((t) => FORM_TRAITS[t].ohaeng === target)
    // 색을 이미 말했는데 "흰빛과 새하얀 꽃빛"처럼 같은 말을 두 번 하지 않는다
    .filter((t) => !(t === "흰꽃" && colorWord === "흰"))
    .sort((a, b) => FORM_TRAITS[b].points - FORM_TRAITS[a].points)[0]

  const sentences: string[] = []

  // 1. 이 꽃이 어떤 꽃인가
  const traits = [
    colorWord ? `${colorWord}빛` : null,
    topTrait ? FORM_TRAIT_LABEL[topTrait] : null,
  ].filter(Boolean) as string[]
  sentences.push(
    traits.length > 0
      ? `${josa(species, "은", "는")} ${traits.join("과 ")}${hasBatchim(traits[traits.length - 1]) ? "을" : "를"} 가진 ${ohaengWord(target)} 기운의 꽃입니다.`
      : `${josa(species, "은", "는")} ${ohaengWord(target)} 기운의 꽃입니다.`,
  )

  // 2. 꽃말 — 서술형("당신만 바라봐요")이 섞여 있어 반드시 따옴표로 감싼다
  const meaning = input.flowerMeaning?.trim() || lookupFlowerMeaning(flowerSpeciesKey(name), canonColor)
  if (meaning) {
    const [k0, k1] = OHAENG_PROFILE[target].keywords
    const keywords = k1 ? `${josa(k0, "과", "와")} ${k1}` : k0
    // 인용격 조사는 따옴표 안 마지막 글자의 받침을 따른다 — '사랑'이라는 / '바라봐요'라는
    sentences.push(
      `'${meaning}'${hasBatchim(meaning) ? "이" : ""}라는 꽃말을 가지고 있어 ${keywords}${hasBatchim(keywords) ? "이" : ""}라는 의미도 더했습니다.`,
    )
  }

  // 3. 나에게 왜 맞는가
  const subject = colorWord ? `${colorWord}빛 ${species}` : species
  const { lacking, excess } = opts
  if (lacking && excess && lacking !== excess) {
    sentences.push(
      `${josa(subject, "은", "는")} 당신에게 부족한 ${ohaengWord(lacking)} 기운을 채우면서, 이미 넉넉한 ${ohaengWord(excess)} 기운은 더 키우지 않아 오행의 균형을 잡아줍니다.`,
    )
  } else if (lacking) {
    sentences.push(`${josa(subject, "은", "는")} 당신에게 부족한 ${ohaengWord(lacking)} 기운을 채워줍니다.`)
  }

  return sentences
}

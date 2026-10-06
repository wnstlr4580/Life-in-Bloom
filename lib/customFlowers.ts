// 커스텀 꽃다발 구성 데이터 — 커스텀 페이지와 후기 갤러리가 함께 사용
import { flowerOhaengProfile } from "./ohaengProfile"

export const SIZES = [
  { id: "mini",  name: "미니",  emoji: "🌷", stems: 7,  mainStems: 4,  maxAdditional: 3,  maxVarieties: 2, widthCm: "15~20", desc: "폭 15~20cm · 최대 약 7대",  engVolume: "tiny petite hand-tied bouquet with only a few stems, minimal and delicate, small enough to hold in one hand" },
  { id: "basic", name: "기본",  emoji: "💐", stems: 12, mainStems: 6,  maxAdditional: 6,  maxVarieties: 3, widthCm: "20~25", desc: "폭 20~25cm · 최대 약 12대", engVolume: "medium-sized hand-tied bouquet with moderate fullness, classic everyday bouquet size" },
  { id: "full",  name: "풍성",  emoji: "🌸", stems: 18, mainStems: 9,  maxAdditional: 9,  maxVarieties: 4, widthCm: "25~32", desc: "폭 25~32cm · 최대 약 18대", engVolume: "large lush full bouquet with abundant blooms densely packed, voluminous and impressive" },
  { id: "large", name: "대형",  emoji: "🌺", stems: 25, mainStems: 12, maxAdditional: 13, maxVarieties: 5, widthCm: "32~40", desc: "폭 32~40cm · 최대 약 25대", engVolume: "grand oversized premium bouquet with dramatic volume, extremely full and lavish with blooms overflowing" },
]

const RAW_FLOWERS = [
  // 장미
  { id: "rose-red",             group: "장미",     name: "빨간 장미",   engDesc: "red roses with deep velvety petals",                            emoji: "🌹", img: "/flowers/red_rose.jpg",               color: "red",    price: 3000 },
  { id: "rose-pink",            group: "장미",     name: "핑크 장미",   engDesc: "soft pink roses with delicate petals",                          emoji: "🌸", img: "/flowers/pink_rose.jpg",              color: "pink",   price: 3000 },
  { id: "rose-white",           group: "장미",     name: "흰 장미",     engDesc: "white roses with pure pristine petals",                         emoji: "🤍", img: "/flowers/white_rose.jpg",             color: "white",  price: 3000 },
  { id: "rose-yellow",          group: "장미",     name: "노란 장미",   engDesc: "bright yellow roses with cheerful petals",                      emoji: "💛", img: "/flowers/yellow_rose.jpg",            color: "yellow", price: 3000 },
  // 튤립
  { id: "tulip-pink",           group: "튤립",     name: "핑크 튤립",   engDesc: "pink tulips with smooth cup-shaped blooms",                     emoji: "🌷", img: "/flowers/pink_tulip.jpg",             color: "pink",   price: 2500 },
  { id: "tulip-white",          group: "튤립",     name: "흰 튤립",     engDesc: "white tulips with elegant cup-shaped blooms",                   emoji: "🤍", img: "/flowers/white_tulip.jpg",            color: "white",  price: 2500 },
  { id: "tulip-purple",         group: "튤립",     name: "보라 튤립",   engDesc: "purple tulips with rich velvety cup-shaped blooms",             emoji: "💜", img: "/flowers/purple_tulip.jpg",           color: "purple", price: 2500 },
  { id: "tulip-orange",         group: "튤립",     name: "주황 튤립",   engDesc: "orange tulips with vibrant warm cup-shaped blooms",             emoji: "🧡", img: "/flowers/orange_tulip.jpg",           color: "orange", price: 2500 },
  { id: "tulip-yellow",         group: "튤립",     name: "노란 튤립",   engDesc: "yellow tulips with bright sunny cup-shaped blooms",             emoji: "💛", img: "/flowers/yellow_tulip.jpg",           color: "yellow", price: 2500 },
  // 백합
  { id: "lily-white",           group: "백합",     name: "흰 백합",     engDesc: "white oriental lilies with large open blooms",                  emoji: "🤍", img: "/flowers/white_lily.jpg",             color: "white",  price: 3500 },
  { id: "lily-pink",            group: "백합",     name: "핑크 백합",   engDesc: "pink oriental lilies with large open blooms",                   emoji: "🌸", img: "/flowers/pink_lily.jpg",              color: "pink",   price: 3500 },
  // 수국
  { id: "hydrangea-blue",       group: "수국",     name: "파란 수국",   engDesc: "blue hydrangea clusters with tiny mophead florets",             emoji: "💙", img: "/flowers/blue_hydrangea.jpg",         color: "blue",   price: 4000 },
  { id: "hydrangea-pink",       group: "수국",     name: "핑크 수국",   engDesc: "pink hydrangea clusters with soft mophead florets",             emoji: "🌸", img: "/flowers/pink_hydrangea.jpg",         color: "pink",   price: 4000 },
  // 카네이션
  { id: "carnation-pink",       group: "카네이션", name: "핑크 카네이션", engDesc: "pink carnations with ruffled fringed petals",                 emoji: "🌸", img: "/flowers/pink_carnation.jpg",         color: "pink",   price: 2000 },
  { id: "carnation-red",        group: "카네이션", name: "빨간 카네이션", engDesc: "red carnations with ruffled fringed petals",                  emoji: "🌹", img: "/flowers/red_carnation.jpg",          color: "red",    price: 2000 },
  { id: "carnation-purple",     group: "카네이션", name: "보라 카네이션", engDesc: "purple carnations with ruffled fringed petals",               emoji: "💜", img: "/flowers/purple_carnation.jpg",       color: "purple", price: 2000 },
  { id: "carnation-white",      group: "카네이션", name: "흰 카네이션",  engDesc: "white carnations with ruffled fringed petals",                 emoji: "🤍", img: "/flowers/white_carnation.jpg",        color: "white",  price: 2000 },
  // 작약
  { id: "peony-pink",           group: "작약",     name: "핑크 작약",   engDesc: "pink peonies with lush full ruffled blooms",                    emoji: "🌸", img: "/flowers/pink_paeonia.jpg",           color: "pink",   price: 5000 },
  { id: "peony-red",            group: "작약",     name: "빨간 작약",   engDesc: "red peonies with lush full ruffled blooms",                     emoji: "🌹", img: "/flowers/red_paeonia.jpg",            color: "red",    price: 5000 },
  { id: "peony-purple",         group: "작약",     name: "보라 작약",   engDesc: "purple peonies with lush full ruffled blooms",                  emoji: "💜", img: "/flowers/purple_paeonia.jpg",         color: "purple", price: 5000 },
  { id: "peony-white",          group: "작약",     name: "흰 작약",     engDesc: "white peonies with lush full ruffled blooms",                   emoji: "🤍", img: "/flowers/white_paeonia.jpg",          color: "white",  price: 5000 },
  { id: "peony-orange",         group: "작약",     name: "주황 작약",   engDesc: "orange peonies with lush full ruffled blooms",                  emoji: "🧡", img: "/flowers/orange_paeonia.jpg",         color: "orange", price: 5000 },
  // 거베라
  { id: "gerbera-orange",       group: "거베라",   name: "주황 거베라",  engDesc: "bright orange gerbera daisies with bold circular blooms",       emoji: "🧡", img: "/flowers/orange_gerbera.jpg",         color: "orange", price: 2500 },
  { id: "gerbera-pink",         group: "거베라",   name: "핑크 거베라",  engDesc: "pink gerbera daisies with bold circular blooms",                emoji: "🌸", img: "/flowers/pink_gerbera.jpg",           color: "pink",   price: 2500 },
  { id: "gerbera-red",          group: "거베라",   name: "빨간 거베라",  engDesc: "red gerbera daisies with bold circular blooms",                 emoji: "🌹", img: "/flowers/red_gerbera.jpg",            color: "red",    price: 2500 },
  { id: "gerbera-yellow",       group: "거베라",   name: "노란 거베라",  engDesc: "yellow gerbera daisies with bold circular blooms",              emoji: "💛", img: "/flowers/yellow_gerbera.jpg",         color: "yellow", price: 2500 },
  // 아네모네
  { id: "anemone-blue",         group: "아네모네", name: "파란 아네모네", engDesc: "blue anemones with dark button centers and silky petals",      emoji: "💙", img: "/flowers/blue_anemone.jpg",           color: "blue",   price: 3000 },
  { id: "anemone-pink",         group: "아네모네", name: "핑크 아네모네", engDesc: "pink anemones with dark button centers and silky petals",      emoji: "🌸", img: "/flowers/pink_anemone.jpg",           color: "pink",   price: 3000 },
  { id: "anemone-purple",       group: "아네모네", name: "보라 아네모네", engDesc: "purple anemones with dark button centers and silky petals",    emoji: "💜", img: "/flowers/purple_anemone.jpg",         color: "purple", price: 3000 },
  { id: "anemone-red",          group: "아네모네", name: "빨간 아네모네", engDesc: "red anemones with dark button centers and silky petals",       emoji: "🌹", img: "/flowers/red_anemone.jpg",            color: "red",    price: 3000 },
  // 국화
  { id: "mum-white",            group: "국화",     name: "흰 국화",     engDesc: "white chrysanthemums with layered petals",                      emoji: "🤍", img: "/flowers/white_mum.jpg",              color: "white",  price: 2000 },
  { id: "mum-pink",             group: "국화",     name: "핑크 국화",   engDesc: "pink chrysanthemums with layered petals",                       emoji: "🌸", img: "/flowers/pink_mum.jpg",               color: "pink",   price: 2000 },
  { id: "mum-yellow",           group: "국화",     name: "노란 국화",   engDesc: "yellow chrysanthemums with layered petals",                     emoji: "💛", img: "/flowers/yellow_mum.jpg",             color: "yellow", price: 2000 },
  // 스위트피
  { id: "sweetpea-pink",        group: "스위트피", name: "핑크 스위트피", engDesc: "pink sweet pea flowers with delicate butterfly-shaped petals", emoji: "🌸", img: "/flowers/pink_sweatpea.jpg",          color: "pink",   price: 2500 },
  { id: "sweetpea-white",       group: "스위트피", name: "흰 스위트피",  engDesc: "white sweet pea flowers with delicate butterfly-shaped petals", emoji: "🤍", img: "/flowers/white_sweatpea.jpg",         color: "white",  price: 2500 },
  // 안개꽃
  { id: "babysbreath-white",    group: "안개꽃",   name: "흰 안개꽃",   engDesc: "white baby's breath with tiny cloud-like clusters",             emoji: "🤍", img: "/flowers/white_baby%27s_breath.jpg",  color: "white",  price: 1500 },
  { id: "babysbreath-pink",     group: "안개꽃",   name: "핑크 안개꽃", engDesc: "pink baby's breath with tiny cloud-like clusters",              emoji: "🌸", img: "/flowers/pink_baby%27s_breath.jpg",   color: "pink",   price: 1500 },
  { id: "babysbreath-purple",   group: "안개꽃",   name: "보라 안개꽃", engDesc: "purple baby's breath with tiny cloud-like clusters",            emoji: "💜", img: "/flowers/purple_baby%27s_breath.jpg", color: "purple", price: 1500 },
  // 칼라
  { id: "calla-pink",           group: "칼라",     name: "핑크 칼라",   engDesc: "pink calla lilies with elegant trumpet-shaped blooms",          emoji: "🌸", img: "/flowers/pink_calla.jpg",             color: "pink",   price: 3500 },
  { id: "calla-red",            group: "칼라",     name: "빨간 칼라",   engDesc: "red calla lilies with elegant trumpet-shaped blooms",           emoji: "🌹", img: "/flowers/red_calla.jpg",              color: "red",    price: 3500 },
  { id: "calla-white",          group: "칼라",     name: "흰 칼라",     engDesc: "white calla lilies with elegant trumpet-shaped blooms",         emoji: "🤍", img: "/flowers/white_calla.jpg",            color: "white",  price: 3500 },
  // 단일 색 꽃
  { id: "sunflower",            group: "해바라기", name: "해바라기",    engDesc: "bright yellow sunflowers with dark centers",                    emoji: "🌻", img: "/flowers/yellow_sunflower.jpg",       color: "yellow", price: 2000 },
  { id: "lavender",             group: "라벤더",   name: "라벤더",      engDesc: "purple lavender sprigs with delicate florets",                  emoji: "💜", img: "/flowers/purple_lavender.jpg",        color: "purple", price: 2500 },
  { id: "daisy",                group: "데이지",   name: "데이지",      engDesc: "white daisy flowers with yellow button centers",                emoji: "🌼", img: "/flowers/white_daisy.jpg",            color: "white",  price: 1500 },
  { id: "freesia",              group: "프리지아", name: "프리지아",    engDesc: "yellow freesia with fragrant tubular blooms",                   emoji: "🌼", img: "/flowers/yellow_freesia.jpg",         color: "yellow", price: 2000 },
  { id: "chamomile",            group: "카모마일", name: "카모마일",    engDesc: "white chamomile flowers with yellow centers and daisy-like petals", emoji: "🌼", img: "/flowers/white_chamomile.jpg",     color: "white",  price: 1500 },
  { id: "eucalyptus",           group: "유칼립투스", name: "유칼립투스", engDesc: "green eucalyptus sprigs with silvery round leaves",            emoji: "🌿", img: "/flowers/green_eucalyptus.jpg",       color: "green",  price: 2000 },
  // 확충 17종(사주 추천 후보 폭 확대용) — 사진(AI 생성 초안, 워터마크 있음)·가격을 갖춰 정식 주문 목록에
  // 편입했다. 가격은 실제 시세 조사 전 임시값이다. lib/flowerCatalog.ts가 더는 이 종들을 별도
  // "확충 전용(주문 불가)" 항목으로 다루지 않는다 — FLOWERS에 있으면 전부 주문 가능이다.
  // 달리아
  { id: "dahlia-red",           group: "달리아",   name: "빨간 달리아",   engDesc: "red dahlias with large round layered petals in a spiral pattern",         emoji: "🌹", img: "/flowers/red_dahlia.jpg",       color: "red",    price: 3000 },
  { id: "dahlia-pink",          group: "달리아",   name: "핑크 달리아",   engDesc: "pink dahlias with large round layered petals in a spiral pattern",        emoji: "🌸", img: "/flowers/pink_dahlia.jpg",      color: "pink",   price: 3000 },
  { id: "dahlia-white",         group: "달리아",   name: "흰 달리아",     engDesc: "white dahlias with large round layered petals in a spiral pattern",       emoji: "🤍", img: "/flowers/white_dahlia.jpg",     color: "white",  price: 3000 },
  { id: "dahlia-yellow",        group: "달리아",   name: "노란 달리아",   engDesc: "yellow dahlias with large round layered petals in a spiral pattern",      emoji: "💛", img: "/flowers/yellow_dahlia.jpg",    color: "yellow", price: 3000 },
  // 백일홍
  { id: "zinnia-red",           group: "백일홍",   name: "빨간 백일홍",   engDesc: "red zinnias with round full ruffled blooms and many layered petals",      emoji: "🌹", img: "/flowers/red_zinnia.jpg",       color: "red",    price: 2000 },
  { id: "zinnia-pink",          group: "백일홍",   name: "핑크 백일홍",   engDesc: "pink zinnias with round full ruffled blooms and many layered petals",     emoji: "🌸", img: "/flowers/pink_zinnia.jpg",      color: "pink",   price: 2000 },
  { id: "zinnia-yellow",        group: "백일홍",   name: "노란 백일홍",   engDesc: "yellow zinnias with round full ruffled blooms and many layered petals",   emoji: "💛", img: "/flowers/yellow_zinnia.jpg",    color: "yellow", price: 2000 },
  // 과꽃
  { id: "aster-purple",         group: "과꽃",     name: "보라 과꽃",     engDesc: "purple China asters with daisy-like starburst blooms and slender petals", emoji: "💜", img: "/flowers/purple_aster.jpg",     color: "purple", price: 2000 },
  { id: "aster-pink",           group: "과꽃",     name: "핑크 과꽃",     engDesc: "pink China asters with daisy-like starburst blooms and slender petals",   emoji: "🌸", img: "/flowers/pink_aster.jpg",       color: "pink",   price: 2000 },
  { id: "aster-white",          group: "과꽃",     name: "흰 과꽃",       engDesc: "white China asters with daisy-like starburst blooms and slender petals",  emoji: "🤍", img: "/flowers/white_aster.jpg",      color: "white",  price: 2000 },
  // 용담
  { id: "gentian-blue",         group: "용담",     name: "파란 용담",     engDesc: "blue gentians with upright trumpet-shaped blooms in tight clusters",      emoji: "💙", img: "/flowers/blue_gentian.jpg",     color: "blue",   price: 2500 },
  { id: "gentian-purple",       group: "용담",     name: "보라 용담",     engDesc: "purple gentians with upright trumpet-shaped blooms in tight clusters",    emoji: "💜", img: "/flowers/purple_gentian.jpg",   color: "purple", price: 2500 },
  // 목화
  { id: "cotton-white",         group: "목화",     name: "흰 목화",       engDesc: "cotton bolls with fluffy round tufts on woody stems",                     emoji: "🤍", img: "/flowers/white_cotton.jpg",     color: "white",  price: 2500 },
  // 에린지움
  { id: "eryngium-blue",        group: "에린지움", name: "파란 에린지움", engDesc: "eryngium sea holly with spiky thistle-like blooms and pointed bracts",    emoji: "💙", img: "/flowers/blue_eryngium.jpg",    color: "blue",   price: 2500 },
  // 동백
  { id: "camellia-red",         group: "동백",     name: "빨간 동백",     engDesc: "red camellias with large glossy round blooms and waxy petals",           emoji: "🌹", img: "/flowers/red_camellia.jpg",     color: "red",    price: 3500 },
  { id: "camellia-pink",        group: "동백",     name: "핑크 동백",     engDesc: "pink camellias with large glossy round blooms and waxy petals",          emoji: "🌸", img: "/flowers/pink_camellia.jpg",    color: "pink",   price: 3500 },
  { id: "camellia-white",       group: "동백",     name: "흰 동백",       engDesc: "white camellias with large glossy round blooms and waxy petals",         emoji: "🤍", img: "/flowers/white_camellia.jpg",   color: "white",  price: 3500 },
  // 시클라멘
  { id: "cyclamen-red",         group: "시클라멘", name: "빨간 시클라멘", engDesc: "potted red cyclamen flowers with swept-back petals on slender curving stems", emoji: "🌹", img: "/flowers/red_cyclamen.jpg",   color: "red",    price: 2500 },
  { id: "cyclamen-pink",        group: "시클라멘", name: "핑크 시클라멘", engDesc: "potted pink cyclamen flowers with swept-back petals on slender curving stems", emoji: "🌸", img: "/flowers/pink_cyclamen.jpg",  color: "pink",   price: 2500 },
  { id: "cyclamen-white",       group: "시클라멘", name: "흰 시클라멘",   engDesc: "potted white cyclamen flowers with swept-back petals on slender curving stems", emoji: "🤍", img: "/flowers/white_cyclamen.jpg", color: "white",  price: 2500 },
  // 크리스마스로즈
  { id: "hellebore-white",      group: "크리스마스로즈", name: "흰 크리스마스로즈", engDesc: "white hellebores with nodding cup-shaped blooms on gentle curving stems",  emoji: "🤍", img: "/flowers/white_hellebore.jpg",  color: "white",  price: 3000 },
  { id: "hellebore-purple",     group: "크리스마스로즈", name: "보라 크리스마스로즈", engDesc: "purple hellebores with nodding cup-shaped blooms on gentle curving stems", emoji: "💜", img: "/flowers/purple_hellebore.jpg", color: "purple", price: 3000 },
  // 매화
  { id: "plum-white",           group: "매화",     name: "흰 매화",       engDesc: "white plum blossoms on bare branches with small delicate five-petaled flowers", emoji: "🤍", img: "/flowers/white_plum.jpg",     color: "white",  price: 2500 },
  { id: "plum-pink",            group: "매화",     name: "핑크 매화",     engDesc: "pink plum blossoms on bare branches with small delicate five-petaled flowers",  emoji: "🌸", img: "/flowers/pink_plum.jpg",      color: "pink",   price: 2500 },
  // 수선화
  { id: "narcissus-yellow",     group: "수선화",   name: "노란 수선화",   engDesc: "yellow narcissus flowers with trumpet-shaped centers and star-shaped petals", emoji: "💛", img: "/flowers/yellow_narcissus.jpg", color: "yellow", price: 2000 },
  { id: "narcissus-white",      group: "수선화",   name: "흰 수선화",     engDesc: "white narcissus flowers with trumpet-shaped centers and star-shaped petals",  emoji: "🤍", img: "/flowers/white_narcissus.jpg",  color: "white",  price: 2000 },
  // 아이리스
  { id: "iris-purple",          group: "아이리스", name: "보라 아이리스", engDesc: "purple irises with tall elegant blooms and long slender drooping petals", emoji: "💜", img: "/flowers/purple_iris.jpg",      color: "purple", price: 2500 },
  { id: "iris-blue",            group: "아이리스", name: "파란 아이리스", engDesc: "blue irises with tall elegant blooms and long slender drooping petals",   emoji: "💙", img: "/flowers/blue_iris.jpg",        color: "blue",   price: 2500 },
  { id: "iris-white",           group: "아이리스", name: "흰 아이리스",   engDesc: "white irises with tall elegant blooms and long slender drooping petals",  emoji: "🤍", img: "/flowers/white_iris.jpg",       color: "white",  price: 2500 },
  // 히아신스
  { id: "hyacinth-purple",      group: "히아신스", name: "보라 히아신스", engDesc: "purple hyacinths with dense spikes of small tightly clustered star-shaped florets", emoji: "💜", img: "/flowers/purple_hyacinth.jpg", color: "purple", price: 2000 },
  { id: "hyacinth-pink",        group: "히아신스", name: "핑크 히아신스", engDesc: "pink hyacinths with dense spikes of small tightly clustered star-shaped florets",   emoji: "🌸", img: "/flowers/pink_hyacinth.jpg",   color: "pink",   price: 2000 },
  { id: "hyacinth-white",       group: "히아신스", name: "흰 히아신스",   engDesc: "white hyacinths with dense spikes of small tightly clustered star-shaped florets",  emoji: "🤍", img: "/flowers/white_hyacinth.jpg",  color: "white",  price: 2000 },
  // 라일락
  { id: "lilac-purple",         group: "라일락",   name: "보라 라일락",   engDesc: "purple lilacs with clusters of tiny fragrant florets on full branching stems", emoji: "💜", img: "/flowers/purple_lilac.jpg",     color: "purple", price: 3000 },
  { id: "lilac-white",          group: "라일락",   name: "흰 라일락",     engDesc: "white lilacs with clusters of tiny fragrant florets on full branching stems",  emoji: "🤍", img: "/flowers/white_lilac.jpg",      color: "white",  price: 3000 },
  // 미모사
  { id: "mimosa-yellow",        group: "미모사",   name: "노란 미모사",   engDesc: "yellow mimosa sprigs with fluffy round pompom-like blooms and feathery leaves", emoji: "💛", img: "/flowers/yellow_mimosa.jpg",   color: "yellow", price: 2000 },
  // 글라디올러스
  { id: "gladiolus-red",        group: "글라디올러스", name: "빨간 글라디올러스", engDesc: "red gladiolus spikes with tall upright ruffled blooms stacked along the stem",   emoji: "🌹", img: "/flowers/red_gladiolus.jpg",   color: "red",    price: 2500 },
  { id: "gladiolus-pink",       group: "글라디올러스", name: "핑크 글라디올러스", engDesc: "pink gladiolus spikes with tall upright ruffled blooms stacked along the stem",  emoji: "🌸", img: "/flowers/pink_gladiolus.jpg",  color: "pink",   price: 2500 },
  { id: "gladiolus-white",      group: "글라디올러스", name: "흰 글라디올러스",   engDesc: "white gladiolus spikes with tall upright ruffled blooms stacked along the stem", emoji: "🤍", img: "/flowers/white_gladiolus.jpg", color: "white",  price: 2500 },
  // 금어초
  { id: "snapdragon-yellow",    group: "금어초",   name: "노란 금어초",   engDesc: "yellow snapdragons with tall upright spikes of dragon-mouth shaped blooms", emoji: "💛", img: "/flowers/yellow_snapdragon.jpg", color: "yellow", price: 2000 },
  { id: "snapdragon-pink",      group: "금어초",   name: "핑크 금어초",   engDesc: "pink snapdragons with tall upright spikes of dragon-mouth shaped blooms",   emoji: "🌸", img: "/flowers/pink_snapdragon.jpg",   color: "pink",   price: 2000 },
  { id: "snapdragon-white",     group: "금어초",   name: "흰 금어초",     engDesc: "white snapdragons with tall upright spikes of dragon-mouth shaped blooms",  emoji: "🤍", img: "/flowers/white_snapdragon.jpg",  color: "white",  price: 2000 },
]

// 오행은 리터럴이 아니라 파생값이다 — 색·형태·계절 프로필(flowerOhaengProfile) 하나에서 계산한다.
// 예전에는 항목마다 손으로 적혀 있어서 같은 꽃이 화면마다 다른 오행으로 보였다
// (흰 데이지가 여기서는 토, 사주 추천에서는 금).
//
// 대표 오행은 프로필 최고점 하나다. 임계(20) 이상을 모두 인정하면 47종 중 목 35·화 39가 걸리고
// 카네이션·거베라는 5개 오행 전부 통과해서 오행 칩이 필터 기능을 잃는다.
// 상품 태깅(classifyProductOhaeng)이 공동 1위 2개를 주는 것과 다른 이유가 이것이다 —
// 같은 프로필에서 파생하되 화면이 요구하는 개수가 다르다.
const OHAENG_ORDER = ["목", "화", "토", "금", "수"] as const

export const FLOWERS = RAW_FLOWERS.map((flower) => {
  const profile = flowerOhaengProfile({ name: flower.name, colorTags: [flower.color] })
  const ohaeng = OHAENG_ORDER.reduce((a, b) => (profile[b] > profile[a] ? b : a))
  return { ...flower, ohaeng, profile }
})

export const WRAPPING = [
  { id: "kraft",       name: "크라프트지",   emoji: "📦", price: 1500, desc: "자연스러운 갈색 종이로 감싸 소박하고 따뜻한 느낌을 줘요. 일상적인 선물이나 캐주얼한 분위기에 잘 어울려요.", engStyle: "lower half of bouquet wrapped in rustic brown kraft paper secured with natural twine bow at the stems" },
  { id: "cellophane",  name: "투명 셀로판",  emoji: "✨", price: 2000, desc: "꽃이 그대로 보이는 투명 필름으로 감싸요. 꽃의 색감과 형태를 가장 잘 살려주는 포장이에요.", engStyle: "flowers wrapped in transparent clear cellophane film tied with a thin satin ribbon, flowers fully visible through wrapping" },
  { id: "linen",       name: "린넨 천 포장", emoji: "🌿", price: 2500, desc: "부드러운 린넨 천으로 감싸 자연스럽고 세련된 분위기를 연출해요. 감성적인 선물에 제격이에요.", engStyle: "bouquet stems wrapped in natural beige linen fabric tied with a simple cotton ribbon" },
  { id: "newspaper",   name: "신문지 빈티지", emoji: "📰", price: 1500, desc: "빈티지 신문지로 감싸 레트로하고 개성 있는 감성을 표현해요. 독특한 분위기를 원하는 분께 추천해요.", engStyle: "bouquet wrapped in vintage newspaper pages secured with rustic twine string, retro style" },
  { id: "hanji",       name: "한지 포장",    emoji: "🏮", price: 3000, desc: "은은한 색감의 한지로 겹겹이 감싸 고급스럽고 전통적인 아름다움을 담아요. 특별한 날의 선물로 잘 어울려요.", engStyle: "bouquet wrapped in multiple layers of pastel-colored Korean hanji tissue paper in soft pink, mint, lavender, and cream tones, creating a ruffled layered paper wrapping with delicate texture, tied with a thin ribbon" },
  { id: "bouquet",     name: "부케 스타일",  emoji: "💍", price: 5000, desc: "웨딩 부케처럼 손잡이를 새틴 리본으로 단단히 감아요. 격식 있고 우아한 자리에서 빛나는 포장이에요.", engStyle: "professional wedding bouquet style, stems tightly bound with white satin ribbon wrapped spirally down the handle, elegant formal presentation" },
]

export const COLOR_FILTER = ["전체", "red", "pink", "white", "yellow", "purple", "orange", "blue", "green"]
export const COLOR_LABEL: Record<string, string> = {
  전체: "전체", red: "레드", pink: "핑크", white: "화이트",
  yellow: "옐로우", purple: "퍼플", orange: "오렌지", blue: "블루", green: "그린",
}

// AI 꽃다발 이미지 프롬프트. FLUX schnell은 프롬프트 앞부분(약 256토큰)만 반영하므로
// 크기·포장을 먼저 두고 꽃 목록은 짧게 쓴다. 부정 프롬프트를 지원하지 않아 금지어는 넣지 않는다.
export function buildBouquetPrompt(
  size: (typeof SIZES)[number],
  items: { flower: (typeof FLOWERS)[number]; count: number }[],
  wrapping: (typeof WRAPPING)[number],
) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const flowers = items.map(({ flower, count }) => `${count} ${flower.engDesc}`).join(", ")
  return [
    `Photorealistic product photo of one hand-tied flower bouquet: ${size.engVolume}.`,
    `${wrapping.engStyle}.`,
    `Contains only these flowers, exactly ${total} stems in total: ${flowers}.`,
    "Upright front three-quarter view, bouquet centered, plain warm beige studio background, soft daylight, sharp focus.",
  ].join(" ")
}

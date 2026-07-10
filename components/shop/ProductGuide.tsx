"use client"

// 상품 상세안내 — 꾸까 스타일의 안내 섹션 (소개 → 추천 순간 → 관리법 → 배송 → 교환·환불)
// 상품마다 글을 따로 쓰지 않고 카테고리·용도·오행 데이터로 자동 구성한다.

import Link from "next/link"

interface Props {
  name: string
  category: string
  description: string
  flowerMeaning: string | null
  ohaengTags?: string[]
  useTags?: string[] | null
}

const OHAENG_LINE: Record<string, string> = {
  목: "목(木) — 봄처럼 새로 시작하는 기운을 담은 꽃이에요. 성장과 도전이 필요한 분께 잘 어울려요.",
  화: "화(火) — 여름처럼 뜨거운 열정의 기운을 담은 꽃이에요. 활력이 필요한 분께 잘 어울려요.",
  토: "토(土) — 대지처럼 든든한 안정의 기운을 담은 꽃이에요. 편안함이 필요한 분께 잘 어울려요.",
  금: "금(金) — 가을처럼 맑은 결실의 기운을 담은 꽃이에요. 순수함과 완성이 필요한 분께 잘 어울려요.",
  수: "수(水) — 물처럼 깊은 지혜의 기운을 담은 꽃이에요. 차분함이 필요한 분께 잘 어울려요.",
}

const USE_LINE: Record<string, { emoji: string; text: string }> = {
  생일: { emoji: "🎂", text: "소중한 사람의 생일, 축하의 마음을 전할 때" },
  축하: { emoji: "🎉", text: "합격·승진·개업 등 기쁜 소식을 축하할 때" },
  개업: { emoji: "🏪", text: "새로운 시작을 응원하는 개업·이전 선물로" },
  결혼: { emoji: "💍", text: "프로포즈, 결혼 기념일 같은 특별한 순간에" },
  추모: { emoji: "🕊️", text: "고인을 기리며 정중한 마음을 전할 때" },
  감사: { emoji: "💐", text: "부모님, 선생님, 고마운 분께 마음을 전할 때" },
}

// 카테고리별 관리 방법
const CARE_GUIDE: Record<string, { title: string; steps: string[] }> = {
  bouquet: {
    title: "꽃다발, 이렇게 관리하면 더 오래가요",
    steps: [
      "받자마자 포장을 풀고, 줄기 끝을 사선으로 1~2cm 잘라주세요.",
      "깨끗한 물에 꽂아주세요. 물은 1~2일에 한 번 갈아주면 좋아요.",
      "직사광선, 에어컨·히터 바람이 닿는 곳은 피해주세요.",
      "시든 꽃잎은 바로 떼어내면 다른 꽃이 더 오래가요.",
      "밤에는 서늘한 곳(15도 안팎)에 두면 수명이 길어져요.",
    ],
  },
  plant: {
    title: "화분, 이렇게 키우면 건강하게 자라요",
    steps: [
      "겉흙이 말랐을 때 화분 아래로 물이 빠질 만큼 충분히 주세요.",
      "직사광선보다는 밝은 간접광이 드는 곳이 좋아요.",
      "바람이 잘 통하는 곳에 두면 병충해를 예방할 수 있어요.",
      "받침에 고인 물은 버려주세요. 뿌리가 썩는 걸 막아줘요.",
      "1~2년에 한 번 조금 더 큰 화분으로 옮겨 심어주면 좋아요.",
    ],
  },
  dried: {
    title: "드라이플라워, 이렇게 두면 오래 예뻐요",
    steps: [
      "물을 주지 마세요! 드라이플라워는 물이 닿으면 상해요.",
      "습기가 많은 곳(욕실, 주방)은 피해주세요.",
      "직사광선을 받으면 색이 바래니 그늘진 곳에 두세요.",
      "먼지가 쌓이면 드라이어 찬바람으로 살살 털어주세요.",
      "잘 관리하면 6개월~1년 이상 감상할 수 있어요.",
    ],
  },
  wreath: {
    title: "화환 주문 전 확인해주세요",
    steps: [
      "받는 곳(행사장·장례식장) 이름과 주소를 정확히 알려주세요.",
      "리본 문구(보내는 분 이름·축하/추모 문구)는 주문 시 메시지 카드에 적어주세요.",
      "행사 시작 2~3시간 전 도착을 기본으로 배송해 드려요.",
      "행사장 사정으로 반입이 어려운 경우가 있으니 미리 확인해주세요.",
    ],
  },
}

export function ProductGuide({ name, category, description, flowerMeaning, ohaengTags, useTags }: Props) {
  const care = CARE_GUIDE[category] ?? CARE_GUIDE.bouquet
  const uses = (useTags ?? []).filter((u) => USE_LINE[u])
  const ohaeng = (ohaengTags ?? []).find((o) => OHAENG_LINE[o])

  const sections = [
    { id: "guide-intro", label: "상품 이야기" },
    ...(uses.length > 0 ? [{ id: "guide-moment", label: "이런 순간에" }] : []),
    { id: "guide-care", label: "관리 방법" },
    { id: "guide-delivery", label: "배송 안내" },
    { id: "guide-refund", label: "교환·환불" },
  ]

  return (
    <div className="mt-16 max-w-3xl">
      {/* 섹션 이동 탭 */}
      <div className="flex gap-2 flex-wrap border-b border-stone-100 pb-3 mb-8">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-stone-50 text-stone-500 hover:bg-rose-50 hover:text-rose-500 transition-colors"
          >
            {s.label}
          </a>
        ))}
      </div>

      <div className="space-y-10">
        {/* 상품 이야기 */}
        <section id="guide-intro" className="scroll-mt-24">
          <h2 className="text-lg font-bold text-stone-800 mb-3">🌸 {name} 이야기</h2>
          <div className="bg-gradient-to-br from-rose-50/60 to-stone-50 rounded-2xl p-6 space-y-3">
            {flowerMeaning && (
              <p className="text-base font-semibold text-rose-500">
                &ldquo;{flowerMeaning}&rdquo;
              </p>
            )}
            <p className="text-sm text-stone-600 leading-relaxed">{description}</p>
            {ohaeng && (
              <p className="text-xs text-stone-500 leading-relaxed bg-white/70 rounded-xl px-4 py-3">
                🔮 {OHAENG_LINE[ohaeng]}
              </p>
            )}
          </div>
        </section>

        {/* 이런 순간에 좋아요 */}
        {uses.length > 0 && (
          <section id="guide-moment" className="scroll-mt-24">
            <h2 className="text-lg font-bold text-stone-800 mb-3">💝 이런 순간에 좋아요</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {uses.map((u) => (
                <div key={u} className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl px-4 py-3.5">
                  <span className="text-2xl shrink-0">{USE_LINE[u].emoji}</span>
                  <p className="text-sm text-stone-600">{USE_LINE[u].text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 관리 방법 */}
        <section id="guide-care" className="scroll-mt-24">
          <h2 className="text-lg font-bold text-stone-800 mb-3">🌿 {care.title}</h2>
          <ol className="space-y-2.5">
            {care.steps.map((step, i) => (
              <li key={i} className="flex gap-3 bg-white border border-stone-100 rounded-xl px-4 py-3.5">
                <span className="shrink-0 w-6 h-6 rounded-full bg-rose-50 text-rose-500 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm text-stone-600 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 배송 안내 */}
        <section id="guide-delivery" className="scroll-mt-24">
          <h2 className="text-lg font-bold text-stone-800 mb-3">🚚 배송 안내</h2>
          <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-2 text-sm text-stone-600">
            <p>· <span className="font-semibold text-stone-700">오전 11시 이전 주문</span> 시 당일 배송이 가능해요.</p>
            <p>· 결제할 때 <span className="font-semibold text-stone-700">받는 날짜와 시간대</span>를 고를 수 있어요. 기념일에 맞춰 보내드려요.</p>
            <p>· <span className="font-semibold text-stone-700">5만원 이상</span> 주문하면 일반 배송비가 무료예요.</p>
            <p>· 꽃이 시들지 않도록 보수 처리와 전용 포장으로 신선하게 배송해요.</p>
            <p>· 매장 픽업(서울 성수점)을 선택하면 배송비가 들지 않아요.</p>
          </div>
        </section>

        {/* 교환·환불 */}
        <section id="guide-refund" className="scroll-mt-24">
          <h2 className="text-lg font-bold text-stone-800 mb-3">↩️ 교환·환불 안내</h2>
          <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5 space-y-2 text-sm text-stone-600">
            <p>· 받은 상품이 사진과 다르거나 훼손됐다면, <span className="font-semibold text-stone-700">사진과 함께 고객센터로</span> 알려주세요. 바로 재배송 또는 전액 환불해 드려요.</p>
            <p>· 생화는 시간이 지나면 시드는 상품이라, <span className="font-semibold text-stone-700">제작이 시작된 후에는 단순 변심 취소가 어려워요.</span></p>
            <p>· 화분·드라이플라워는 받은 날부터 7일 안에 환불을 요청할 수 있어요. (상품 훼손이 없어야 해요)</p>
            <p className="pt-1">
              <Link href="/terms" className="text-rose-500 underline">이용약관에서 자세한 규정 보기</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

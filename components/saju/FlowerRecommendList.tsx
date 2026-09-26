"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { SajuFlower } from "@/types/saju"
import { flowerBuyHref, flowerBouquetHref } from "@/lib/sajuFlowerLink"

interface Props {
  title: string
  flowers: SajuFlower[]
  /** 지금 주문 가능한 꽃 id — 없으면 배지를 그리지 않는다(재고 조회 실패 포함) */
  availableIds?: Set<string>
}

export function FlowerRecommendList({ title, flowers, availableIds }: Props) {
  // 한 번에 한 장만 펼친다 — 4장이 동시에 늘어나면 그리드 높이가 폭발한다.
  const [openId, setOpenId] = useState<string | null>(null)

  if (flowers.length === 0) return null

  return (
    <div>
      <h3 className="text-base font-semibold text-stone-700 mb-3">{title}</h3>
      <div className="grid grid-cols-4 gap-2">
        {flowers.map((flower) => {
          const reasons = flower.reasons ?? []
          const open = openId === flower.id

          return (
            <div
              key={flower.id}
              className="bg-white rounded-xl border border-stone-100 hover:border-rose-200 hover:shadow-sm transition-all p-2"
            >
              {/* 카드 전체를 링크로 두지 않는다 — 목적지가 상품 검색·꽃다발 빌더로 갈리고,
                  빌더는 진입만으로 선택 상태가 세팅돼서 모르고 떨어지면 놀란다. */}
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-stone-50">
                {flower.img ? (
                  <Image
                    src={flower.img}
                    alt={flower.name}
                    fill
                    sizes="(max-width: 640px) 22vw, 140px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">{flower.emoji}</div>
                )}
                {availableIds?.has(flower.id) && (
                  <span
                    title="지금 살 수 있어요"
                    className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"
                  />
                )}
                <span className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm text-rose-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {flower.score}점
                </span>
              </div>

              <p className="text-xs font-medium text-stone-800 truncate mt-1.5">{flower.emoji} {flower.name}</p>
              {reasons[0] && (
                <p className="text-[10px] text-rose-400 truncate">{reasons[0].icon} {reasons[0].title}</p>
              )}

              <div className="mt-1.5 space-y-1">
                {flower.productCount > 0 ? (
                  <Link
                    href={flowerBuyHref(flower)}
                    className="block w-full text-center text-[10.5px] font-semibold rounded-md bg-rose-400 hover:bg-rose-500 text-white py-1 transition-colors"
                  >
                    🛒 사러가기
                  </Link>
                ) : (
                  // 만들기 버튼이 자리를 지키도록 자리만 차지하는 투명 placeholder
                  <div aria-hidden className="invisible text-[10.5px] py-1">.</div>
                )}
                <Link
                  href={flower.productCount > 0 ? flowerBouquetHref(flower) : flowerBuyHref(flower)}
                  className="block w-full text-center text-[10.5px] font-semibold rounded-md bg-white border border-rose-300 text-rose-500 hover:bg-rose-50 py-1 transition-colors"
                >
                  💐 만들기
                </Link>
              </div>

              {reasons.length > 1 && (
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : flower.id)}
                  className="mt-1.5 text-[9.5px] text-stone-400 hover:text-rose-400 transition-colors"
                >
                  근거 {reasons.length}개 {open ? "접기 ▴" : "보기 ▾"}
                </button>
              )}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  open ? "max-h-64 opacity-100 mt-1.5" : "max-h-0 opacity-0"
                }`}
              >
                <ul className="bg-stone-50/70 rounded-lg p-1.5 space-y-1.5">
                  {reasons.map((r, i) => (
                    <li key={i} className="flex gap-1 items-start">
                      <span className="text-xs leading-none mt-0.5">{r.icon}</span>
                      <div>
                        <p className="text-[10px] font-semibold text-stone-600 leading-tight">{r.title}</p>
                        <p className="text-[9px] text-stone-400 leading-tight">{r.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

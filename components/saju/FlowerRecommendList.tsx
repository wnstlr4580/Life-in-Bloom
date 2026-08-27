"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { SajuFlower } from "@/types/saju"
import { flowerBuyHref } from "@/lib/sajuFlowerLink"

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
      <div className="grid grid-cols-2 gap-3">
        {flowers.map((flower) => {
          const reasons = flower.reasons ?? []
          const open = openId === flower.id

          return (
            <div
              key={flower.id}
              className="bg-white rounded-xl overflow-hidden border border-stone-100 hover:border-rose-200 hover:shadow-md transition-all"
            >
              {/* 카드 전체를 링크로 두지 않는다 — 목적지가 상품 검색·꽃다발 빌더로 갈리고,
                  빌더는 진입만으로 선택 상태가 세팅돼서 모르고 떨어지면 놀란다. */}
              <div>
                <div className="aspect-square bg-stone-50 relative overflow-hidden">
                  {flower.img ? (
                    <Image
                      src={flower.img}
                      alt={flower.name}
                      fill
                      sizes="(max-width: 640px) 45vw, 240px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">{flower.emoji}</div>
                  )}
                  <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-rose-500 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {flower.score}점
                  </span>
                  {availableIds?.has(flower.id) && (
                    <span className="absolute top-2 left-2 bg-emerald-500/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      지금 살 수 있어요
                    </span>
                  )}
                </div>
                <div className="px-3 pt-3">
                  <p className="text-xs font-medium text-stone-800 line-clamp-1">{flower.emoji} {flower.name}</p>
                  {reasons[0] && (
                    <p className="text-[11px] text-rose-400 mt-0.5 line-clamp-1">
                      {reasons[0].icon} {reasons[0].title}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-3 pb-3 pt-2 space-y-2">
                <Link
                  href={flowerBuyHref(flower)}
                  className="block w-full text-center text-[11px] font-semibold rounded-lg bg-rose-400 hover:bg-rose-500 text-white py-1.5 transition-colors"
                >
                  {flower.productCount > 0 ? "🛒 이 꽃 사러가기" : "💐 이 꽃으로 꽃다발 만들기"}
                </Link>
                {reasons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : flower.id)}
                    className="text-[10px] text-stone-400 hover:text-rose-400 transition-colors"
                  >
                    추천 근거 {reasons.length}개 {open ? "접기 ▴" : "보기 ▾"}
                  </button>
                )}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    open ? "max-h-64 opacity-100 mt-2" : "max-h-0 opacity-0"
                  }`}
                >
                  <ul className="bg-stone-50/70 rounded-lg p-2 space-y-1.5">
                    {reasons.map((r, i) => (
                      <li key={i} className="flex gap-1.5 items-start">
                        <span className="text-sm leading-none mt-0.5">{r.icon}</span>
                        <div>
                          <p className="text-[11px] font-semibold text-stone-600">{r.title}</p>
                          <p className="text-[10px] text-stone-400 leading-tight">{r.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { SajuProduct } from "@/types/saju"

interface Props {
  title: string
  products: SajuProduct[]
}

export function FlowerRecommendList({ title, products }: Props) {
  // 한 번에 한 장만 펼친다 — 4장이 동시에 늘어나면 그리드 높이가 폭발한다.
  const [openId, setOpenId] = useState<string | null>(null)

  if (products.length === 0) return null

  return (
    <div>
      <h3 className="text-base font-semibold text-stone-700 mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => {
          const reasons = product.reasons ?? []
          const open = openId === product.id

          return (
            <div
              key={product.id}
              className="bg-white rounded-xl overflow-hidden border border-stone-100 hover:border-rose-200 hover:shadow-md transition-all"
            >
              <Link href={`/products/${product.id}`} className="group block">
                <div className="aspect-square bg-stone-50 relative overflow-hidden">
                  {product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 45vw, 240px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🌸</div>
                  )}
                  <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-rose-500 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {product.score}점
                  </span>
                </div>
                <div className="px-3 pt-3">
                  <p className="text-xs font-medium text-stone-800 line-clamp-1">{product.name}</p>
                  {reasons[0] && (
                    <p className="text-[11px] text-rose-400 mt-0.5 line-clamp-1">
                      {reasons[0].icon} {reasons[0].title}
                    </p>
                  )}
                  <p className="text-sm font-bold text-rose-500 mt-1">
                    {product.price.toLocaleString()}원
                  </p>
                </div>
              </Link>

              <div className="px-3 pb-3">
                {reasons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : product.id)}
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

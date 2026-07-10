"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

// 진행 중인 기획전 — 시즌마다 이 배열만 바꾸면 된다
const EVENTS = [
  {
    title: "마음을 전하는 감사 기획전",
    desc: "카네이션부터 감사 꽃다발까지, 고마운 분께 마음을 전하세요",
    badge: "EVENT",
    href: "/products?use=감사",
    img: "/flowers/red_carnation.jpg",
    bg: "from-rose-100 to-pink-50",
  },
  {
    title: "나만의 꽃다발 만들기",
    desc: "40가지 꽃으로 조합하고, AI 미리보기로 먼저 확인하세요",
    badge: "NEW",
    href: "/custom",
    img: "/flowers/pink_rose.jpg",
    bg: "from-amber-50 to-rose-50",
  },
  {
    title: "여름을 밝히는 해바라기전",
    desc: "무더위를 이기는 밝은 에너지, 응원의 꽃을 만나보세요",
    badge: "SEASON",
    href: "/products?q=해바라기",
    img: "/flowers/yellow_sunflower.jpg",
    bg: "from-yellow-50 to-amber-50",
  },
]

export function EventBanner() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % EVENTS.length), 5000)
    return () => clearInterval(t)
  }, [])

  const ev = EVENTS[idx]

  return (
    <section className="px-6 pt-6">
      <div className="max-w-6xl mx-auto">
        <Link
          href={ev.href}
          className={`relative block rounded-3xl overflow-hidden bg-gradient-to-r ${ev.bg} transition-colors`}
        >
          <div className="flex items-center justify-between gap-6 px-8 md:px-12 py-10 md:py-14">
            <div className="space-y-3 max-w-lg">
              <span className="inline-block text-[11px] font-bold tracking-widest bg-white/80 text-rose-500 px-3 py-1 rounded-full">
                {ev.badge}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-stone-800 leading-snug">{ev.title}</h2>
              <p className="text-sm text-stone-500 leading-relaxed">{ev.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-500 pt-1">
                기획전 보러 가기 <ArrowRight size={15} />
              </span>
            </div>
            <div className="hidden sm:block relative w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden shrink-0 shadow-lg">
              <Image src={ev.img} alt={ev.title} fill sizes="208px" className="object-cover" />
            </div>
          </div>

          {/* 인디케이터 */}
          <div className="absolute bottom-4 left-8 md:left-12 flex gap-1.5">
            {EVENTS.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setIdx(i) }}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-rose-400" : "w-1.5 bg-stone-300"}`}
                aria-label={`배너 ${i + 1}`}
              />
            ))}
          </div>
        </Link>
      </div>
    </section>
  )
}

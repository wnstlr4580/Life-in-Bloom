import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { HomeProducts } from "@/components/shop/HomeProducts"
import { ArrowRight, Flower2, Sparkles, Leaf } from "lucide-react"

export default function HomePage() {
  return (
    <>
      {/* 히어로 섹션 */}
      <section className="bg-gradient-to-br from-rose-50 via-white to-stone-50 py-24 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-600 text-sm font-medium px-3 py-1 rounded-full">
              <Sparkles size={14} /> 오행 기반 꽃 추천
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-stone-800 leading-tight">
              나를 닮은 꽃을<br />찾아보세요
            </h1>
            <p className="text-stone-500 text-lg leading-relaxed max-w-md">
              생년월일로 분석한 오행(五行)으로 당신의 기운에 어울리는 꽃을 추천해 드려요.
              특별한 날, 나만의 꽃으로 더 빛나세요.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/saju">
                <Button className="h-12 px-6 bg-rose-400 hover:bg-rose-500 text-white text-base font-semibold gap-2">
                  🔮 나의 꽃 찾기 <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/products">
                <Button variant="outline" className="h-12 px-6 border-stone-200 text-stone-700 text-base hover:border-rose-300 hover:text-rose-500">
                  꽃 구경하기
                </Button>
              </Link>
            </div>
          </div>

          {/* 장식 카드 */}
          <div className="flex-1 grid grid-cols-2 gap-4 max-w-sm">
            {[
              { img: "https://images.unsplash.com/photo-1778074631493-5bdb54f8ada6?w=400&h=400&fit=crop&q=80", title: "봄의 튤립", tag: "목(木)" },
              { img: "https://images.unsplash.com/photo-1523693916903-027d144a2b7d?w=400&h=400&fit=crop&q=80", title: "열정의 장미", tag: "화(火)" },
              { img: "https://images.unsplash.com/photo-1776445602573-0cc8680b4d0a?w=400&h=400&fit=crop&q=80", title: "여름 해바라기", tag: "토(土)" },
              { img: "https://images.unsplash.com/photo-1528190590778-23ac3ad37dff?w=400&h=400&fit=crop&q=80", title: "라벤더", tag: "수(水)" },
            ].map(({ img, title, tag }) => (
              <div key={title} className="rounded-2xl overflow-hidden relative aspect-square group">
                <Image src={img} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <span className="text-xs text-white/70">{tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 특징 섹션 */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-800 text-center mb-12">왜 인생내꽃인가요?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "🔮",
                title: "오행 맞춤 추천",
                desc: "생년월일의 천간을 분석해 목·화·토·금·수 오행에 맞는 꽃을 추천해요.",
              },
              {
                icon: "💐",
                title: "감성 꽃다발",
                desc: "꽃말, 색감, 계절감까지 고려한 큐레이션으로 특별한 순간을 완성해요.",
              },
              {
                icon: "🚚",
                title: "당일 배송",
                desc: "오전 11시 이전 주문 시 당일 배송. 신선한 꽃을 바로 받아보세요.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="text-center space-y-3 p-6 rounded-2xl hover:bg-stone-50 transition-colors">
                <span className="text-4xl">{icon}</span>
                <h3 className="font-bold text-stone-800">{title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 실제 판매 상품 */}
      <HomeProducts />

      {/* 서비스 바로가기 */}
      <section className="py-20 px-6 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-800 text-center mb-3">인생내꽃에서 할 수 있어요</h2>
          <p className="text-stone-500 text-center mb-12">꽃을 고르는 새로운 방법을 만나보세요</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { href: "/saju", emoji: "🔮", title: "나의 꽃 찾기", desc: "생년월일로 알아보는 나의 오행과 꽃" },
              { href: "/compat", emoji: "💞", title: "궁합 보기", desc: "둘의 기운은 얼마나 잘 맞을까요?" },
              { href: "/custom", emoji: "💐", title: "꽃다발 만들기", desc: "원하는 꽃으로 나만의 꽃다발 완성" },
              { href: "/products", emoji: "🌷", title: "꽃 & 식물", desc: "꽃다발부터 화분까지 한눈에" },
            ].map(({ href, emoji, title, desc }) => (
              <Link
                key={href}
                href={href}
                className="group bg-white rounded-2xl border border-stone-100 p-6 text-center space-y-2 hover:border-rose-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <span className="text-3xl block">{emoji}</span>
                <h3 className="font-bold text-stone-800 group-hover:text-rose-500 transition-colors">{title}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-20 px-6 bg-gradient-to-r from-rose-400 to-pink-400 text-white">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <Leaf size={32} className="mx-auto opacity-80" />
          <h2 className="text-3xl font-bold">지금 바로 나의 꽃을 찾아보세요</h2>
          <p className="text-rose-100 max-w-md mx-auto">
            단 30초, 생년월일만 입력하면 당신에게 어울리는 꽃을 알 수 있어요.
          </p>
          <Link href="/saju">
            <Button className="h-12 px-8 bg-white text-rose-500 hover:bg-rose-50 font-semibold text-base">
              오행 분석 시작하기
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}

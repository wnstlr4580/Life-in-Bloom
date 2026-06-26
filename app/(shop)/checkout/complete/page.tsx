"use client"

import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Suspense } from "react"

function CompleteContent() {
  const params = useSearchParams()
  const orderId = params.get("orderId")

  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center space-y-6">
      <div className="space-y-3">
        <p className="text-6xl">🌸</p>
        <h1 className="text-2xl font-bold text-stone-800">주문이 완료됐어요!</h1>
        <p className="text-stone-400 text-sm leading-relaxed">
          소중한 꽃이 정성껏 포장되어<br />곧 찾아갈 거예요
        </p>
        {orderId && (
          <p className="text-xs text-stone-300 font-mono bg-stone-50 rounded-lg px-3 py-2 inline-block">
            주문번호: {orderId}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <Link href="/mypage">
          <Button className="w-full h-12 bg-rose-400 hover:bg-rose-500 text-white font-semibold">
            주문 내역 확인하기
          </Button>
        </Link>
        <Link href="/products">
          <Button variant="outline" className="w-full h-12 border-stone-200 text-stone-600">
            쇼핑 계속하기
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function CompletePage() {
  return (
    <Suspense>
      <CompleteContent />
    </Suspense>
  )
}

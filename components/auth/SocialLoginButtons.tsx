"use client"

import { useEffect, useState } from "react"
import { getProviders, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

// 소셜 로그인 = 회원가입. 처음 로그인하면 lib/auth.ts의 signIn 콜백이 User 행을 만들어 준다.
// 서버에 키(환경변수)가 설정된 공급자만 버튼을 보여준다 — 키 없는 버튼을 누르면 에러 페이지로 빠지기 때문.
const BUTTONS: Record<string, { label: string; className: string; variant?: "outline" }> = {
  kakao: { label: "카카오로 시작하기", className: "bg-[#FEE500] hover:bg-[#F5D800] text-stone-800" },
  naver: { label: "네이버로 시작하기", className: "bg-[#03C75A] hover:bg-[#02b350] text-white" },
  google: { label: "Google로 시작하기", className: "", variant: "outline" },
}

export function SocialLoginButtons({ callbackUrl }: { callbackUrl: string }) {
  const [enabled, setEnabled] = useState<string[] | null>(null)

  useEffect(() => {
    getProviders()
      .then((p) => setEnabled(Object.keys(p ?? {}).filter((id) => id in BUTTONS)))
      .catch(() => setEnabled([]))
  }, [])

  if (!enabled || enabled.length === 0) return null

  return (
    <>
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-stone-100" />
        <span className="text-xs text-stone-400">또는</span>
        <div className="flex-1 h-px bg-stone-100" />
      </div>
      <div className="flex flex-col gap-2">
        {Object.entries(BUTTONS)
          .filter(([id]) => enabled.includes(id))
          .map(([id, b]) => (
            <Button
              key={id}
              onClick={() => signIn(id, { callbackUrl })}
              variant={b.variant}
              className={`h-11 font-semibold ${b.className}`}
            >
              {b.label}
            </Button>
          ))}
        <p className="text-[11px] text-stone-400 text-center">
          처음 로그인하면 자동으로 일반 회원으로 가입돼요 · 판매자는 이메일로 가입해 주세요
        </p>
        {enabled.includes("naver") && (
          <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs leading-relaxed text-stone-600">
            <p className="font-semibold text-emerald-700">📢 네이버 로그인 안내</p>
            <p className="mt-1">
              네이버 로그인은 아직 정식 오픈 전이라, <strong>멤버로 등록된 분만</strong> 가입·로그인할 수 있어요.
              네이버로 이용하고 싶으시면 인생내꽃 운영자에게 연락해 주세요.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

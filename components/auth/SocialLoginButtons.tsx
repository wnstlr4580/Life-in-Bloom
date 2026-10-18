"use client"

import { useEffect, useState } from "react"
import { getProviders, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

// SNS 로그인과 SNS 가입은 같은 동작이다 — 처음 온 계정이면 lib/auth.ts의 signIn 콜백이
// 일반 회원으로 자동 가입시키고, 이미 가입한 계정이면 그대로 로그인한다.
// 화면(로그인/회원가입)에 맞춰 버튼 문구만 다르게 보여준다.
// 서버에 키(환경변수)가 설정된 공급자만 버튼을 보여준다 — 키 없는 버튼을 누르면 오류로 빠지기 때문.
const PROVIDERS: Record<string, { name: string; className: string; variant?: "outline" }> = {
  kakao: { name: "카카오", className: "bg-[#FEE500] hover:bg-[#F5D800] text-stone-800" },
  naver: { name: "네이버", className: "bg-[#03C75A] hover:bg-[#02b350] text-white" },
  google: { name: "Google", className: "border-stone-200", variant: "outline" },
}

type Mode = "login" | "signup"

function useEnabledProviders() {
  const [enabled, setEnabled] = useState<string[] | null>(null)
  useEffect(() => {
    getProviders()
      .then((p) => setEnabled(Object.keys(p ?? {}).filter((id) => id in PROVIDERS)))
      .catch(() => setEnabled([]))
  }, [])
  return enabled
}

/**
 * 오른쪽(PC) / 아래쪽(모바일) SNS 카드 — 왼쪽 이메일 폼 카드와 같은 모양·높이로 맞춘다.
 * 부모 그리드가 두 카드를 같은 높이로 늘리므로 h-full로 채운다.
 */
export function SocialLoginButtons({ callbackUrl, mode = "login" }: { callbackUrl: string; mode?: Mode }) {
  const enabled = useEnabledProviders()
  if (!enabled || enabled.length === 0) return null

  return (
    <>
      <div className="flex items-center gap-3 my-6 md:hidden">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400">또는</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>
      <div className="flex h-full flex-col bg-white rounded-2xl border border-stone-100 p-6">
        <div>
          <h2 className="text-sm font-bold text-stone-700">{mode === "login" ? "SNS 로그인" : "SNS 간편 가입"}</h2>
          <p className="mt-0.5 text-xs text-stone-400">
            {mode === "login" ? "처음이면 자동으로 가입된 뒤 로그인돼요" : "이미 가입한 계정이면 바로 로그인돼요"}
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          {Object.entries(PROVIDERS)
            .filter(([id]) => enabled.includes(id))
            .map(([id, p]) => (
              <Button
                key={id}
                onClick={() => signIn(id, { callbackUrl })}
                variant={p.variant}
                className={`w-full h-11 font-semibold ${p.className}`}
              >
                {mode === "login" ? `${p.name}로 로그인` : `${p.name}로 가입하기`}
              </Button>
            ))}
        </div>
        {/* 왼쪽 카드 맨 아래 '계정이 없으신가요?' 줄과 높이를 맞추는 안내 */}
        <p className="mt-auto pt-4 text-xs text-center text-stone-400">
          {mode === "login" ? "SNS 계정만 있으면 별도 가입 없이 시작할 수 있어요" : "가입 후 마이페이지에서 닉네임을 바꿀 수 있어요"}
        </p>
      </div>
    </>
  )
}

/** 두 카드 아래에 가로로 나란히 놓는 안내 (판매자 · 네이버) */
export function SocialLoginNotices({ mode = "login" }: { mode?: Mode }) {
  const enabled = useEnabledProviders()
  if (!enabled || enabled.length === 0) return null

  return (
    <div className={`mt-6 grid gap-3 ${enabled.includes("naver") ? "md:grid-cols-2" : ""}`}>
      <div className="rounded-xl border border-stone-200 bg-white/60 px-4 py-3 text-xs leading-relaxed text-stone-600">
        <p className="font-semibold text-stone-700">🏪 판매자 회원 안내</p>
        <p className="mt-1">
          판매자 계정은 SNS 로그인을 쓸 수 없어요.{" "}
          {mode === "login" ? "일반 로그인(이메일·비밀번호)으로 로그인해 주세요." : "판매자 회원가입에서 이메일로 가입해 주세요."}
        </p>
      </div>
      {enabled.includes("naver") && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs leading-relaxed text-stone-600">
          <p className="font-semibold text-emerald-700">📢 네이버 로그인 안내</p>
          <p className="mt-1">
            아직 정식 오픈 전이라 <strong>멤버로 등록된 분만</strong> 가입·로그인할 수 있어요.
            네이버로 이용하고 싶으시면 인생내꽃 운영자에게 연락해 주세요.
          </p>
        </div>
      )}
    </div>
  )
}

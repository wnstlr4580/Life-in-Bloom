"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// 로그인 실패 사유 — lib/auth.ts의 signIn 콜백이 보낸 코드와 Auth.js 기본 오류 코드
const LOGIN_ERRORS: Record<string, string> = {
  SellerUseEmail: "판매자 계정은 SNS 로그인을 쓸 수 없어요. 이메일·비밀번호로 로그인해 주세요.",
  SocialSignupFailed: "SNS 계정으로 가입하는 중 문제가 생겼어요. 잠시 후 다시 시도하거나 운영자에게 알려 주세요.",
  NoEmailFromProvider: "SNS 계정 정보를 받아오지 못했어요. 다시 시도하거나 이메일로 가입해 주세요.",
  AccessDenied: "로그인이 거부됐어요. 이용이 정지된 계정이거나, 네이버의 경우 멤버로 등록되지 않은 계정일 수 있어요. 필요하면 인생내꽃 운영자에게 연락해 주세요.",
  Configuration: "로그인 설정에 문제가 있어요(서버 설정 오류). 운영자에게 알려 주세요.",
  OAuthSignin: "SNS 로그인 화면을 여는 중 문제가 생겼어요. 다시 시도해 주세요.",
  OAuthCallback: "SNS에서 돌아오는 중 문제가 생겼어요. 다시 시도해 주세요.",
  OAuthCallbackError: "SNS에서 돌아오는 중 문제가 생겼어요. 다시 시도해 주세요.",
  CallbackRouteError: "SNS에서 돌아오는 중 문제가 생겼어요. 다시 시도해 주세요.",
  CredentialsSignin: "이메일 또는 비밀번호가 일치하지 않아요",
}

function loginErrorMessage(code: string | null) {
  if (!code) return ""
  return LOGIN_ERRORS[code] ?? `로그인 중 문제가 생겼어요 (오류 코드: ${code}). 다시 시도해 주세요.`
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/account"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(() => loginErrorMessage(searchParams.get("error")))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await signIn("credentials", { email, password, redirect: false })
      if (res?.error) { setError("이메일 또는 비밀번호가 일치하지 않아요"); return }
      router.push(callbackUrl)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    // PC(md 이상)에서는 왼쪽 이메일 폼 · 오른쪽 SNS 로그인을 가로로 배치, 모바일은 세로로 쌓는다
    <div className="max-w-sm md:max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <p className="text-3xl mb-2">🌸</p>
        <h1 className="text-2xl font-bold text-stone-800">로그인</h1>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-10 md:items-start">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-stone-700">일반 로그인</h2>
          <p className="mt-0.5 text-xs text-stone-400">이메일과 비밀번호로 로그인해요 · 판매자 회원은 여기로</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">이메일</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="rounded-xl border-stone-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">비밀번호</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="rounded-xl border-stone-200" />
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full h-11 bg-rose-400 hover:bg-rose-500 text-white font-semibold">
          {loading ? "로그인 중..." : "로그인"}
        </Button>

        <p className="text-xs text-center text-stone-400">
          계정이 없으신가요? <Link href="/signup" className="text-rose-500 font-medium">회원가입</Link>
        </p>
      </form>

        <div>
        <SocialLoginButtons callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}

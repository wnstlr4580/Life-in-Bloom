"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/account"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(
    searchParams.get("error") === "NoEmailFromProvider"
      ? "카카오 계정에서 이메일 제공에 동의하지 않아 로그인할 수 없어요. 이메일/비밀번호로 로그인하거나 카카오 로그인 시 이메일 제공에 동의해주세요."
      : ""
  )

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
    <div className="max-w-sm mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <p className="text-3xl mb-2">🌸</p>
        <h1 className="text-2xl font-bold text-stone-800">로그인</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
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

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-stone-100" />
        <span className="text-xs text-stone-400">또는</span>
        <div className="flex-1 h-px bg-stone-100" />
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={() => signIn("kakao", { callbackUrl })} className="h-11 bg-[#FEE500] hover:bg-[#F5D800] text-stone-800 font-semibold">
          카카오로 시작하기
        </Button>
        <Button onClick={() => signIn("google", { callbackUrl })} variant="outline" className="h-11 font-semibold">
          Google로 시작하기
        </Button>
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

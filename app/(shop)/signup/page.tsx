"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== passwordConfirm) { setError("비밀번호가 일치하지 않아요"); return }
    if (password.length < 8) { setError("비밀번호는 8자 이상이어야 해요"); return }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? "회원가입에 실패했어요")

      const signInRes = await signIn("credentials", { email, password, redirect: false })
      if (signInRes?.error) throw new Error("가입은 됐지만 로그인에 실패했어요. 로그인 페이지에서 다시 시도해주세요")

      router.push("/mypage")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했어요")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <p className="text-3xl mb-2">🌸</p>
        <h1 className="text-2xl font-bold text-stone-800">이메일로 회원가입</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">이름</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className="rounded-xl border-stone-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">이메일 *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="rounded-xl border-stone-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">비밀번호 * (8자 이상)</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="rounded-xl border-stone-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">비밀번호 확인 *</Label>
          <Input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="••••••••" className="rounded-xl border-stone-200" />
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full h-11 bg-rose-400 hover:bg-rose-500 text-white font-semibold">
          {loading ? "가입 중..." : "회원가입"}
        </Button>

        <p className="text-xs text-center text-stone-400">
          이미 계정이 있으신가요? <Link href="/login" className="text-rose-500 font-medium">로그인</Link>
        </p>
      </form>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function PasswordChangePage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState("")
  const save = async () => {
    if (password !== confirm) return setMessage("비밀번호가 서로 달라요")
    const response = await fetch("/api/account/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) })
    const data = await response.json()
    if (!response.ok) return setMessage(data.error)
    await update()
    router.replace(session?.user.role === "SELLER" ? "/seller" : session?.user.role === "ADMIN" ? "/admin" : "/mypage")
  }
  return <div className="mx-auto max-w-md px-6 py-24"><div className="rounded-2xl border bg-white p-6"><h1 className="text-xl font-bold">새 비밀번호 설정</h1><p className="mt-2 text-sm text-stone-500">관리자가 발급한 임시 비밀번호로 로그인했습니다. 계속하려면 새 비밀번호를 설정해주세요.</p><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="새 비밀번호" className="mt-6 h-11 w-full rounded-xl border px-3 text-sm" /><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="새 비밀번호 확인" className="mt-3 h-11 w-full rounded-xl border px-3 text-sm" />{message && <p className="mt-3 text-sm text-rose-600">{message}</p>}<button onClick={save} className="mt-5 h-11 w-full rounded-xl bg-stone-900 text-sm font-semibold text-white">비밀번호 변경</button></div></div>
}

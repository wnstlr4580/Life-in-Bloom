"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function AccountRedirectPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status !== "authenticated") return
    const role = session.user.role
    router.replace(role === "ADMIN" ? "/admin" : role === "SELLER" ? "/seller" : "/mypage")
  }, [router, session, status])
  return <div className="py-32 flex justify-center"><div className="w-8 h-8 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" /></div>
}

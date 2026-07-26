"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Heart } from "lucide-react"

export function WishlistButton({ productId }: { productId: string }) {
  const { status } = useSession()
  const [wished, setWished] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/wishlist").then((r) => r.json()).then((d) => setWished((d.productIds ?? []).includes(productId))).catch(() => {})
  }, [productId, status])

  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault(); event.stopPropagation()
    if (status !== "authenticated") { window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`; return }
    setSaving(true)
    const response = await fetch(wished ? `/api/wishlist?productId=${encodeURIComponent(productId)}` : "/api/wishlist", {
      method: wished ? "DELETE" : "POST", headers: { "Content-Type": "application/json" },
      ...(wished ? {} : { body: JSON.stringify({ productId }) }),
    })
    if (response.ok) setWished(!wished)
    setSaving(false)
  }

  return <button type="button" onClick={toggle} disabled={saving} aria-label={wished ? "관심상품 해제" : "관심상품 추가"}
    className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-105 disabled:opacity-50">
    <Heart size={18} className={wished ? "fill-rose-500 text-rose-500" : "text-stone-500"} />
  </button>
}

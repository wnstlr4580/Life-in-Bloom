"use client"

import { ShoppingBag } from "lucide-react"
import { useCartStore } from "@/store/cartStore"

export function CartButton() {
  const totalCount = useCartStore((s) => s.totalCount())

  return (
    <button className="relative p-2 text-stone-600 hover:text-rose-500 transition-colors">
      <ShoppingBag size={22} />
      {totalCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {totalCount > 9 ? "9+" : totalCount}
        </span>
      )}
    </button>
  )
}

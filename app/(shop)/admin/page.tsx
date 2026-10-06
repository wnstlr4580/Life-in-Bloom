"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Boxes, CircleDollarSign, ClipboardList, MessageSquareWarning, Store, Users } from "lucide-react"

type Stats = {
  users: number; activeSellers: number; pendingSellers: number; activeProducts: number
  soldOutProducts: number; totalOrders: number; totalRevenue: number
  monthOrders: number; monthRevenue: number; reviews: number; hiddenContent: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState("")
  useEffect(() => { fetch("/api/admin/dashboard").then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setStats(d) }).catch((e) => setError(e.message)) }, [])
  if (error) return <div className="p-10 text-rose-600">{error}</div>
  if (!stats) return <div className="p-10 text-stone-400">운영 현황을 불러오는 중...</div>
  const cards = [
    ["사용자", stats.users, "전체 가입 계정", Users, "/admin/users"],
    ["운영 판매처", stats.activeSellers, `승인 대기 ${stats.pendingSellers}곳`, Store, "/admin/sellers"],
    ["판매 상품", stats.activeProducts, `품절 ${stats.soldOutProducts}개`, Boxes, "/admin/products"],
    ["이번 달 주문", stats.monthOrders, `전체 ${stats.totalOrders}건`, ClipboardList, "/admin/orders"],
    ["이번 달 거래액", `${stats.monthRevenue.toLocaleString()}원`, `누적 ${stats.totalRevenue.toLocaleString()}원`, CircleDollarSign, "/admin/orders"],
    ["리뷰·게시물", stats.reviews, `숨김 ${stats.hiddenContent}건`, MessageSquareWarning, "/admin/content"],
  ] as const
  return <div className="p-6 sm:p-10">
    <p className="text-sm font-semibold text-rose-500">ADMIN CENTER</p>
    <h1 className="mt-1 text-2xl font-bold">운영 대시보드</h1>
    <p className="mt-2 text-sm text-stone-500">판매 업무가 아닌 플랫폼 전체 현황과 처리할 운영 이슈를 확인합니다.</p>
    <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
      {cards.map(([title, value, detail, Icon, href]) => <Link href={href} key={title} className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-rose-200 hover:shadow-sm">
        <Icon size={21} className="text-rose-500" /><p className="mt-4 text-sm text-stone-500">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-2 text-xs text-stone-400">{detail}</p>
      </Link>)}
    </div>
    <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="font-bold text-amber-900">확인이 필요한 운영 항목</h2>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <Link href="/admin/sellers" className="rounded-xl bg-white p-4">판매처 승인 대기 <strong className="float-right text-amber-700">{stats.pendingSellers}</strong></Link>
        <Link href="/admin/products" className="rounded-xl bg-white p-4">품절 상품 <strong className="float-right text-amber-700">{stats.soldOutProducts}</strong></Link>
        <Link href="/admin/content" className="rounded-xl bg-white p-4">숨김 콘텐츠 <strong className="float-right text-amber-700">{stats.hiddenContent}</strong></Link>
      </div>
    </div>
  </div>
}

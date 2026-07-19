"use client"

import { useEffect, useState } from "react"

type Log = { id: string; action: string; targetType: string; targetId: string; reason: string | null; createdAt: string; User: { email: string; name: string | null } | null }

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => { fetch("/api/admin/audit", { cache: "no-store" }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setLogs(d.logs ?? []) }).catch((e) => setError(e.message || "운영 기록을 불러오지 못했어요")).finally(() => setLoading(false)) }, [])
  return <div className="p-6 sm:p-10"><h1 className="text-2xl font-bold">운영 기록</h1><p className="mt-2 text-sm text-stone-500">관리자가 수행한 계정·판매처·상품·콘텐츠 조치를 확인합니다.</p>{loading && <p className="mt-6 rounded-xl border bg-white p-8 text-center text-sm text-stone-400">운영 기록을 불러오는 중...</p>}{error && <p className="mt-6 rounded-xl bg-rose-50 p-6 text-center text-sm text-rose-600">{error}</p>}{!loading && !error && <div className="mt-6 overflow-hidden rounded-2xl border bg-white"><div className="divide-y">{logs.map((log) => <div key={log.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[160px_1fr_180px]"><div><span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold">{log.action}</span><p className="mt-2 text-xs text-stone-400">{log.User?.name || log.User?.email}</p></div><div><p className="font-medium">{log.targetType} · {log.targetId}</p><p className="mt-1 text-xs text-stone-500">{log.reason || "사유 없음"}</p></div><p className="text-xs text-stone-400 sm:text-right">{new Date(log.createdAt).toLocaleString("ko-KR")}</p></div>)}</div>{logs.length === 0 && <p className="p-16 text-center text-sm text-stone-400">아직 운영 기록이 없습니다.</p>}</div>}</div>
}

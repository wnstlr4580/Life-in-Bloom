import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const { data, error } = await supabaseAdmin.from("AdminAuditLog")
    .select("id, action, targetType, targetId, reason, createdAt, User(email, name)")
    .order("createdAt", { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: "운영 기록을 불러오지 못했어요" }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] })
}

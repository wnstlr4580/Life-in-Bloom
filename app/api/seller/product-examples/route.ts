import { NextRequest, NextResponse } from "next/server"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const actor = await requireSeller()
  if (!actor) return NextResponse.json({ error: "판매자 로그인이 필요해요" }, { status: 401 })
  const field = req.nextUrl.searchParams.get("field")?.trim()
  const category = req.nextUrl.searchParams.get("category")?.trim() || "all"
  if (!field) return NextResponse.json({ error: "도움말 항목을 선택해주세요" }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("SellerProductExample")
    .select("id, field, category, title, content")
    .eq("field", field)
    .in("category", ["all", category])
    .order("sortOrder", { ascending: true })
  if (error) return NextResponse.json({ error: "작성 예시를 불러오지 못했어요" }, { status: 500 })
  return NextResponse.json({ examples: data ?? [] })
}

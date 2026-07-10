import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// 후기 단건 조회 — /custom?post=ID 에서 조합을 불러올 때 사용
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data } = await supabaseAdmin
    .from("BouquetPost")
    .select("id, authorName, imageUrl, composition, content, derivedOrderCount")
    .eq("id", id)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: "후기를 찾을 수 없어요" }, { status: 404 })
  return NextResponse.json(data)
}

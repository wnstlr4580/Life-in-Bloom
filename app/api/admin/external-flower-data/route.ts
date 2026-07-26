import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/authorization"
import { EXTERNAL_FLOWER_SOURCES, externalFlowerSource } from "@/lib/externalFlowerData"

const ALLOWED_PARAMS = new Set(["pageNo", "numOfRows", "startDate", "endDate", "date", "whsl_mrkt_cd", "corp_cd", "gds_lclsf_cd", "gds_mclsf_cd", "gds_sclsf_cd", "itemCode", "kindCode", "regday", "p_product_cls_code", "p_item_category_code", "p_item_code", "p_kind_code", "p_country_code", "p_convert_kg_yn"])

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  return NextResponse.json({ configured: Boolean(process.env.DATA_GO_KR_SERVICE_KEY), sources: EXTERNAL_FLOWER_SOURCES })
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY
  if (!serviceKey) return NextResponse.json({ error: "DATA_GO_KR_SERVICE_KEY가 필요해요", requiresKey: true }, { status: 503 })
  const body = await req.json().catch(() => null)
  const params = body?.params && typeof body.params === "object" ? body.params as Record<string, unknown> : {}
  const requestedIds: string[] = body?.sourceId === "all"
    ? EXTERNAL_FLOWER_SOURCES.map((source) => source.id)
    : Array.isArray(body?.sourceIds) ? body.sourceIds.map((value: unknown) => String(value)) : [String(body?.sourceId ?? "")]
  const sources = [...new Set(requestedIds)].map(externalFlowerSource).filter((source): source is NonNullable<typeof source> => Boolean(source))
  if (sources.length === 0) return NextResponse.json({ error: "지원하지 않는 데이터 소스예요" }, { status: 400 })
  const results = await Promise.all(sources.map(async (source) => {
    const url = new URL(source.endpoint, source.baseUrl)
    url.searchParams.set("serviceKey", serviceKey)
    url.searchParams.set("returnType", "json")
    url.searchParams.set("type", "json")
    url.searchParams.set("pageNo", "1")
    url.searchParams.set("numOfRows", "100")
    for (const [key, value] of Object.entries(params)) if (ALLOWED_PARAMS.has(key) && value !== null && value !== undefined && String(value).length <= 100) url.searchParams.set(key, String(value))
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15000) })
      const text = await response.text()
      if (!response.ok) return { source, ok: false, status: response.status, error: text.slice(0, 500) }
      try { return { source, ok: true, data: JSON.parse(text) } }
      catch { return { source, ok: true, raw: text } }
    } catch (error) { return { source, ok: false, error: error instanceof Error ? error.message : "호출 실패" } }
  }))
  return NextResponse.json({ fetchedAt: new Date().toISOString(), results })
}

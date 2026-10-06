import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()

  if (!prompt) {
    return NextResponse.json({ error: "프롬프트가 없습니다." }, { status: 400 })
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: "Cloudflare 이미지 생성 설정을 확인해 주세요." },
      { status: 503 },
    )
  }

  // FLUX schnell은 부정 프롬프트를 지원하지 않는다 — 금지어를 본문에 붙이면 오히려 그 요소가 그려진다
  const fullPrompt = String(prompt).slice(0, 2048)
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: fullPrompt, steps: 8 }),
      cache: "no-store",
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300)
      console.error("[bouquet-image] Cloudflare error", res.status, detail)
      return NextResponse.json(
        { error: res.status === 401 || res.status === 403 ? "Cloudflare 이미지 생성 인증 정보를 확인해 주세요." : res.status === 429 ? "오늘의 무료 이미지 생성 한도를 모두 사용했어요." : `이미지 생성 서비스 오류(${res.status})가 발생했어요.` },
        { status: res.status === 429 ? 429 : 502 },
      )
    }

    const payload = await res.json() as { result?: { image?: string }; success?: boolean }
    const image = payload.result?.image
    if (!image) {
      console.error("[bouquet-image] Cloudflare returned no image")
      return NextResponse.json({ error: "이미지 생성 결과가 비어 있어요." }, { status: 502 })
    }
    return new Response(Buffer.from(image, "base64"), {
      headers: { "Content-Type": "image/jpeg" },
    })
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    console.error("[bouquet-image] request failed", err)
    const isTimeout = err instanceof Error && err.name === "AbortError"
    return NextResponse.json(
      { error: isTimeout ? "생성 시간이 초과됐어요. 다시 시도해 주세요." : "이미지 생성에 실패했어요. 다시 시도해 주세요." },
      { status: 500 }
    )
  }
}

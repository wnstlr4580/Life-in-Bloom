import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { prompt, negative } = await req.json()

  if (!prompt) {
    return NextResponse.json({ error: "프롬프트가 없습니다." }, { status: 400 })
  }

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux-realism&width=512&height=512&nologo=true&negative=${encodeURIComponent(negative ?? "")}&seed=${Date.now()}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90000)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`upstream_error:${res.status}`)

    const blob = await res.blob()
    return new Response(blob, {
      headers: { "Content-Type": "image/jpeg" },
    })
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    const isTimeout = err instanceof Error && err.name === "AbortError"
    return NextResponse.json(
      { error: isTimeout ? "생성 시간이 초과됐어요. 다시 시도해 주세요." : "이미지 생성에 실패했어요. 다시 시도해 주세요." },
      { status: 500 }
    )
  }
}

/** Bound both the response headers and body of a lookup request. */
export async function postDiyLookup<T>(url: string, body: unknown, signal: AbortSignal, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const cancel = () => controller.abort(signal.reason)
  signal.addEventListener("abort", cancel, { once: true })
  if (signal.aborted) cancel()
  let timer: ReturnType<typeof setTimeout> | undefined
  const stopped = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true })
    if (controller.signal.aborted) reject(controller.signal.reason)
    timer = setTimeout(() => controller.abort(new DOMException("조회 시간이 초과됐어요. 다시 시도해주세요.", "TimeoutError")), timeoutMs)
  })
  try {
    return await Promise.race([stopped, (async () => {
      const response = await fetch(url, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "조회를 완료하지 못했어요.")
      return data as T
    })()])
  } finally {
    clearTimeout(timer)
    signal.removeEventListener("abort", cancel)
  }
}

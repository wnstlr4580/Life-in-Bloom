import { afterEach, expect, it, vi } from "vitest"
import { postDiyLookup } from "../diyLookup"

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

it("returns inventory while the public market request remains pending, then bounds the wait", async () => {
  vi.useFakeTimers()
  vi.stubGlobal("fetch", vi.fn((url) => url === "/matches"
    ? Promise.resolve(Response.json({ matches: [{ sellerId: "test" }] }))
    : new Promise(() => {})))
  const signal = new AbortController().signal
  const publicRequest = postDiyLookup("/markets", {}, signal, 20000)
  const failure = expect(publicRequest).rejects.toMatchObject({ name: "TimeoutError" })
  await expect(postDiyLookup("/matches", {}, signal, 15000)).resolves.toEqual({ matches: [{ sellerId: "test" }] })
  await vi.advanceTimersByTimeAsync(20000)
  await failure
})

it("also times out when response headers arrive but the JSON body stalls", async () => {
  vi.useFakeTimers()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => {}) }))
  const request = postDiyLookup("/matches", {}, new AbortController().signal, 15000)
  const failure = expect(request).rejects.toMatchObject({ name: "TimeoutError" })
  await vi.advanceTimersByTimeAsync(15000)
  await failure
})

it("cancels an obsolete search immediately", async () => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
  const controller = new AbortController()
  const request = postDiyLookup("/matches", {}, controller.signal, 15000)
  controller.abort()
  await expect(request).rejects.toMatchObject({ name: "AbortError" })
})

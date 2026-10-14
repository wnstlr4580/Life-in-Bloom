import { expect, it } from "vitest"
import { isStyleExample } from "../reviewProvenance"
it("keeps legacy and curated examples separate from buyer reviews", () => {
  expect(isStyleExample({ id: "demo-review-calla" })).toBe(true)
  expect(isStyleExample({ id: "presentation-comparison-review-white-2" })).toBe(true)
  expect(isStyleExample({ id: "new", composition: { provenance: "AI_STAGED_EXAMPLE" } })).toBe(true)
  expect(isStyleExample({ id: "real-buyer", composition: { flowers: [] } })).toBe(false)
})

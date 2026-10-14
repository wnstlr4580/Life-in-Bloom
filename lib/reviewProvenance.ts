/** Legacy seeded rows and curated examples must not look like verified purchases. */
export function isStyleExample(review: { id: string; composition?: unknown }) {
  const composition = review.composition as { provenance?: string } | null
  return composition?.provenance === "AI_STAGED_EXAMPLE"
    || review.id.startsWith("presentation-comparison-review-")
    || ["presentation-review-white", "presentation-review-pink", "demo-review-white-rose", "demo-review-tulip", "demo-review-calla", "demo-review-yellow-lily"].includes(review.id)
}

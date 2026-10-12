import { describe, it, expect } from "vitest"
import { calcCompat, type PersonSaju } from "@/lib/compat"
import { calculateSaju, type Ohaeng } from "@/lib/saju"

const OHAENG: Ohaeng[] = ["목", "화", "토", "금", "수"]
const base = calculateSaju(new Date(Date.UTC(1995, 4, 26)), "unknown")

function person(mainOhaeng: Ohaeng): PersonSaju {
  return { name: mainOhaeng, pillars: base.pillars, mainOhaeng, dayStemIdx: 3, dayBranchIdx: 5 }
}

describe("궁합 커플 꽃", () => {
  it("대표 기운 15가지 조합 모두 고유한 꽃을 받는다 (입력 순서와 무관)", () => {
    for (const a of OHAENG) {
      for (const b of OHAENG) {
        const ab = calcCompat(person(a), person(b))
        const ba = calcCompat(person(b), person(a))
        expect(ab.coupleFlower, `${a}-${b}`).not.toBe("혼합 꽃다발")
        expect(ab.coupleFlower).toBe(ba.coupleFlower)
      }
    }
  })
})

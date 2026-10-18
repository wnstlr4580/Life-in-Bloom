import { describe, expect, it } from "vitest"
import { regionOhaengOf, regionsOfOhaeng } from "@/lib/regionOhaeng"

describe("regionOhaeng", () => {
  it("시·도 약칭과 정식 명칭을 모두 인식한다", () => {
    expect(regionOhaengOf("제주특별자치도 서귀포시 남원읍")?.ohaeng).toBe("수")
    expect(regionOhaengOf("전남 고흥군 도양읍")?.ohaeng).toBe("화")
    expect(regionOhaengOf("경상남도 함안군 가야읍")?.ohaeng).toBe("토")
    expect(regionOhaengOf("강원특별자치도 평창군")?.ohaeng).toBe("금")
    expect(regionOhaengOf("경기 고양시 덕양구 원당로")?.ohaeng).toBe("목")
  })
  it("주소가 없거나 모르는 형식이면 null", () => {
    expect(regionOhaengOf("")).toBeNull()
    expect(regionOhaengOf(null)).toBeNull()
    expect(regionOhaengOf("Seoul")).toBeNull()
  })
  it("모든 오행에 산지가 하나 이상 있다", () => {
    for (const o of ["목", "화", "토", "금", "수"] as const) expect(regionsOfOhaeng(o).length).toBeGreaterThan(0)
  })
})

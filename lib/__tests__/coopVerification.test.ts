import { describe, expect, it } from "vitest"
import { checkCoopMember, fetchCoopEducation, isValidBirthDate } from "@/lib/coopVerification"

const now = new Date("2026-09-28T00:00:00Z")

describe("checkCoopMember", () => {
  it("고객정보와 조합원 배치파일에 모두 있으면 조합원이다", () => {
    const check = checkCoopMember({ name: "김화훼", birthDate: "1968-03-12", phone: "010-1234-0001" }, now)
    expect(check).toEqual({ result: "MEMBER", creditCustomerNo: "1000000001", checkedAt: now.toISOString() })
  })

  it("고객은 있지만 배치파일에 없으면 비조합원이다", () => {
    expect(checkCoopMember({ name: "박일반", birthDate: "19900505", phone: "01012340003" }, now).result).toBe("NOT_MEMBER")
  })

  it("세 값 중 하나라도 다르면 고객을 찾지 못한다", () => {
    const check = checkCoopMember({ name: "김화훼", birthDate: "19680313", phone: "01012340001" }, now)
    expect(check.result).toBe("CUSTOMER_NOT_FOUND")
    expect(check.creditCustomerNo).toBeNull()
  })
})

describe("fetchCoopEducation", () => {
  it("교육이력이 있는 조합원은 이력을, 없는 조합원은 빈 목록을 돌려준다", () => {
    expect(fetchCoopEducation("1000000001", now).records).toHaveLength(3)
    expect(fetchCoopEducation("1000000002", now).records).toEqual([])
  })
})

describe("isValidBirthDate", () => {
  it("실제 존재하는 과거 날짜 8자리만 통과한다", () => {
    expect(isValidBirthDate("19680312")).toBe(true)
    expect(isValidBirthDate("19680230")).toBe(false)
    expect(isValidBirthDate("680312")).toBe(false)
    expect(isValidBirthDate("29990101")).toBe(false)
  })
})

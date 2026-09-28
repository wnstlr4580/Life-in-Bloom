// 조합원 인증 연계 — 판매자 입점 시 [조합원여부확인] / [조합원교육이력확인]
// 실제 구축 시 두 함수의 내부만 농협 내부 연계 인터페이스로 바꾼다:
//  ① 통합업무시스템 [상호고객정보]에서 이름·생년월일·휴대폰번호로 신용고객번호 조회
//     → 조합원관리시스템 배치파일에 그 신용고객번호가 있는지 확인
//  ② 조합원교육관리시스템(배치파일 또는 API)에서 신용고객번호로 교육 수강이력 조회
// 이번 파일럿은 lib/coopTestData.ts의 테스트 데이터로 같은 흐름을 재현한다.
import { TEST_COOP_MEMBER_BATCH, TEST_CUSTOMERS, TEST_EDUCATION_RECORDS, type CoopEducationRecord } from "@/lib/coopTestData"

export type CoopMemberResult = "MEMBER" | "NOT_MEMBER" | "CUSTOMER_NOT_FOUND"
export type CoopMemberCheck = { result: CoopMemberResult; creditCustomerNo: string | null; checkedAt: string }
export type CoopEducationCheck = { records: CoopEducationRecord[]; checkedAt: string }

const digits = (value: string) => value.replace(/\D/g, "")

export function isValidBirthDate(value: string) {
  const text = digits(value)
  if (!/^\d{8}$/.test(text)) return false
  const date = new Date(`${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10).replace(/-/g, "") === text && date < new Date()
}

export function checkCoopMember(input: { name: string; birthDate: string; phone: string }, now = new Date()): CoopMemberCheck {
  const name = input.name.trim()
  const birthDate = digits(input.birthDate)
  const phone = digits(input.phone)
  const checkedAt = now.toISOString()
  const customer = TEST_CUSTOMERS.find((c) => c.name === name && c.birthDate === birthDate && c.phone === phone)
  if (!customer) return { result: "CUSTOMER_NOT_FOUND", creditCustomerNo: null, checkedAt }
  return {
    result: TEST_COOP_MEMBER_BATCH.has(customer.creditCustomerNo) ? "MEMBER" : "NOT_MEMBER",
    creditCustomerNo: customer.creditCustomerNo,
    checkedAt,
  }
}

export function fetchCoopEducation(creditCustomerNo: string, now = new Date()): CoopEducationCheck {
  return { records: TEST_EDUCATION_RECORDS[creditCustomerNo] ?? [], checkedAt: now.toISOString() }
}

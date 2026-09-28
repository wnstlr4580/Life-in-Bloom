// 조합원 인증 파일럿용 테스트 데이터 — 실제 농협 데이터가 아니다.
// 파일럿은 외부망 테스트시스템으로 구현하므로(개인정보·사업부서 협의는 된 것으로 가정),
// 통합업무시스템 [상호고객정보], 조합원관리시스템 배치파일, 조합원교육관리시스템 응답을 이 파일로 대신한다.

export type CoopEducationRecord = {
  course: string
  provider: string
  completedAt: string // YYYY-MM-DD
  hours: number
}

// [상호고객정보] 이름·생년월일·휴대폰번호로 신용고객번호를 찾는 조회를 흉내 낸다.
export const TEST_CUSTOMERS: { name: string; birthDate: string; phone: string; creditCustomerNo: string }[] = [
  { name: "김화훼", birthDate: "19680312", phone: "01012340001", creditCustomerNo: "1000000001" },
  { name: "이농부", birthDate: "19751120", phone: "01012340002", creditCustomerNo: "1000000002" },
  { name: "박일반", birthDate: "19900505", phone: "01012340003", creditCustomerNo: "1000000003" },
]

// 조합원관리시스템이 배치로 내려주는 조합원 신용고객번호 목록
export const TEST_COOP_MEMBER_BATCH = new Set(["1000000001", "1000000002"])

// 조합원교육관리시스템의 교육 수강이력 (신용고객번호별)
export const TEST_EDUCATION_RECORDS: Record<string, CoopEducationRecord[]> = {
  "1000000001": [
    { course: "화훼 재배기술 심화과정", provider: "화훼농협", completedAt: "2025-11-14", hours: 16 },
    { course: "조합원 역량강화 교육", provider: "농협중앙회", completedAt: "2026-03-20", hours: 8 },
    { course: "농산물 온라인 판매 실무", provider: "농협중앙회", completedAt: "2026-06-05", hours: 12 },
  ],
}

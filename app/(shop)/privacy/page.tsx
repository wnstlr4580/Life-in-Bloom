import type { Metadata } from "next"

export const metadata: Metadata = { title: "개인정보처리방침" }

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. 수집하는 개인정보",
    body: [
      "회사는 서비스 제공을 위해 아래 정보를 수집합니다.",
      "· 회원 가입(카카오/구글 로그인): 이름, 이메일, 프로필 사진",
      "· 오행 분석: 이름, 성별, 생년월일, 태어난 시간, 태어난 도시 (선택 저장)",
      "· 주문·배송: 주문자와 받는 분의 이름, 연락처, 배송 주소",
      "· 결제: 결제 정보는 결제 대행사(포트원)가 처리하며, 회사는 카드번호를 저장하지 않습니다.",
    ],
  },
  {
    title: "2. 개인정보를 사용하는 목적",
    body: [
      "· 상품 주문, 결제, 배송",
      "· 오행 분석 결과 저장과 다음 방문 시 불러오기",
      "· 주문 관련 안내 연락",
      "· 서비스 개선을 위한 통계 (개인을 알아볼 수 없는 형태)",
    ],
  },
  {
    title: "3. 보관 기간",
    body: [
      "· 회원 정보: 회원 탈퇴 시까지",
      "· 주문·결제 기록: 전자상거래법에 따라 5년",
      "· 오행 포토부스 사진: 48시간 후 자동 삭제",
    ],
  },
  {
    title: "4. 제3자 제공",
    body: [
      "회사는 이용자의 동의 없이 개인정보를 다른 곳에 제공하지 않습니다. 단, 배송을 위해 택배사에 받는 분 정보(이름, 연락처, 주소)를 전달합니다.",
    ],
  },
  {
    title: "5. 처리 위탁",
    body: [
      "· 결제 처리: 포트원(PortOne)",
      "· 데이터 보관: Supabase, Vercel",
      "· 로그인: 카카오, 구글",
    ],
  },
  {
    title: "6. 이용자의 권리",
    body: [
      "이용자는 언제든지 자신의 개인정보를 확인하고, 수정하거나 삭제(회원 탈퇴)를 요청할 수 있습니다. 고객센터로 연락해 주세요.",
    ],
  },
  {
    title: "7. 개인정보 보호 책임자",
    body: [
      "· 이름: (지정 후 기재)",
      "· 연락처: (지정 후 기재)",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">개인정보처리방침</h1>
      <p className="text-sm text-stone-400 mb-10">시행일: 2026년 7월 7일</p>
      <div className="space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-base font-bold text-stone-700 mb-2">{s.title}</h2>
            <div className="space-y-1.5">
              {s.body.map((line, i) => (
                <p key={i} className="text-sm text-stone-600 leading-relaxed">{line}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

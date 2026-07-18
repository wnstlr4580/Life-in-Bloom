import Link from "next/link"
import { ChevronRight, ShoppingBag, Store } from "lucide-react"

export default function SignupTypePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <p className="text-4xl mb-3">🌸</p>
        <h1 className="text-2xl font-bold text-stone-800">어떤 계정으로 시작할까요?</h1>
        <p className="text-sm text-stone-500 mt-2">계정 유형에 따라 이용할 수 있는 기능이 달라요.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <Link href="/signup/customer" className="group bg-white rounded-3xl border border-stone-100 p-7 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-50 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-5">
            <ShoppingBag className="text-rose-400" size={23} />
          </div>
          <h2 className="text-lg font-bold text-stone-800 flex items-center justify-between">
            일반 사용자 회원가입 <ChevronRight size={18} className="text-stone-300 group-hover:text-rose-400" />
          </h2>
          <p className="text-sm text-stone-500 mt-2 leading-6">꽃을 구매하고 오행 추천, 리뷰, 포인트 서비스를 이용해요.</p>
          <p className="text-xs text-rose-400 mt-4">이메일 · 카카오 · 구글</p>
        </Link>
        <Link href="/signup/seller" className="group bg-white rounded-3xl border border-stone-100 p-7 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
            <Store className="text-emerald-500" size={23} />
          </div>
          <h2 className="text-lg font-bold text-stone-800 flex items-center justify-between">
            판매자 회원가입 <ChevronRight size={18} className="text-stone-300 group-hover:text-emerald-500" />
          </h2>
          <p className="text-sm text-stone-500 mt-2 leading-6">판매처와 사업자 정보를 등록하고 상품·꽃 재고를 관리해요.</p>
          <p className="text-xs text-emerald-600 mt-4">사업자 정보 제출 후 관리자 승인 필요</p>
        </Link>
      </div>
    </div>
  )
}

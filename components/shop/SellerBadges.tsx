import { Award } from "lucide-react"
import { NonghyupMark } from "@/components/brand/NonghyupMark"

// 농협 조합원 인증(관리자 승인)과 플로리스트 자격증 등록 판매처 표시
export function SellerBadges({ coop, florist, farm, className = "" }: { coop?: boolean; florist?: boolean; farm?: boolean; className?: string }) {
  if (!coop && !florist) return null
  return <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
    {coop && <span className="inline-flex items-center gap-1 rounded-full border border-[#8bc7aa] bg-[#f1faf5] py-0.5 pl-0.5 pr-2 text-[11px] font-bold text-[#007a4d]"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-white"><NonghyupMark compact/></span>{farm ? "조합원농가" : "조합원꽃집"}</span>}
    {florist && <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700"><Award size={11}/>플로리스트 인증</span>}
  </span>
}

import Link from "next/link"
import { ChevronRight, Star } from "lucide-react"

export type SellerReviewStat = { count: number; rating: number; image: string | null }

// 꽃집 카드·상품 상세에서 그 꽃집의 꽃다발 후기로 연결 (/gallery?seller=마켓명)
export function SellerReviewLink({ marketName, stat, className = "" }: { marketName: string; stat?: SellerReviewStat; className?: string }) {
  if (!stat?.count) return null
  return <Link href={`/gallery?seller=${encodeURIComponent(marketName)}`} target="_blank" className={`group inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-2.5 text-xs text-stone-600 shadow-sm transition hover:border-violet-300 hover:text-violet-700 ${className}`}>
    {stat.image
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={stat.image} alt="" className="h-7 w-7 rounded-full object-cover" />
      : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-50">💐</span>}
    <span className="flex items-center gap-0.5 font-bold text-stone-800"><Star size={12} className="fill-amber-400 text-amber-400" />{stat.rating.toFixed(1)}</span>
    <span>꽃다발 후기 {stat.count}개</span>
    <ChevronRight size={14} className="text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
  </Link>
}

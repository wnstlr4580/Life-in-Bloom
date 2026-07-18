import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, ExternalLink, Store } from "lucide-react"

interface Props {
  id: string
  name: string
  price: number
  images: string[]
  flowerMeaning: string | null
  category: string
  stock?: number
  ratingAvg?: number | null
  reviewCount?: number
  seller?: { marketName: string } | { marketName: string }[] | null
  purchaseType?: string
  externalUrl?: string | null
  partnerName?: string | null
  partnerBadge?: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  bouquet: "꽃다발",
  plant: "화분",
  wreath: "화환",
  dried: "드라이",
  subscription: "구독",
}

export function ProductCard({ id, name, price, images, flowerMeaning, category, stock, ratingAvg, reviewCount, seller, purchaseType, externalUrl, partnerName, partnerBadge }: Props) {
  const soldOut = stock === 0
  const sellerInfo = Array.isArray(seller) ? seller[0] : seller
  const external = purchaseType === "EXTERNAL" && Boolean(externalUrl)
  const marketName = external ? partnerName : sellerInfo?.marketName
  return (
    <Link href={external ? externalUrl! : `/products/${id}`} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="group">
      <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-rose-200 hover:shadow-lg transition-all duration-300">
        <div className="aspect-square bg-stone-50 relative overflow-hidden">
          {images[0] ? (external ? (
            // 제휴사 원본 이미지는 개발 서버의 next.config 재시작 없이도 안전하게 표시한다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[0]}
              alt={name}
              className={`h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ${soldOut ? "opacity-60 grayscale" : ""}`}
            />
          ) : (
            <Image
              src={images[0]}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              className={`object-cover group-hover:scale-105 transition-transform duration-500 ${soldOut ? "opacity-60 grayscale" : ""}`}
            />
          )) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl">🌸</span>
            </div>
          )}
          <span className="absolute top-2 left-2 bg-white/90 text-xs text-stone-500 px-2 py-0.5 rounded-full">
            {CATEGORY_LABEL[category] ?? category}
          </span>
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-stone-800/80 text-white text-sm font-semibold px-4 py-1.5 rounded-full">
                품절
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-sm font-semibold text-stone-800 line-clamp-1">{name}</p>
          {marketName && (
            <div className={`mt-2 flex items-center gap-1.5 rounded-full border px-2 py-1.5 ${external ? "border-amber-200 bg-amber-50/80" : "border-emerald-100 bg-emerald-50/70"}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${external ? "bg-gradient-to-br from-amber-300 to-yellow-600 text-white" : "bg-white text-emerald-700"}`}>
                {external ? <BadgeCheck size={12} /> : <Store size={11} />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-stone-700">{marketName}</span>
              {external && <span className="shrink-0 text-[9px] font-bold text-amber-700">공식 제휴</span>}
              {external && <ExternalLink size={11} className="shrink-0 text-amber-600" />}
            </div>
          )}
          {flowerMeaning && (
            <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{flowerMeaning}</p>
          )}
          {ratingAvg != null && (reviewCount ?? 0) > 0 && (
            <p className="text-xs text-stone-500 mt-1">
              <span className="text-amber-400">★</span> {ratingAvg}
              <span className="text-stone-400"> ({reviewCount})</span>
            </p>
          )}
          <p className="text-base font-bold text-rose-500 mt-1.5">
            {price.toLocaleString()}원
          </p>
        </div>
      </div>
    </Link>
  )
}

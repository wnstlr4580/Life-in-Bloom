import Image from "next/image"
import Link from "next/link"

interface Product {
  id: string
  name: string
  price: number
  images: string[]
  flowerMeaning: string | null
  category: string
  ohaengReason?: string // "왜 이 꽃인가" — 오행 점수에 기여한 근거 (예: "노란 색감 · 여름 개화")
}

interface Props {
  title: string
  products: Product[]
}

export function FlowerRecommendList({ title, products }: Props) {
  if (products.length === 0) return null

  return (
    <div>
      <h3 className="text-base font-semibold text-stone-700 mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="group bg-white rounded-xl overflow-hidden border border-stone-100 hover:border-rose-200 hover:shadow-md transition-all"
          >
            <div className="aspect-square bg-stone-50 relative overflow-hidden">
              {product.images[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 45vw, 240px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🌸</div>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs font-medium text-stone-800 line-clamp-1">{product.name}</p>
              {product.ohaengReason && (
                <p className="text-[11px] text-rose-400 mt-0.5 line-clamp-1">{product.ohaengReason}</p>
              )}
              {product.flowerMeaning && (
                <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{product.flowerMeaning}</p>
              )}
              <p className="text-sm font-bold text-rose-500 mt-1">
                {product.price.toLocaleString()}원
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

import Image from "next/image"
import Link from "next/link"

interface Props {
  id: string
  name: string
  price: number
  images: string[]
  flowerMeaning: string | null
  category: string
}

const CATEGORY_LABEL: Record<string, string> = {
  bouquet: "꽃다발",
  plant: "화분",
  wreath: "화환",
  dried: "드라이",
  subscription: "구독",
}

export function ProductCard({ id, name, price, images, flowerMeaning, category }: Props) {
  return (
    <Link href={`/products/${id}`} className="group">
      <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-rose-200 hover:shadow-lg transition-all duration-300">
        <div className="aspect-square bg-stone-50 relative overflow-hidden">
          {images[0] ? (
            <Image
              src={images[0]}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl">🌸</span>
            </div>
          )}
          <span className="absolute top-2 left-2 bg-white/90 text-xs text-stone-500 px-2 py-0.5 rounded-full">
            {CATEGORY_LABEL[category] ?? category}
          </span>
        </div>
        <div className="p-3">
          <p className="text-sm font-semibold text-stone-800 line-clamp-1">{name}</p>
          {flowerMeaning && (
            <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{flowerMeaning}</p>
          )}
          <p className="text-base font-bold text-rose-500 mt-1.5">
            {price.toLocaleString()}원
          </p>
        </div>
      </div>
    </Link>
  )
}

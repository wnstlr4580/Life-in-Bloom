import Link from "next/link"
import type { Ohaeng } from "@/lib/saju"
import { FLOWERS_BY_OHAENG } from "@/lib/flowers"

// 오행별 카드 색상
const OHAENG_STYLE: Record<Ohaeng, { bg: string; border: string; text: string; chip: string }> = {
  목: { bg: "bg-emerald-50/60", border: "border-emerald-100", text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700" },
  화: { bg: "bg-rose-50/60", border: "border-rose-100", text: "text-rose-600", chip: "bg-rose-100 text-rose-600" },
  토: { bg: "bg-amber-50/60", border: "border-amber-100", text: "text-amber-700", chip: "bg-amber-100 text-amber-700" },
  금: { bg: "bg-slate-50/80", border: "border-slate-200", text: "text-slate-600", chip: "bg-slate-100 text-slate-600" },
  수: { bg: "bg-blue-50/60", border: "border-blue-100", text: "text-blue-700", chip: "bg-blue-100 text-blue-700" },
}

const OHAENG_NAME: Record<Ohaeng, string> = { 목: "나무", 화: "불", 토: "흙", 금: "금", 수: "물" }

function FlowerCards({ ohaeng, count }: { ohaeng: Ohaeng; count: number }) {
  const style = OHAENG_STYLE[ohaeng]
  const flowers = FLOWERS_BY_OHAENG[ohaeng].slice(0, count)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {flowers.map((f) => (
        <div key={f.name} className={`rounded-xl border ${style.border} ${style.bg} p-3.5 text-center space-y-1.5`}>
          <span className="text-2xl block">{f.emoji}</span>
          <p className={`text-sm font-bold ${style.text}`}>{f.name}</p>
          <p className="text-[11px] text-stone-500 leading-snug">{f.meaning}</p>
          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${style.chip}`}>{f.color}</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  mainOhaeng: Ohaeng
  lackingOhaeng: Ohaeng[]
}

export function FlowerGuide({ mainOhaeng, lackingOhaeng }: Props) {
  return (
    <div className="space-y-8">
      {/* 나의 기운 꽃 사전 */}
      <div>
        <h3 className="text-base font-semibold text-stone-700 mb-1">
          🌸 {mainOhaeng}({OHAENG_NAME[mainOhaeng]}) 기운과 어울리는 꽃들
        </h3>
        <p className="text-xs text-stone-400 mb-3">
          꽃집에서 이 꽃들을 찾아보세요. 당신의 기운을 더 빛나게 해줘요.
        </p>
        <FlowerCards ohaeng={mainOhaeng} count={8} />
        <div className="text-center mt-4">
          <Link
            href={`/products?ohaeng=${mainOhaeng}`}
            className="inline-block px-5 py-2.5 rounded-full bg-rose-400 hover:bg-rose-500 text-white text-sm font-semibold transition-colors"
          >
            🛒 내 기운에 맞는 꽃 상품 보러 가기
          </Link>
        </div>
      </div>

      {/* 부족한 기운을 채워주는 꽃 */}
      {lackingOhaeng.map((o) => (
        <div key={o}>
          <h3 className="text-base font-semibold text-stone-700 mb-1">
            💧 부족한 {o}({OHAENG_NAME[o]}) 기운을 채워주는 꽃들
          </h3>
          <p className="text-xs text-stone-400 mb-3">
            이 꽃들을 곁에 두면 모자란 기운을 채우는 데 도움이 돼요.
          </p>
          <FlowerCards ohaeng={o} count={4} />
        </div>
      ))}
    </div>
  )
}

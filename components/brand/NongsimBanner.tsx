import Image from "next/image"
import type { Ohaeng } from "@/lib/saju"
import { OHAENG_HANJA, regionsOfOhaeng } from "@/lib/regionOhaeng"

export const NONGSIM_URL = "https://nongsim.nonghyup.com/"
/** 농심N천심 — 농촌 재능나눔 모집 (지역별 농촌 방문 · 일손 돕기) */
export const NONGSIM_TALENT_URL = "https://nongsim.nonghyup.com/PP/USPP0003.do"

/**
 * 농협 농심천심운동 포털 '농심N천심' 연계 배너.
 * lacking(부족한 오행)이 있으면 그 기운의 산지를 알려 주고, 그 농촌의 재능나눔 · 방문으로 잇는다.
 */
export function NongsimBanner({ lacking, className = "" }: { lacking?: Ohaeng[]; className?: string }) {
  const target = lacking?.[0]
  const regions = target ? regionsOfOhaeng(target) : []
  return (
    <section className={`rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-sky-50 px-5 py-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Image src="/partners/nongsim/nongsim_logo.png" alt="농심N천심" width={160} height={36} className="h-9 w-auto shrink-0 self-start sm:self-center" />
        <div className="flex-1">
          <p className="text-base font-bold text-stone-800">이 꽃이 자라는 농촌, 지금 가볼래요?</p>
          {target && regions.length > 0 ? (
            <p className="mt-1 text-sm text-stone-600">
              부족한 <strong className="text-emerald-700">{target}({OHAENG_HANJA[target]})</strong> 기운은{" "}
              <strong className="text-emerald-700">{regions.map((r) => r.region).join(" · ")}</strong> 산지가 품고 있어요
              <span className="text-stone-400"> — {regions[0].story}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-stone-600">농협 농심천심운동 포털에서 농촌 방문 · 체험과 재능나눔에 참여할 수 있어요</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 sm:justify-end">
        <a href={NONGSIM_TALENT_URL} target="_blank" rel="noopener noreferrer"
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
          {regions.length > 0 ? `${regions[0].region.split("·")[0]} 농촌 재능나눔 참여하기 →` : "농촌 재능나눔 참여하기 →"}
        </a>
        <a href={NONGSIM_URL} target="_blank" rel="noopener noreferrer"
          className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50">
          농심N천심 바로가기
        </a>
      </div>
    </section>
  )
}

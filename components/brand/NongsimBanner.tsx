import Image from "next/image"

export const NONGSIM_URL = "https://nongsim.nonghyup.com/"

/** 농협 농심천심운동 포털 '농심N천심' 바로가기 배너 */
export function NongsimBanner({ className = "" }: { className?: string }) {
  return (
    <a
      href={NONGSIM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-sky-50 px-5 py-4 transition-shadow hover:shadow-md ${className}`}
    >
      <Image
        src="/partners/nongsim/nongsim_logo.png"
        alt="농심N천심"
        width={160}
        height={36}
        className="h-9 w-auto shrink-0"
      />
      <div className="flex-1 text-center sm:text-left">
        <p className="text-sm font-bold text-stone-800">이 꽃이 자라는 농촌, 함께 가볼래요?</p>
        <p className="mt-0.5 text-xs text-stone-500">농협 농심천심운동 포털에서 농촌 방문·체험과 재능나눔에 참여할 수 있어요</p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-emerald-700 group-hover:underline">농심N천심 바로가기 →</span>
    </a>
  )
}

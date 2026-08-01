const OFFICIAL_NONGHYUP_SYMBOL = "/brand/nonghyup-symbol.svg"
const OFFICIAL_NONGHYUP_CI_PAGE = "https://www.nonghyup.com/introduce/ci/symbol.do"

export function isNonghyupName(...values: Array<string | null | undefined>) {
  // 일부 농협 운영 공판장은 대외 명칭에 '농협'이 없어 운영 주체 기준 별칭도 함께 판별한다.
  return values.some((value) => /농협|부산화훼공판장/.test(value ?? ""))
}

export function NonghyupMark({ label = "농협", compact = false, className = "" }: { label?: string; compact?: boolean; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 ${className}`} title="농협 공식 CI 기준 심벌">
    {/* 사용자가 제공한 공식 ai01.zip/심볼마크.ai를 웹용 SVG로 변환한 자산. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={OFFICIAL_NONGHYUP_SYMBOL} alt="농협 심벌" className={`${compact ? "h-4 w-4" : "h-7 w-7"} shrink-0 object-contain`} />
    {!compact && <span className="font-bold text-[#007a4d]">{label}</span>}
  </span>
}

export function NonghyupCiSourceLink() {
  return <a href={OFFICIAL_NONGHYUP_CI_PAGE} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-[#007a4d] underline decoration-[#ffb81c] underline-offset-2">농협 공식 CI</a>
}

export { OFFICIAL_NONGHYUP_SYMBOL }

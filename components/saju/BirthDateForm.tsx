"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Search, Clock } from "lucide-react"

interface SubmitData {
  name: string
  gender: "male" | "female"
  birthDate: string
  birthHour: string
  city: string
  calendarType: string
}

interface DefaultValues {
  name?: string
  gender?: string
  birthDate?: string
  calendarType?: string
  birthHour?: string
  city?: string
}

interface Props {
  onSubmit: (data: SubmitData) => void
  loading: boolean
  defaultValues?: DefaultValues
}

const ALL_CITIES = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "수원", "성남", "고양", "용인", "안산", "안양", "부천", "화성", "남양주",
  "의정부", "시흥", "파주", "김포", "광명", "군포", "오산", "이천", "양주",
  "구리", "안성", "포천", "의왕", "하남", "여주", "평택", "동두천", "과천",
  "춘천", "원주", "강릉", "동해", "태백", "속초", "삼척", "홍천", "횡성",
  "영월", "평창", "정선", "철원", "화천", "양구", "인제", "양양",
  "청주", "충주", "제천", "보은", "옥천", "영동", "증평", "진천", "괴산", "음성", "단양",
  "천안", "공주", "보령", "아산", "서산", "논산", "계룡", "당진", "금산",
  "부여", "서천", "청양", "홍성", "예산", "태안",
  "전주", "군산", "익산", "정읍", "남원", "김제", "완주", "진안", "무주",
  "장수", "임실", "순창", "고창", "부안",
  "목포", "여수", "순천", "나주", "광양", "담양", "곡성", "구례", "고흥",
  "보성", "화순", "장흥", "강진", "해남", "영암", "무안", "함평", "영광",
  "장성", "완도", "진도", "신안",
  "포항", "경주", "김천", "안동", "구미", "영주", "영천", "상주", "문경",
  "경산", "의성", "청송", "영양", "영덕", "청도", "고령", "성주", "칠곡",
  "예천", "봉화", "울진", "울릉",
  "창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령",
  "함안", "창녕", "남해", "하동", "산청", "함양", "거창", "합천",
  "제주시", "서귀포시",
  "해외",
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function BirthDateForm({ onSubmit, loading, defaultValues }: Props) {
  const [name, setName] = useState(defaultValues?.name ?? "")
  const [gender, setGender] = useState<"male" | "female">((defaultValues?.gender as "male" | "female") ?? "female")
  const [year, setYear] = useState(defaultValues?.birthDate?.slice(0, 4) ?? "")
  const [month, setMonth] = useState(defaultValues?.birthDate ? String(+defaultValues.birthDate.slice(5, 7)) : "")
  const [day, setDay] = useState(defaultValues?.birthDate ? String(+defaultValues.birthDate.slice(8, 10)) : "")
  const [calendarType, setCalendarType] = useState(defaultValues?.calendarType ?? "solar")
  const [timeKnown, setTimeKnown] = useState(
    !defaultValues?.birthHour || defaultValues.birthHour === "unknown" ? true : true
  )
  const [ampm, setAmpm] = useState(() => {
    if (!defaultValues?.birthHour || defaultValues.birthHour === "unknown") return "오전"
    const h = parseInt(defaultValues.birthHour)
    return h >= 12 ? "오후" : "오전"
  })
  const [timeHour, setTimeHour] = useState(() => {
    if (!defaultValues?.birthHour || defaultValues.birthHour === "unknown") return ""
    const h = parseInt(defaultValues.birthHour)
    if (h === 0) return "12"
    if (h > 12) return String(h - 12)
    return String(h)
  })
  const [timeMin, setTimeMin] = useState(() => {
    if (!defaultValues?.birthHour || defaultValues.birthHour === "unknown") return ""
    return defaultValues.birthHour.includes(":") ? defaultValues.birthHour.split(":")[1].padStart(2, "0") : ""
  })
  const [cityQuery, setCityQuery] = useState(defaultValues?.city ?? "")
  const [cityOpen, setCityOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  const cityInputRef = useRef<HTMLInputElement>(null)

  // 도시 드롭다운 위치를 input 기준으로 계산
  const openCityDropdown = () => {
    if (cityInputRef.current) {
      const rect = cityInputRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
    setCityOpen(true)
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (cityInputRef.current && !cityInputRef.current.contains(e.target as Node)) {
        setCityOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const days = year && month
    ? Array.from({ length: getDaysInMonth(+year, +month) }, (_, i) => i + 1)
    : Array.from({ length: 31 }, (_, i) => i + 1)

  const filteredCities = cityQuery.trim()
    ? ALL_CITIES.filter((c) => c.includes(cityQuery)).slice(0, 8)
    : ALL_CITIES.slice(0, 8)

  const birthDate = year && month && day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : ""

  const canSubmit = name.trim().length > 0 && year !== "" && month !== "" && day !== ""

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      gender,
      birthDate,
      birthHour: timeKnown && timeHour && timeMin
        ? `${ampm === "오후" && timeHour !== "12" ? +timeHour + 12 : ampm === "오전" && timeHour === "12" ? 0 : +timeHour}:${timeMin}`
        : "unknown",
      city: cityQuery.trim() || "미입력",
      calendarType,
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 이름 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-stone-700">이름</Label>
          <input
            type="text"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-rose-300"
          />
        </div>

        {/* 성별 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-stone-700">성별</Label>
          <div className="flex gap-3">
            {([["female", "여성"], ["male", "남성"]] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setGender(val)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  gender === val
                    ? "bg-rose-400 border-rose-400 text-white"
                    : "bg-white border-stone-200 text-stone-600 hover:border-rose-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 생년월일 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-stone-700">생년월일</Label>
          <div className="flex gap-2">
            <select
              value={year}
              onChange={(e) => { setYear(e.target.value); setDay("") }}
              className="flex-[2] rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
            >
              <option value="">년도</option>
              {YEARS.map((y) => <option key={y} value={String(y)}>{y}년</option>)}
            </select>
            <select
              value={month}
              onChange={(e) => { setMonth(e.target.value); setDay("") }}
              className="flex-1 rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
            >
              <option value="">월</option>
              {MONTHS.map((m) => <option key={m} value={String(m)}>{m}월</option>)}
            </select>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="flex-1 rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
            >
              <option value="">일</option>
              {days.map((d) => <option key={d} value={String(d)}>{d}일</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-0.5">
            {["solar", "lunar"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCalendarType(type)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  calendarType === type
                    ? "bg-rose-400 border-rose-400 text-white"
                    : "bg-white border-stone-200 text-stone-500 hover:border-rose-300"
                }`}
              >
                {type === "solar" ? "양력" : "음력"}
              </button>
            ))}
          </div>
        </div>

        {/* 태어난 시간 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-stone-700">태어난 시간</Label>
            <button
              type="button"
              onClick={() => setTimeKnown((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                !timeKnown
                  ? "bg-rose-50 border-rose-300 text-rose-500"
                  : "bg-stone-50 border-stone-200 text-stone-400"
              }`}
            >
              <Clock size={11} />
              시간 모름
            </button>
          </div>
          {timeKnown ? (
            <div className="flex gap-2">
              <select
                value={ampm}
                onChange={(e) => setAmpm(e.target.value)}
                className="rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
              >
                <option value="오전">오전</option>
                <option value="오후">오후</option>
              </select>
              <select
                value={timeHour}
                onChange={(e) => setTimeHour(e.target.value)}
                className="flex-1 rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
              >
                <option value="">시</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={String(h)}>{h}시</option>
                ))}
              </select>
              <select
                value={timeMin}
                onChange={(e) => setTimeMin(e.target.value)}
                className="flex-1 rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:border-rose-300"
              >
                <option value="">분</option>
                {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                  <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}분</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-stone-400 bg-rose-50 rounded-lg px-3 py-2 text-center border border-rose-100">
              시간 모름 — 노년기 기운 분석이 제외됩니다
            </p>
          )}
        </div>

        {/* 태어난 도시 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-stone-700">태어난 도시</Label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              ref={cityInputRef}
              type="text"
              placeholder="도시 검색 (예: 서울, 수원, 해외)"
              value={cityQuery}
              onChange={(e) => { setCityQuery(e.target.value); openCityDropdown() }}
              onFocus={openCityDropdown}
              className="w-full rounded-lg border border-stone-200 pl-8 pr-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-rose-300"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full bg-rose-400 hover:bg-rose-500 text-white disabled:opacity-40"
        >
          {loading ? "분석 중..." : "나의 꽃 찾기 🌸"}
        </Button>
      </form>

      {/* 도시 드롭다운 — fixed 포지션으로 카드 밖에 렌더링 */}
      {cityOpen && filteredCities.length > 0 && (
        <ul
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
          }}
          className="bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden"
        >
          {filteredCities.map((c) => (
            <li
              key={c}
              onMouseDown={(e) => {
                e.preventDefault()
                setCityQuery(c)
                setCityOpen(false)
              }}
              className={`px-3 py-2.5 text-sm cursor-pointer transition-colors hover:bg-rose-50 hover:text-rose-600 ${
                cityQuery === c ? "bg-rose-50 text-rose-600 font-medium" : "text-stone-700"
              }`}
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

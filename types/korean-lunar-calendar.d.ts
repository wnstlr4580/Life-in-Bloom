declare module "korean-lunar-calendar" {
  export default class KoreanLunarCalendar {
    setLunarDate(year: number, month: number, day: number, intercalation: boolean): boolean
    setSolarDate(year: number, month: number, day: number): boolean
    getSolarCalendar(): { year: number; month: number; day: number }
    getLunarCalendar(): { year: number; month: number; day: number; intercalation: boolean }
  }
}

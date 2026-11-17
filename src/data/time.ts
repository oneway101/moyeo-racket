/**
 * 시각은 서버나 휴대폰의 시간대와 상관없이 항상 한국 시간으로 보여주고 입력받는다.
 * 저장은 ISO 문자열(UTC)로 하고, 화면에 낼 때와 입력을 받을 때만 한국 시간으로 바꾼다.
 */

const KST = 'Asia/Seoul'
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
export const DAY_MS = 86_400_000

const partsFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export interface KstParts {
  /** "2026-10-24" */
  date: string
  /** "07:00" */
  time: string
  month: number
  day: number
  /** 일요일이 0 */
  weekday: number
}

/** ISO 시각을 한국 시간의 날짜와 시각으로 나눈다 */
export function kstParts(iso: string): KstParts {
  const p: Record<string, string> = {}
  for (const part of partsFormat.formatToParts(new Date(iso))) p[part.type] = part.value
  const date = `${p.year}-${p.month}-${p.day}`
  return {
    date,
    time: `${p.hour}:${p.minute}`,
    month: Number(p.month),
    day: Number(p.day),
    weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
  }
}

/** 한국 시간의 날짜("2026-10-24")와 시각("07:00")을 ISO 시각으로 바꾼다. 비어 있거나 틀리면 null */
export function kstToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const d = new Date(`${date}T${time}:00+09:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString()
}

/** "10/24(토) 07:00" */
export function formatKst(iso: string): string {
  const p = kstParts(iso)
  return `${p.month}/${p.day}(${WEEKDAYS[p.weekday]}) ${p.time}`
}

/** "10/24" */
export function formatKstDay(iso: string): string {
  const p = kstParts(iso)
  return `${p.month}/${p.day}`
}

/** 남은 시간이나 지난 시간을 "45분", "3시간", "2일"처럼 줄여 말한다 */
export function formatSpan(ms: number): string {
  const abs = Math.abs(ms)
  if (abs < 3_600_000) return `${Math.max(1, Math.floor(abs / 60_000))}분`
  if (abs < DAY_MS) return `${Math.floor(abs / 3_600_000)}시간`
  return `${Math.floor(abs / DAY_MS)}일`
}

// ── 달력용 날짜 계산. 날짜는 한국 시간 기준의 "2026-10-24" 문자열로 다룬다 ──

const asUtc = (date: string) => new Date(`${date}T00:00:00Z`)
const fromUtc = (d: Date) => d.toISOString().slice(0, 10)

/** 한국 시간으로 오늘 날짜 */
export function todayKst(now: number = Date.now()): string {
  return kstParts(new Date(now).toISOString()).date
}

export function addDate(date: string, days: number): string {
  return fromUtc(new Date(asUtc(date).getTime() + days * DAY_MS))
}

/** 월요일이 0, 일요일이 6 */
export function weekdayMon(date: string): number {
  return (asUtc(date).getUTCDay() + 6) % 7
}

/** 그 날짜가 속한 주의 월요일 */
export function mondayOf(date: string): string {
  return addDate(date, -weekdayMon(date))
}

/** 달을 옮긴다. 옮긴 달에 그 날짜가 없으면 말일로 맞춘다 */
export function addMonths(date: string, months: number): string {
  const d = asUtc(date)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return fromUtc(d)
}

export function daysInMonth(date: string): number {
  const d = asUtc(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
}

export const WEEKDAYS_MON = ['월', '화', '수', '목', '금', '토', '일']

/** 날짜 문자열을 숫자로 나눈다 */
export function dateParts(date: string): { year: number; month: number; day: number; wd: string } {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day, wd: WEEKDAYS_MON[weekdayMon(date)] }
}

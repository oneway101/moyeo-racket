import { addDate, dateParts, daysInMonth, kstParts } from './time'

/**
 * 정기 모임의 반복 규칙. 날짜는 한국 시간 기준의 "2026-11-21" 문자열로 다룬다.
 *
 * 반복 기준은 첫 모임 날짜에서 만든 네 가지 중 하나다.
 * - 매주 그 요일, 격주 그 요일
 * - 매월 그 날짜. 그 날짜가 없는 달은 말일에 연다
 * - 매월 몇째 주 그 요일. 첫 모임이 그 달의 마지막 그 요일이면 "매월 마지막 주 그 요일"
 */

export type Repeat = 'weekly' | 'biweekly' | 'monthlyDate' | 'monthlyNth'

const WEEKDAY_NAMES = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
const NTH_NAMES = ['첫째', '둘째', '셋째', '넷째']

/** 그 달에서 몇째 그 요일인지. 마지막 그 요일이면 'last' */
export function nthWeekday(date: string): number | 'last' {
  const { day } = dateParts(date)
  if (day + 7 > daysInMonth(date)) return 'last'
  return Math.ceil(day / 7)
}

const weekdayName = (date: string) => WEEKDAY_NAMES[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7]

/** "매주 토요일", "격주 토요일", "매월 21일", "매월 셋째 주 토요일", "매월 마지막 주 토요일" */
export function repeatLabel(repeat: Repeat, firstDate: string): string {
  const wd = weekdayName(firstDate)
  if (repeat === 'weekly') return `매주 ${wd}`
  if (repeat === 'biweekly') return `격주 ${wd}`
  if (repeat === 'monthlyDate') return `매월 ${dateParts(firstDate).day}일`
  const nth = nthWeekday(firstDate)
  return `매월 ${nth === 'last' ? '마지막' : NTH_NAMES[nth - 1]} 주 ${wd}`
}

/** 년, 월(1~12)의 그 날짜. 그 날짜가 없으면 말일 */
function dayInMonth(year: number, month: number, day: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
}

/** 년, 월의 n번째(또는 마지막) 그 요일. 요일은 일요일이 0 */
function nthInMonth(year: number, month: number, weekday: number, nth: number | 'last'): string {
  if (nth === 'last') {
    const last = new Date(Date.UTC(year, month, 0))
    const back = (last.getUTCDay() - weekday + 7) % 7
    return last.toISOString().slice(0, 10).replace(/\d{2}$/, String(last.getUTCDate() - back).padStart(2, '0'))
  }
  const first = new Date(Date.UTC(year, month - 1, 1))
  const forward = (weekday - first.getUTCDay() + 7) % 7
  return dayInMonth(year, month, 1 + forward + (nth - 1) * 7)
}

/** k번째 회차의 날짜. 첫 모임이 0번째다 */
export function occurrenceAt(firstDate: string, repeat: Repeat, k: number): string {
  if (repeat === 'weekly') return addDate(firstDate, 7 * k)
  if (repeat === 'biweekly') return addDate(firstDate, 14 * k)
  const { year, month, day } = dateParts(firstDate)
  const total = year * 12 + (month - 1) + k
  const y = Math.floor(total / 12), m = (total % 12) + 1
  if (repeat === 'monthlyDate') return dayInMonth(y, m, day)
  return nthInMonth(y, m, new Date(`${firstDate}T00:00:00Z`).getUTCDay(), nthWeekday(firstDate))
}

/**
 * fromDate 이후(그날 포함)의 회차 날짜를 count개까지 돌려준다.
 * 첫 모임보다 앞선 회차는 만들지 않고, 종료일이 있으면 그보다 뒤의 회차도 만들지 않는다.
 */
export function upcomingDates(
  firstDate: string, repeat: Repeat, endDate: string | null, fromDate: string, count: number,
): string[] {
  const out: string[] = []
  for (let k = 0; out.length < count && k < 1200; k++) {
    const date = occurrenceAt(firstDate, repeat, k)
    if (endDate && date > endDate) break
    if (date >= fromDate) out.push(date)
  }
  return out
}

/** 모임 시각보다 얼마나 앞서 열리고 닫히는지를 "모임 7일 전 같은 시각", "모임 2일 전 20:00"처럼 말한다 */
export function offsetText(meetingIso: string, offsetMs: number): string {
  const at = kstParts(meetingIso)
  const point = kstParts(new Date(new Date(meetingIso).getTime() - offsetMs).toISOString())
  const days = Math.round((Date.parse(`${at.date}T00:00:00Z`) - Date.parse(`${point.date}T00:00:00Z`)) / 86_400_000)
  const dayText = days === 0 ? '모임 당일' : days === 1 ? '모임 하루 전' : days === 14 ? '모임 2주 전' : `모임 ${days}일 전`
  return point.time === at.time ? `${dayText} 같은 시각` : `${dayText} ${point.time}`
}

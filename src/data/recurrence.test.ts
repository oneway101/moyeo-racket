import { describe, expect, it } from 'vitest'
import { nthWeekday, occurrenceAt, offsetText, repeatLabel, upcomingDates } from './recurrence'

describe('반복 이름', () => {
  it('첫 모임 날짜에서 네 가지 이름을 만든다', () => {
    expect(repeatLabel('weekly', '2026-11-21')).toBe('매주 토요일')
    expect(repeatLabel('biweekly', '2026-11-21')).toBe('격주 토요일')
    expect(repeatLabel('monthlyDate', '2026-11-21')).toBe('매월 21일')
    expect(repeatLabel('monthlyNth', '2026-11-21')).toBe('매월 셋째 주 토요일')
  })

  it('그 달의 마지막 그 요일이면 "마지막 주"가 된다', () => {
    expect(nthWeekday('2026-11-28')).toBe('last') // 11월의 마지막 토요일
    expect(repeatLabel('monthlyNth', '2026-11-28')).toBe('매월 마지막 주 토요일')
    expect(nthWeekday('2026-11-22')).toBe(4) // 11/22 일요일 뒤에 11/29 일요일이 있다
  })
})

describe('회차 날짜', () => {
  it('매주와 격주', () => {
    expect(upcomingDates('2026-11-21', 'weekly', null, '2026-11-21', 3)).toEqual(['2026-11-21', '2026-11-28', '2026-12-05'])
    expect(upcomingDates('2026-11-21', 'biweekly', null, '2026-11-21', 3)).toEqual(['2026-11-21', '2026-12-05', '2026-12-19'])
  })

  it('매월 그 날짜. 그 날짜가 없는 달은 말일에 연다', () => {
    expect(upcomingDates('2027-01-31', 'monthlyDate', null, '2027-01-01', 4)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30'])
  })

  it('말일로 당겨진 다음 달에도 원래 날짜로 돌아간다', () => {
    expect(occurrenceAt('2027-01-31', 'monthlyDate', 2)).toBe('2027-03-31')
  })

  it('매월 몇째 주 그 요일', () => {
    expect(upcomingDates('2026-11-21', 'monthlyNth', null, '2026-11-01', 3)).toEqual(['2026-11-21', '2026-12-19', '2027-01-16'])
  })

  it('매월 마지막 주 그 요일', () => {
    expect(upcomingDates('2026-11-28', 'monthlyNth', null, '2026-11-01', 3)).toEqual(['2026-11-28', '2026-12-26', '2027-01-30'])
  })

  it('해를 넘겨도 이어진다', () => {
    expect(occurrenceAt('2026-12-10', 'monthlyDate', 1)).toBe('2027-01-10')
  })

  it('첫 모임보다 앞선 회차는 없다', () => {
    expect(upcomingDates('2026-12-05', 'weekly', null, '2026-11-01', 1)).toEqual(['2026-12-05'])
  })

  it('지난 회차는 건너뛰고 오늘부터 센다', () => {
    expect(upcomingDates('2026-11-07', 'weekly', null, '2026-11-18', 2)).toEqual(['2026-11-21', '2026-11-28'])
  })

  it('종료일보다 뒤의 회차는 만들지 않는다', () => {
    expect(upcomingDates('2026-11-21', 'weekly', '2026-12-05', '2026-11-21', 10)).toEqual(['2026-11-21', '2026-11-28', '2026-12-05'])
  })
})

describe('열고 닫는 시점 문장', () => {
  const at = new Date('2026-11-21T07:00:00+09:00').toISOString()
  const DAY = 86_400_000
  it('며칠 전 같은 시각', () => {
    expect(offsetText(at, 7 * DAY)).toBe('모임 7일 전 같은 시각')
    expect(offsetText(at, 14 * DAY)).toBe('모임 2주 전 같은 시각')
    expect(offsetText(at, DAY)).toBe('모임 하루 전 같은 시각')
  })
  it('직접 고른 시각', () => {
    expect(offsetText(at, 2 * DAY + 11 * 3_600_000)).toBe('모임 3일 전 20:00')
    expect(offsetText(at, 2 * 3_600_000)).toBe('모임 당일 05:00')
  })
})

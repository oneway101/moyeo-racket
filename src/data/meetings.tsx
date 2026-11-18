import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useClubs } from './clubs'
import { upcomingDates, type Repeat } from './recurrence'
import { kstParts, kstToIso, todayKst } from './time'

/**
 * 모임(참석 투표). 지금은 이 브라우저에만 저장하는 가짜 데이터이고,
 * 나중에 같은 모양의 함수로 실제 데이터베이스에 연결한다.
 */

export const TITLE_MAX = 50
export const PLACE_MAX = 100
export const CAPACITY_MAX = 999
/** 투표 시작은 모임 며칠 전부터 고를 수 있는지 */
export const OPEN_DAYS_MAX = 14

/** 모임 며칠 전에 여는지. 직접 고른 시각이면 'custom' */
export type OpenRule = 14 | 7 | 3 | 1 | 'custom'
export type CloseRule = 1 | 3 | 5 | 'custom'
/** 시작 전, 진행 중, 마감 */
export type MeetingStatus = 'ready' | 'open' | 'closed'

export interface MeetingInput {
  title: string
  /** 모임 일시 (ISO) */
  at: string
  place: string
  /** 정원. 없으면 인원 제한이 없다 */
  capacity: number | null
  /** 최소 인원. 마감 때 참석 인원이 이보다 적으면 모임이 자동으로 취소된다 */
  minPeople: number | null
  openRule: OpenRule
  opensAt: string
  closeRule: CloseRule
  closesAt: string
  guestAllowed: boolean
  guestInCapacity: boolean
}

export interface Meeting extends MeetingInput {
  id: string
  clubId: string
  status: MeetingStatus
  /** 정기 모임이 만든 모임이면 그 정기 모임 id */
  templateId?: string
  /** 정기 모임의 몇 월 며칠 회차인지 */
  occurrence?: string
}

type Stored = Omit<Meeting, 'status'>

/** 정기 모임 설정. 회차마다 투표 시작 시각이 되면 이 설정으로 모임이 만들어진다 */
export interface TemplateInput {
  title: string
  /** 첫 모임 일시 (ISO). 시각은 모든 회차에 같이 쓴다 */
  firstAt: string
  repeat: Repeat
  /** 반복 종료일. 없으면 계속 반복 */
  endDate: string | null
  place: string
  capacity: number | null
  minPeople: number | null
  openRule: OpenRule
  /** 모임 시각보다 얼마나 앞서 투표를 여는지 (밀리초) */
  openOffset: number
  closeRule: CloseRule
  closeOffset: number
  guestAllowed: boolean
  guestInCapacity: boolean
}

export interface Template extends TemplateInput {
  id: string
  clubId: string
  /** 건너뛰기로 한 회차 날짜 */
  skips: string[]
  /** 이미 모임이 만들어진 회차 날짜. 한 회차에 모임은 하나만 만든다 */
  made: string[]
}

/** 정기 모임의 한 회차 */
export interface Occurrence {
  date: string
  at: string
  opensAt: string
  closesAt: string
  skipped: boolean
  /** 이미 만들어진 모임 */
  meeting: Meeting | null
}

interface MeetingsValue {
  /** 지금 보는 클럽의 모임 */
  meetings: Meeting[]
  getMeeting: (id: string) => Meeting | null
  /** 지금 시각. 30초마다 바뀐다 */
  now: number
  createMeeting: (input: MeetingInput) => string
  updateMeeting: (id: string, input: MeetingInput) => void
  /** 진행 중인 모임을 지금 마감한다 */
  closeNow: (id: string) => void
  /** 모임을 지운다. 되돌릴 수 없다 */
  deleteMeeting: (id: string) => void

  /** 지금 보는 클럽의 정기 모임 */
  templates: Template[]
  getTemplate: (id: string) => Template | null
  /** 다가오는 회차. 모임 시각이 지나지 않은 것부터 count개 */
  upcomingOf: (template: Template, count: number) => Occurrence[]
  createTemplate: (input: TemplateInput) => string
  /** 정기 모임 설정을 고친다. 이미 만들어진 모임은 바뀌지 않는다 */
  updateTemplate: (id: string, input: TemplateInput) => void
  /** 회차 건너뛰기와 그 취소. 모임이 만들어지기 전에만 고를 수 있다 */
  setSkip: (id: string, date: string, skip: boolean) => void
  /** 모임 중단. 정기 모임과 아직 모임 시각이 지나지 않은 모임을 모두 지운다 */
  stopTemplate: (id: string) => void
}

const TEMPLATES_KEY = 'moyeo.templates.v1'

function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (raw) return JSON.parse(raw) as Template[]
  } catch {
    // 아래에서 빈 목록으로 시작한다
  }
  return []
}

/** 정기 모임의 그 회차 일시 */
function occurrenceTimes(t: TemplateInput, date: string) {
  const at = kstToIso(date, kstParts(t.firstAt).time) ?? t.firstAt
  const ms = new Date(at).getTime()
  return { at, opensAt: new Date(ms - t.openOffset).toISOString(), closesAt: new Date(ms - t.closeOffset).toISOString() }
}

const STORAGE_KEY = 'moyeo.meetings.v1'

function load(): Stored[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Stored[]
  } catch {
    // 아래에서 빈 목록으로 시작한다
  }
  return []
}

function save(data: unknown, key: string = STORAGE_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // 저장소를 쓸 수 없으면 새로고침할 때 사라진다
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function statusOf(m: { opensAt: string; closesAt: string }, now: number): MeetingStatus {
  if (now < new Date(m.opensAt).getTime()) return 'ready'
  if (now < new Date(m.closesAt).getTime()) return 'open'
  return 'closed'
}

const MeetingsContext = createContext<MeetingsValue | null>(null)

export function MeetingsProvider({ children }: { children: ReactNode }) {
  const { current } = useClubs()
  const [data, setData] = useState<Stored[]>(load)
  const [now, setNow] = useState(() => Date.now())
  const latest = useRef(data)
  const [templates, setTemplates] = useState<Template[]>(loadTemplates)
  const latestTemplates = useRef(templates)

  // 시작과 마감이 시각에 따라 바뀌므로 주기적으로 다시 계산한다
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const update = useCallback((change: (prev: Stored[]) => Stored[]) => {
    const next = change(latest.current)
    latest.current = next
    save(next)
    setData(next)
    setNow(Date.now())
  }, [])

  const updateTemplates = useCallback((change: (prev: Template[]) => Template[]) => {
    const next = change(latestTemplates.current)
    latestTemplates.current = next
    save(next, TEMPLATES_KEY)
    setTemplates(next)
  }, [])

  // 회차마다 투표 시작 시각이 되면 모임을 만든다. 마감 전인 회차만 만들고, 한 회차에 하나뿐이다.
  // 지금은 앱이 열려 있을 때 실행하고, 나중에는 서버가 1분마다 실행한다
  useEffect(() => {
    const due: { tid: string; meeting: Stored }[] = []
    const today = todayKst(now)
    for (const t of templates) {
      // 투표는 모임 14일 전보다 일찍 열리지 않으므로 앞으로 3주 안의 회차만 보면 된다
      for (const date of upcomingDates(kstParts(t.firstAt).date, t.repeat, t.endDate, today, 4)) {
        if (t.made.includes(date) || t.skips.includes(date)) continue
        const times = occurrenceTimes(t, date)
        if (now < new Date(times.opensAt).getTime() || now >= new Date(times.closesAt).getTime()) continue
        due.push({
          tid: t.id,
          meeting: {
            id: `mt-${t.id}-${date}`, clubId: t.clubId, templateId: t.id, occurrence: date,
            title: t.title, place: t.place, capacity: t.capacity, minPeople: t.minPeople,
            openRule: t.openRule, closeRule: t.closeRule, guestAllowed: t.guestAllowed, guestInCapacity: t.guestInCapacity,
            ...times,
          },
        })
      }
    }
    if (due.length === 0) return
    update((prev) => [...prev, ...due.map((d) => d.meeting).filter((m) => !prev.some((x) => x.id === m.id))])
    updateTemplates((prev) =>
      prev.map((t) => {
        const dates = due.filter((d) => d.tid === t.id).map((d) => d.meeting.occurrence as string)
        return dates.length ? { ...t, made: [...t.made, ...dates] } : t
      }),
    )
  }, [now, templates, update, updateTemplates])

  const clubId = current?.id ?? null
  const isAdmin = current?.role === 'admin'

  const value = useMemo<MeetingsValue>(() => {
    const meetings = data.filter((m) => m.clubId === clubId).map((m) => ({ ...m, status: statusOf(m, now) }))
    const mine = templates.filter((t) => t.clubId === clubId)
    return {
      meetings,
      now,
      getMeeting: (id) => meetings.find((m) => m.id === id) ?? null,
      // 모임을 만들고 고치는 것은 운영진만 한다
      createMeeting: (input) => {
        const id = `mt-${Date.now().toString(36)}`
        if (isAdmin && clubId) update((prev) => [...prev, { ...input, id, clubId }])
        return id
      },
      updateMeeting: (id, input) => {
        if (!isAdmin) return
        update((prev) => prev.map((m) => (m.id === id && m.clubId === clubId ? { ...m, ...input } : m)))
      },
      closeNow: (id) => {
        const target = meetings.find((m) => m.id === id)
        if (!isAdmin || target?.status !== 'open') return
        const at = new Date().toISOString()
        update((prev) => prev.map((m) => (m.id === id ? { ...m, closesAt: at, closeRule: 'custom' } : m)))
      },
      deleteMeeting: (id) => {
        if (!isAdmin) return
        update((prev) => prev.filter((m) => !(m.id === id && m.clubId === clubId)))
      },

      templates: mine,
      getTemplate: (id) => mine.find((t) => t.id === id) ?? null,
      upcomingOf: (t, count) => {
        // 오늘 모임이 이미 끝났으면 빼고 count개를 채우려고 하나 더 구한다
        const dates = upcomingDates(kstParts(t.firstAt).date, t.repeat, t.endDate, todayKst(now), count + 1)
        return dates
          .map((date) => {
            const meeting = meetings.find((m) => m.templateId === t.id && m.occurrence === date) ?? null
            const times = meeting ? { at: meeting.at, opensAt: meeting.opensAt, closesAt: meeting.closesAt } : occurrenceTimes(t, date)
            return { date, ...times, skipped: t.skips.includes(date), meeting }
          })
          .filter((o) => new Date(o.at).getTime() > now)
          .slice(0, count)
      },
      createTemplate: (input) => {
        const id = `rg-${Date.now().toString(36)}`
        if (isAdmin && clubId) updateTemplates((prev) => [...prev, { ...input, id, clubId, skips: [], made: [] }])
        return id
      },
      updateTemplate: (id, input) => {
        if (!isAdmin) return
        updateTemplates((prev) => prev.map((t) => (t.id === id && t.clubId === clubId ? { ...t, ...input } : t)))
      },
      setSkip: (id, date, skip) => {
        const t = mine.find((x) => x.id === id)
        if (!isAdmin || !t || t.made.includes(date)) return
        const skips = skip ? [...new Set([...t.skips, date])] : t.skips.filter((d) => d !== date)
        updateTemplates((prev) => prev.map((x) => (x.id === id ? { ...x, skips } : x)))
      },
      stopTemplate: (id) => {
        if (!isAdmin || !mine.some((t) => t.id === id)) return
        const at = Date.now()
        // 모임 시각이 지난 모임과 참석 내역은 그대로 남는다
        update((prev) => prev.filter((m) => !(m.templateId === id && new Date(m.at).getTime() > at)))
        updateTemplates((prev) => prev.filter((t) => t.id !== id))
      },
    }
  }, [data, templates, now, clubId, isAdmin, update, updateTemplates])

  return <MeetingsContext.Provider value={value}>{children}</MeetingsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMeetings(): MeetingsValue {
  const value = useContext(MeetingsContext)
  if (!value) throw new Error('MeetingsProvider 안에서만 쓸 수 있어요')
  return value
}

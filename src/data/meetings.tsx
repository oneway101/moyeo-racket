import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useClubs } from './clubs'

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
}

type Stored = Omit<Meeting, 'status'>

interface MeetingsValue {
  /** 지금 보는 클럽의 모임 */
  meetings: Meeting[]
  getMeeting: (id: string) => Meeting | null
  /** 지금 시각. 30초마다 바뀐다 */
  now: number
  createMeeting: (input: MeetingInput) => string
  updateMeeting: (id: string, input: MeetingInput) => void
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

function save(data: Stored[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
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

  const clubId = current?.id ?? null
  const isAdmin = current?.role === 'admin'

  const value = useMemo<MeetingsValue>(() => {
    const meetings = data.filter((m) => m.clubId === clubId).map((m) => ({ ...m, status: statusOf(m, now) }))
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
    }
  }, [data, now, clubId, isAdmin, update])

  return <MeetingsContext.Provider value={value}>{children}</MeetingsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMeetings(): MeetingsValue {
  const value = useContext(MeetingsContext)
  if (!value) throw new Error('MeetingsProvider 안에서만 쓸 수 있어요')
  return value
}

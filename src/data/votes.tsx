import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ME, useClubs } from './clubs'
import { useMeetings, type Meeting } from './meetings'
import { cancelLate, lineUp, pickAttend, pickNo, placeOf, previewWait, setLate, type Place, type Vote, type Voter } from './roster'

/**
 * 모임별 투표. 지금은 이 브라우저에만 저장하는 가짜 데이터이고,
 * 나중에 같은 모양의 함수로 실제 데이터베이스에 연결한다.
 * 순번과 대기 계산은 roster.ts의 규칙을 그대로 쓴다.
 */

/** 명단의 한 줄 */
export interface Row {
  id: string
  name: string
  nick: string
  isMe: boolean
  /** 늦참이면 도착 예정 시각 */
  lateTime: string | null
}

export interface Roster {
  attend: Row[]
  wait: Row[]
  no: Row[]
  /** 아직 투표하지 않은 회원 */
  maybe: Row[]
  /** 내 표. 투표하지 않았으면 null */
  mine: Vote | null
  /** 내 자리 */
  place: Place
  /** 지금 참석을 누르면 대기 몇 번이 되는지. 바로 참석이면 0 */
  waitIfAttend: number
  /** 지금 늦참으로 바꾸면 대기 몇 번이 되는지 */
  waitIfLate: number
  /** 마감 때 참석 인원이 최소 인원에 못 미쳐 취소된 모임 */
  canceled: boolean
}

type Stored = Record<string, Vote[]>

interface VotesValue {
  rosterOf: (meeting: Meeting) => Roster
  /** 참석 버튼. 이미 참석이나 늦참이면 투표를 취소한다 */
  attend: (meetingId: string) => void
  /** 불참 버튼. 이미 불참이면 투표를 취소한다 */
  decline: (meetingId: string) => void
  setLateTime: (meetingId: string, time: string) => void
  cancelLateTime: (meetingId: string) => void
}

const STORAGE_KEY = 'moyeo.votes.v1'

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Stored
  } catch {
    // 아래에서 빈 상태로 시작한다
  }
  return {}
}

function save(data: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 저장소를 쓸 수 없으면 새로고침할 때 사라진다
  }
}

const VotesContext = createContext<VotesValue | null>(null)

export function VotesProvider({ children }: { children: ReactNode }) {
  const { members } = useClubs()
  const { meetings } = useMeetings()
  const [data, setData] = useState<Stored>(load)
  const latest = useRef(data)

  const update = useCallback((change: (prev: Stored) => Stored) => {
    const next = change(latest.current)
    if (next === latest.current) return
    latest.current = next
    save(next)
    setData(next)
  }, [])

  // 눌러 볼 수 있도록, 투표가 열린 모임에는 예시 회원들이 미리 투표해 둔 것으로 한다.
  // 실제 데이터베이스를 연결하면 없앤다
  useEffect(() => {
    const fresh = meetings.filter((m) => m.status !== 'ready' && !latest.current[m.id])
    if (fresh.length === 0) return
    const others = members.filter((p) => !p.isMe)
    update((prev) => {
      const next = { ...prev }
      for (const m of fresh) {
        let votes: Vote[] = []
        others.forEach((p, i) => {
          const who: Voter = { id: p.id, name: p.name, nick: p.nick }
          const kind = i % 5
          if (kind === 0 || kind === 1) votes = pickAttend(votes, who)
          else if (kind === 2) votes = setLate(votes, who, lateDefault(m))
          else if (kind === 3) votes = pickNo(votes, who)
        })
        next[m.id] = votes
      }
      return next
    })
  }, [meetings, members, update])

  const value = useMemo<VotesValue>(() => {
    const me = members.find((p) => p.isMe)
    const who: Voter | null = me ? { id: ME, name: me.name, nick: me.nick } : null

    const toRow = (v: Vote): Row => {
      // 지금 회원이면 지금 이름을, 클럽에서 빠진 사람이면 투표할 때의 이름을 보여준다
      const member = members.find((p) => p.id === v.memberId)
      return {
        id: v.memberId, name: member?.name ?? v.name, nick: member?.nick ?? v.nick,
        isMe: v.memberId === ME, lateTime: v.choice === 'late' ? v.lateTime : null,
      }
    }

    /** 마감 전인 모임에서 내 표만 바꾼다 */
    const change = (meetingId: string, apply: (votes: Vote[], who: Voter) => Vote[]) => {
      const meeting = meetings.find((m) => m.id === meetingId)
      if (!who || meeting?.status !== 'open') return
      update((prev) => ({ ...prev, [meetingId]: apply(prev[meetingId] ?? [], who) }))
    }

    return {
      rosterOf: (meeting) => {
        const votes = data[meeting.id] ?? []
        const line = lineUp(votes, meeting.capacity)
        const voted = new Set(votes.map((v) => v.memberId))
        const open = meeting.status === 'open'
        return {
          attend: line.attend.map(toRow),
          wait: line.wait.map(toRow),
          no: line.no.map(toRow),
          maybe: members
            .filter((p) => !voted.has(p.id))
            .map((p) => ({ id: p.id, name: p.name, nick: p.nick, isMe: p.isMe, lateTime: null })),
          mine: votes.find((v) => v.memberId === ME) ?? null,
          place: placeOf(line, ME),
          waitIfAttend: open && who ? previewWait(votes, meeting.capacity, who, 'attend') : 0,
          waitIfLate: open && who ? previewWait(votes, meeting.capacity, who, 'late') : 0,
          canceled: meeting.status === 'closed' && meeting.minPeople !== null && line.attend.length < meeting.minPeople,
        }
      },
      attend: (id) => change(id, pickAttend),
      decline: (id) => change(id, pickNo),
      setLateTime: (id, time) => change(id, (votes, w) => setLate(votes, w, time)),
      cancelLateTime: (id) => change(id, cancelLate),
    }
  }, [data, members, meetings, update])

  return <VotesContext.Provider value={value}>{children}</VotesContext.Provider>
}

/** 늦참 도착 시간의 처음 값. 모임 시각 30분 뒤 (한국 시간) */
// eslint-disable-next-line react-refresh/only-export-components
export function lateDefault(meeting: { at: string }): string {
  const d = new Date(new Date(meeting.at).getTime() + 30 * 60_000 + 9 * 3_600_000)
  return d.toISOString().slice(11, 16)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVotes(): VotesValue {
  const value = useContext(VotesContext)
  if (!value) throw new Error('VotesProvider 안에서만 쓸 수 있어요')
  return value
}

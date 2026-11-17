import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ME, useClubs } from './clubs'
import { useMeetings, type Meeting } from './meetings'
import {
  addGuest, cancelLate, closeProcess, guestLine, lineUp, memberSeats, pickAttend, pickNo, placeOf, previewWait,
  removeGuest, setLate, type Guest, type Place, type Vote, type Voter,
} from './roster'

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
  /** 게스트면 데려온 회원의 실명 */
  guestOf: string | null
}

/** 내가 데려온 게스트 */
export interface MyGuest {
  name: string
  /** 참석이면 0, 대기면 대기 몇 번인지 */
  waitNo: number
}

export interface Roster {
  /** 참석 명단. 회원이 순번대로 먼저 오고 게스트가 그 뒤에 온다 */
  attend: Row[]
  /** 대기 명단. 회원이 먼저, 게스트가 그 뒤 */
  wait: Row[]
  /** 정원을 채운 인원. 정원에 포함되지 않는 게스트는 세지 않는다 */
  attendCount: number
  /** 정원과 상관없이 참석하는 게스트 수 (정원이 있는 모임에서만) */
  extraGuests: number
  myGuest: MyGuest | null
  /** 이 모임에 등록된 게스트가 있는지 */
  hasGuests: boolean
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
type StoredGuests = Record<string, Guest[]>

interface VotesValue {
  rosterOf: (meeting: Meeting) => Roster
  /** 참석 버튼. 이미 참석이나 늦참이면 투표를 취소한다 */
  attend: (meetingId: string) => void
  /** 불참 버튼. 이미 불참이면 투표를 취소한다 */
  decline: (meetingId: string) => void
  setLateTime: (meetingId: string, time: string) => void
  cancelLateTime: (meetingId: string) => void
  /** 게스트 등록. 내가 참석이나 늦참(대기 포함)일 때만 된다 */
  registerGuest: (meetingId: string, name: string) => void
  cancelGuest: (meetingId: string) => void
}

const STORAGE_KEY = 'moyeo.votes.v1'
const GUESTS_KEY = 'moyeo.guests.v1'

function load<T>(key: string): Record<string, T[]> {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as Record<string, T[]>
  } catch {
    // 아래에서 빈 상태로 시작한다
  }
  return {}
}

function save(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // 저장소를 쓸 수 없으면 새로고침할 때 사라진다
  }
}

const VotesContext = createContext<VotesValue | null>(null)

export function VotesProvider({ children }: { children: ReactNode }) {
  const { members } = useClubs()
  const { meetings } = useMeetings()
  const [data, setData] = useState<Stored>(() => load<Vote>(STORAGE_KEY))
  const [guestData, setGuestData] = useState<StoredGuests>(() => load<Guest>(GUESTS_KEY))
  const latest = useRef(data)
  const latestGuests = useRef(guestData)

  const update = useCallback((change: (prev: Stored) => Stored) => {
    const next = change(latest.current)
    if (next === latest.current) return
    latest.current = next
    save(STORAGE_KEY, next)
    setData(next)
  }, [])

  const updateGuests = useCallback((change: (prev: StoredGuests) => StoredGuests) => {
    const next = change(latestGuests.current)
    if (next === latestGuests.current) return
    latestGuests.current = next
    save(GUESTS_KEY, next)
    setGuestData(next)
  }, [])

  // 마감 처리. 마감된 모임에 자리가 남으면 대기 중인 게스트를 참석으로 바꿔 저장한다.
  // 지금은 화면이 열려 있을 때 실행하고, 나중에는 서버가 마감 시각에 실행한다
  useEffect(() => {
    updateGuests((prev) => {
      let next = prev
      for (const m of meetings) {
        if (m.status !== 'closed' || !prev[m.id]) continue
        const processed = closeProcess(data[m.id] ?? [], prev[m.id], m.capacity, m.guestInCapacity)
        if (processed !== prev[m.id]) next = { ...next, [m.id]: processed }
      }
      return next
    })
  }, [meetings, data, guestData, updateGuests])

  // 눌러 볼 수 있도록, 투표가 열린 모임에는 예시 회원들이 미리 투표해 둔 것으로 한다.
  // 실제 데이터베이스를 연결하면 없앤다
  useEffect(() => {
    const fresh = meetings.filter((m) => m.status !== 'ready' && !latest.current[m.id])
    if (fresh.length === 0) return
    const others = members.filter((p) => !p.isMe)
    // 게스트를 받는 모임에는 첫 번째 예시 회원이 게스트를 한 명 데려온 것으로 한다
    const host = others[0]
    if (host) {
      updateGuests((prev) => {
        const next = { ...prev }
        for (const m of fresh) {
          if (m.guestAllowed && !next[m.id]) next[m.id] = addGuest([], { id: host.id, name: host.name, nick: host.nick }, '김민준')
        }
        return next
      })
    }
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
  }, [meetings, members, update, updateGuests])

  const value = useMemo<VotesValue>(() => {
    const me = members.find((p) => p.isMe)
    const who: Voter | null = me ? { id: ME, name: me.name, nick: me.nick } : null

    const toRow = (v: Vote): Row => {
      // 지금 회원이면 지금 이름을, 클럽에서 빠진 사람이면 투표할 때의 이름을 보여준다
      const member = members.find((p) => p.id === v.memberId)
      return {
        id: v.memberId, name: member?.name ?? v.name, nick: member?.nick ?? v.nick,
        isMe: v.memberId === ME, lateTime: v.choice === 'late' ? v.lateTime : null, guestOf: null,
      }
    }
    const guestRow = (g: Guest): Row => ({
      id: `guest-${g.hostId}`, name: g.name, nick: '', isMe: g.hostId === ME, lateTime: null,
      guestOf: members.find((p) => p.id === g.hostId)?.name ?? g.hostName,
    })

    /** 마감 전인 모임에서 내 표만 바꾼다 */
    const change = (meetingId: string, apply: (votes: Vote[], who: Voter) => Vote[]) => {
      const meeting = meetings.find((m) => m.id === meetingId)
      if (!who || meeting?.status !== 'open') return
      update((prev) => ({ ...prev, [meetingId]: apply(prev[meetingId] ?? [], who) }))
    }

    return {
      rosterOf: (meeting) => {
        const votes = data[meeting.id] ?? []
        const open = meeting.status === 'open'
        const cap = meeting.capacity
        const inCap = meeting.guestInCapacity
        // 마감된 모임은 마감 처리를 한 결과로 보여준다. 저장은 위의 마감 처리에서 따로 한다
        const stored = guestData[meeting.id] ?? []
        const guests = open ? stored : closeProcess(votes, stored, cap, inCap)
        const seats = memberSeats(cap, guests, inCap)
        const line = lineUp(votes, seats)
        const gl = guestLine(guests, cap, inCap)
        const voted = new Set(votes.map((v) => v.memberId))
        // 정원이 있는데 게스트가 정원 밖이면 따로 세고, 그 밖에는 참석 인원에 함께 센다
        const outside = cap !== null && !inCap
        const mineIdx = gl.wait.findIndex((g) => g.hostId === ME)
        const myGuest = guests.find((g) => g.hostId === ME)
        return {
          attend: [...line.attend.map(toRow), ...gl.attend.map(guestRow)],
          wait: [...line.wait.map(toRow), ...gl.wait.map(guestRow)],
          no: line.no.map(toRow),
          maybe: members
            .filter((p) => !voted.has(p.id))
            .map((p) => ({ id: p.id, name: p.name, nick: p.nick, isMe: p.isMe, lateTime: null, guestOf: null })),
          attendCount: line.attend.length + (outside ? 0 : gl.attend.length),
          extraGuests: outside ? gl.attend.length : 0,
          myGuest: myGuest ? { name: myGuest.name, waitNo: mineIdx >= 0 ? line.wait.length + mineIdx + 1 : 0 } : null,
          hasGuests: stored.length > 0,
          mine: votes.find((v) => v.memberId === ME) ?? null,
          place: placeOf(line, ME),
          waitIfAttend: open && who ? previewWait(votes, seats, who, 'attend') : 0,
          waitIfLate: open && who ? previewWait(votes, seats, who, 'late') : 0,
          // 참석 확정 인원은 회원과 게스트를 모두 센다
          canceled:
            meeting.status === 'closed' && meeting.minPeople !== null &&
            line.attend.length + gl.attend.length < meeting.minPeople,
        }
      },
      attend: (id) => change(id, pickAttend),
      decline: (id) => change(id, pickNo),
      setLateTime: (id, time) => change(id, (votes, w) => setLate(votes, w, time)),
      cancelLateTime: (id) => change(id, cancelLate),
      registerGuest: (id, name) => {
        const meeting = meetings.find((m) => m.id === id)
        const mine = (data[id] ?? []).find((v) => v.memberId === ME)
        // 게스트를 받는 진행 중인 모임에서, 내가 참석이나 늦참일 때만 등록할 수 있다
        if (!who || meeting?.status !== 'open' || !meeting.guestAllowed || !mine || mine.choice === 'no') return
        updateGuests((prev) => ({ ...prev, [id]: addGuest(prev[id] ?? [], who, name) }))
      },
      cancelGuest: (id) => {
        const meeting = meetings.find((m) => m.id === id)
        // 마감 뒤에는 운영진만 취소 처리한다
        if (meeting?.status !== 'open') return
        updateGuests((prev) => ({ ...prev, [id]: removeGuest(prev[id] ?? [], ME) }))
      },
    }
  }, [data, guestData, members, meetings, update, updateGuests])

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

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * 클럽과 가입 정보. 지금은 이 브라우저에만 저장하는 가짜 데이터이고,
 * 나중에 같은 모양의 함수로 실제 데이터베이스에 연결한다.
 */

export const CLUB_NAME_MAX = 20
export const NICK_MAX = 6
export const CODE_LENGTH = 6

export type Role = 'admin' | 'member'
export type MemberStatus = 'approved' | 'pending'

export interface Club {
  id: string
  name: string
  /** 초대 코드. 영문 대문자와 숫자 여섯 자리 */
  code: string
  /** 나를 뺀 회원 수 (가짜 데이터용) */
  others: number
}

interface Membership {
  clubId: string
  role: Role
  status: MemberStatus
  /** 이 클럽에서 쓰는 별명. 없으면 빈 문자열 */
  nick: string
  requestedAt: string
}

/** 내가 가입했거나 가입 신청한 클럽 */
export interface MyClub extends Club {
  role: Role
  status: MemberStatus
  nick: string
  requestedAt: string
  memberCount: number
}

interface Stored {
  clubs: Club[]
  memberships: Membership[]
  currentId: string | null
}

interface ClubsValue {
  /** 가입한 클럽과 승인 대기 중인 클럽. 가입한 클럽이 먼저 온다 */
  myClubs: MyClub[]
  /** 지금 보는 클럽. 승인된 클럽이 없으면 null */
  current: MyClub | null
  findByCode: (code: string) => Club | null
  getMyClub: (clubId: string) => MyClub | null
  requestJoin: (clubId: string, nick: string) => void
  /** 승인됐는지 다시 확인한다. 승인됐으면 true */
  checkApproval: (clubId: string) => Promise<boolean>
  createClub: (name: string, nick: string) => string
  switchClub: (clubId: string) => void
}

const STORAGE_KEY = 'moyeo.clubs'

// 눌러 볼 수 있도록 넣어 둔 예시 클럽
const SEED: Stored = {
  clubs: [{ id: 'seed-hangang', name: '한강 테니스 클럽', code: 'TN4K7P', others: 24 }],
  memberships: [],
  currentId: null,
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Stored
  } catch {
    // 아래에서 예시 데이터로 시작한다
  }
  return SEED
}

function save(data: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 저장소를 쓸 수 없으면 새로고침할 때 처음 상태로 돌아간다
  }
}

/** 헷갈리는 글자(0, O, 1, I, L)를 뺀 초대 코드 */
function newCode(taken: string[]): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  for (;;) {
    let code = ''
    for (let i = 0; i < CODE_LENGTH; i++) code += chars[Math.floor(Math.random() * chars.length)]
    if (!taken.includes(code)) return code
  }
}

/** 입력한 글자를 초대 코드 모양으로 다듬는다 */
// eslint-disable-next-line react-refresh/only-export-components
export function cleanCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
}

/** 명단에 보이는 이름. 별명이 있으면 "실명(별명)" */
// eslint-disable-next-line react-refresh/only-export-components
export function displayName(name: string, nick: string): string {
  return nick ? `${name}(${nick})` : name
}

const ClubsContext = createContext<ClubsValue | null>(null)

export function ClubsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Stored>(load)

  const update = useCallback((change: (prev: Stored) => Stored) => {
    setData((prev) => {
      const next = change(prev)
      save(next)
      return next
    })
  }, [])

  const value = useMemo<ClubsValue>(() => {
    const toMyClub = (m: Membership): MyClub | null => {
      const club = data.clubs.find((c) => c.id === m.clubId)
      if (!club) return null
      return { ...club, ...m, memberCount: club.others + (m.status === 'approved' ? 1 : 0) }
    }
    const all = data.memberships.map(toMyClub).filter((c): c is MyClub => c !== null)
    const myClubs = [...all.filter((c) => c.status === 'approved'), ...all.filter((c) => c.status === 'pending')]
    const approved = myClubs.filter((c) => c.status === 'approved')
    const current = approved.find((c) => c.id === data.currentId) ?? approved[0] ?? null

    return {
      myClubs,
      current,
      findByCode: (code) => data.clubs.find((c) => c.code === cleanCode(code)) ?? null,
      getMyClub: (clubId) => myClubs.find((c) => c.id === clubId) ?? null,
      requestJoin: (clubId, nick) =>
        update((prev) => {
          if (prev.memberships.some((m) => m.clubId === clubId)) return prev
          const membership: Membership = {
            clubId,
            role: 'member',
            status: 'pending',
            nick: nick.trim().slice(0, NICK_MAX),
            requestedAt: new Date().toISOString(),
          }
          return { ...prev, memberships: [...prev.memberships, membership] }
        }),
      checkApproval: (clubId) =>
        new Promise((resolve) => {
          // 가짜 데이터 단계에는 승인해 줄 운영진이 없어서, 확인하면 바로 승인된 것으로 한다
          setTimeout(() => {
            update((prev) => ({
              ...prev,
              memberships: prev.memberships.map((m) => (m.clubId === clubId ? { ...m, status: 'approved' } : m)),
              currentId: clubId,
            }))
            resolve(true)
          }, 900)
        }),
      createClub: (name, nick) => {
        const id = `club-${Date.now().toString(36)}`
        update((prev) => ({
          clubs: [
            ...prev.clubs,
            { id, name: name.trim().slice(0, CLUB_NAME_MAX), code: newCode(prev.clubs.map((c) => c.code)), others: 0 },
          ],
          memberships: [
            ...prev.memberships,
            {
              clubId: id,
              role: 'admin',
              status: 'approved',
              nick: nick.trim().slice(0, NICK_MAX),
              requestedAt: new Date().toISOString(),
            },
          ],
          currentId: id,
        }))
        return id
      },
      switchClub: (clubId) => update((prev) => ({ ...prev, currentId: clubId })),
    }
  }, [data, update])

  return <ClubsContext.Provider value={value}>{children}</ClubsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClubs(): ClubsValue {
  const value = useContext(ClubsContext)
  if (!value) throw new Error('ClubsProvider 안에서만 쓸 수 있어요')
  return value
}

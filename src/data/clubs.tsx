import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

/**
 * 클럽과 가입 정보. 지금은 이 브라우저에만 저장하는 가짜 데이터이고,
 * 나중에 같은 모양의 함수로 실제 데이터베이스에 연결한다.
 */

export const CLUB_NAME_MAX = 20
export const NICK_MAX = 6
export const CODE_LENGTH = 6
/** 명단에서 나를 가리키는 id */
export const ME = 'me'

export type Role = 'admin' | 'member'
export type MemberStatus = 'approved' | 'pending'

export interface Club {
  id: string
  name: string
  /** 초대 코드. 영문 대문자와 숫자 여섯 자리 */
  code: string
}

interface Membership {
  clubId: string
  role: Role
  status: MemberStatus
  /** 이 클럽에서 쓰는 별명. 없으면 빈 문자열 */
  nick: string
  requestedAt: string
}

/** 나 말고 같은 클럽에 있는 사람 (가짜 데이터) */
interface Person extends Membership {
  id: string
  name: string
  rejoin?: boolean
}

/** 클럽 명단의 한 사람. 나도 포함된다 */
export interface Member {
  id: string
  name: string
  nick: string
  role: Role
  status: MemberStatus
  requestedAt: string
  isMe: boolean
  /** 탈퇴 처리된 뒤 다시 가입 신청한 사람 */
  rejoin: boolean
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
  people: Person[]
  currentId: string | null
}

interface ClubsValue {
  /** 가입한 클럽과 승인 대기 중인 클럽. 가입한 클럽이 먼저 온다 */
  myClubs: MyClub[]
  /** 지금 보는 클럽. 승인된 클럽이 없으면 null */
  current: MyClub | null
  findByCode: (code: string) => (Club & { memberCount: number }) | null
  getMyClub: (clubId: string) => MyClub | null
  requestJoin: (clubId: string, nick: string) => void
  /** 승인됐는지 다시 확인한다. 승인됐으면 true */
  checkApproval: (clubId: string) => Promise<boolean>
  createClub: (name: string, nick: string) => string
  switchClub: (clubId: string) => void

  // 아래는 지금 보는 클럽의 운영진만 쓴다
  /** 지금 보는 클럽의 명단. 나, 운영진, 회원 순서 */
  members: Member[]
  /** 지금 보는 클럽의 가입 신청. 먼저 신청한 순서 */
  applicants: Member[]
  approve: (personId: string) => void
  reject: (personId: string) => void
  setRole: (personId: string, role: Role) => void
  removeMember: (personId: string) => void
  renameClub: (name: string) => void
  /** 초대 코드를 새로 만든다. 예전 코드와 링크는 못 쓰게 된다 */
  regenerateCode: () => void
  deleteClub: () => void

  // 아래는 지금 보는 클럽에서 나에 대한 것
  /** 이 클럽에서 쓰는 별명을 바꾼다. 비우면 실명만 보인다 */
  updateNick: (nick: string) => void
  /** 운영진이 나 혼자라서 클럽을 나갈 수 없는지 */
  soleAdmin: boolean
  /** 지금 보는 클럽에서 나간다. 이미 한 투표와 게스트는 명단에 남는다 */
  leaveClub: () => void
}

const STORAGE_KEY = 'moyeo.clubs.v2'
const SEED_CLUB = 'seed-hangang'

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

function person(clubId: string, i: number, name: string, extra: Partial<Person> = {}): Person {
  return { id: `${clubId}-p${i}`, clubId, name, nick: '', role: 'member', status: 'approved', requestedAt: hoursAgo(24 * 30), ...extra }
}

/** 새 클럽에 넣어 두는 예시 회원. 실제 데이터베이스를 연결하면 없앤다 */
function samplePeople(clubId: string): Person[] {
  return [
    person(clubId, 1, '정하늘', { nick: '하늘' }),
    person(clubId, 2, '강지호', { nick: '지호' }),
    person(clubId, 3, '윤채원'),
    person(clubId, 4, '한도현', { nick: '도현이' }),
    person(clubId, 5, '박서연', { status: 'pending', requestedAt: hoursAgo(3) }),
    person(clubId, 6, '최민재', { status: 'pending', nick: '민재', requestedAt: hoursAgo(30), rejoin: true }),
    person(clubId, 7, '오세린', { status: 'pending', requestedAt: hoursAgo(24 * 6) }),
  ]
}

// 눌러 볼 수 있도록 넣어 둔 예시 클럽
function seed(): Stored {
  const names = ['이수아', '정하늘', '강지호', '윤채원', '한도현', '오세린', '임준우', '송유나', '최지훈', '정하은', '강민재', '윤서진']
  return {
    clubs: [{ id: SEED_CLUB, name: '한강 테니스 클럽', code: 'TN4K7P' }],
    memberships: [],
    people: names.map((name, i) => person(SEED_CLUB, i, name, { role: i < 2 ? 'admin' : 'member' })),
    currentId: null,
  }
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Stored
  } catch {
    // 아래에서 예시 데이터로 시작한다
  }
  return seed()
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

export function ClubsProvider({ myName, children }: { myName: string; children: ReactNode }) {
  const [data, setData] = useState<Stored>(load)

  // 가장 최근 데이터. 바꿀 때마다 한 번만 계산하고 한 번만 저장하려고 따로 들고 있는다
  const latest = useRef(data)

  const update = useCallback((change: (prev: Stored) => Stored) => {
    const next = change(latest.current)
    if (next === latest.current) return
    latest.current = next
    save(next)
    setData(next)
  }, [])

  const value = useMemo<ClubsValue>(() => {
    const countOf = (clubId: string) =>
      data.people.filter((p) => p.clubId === clubId && p.status === 'approved').length +
      (data.memberships.some((m) => m.clubId === clubId && m.status === 'approved') ? 1 : 0)

    const toMyClub = (m: Membership): MyClub | null => {
      const club = data.clubs.find((c) => c.id === m.clubId)
      return club ? { ...club, ...m, memberCount: countOf(club.id) } : null
    }
    const all = data.memberships.map(toMyClub).filter((c): c is MyClub => c !== null)
    const myClubs = [...all.filter((c) => c.status === 'approved'), ...all.filter((c) => c.status === 'pending')]
    const approved = myClubs.filter((c) => c.status === 'approved')
    const current = approved.find((c) => c.id === data.currentId) ?? approved[0] ?? null
    const curId = current?.id ?? null
    const iAmAdmin = current?.role === 'admin'

    const here = data.people.filter((p) => p.clubId === curId)
    const toMember = (p: Person): Member => ({
      id: p.id, name: p.name, nick: p.nick, role: p.role, status: p.status,
      requestedAt: p.requestedAt, isMe: false, rejoin: !!p.rejoin,
    })
    const me: Member[] = current
      ? [{ id: ME, name: myName, nick: current.nick, role: current.role, status: 'approved', requestedAt: current.requestedAt, isMe: true, rejoin: false }]
      : []
    const others = here.filter((p) => p.status === 'approved').map(toMember)
    const members = [...me, ...others.filter((m) => m.role === 'admin'), ...others.filter((m) => m.role === 'member')]
    const applicants = here
      .filter((p) => p.status === 'pending')
      .map(toMember)
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))

    /** 지금 보는 클럽의 운영진일 때만 사람 목록을 바꾼다 */
    const changePeople = (change: (people: Person[]) => Person[]) => {
      if (!iAmAdmin) return
      update((prev) => ({ ...prev, people: change(prev.people) }))
    }
    const inClub = (p: Person, id: string) => p.id === id && p.clubId === curId

    return {
      myClubs,
      current,
      findByCode: (code) => {
        const club = data.clubs.find((c) => c.code === cleanCode(code))
        return club ? { ...club, memberCount: countOf(club.id) } : null
      },
      getMyClub: (clubId) => myClubs.find((c) => c.id === clubId) ?? null,
      requestJoin: (clubId, nick) =>
        update((prev) => {
          if (prev.memberships.some((m) => m.clubId === clubId)) return prev
          const membership: Membership = {
            clubId, role: 'member', status: 'pending',
            nick: nick.trim().slice(0, NICK_MAX), requestedAt: new Date().toISOString(),
          }
          return { ...prev, memberships: [...prev.memberships, membership] }
        }),
      checkApproval: (clubId) =>
        new Promise((resolve) => {
          // 가짜 데이터 단계에는 예시 클럽에 승인해 줄 운영진이 없어서, 확인하면 바로 승인된 것으로 한다
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
          clubs: [...prev.clubs, { id, name: name.trim().slice(0, CLUB_NAME_MAX), code: newCode(prev.clubs.map((c) => c.code)) }],
          memberships: [
            ...prev.memberships,
            { clubId: id, role: 'admin', status: 'approved', nick: nick.trim().slice(0, NICK_MAX), requestedAt: new Date().toISOString() },
          ],
          people: [...prev.people, ...samplePeople(id)],
          currentId: id,
        }))
        return id
      },
      switchClub: (clubId) => update((prev) => ({ ...prev, currentId: clubId })),

      members,
      applicants,
      approve: (id) => changePeople((people) => people.map((p) => (inClub(p, id) ? { ...p, status: 'approved' } : p))),
      reject: (id) => changePeople((people) => people.filter((p) => !(inClub(p, id) && p.status === 'pending'))),
      // 운영진으로 지정할 수 있는 사람은 승인된 회원뿐이다. 나 자신의 역할은 여기서 바꿀 수 없다
      setRole: (id, role) =>
        changePeople((people) => people.map((p) => (inClub(p, id) && p.status === 'approved' ? { ...p, role } : p))),
      // 운영진은 바로 탈퇴 처리할 수 없다. 먼저 운영진에서 해제해야 한다
      removeMember: (id) =>
        changePeople((people) => people.filter((p) => !(inClub(p, id) && p.status === 'approved' && p.role === 'member'))),
      renameClub: (name) => {
        const trimmed = name.trim().slice(0, CLUB_NAME_MAX)
        if (!iAmAdmin || !trimmed) return
        update((prev) => ({ ...prev, clubs: prev.clubs.map((c) => (c.id === curId ? { ...c, name: trimmed } : c)) }))
      },
      regenerateCode: () => {
        if (!iAmAdmin) return
        update((prev) => ({
          ...prev,
          clubs: prev.clubs.map((c) => (c.id === curId ? { ...c, code: newCode(prev.clubs.map((x) => x.code)) } : c)),
        }))
      },
      updateNick: (nick) => {
        if (!curId) return
        const trimmed = nick.trim().slice(0, NICK_MAX)
        update((prev) => ({ ...prev, memberships: prev.memberships.map((m) => (m.clubId === curId ? { ...m, nick: trimmed } : m)) }))
      },
      soleAdmin: iAmAdmin && !here.some((p) => p.status === 'approved' && p.role === 'admin'),
      leaveClub: () => {
        if (!curId || (iAmAdmin && !here.some((p) => p.status === 'approved' && p.role === 'admin'))) return
        update((prev) => ({ ...prev, memberships: prev.memberships.filter((m) => m.clubId !== curId), currentId: null }))
      },
      deleteClub: () => {
        if (!iAmAdmin) return
        update((prev) => ({
          clubs: prev.clubs.filter((c) => c.id !== curId),
          memberships: prev.memberships.filter((m) => m.clubId !== curId),
          people: prev.people.filter((p) => p.clubId !== curId),
          currentId: null,
        }))
      },
    }
  }, [data, update, myName])

  return <ClubsContext.Provider value={value}>{children}</ClubsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClubs(): ClubsValue {
  const value = useContext(ClubsContext)
  if (!value) throw new Error('ClubsProvider 안에서만 쓸 수 있어요')
  return value
}

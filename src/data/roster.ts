/**
 * 투표 규칙. 화면이나 저장 방식과 상관없이 순번과 대기만 계산한다.
 *
 * - 고를 수 있는 것은 참석, 늦참, 불참 세 가지다. 투표하지 않은 사람은 미정이다.
 * - 정시 참석자를 순번대로 먼저 세우고 늦참자를 순번대로 그 뒤에 세워,
 *   앞에서부터 정원만큼 참석이 되고 나머지는 대기가 된다.
 * - 누가 빠지면 뒤 사람이 한 칸씩 당겨지므로 대기 1번이 자동으로 참석이 된다.
 */

export type Choice = 'attend' | 'late' | 'no'

export interface Voter {
  id: string
  name: string
  nick: string
}

export interface Vote {
  memberId: string
  choice: Choice
  /** 순번을 받은 차례. 작을수록 먼저다 */
  seq: number
  /** 늦참일 때 도착 예정 시각 ("07:30") */
  lateTime: string | null
  /** 투표할 때의 이름. 나중에 클럽에서 빠진 사람도 명단에 남기려고 적어 둔다 */
  name: string
  nick: string
}

const isIn = (v: Vote | undefined): v is Vote => !!v && v.choice !== 'no'
const nextSeq = (votes: Vote[]) => votes.reduce((max, v) => Math.max(max, v.seq), 0) + 1
const without = (votes: Vote[], id: string) => votes.filter((v) => v.memberId !== id)
const put = (votes: Vote[], who: Voter, choice: Choice, seq: number, lateTime: string | null): Vote[] => [
  ...without(votes, who.id),
  { memberId: who.id, choice, seq, lateTime, name: who.name, nick: who.nick },
]

/**
 * "참석" 버튼. 참석이나 늦참인 사람이 다시 누르면 투표가 취소되어 미정으로 돌아간다.
 * 그 밖에는 지금 차례로 순번을 새로 받아 정시 참석이 된다.
 */
export function pickAttend(votes: Vote[], who: Voter): Vote[] {
  const cur = votes.find((v) => v.memberId === who.id)
  if (isIn(cur)) return without(votes, who.id)
  return put(votes, who, 'attend', nextSeq(votes), null)
}

/** "불참" 버튼. 이미 불참인 사람이 다시 누르면 미정으로 돌아간다 */
export function pickNo(votes: Vote[], who: Voter): Vote[] {
  const cur = votes.find((v) => v.memberId === who.id)
  if (cur?.choice === 'no') return without(votes, who.id)
  return put(votes, who, 'no', nextSeq(votes), null)
}

/**
 * 늦참으로 바꾸거나 도착 시간을 고친다.
 * 참석이던 사람은 순번을 유지하지만 정시 참석자 뒤에 서게 된다.
 */
export function setLate(votes: Vote[], who: Voter, lateTime: string): Vote[] {
  const cur = votes.find((v) => v.memberId === who.id)
  return put(votes, who, 'late', isIn(cur) ? cur.seq : nextSeq(votes), lateTime)
}

/** 늦참을 취소해 정시 참석으로 돌아간다. 순번을 새로 받아 정시 참석자 맨 뒤로 간다 */
export function cancelLate(votes: Vote[], who: Voter): Vote[] {
  const cur = votes.find((v) => v.memberId === who.id)
  if (cur?.choice !== 'late') return votes
  return put(votes, who, 'attend', nextSeq(votes), null)
}

export interface LineUp {
  attend: Vote[]
  wait: Vote[]
  no: Vote[]
}

/** 정원(없으면 null)에 맞춰 참석과 대기를 나눈다 */
export function lineUp(votes: Vote[], capacity: number | null): LineUp {
  const bySeq = (a: Vote, b: Vote) => a.seq - b.seq
  const line = [
    ...votes.filter((v) => v.choice === 'attend').sort(bySeq),
    ...votes.filter((v) => v.choice === 'late').sort(bySeq),
  ]
  const cut = capacity ?? line.length
  return {
    attend: line.slice(0, cut),
    wait: line.slice(cut),
    no: votes.filter((v) => v.choice === 'no').sort(bySeq),
  }
}

export interface Place {
  state: 'attend' | 'wait' | 'no' | 'none'
  /** 참석이면 몇 번째인지, 대기면 대기 몇 번인지. 그 밖에는 0 */
  no: number
}

export function placeOf(line: LineUp, memberId: string): Place {
  const a = line.attend.findIndex((v) => v.memberId === memberId)
  if (a >= 0) return { state: 'attend', no: a + 1 }
  const w = line.wait.findIndex((v) => v.memberId === memberId)
  if (w >= 0) return { state: 'wait', no: w + 1 }
  if (line.no.some((v) => v.memberId === memberId)) return { state: 'no', no: 0 }
  return { state: 'none', no: 0 }
}

/**
 * 지금 그 선택을 하면 대기 몇 번이 되는지 미리 알려 준다. 바로 참석이 되면 0.
 * 정원이 찬 모임이라도 내가 정시 참석이고 맨 뒤가 늦참자면 내가 참석이 되고 그 사람이 대기로 내려간다.
 */
export function previewWait(votes: Vote[], capacity: number | null, who: Voter, as: 'attend' | 'late'): number {
  const cur = votes.find((v) => v.memberId === who.id)
  const after =
    as === 'late' ? setLate(votes, who, cur?.lateTime ?? '')
    : cur?.choice === 'late' ? cancelLate(votes, who)
    : isIn(cur) ? votes
    : pickAttend(votes, who)
  const place = placeOf(lineUp(after, capacity), who.id)
  return place.state === 'wait' ? place.no : 0
}

// ── 게스트 ──────────────────────────────────────────────────────────────
//
// - 회원 한 명이 게스트 한 명까지 데려올 수 있다. 게스트는 등록한 차례로 따로 순번을 받고,
//   데려온 회원이 취소해도 명단에 남는다.
// - 모든 모임은 회원 우선이다. 정원에 포함되는 게스트는 대기로 두었다가
//   마감 때 자리가 남을 때만 참석이 된다.
// - 정원에 포함되지 않는 게스트와 정원이 없는 모임의 게스트는 바로 참석이 된다.

export const GUEST_NAME_MAX = 20

export interface Guest {
  /** 데려온 회원 */
  hostId: string
  hostName: string
  name: string
  seq: number
  /** 마감 처리에서 자리를 받았는지. 한 번 자리를 받으면 투표를 다시 열어도 그대로다 */
  admitted: boolean
}

/** 게스트가 정원 안에서 자리를 다투는 모임인지 */
const competes = (capacity: number | null, inCapacity: boolean): capacity is number => capacity !== null && inCapacity

const bySeq = (a: Guest, b: Guest) => a.seq - b.seq

/** 회원이 쓸 수 있는 자리 수. 이미 자리를 받은 게스트만큼 줄어든다 */
export function memberSeats(capacity: number | null, guests: Guest[], inCapacity: boolean): number | null {
  if (!competes(capacity, inCapacity)) return capacity
  return Math.max(0, capacity - guests.filter((g) => g.admitted).length)
}

/** 게스트를 등록한다. 한 회원에 한 명뿐이라 이미 있으면 그대로 둔다 */
export function addGuest(guests: Guest[], host: Voter, name: string): Guest[] {
  const trimmed = name.trim().slice(0, GUEST_NAME_MAX)
  if (!trimmed || guests.some((g) => g.hostId === host.id)) return guests
  const seq = guests.reduce((max, g) => Math.max(max, g.seq), 0) + 1
  return [...guests, { hostId: host.id, hostName: host.name, name: trimmed, seq, admitted: false }]
}

export function removeGuest(guests: Guest[], hostId: string): Guest[] {
  return guests.filter((g) => g.hostId !== hostId)
}

export interface GuestLine {
  attend: Guest[]
  wait: Guest[]
}

export function guestLine(guests: Guest[], capacity: number | null, inCapacity: boolean): GuestLine {
  const sorted = [...guests].sort(bySeq)
  if (!competes(capacity, inCapacity)) return { attend: sorted, wait: [] }
  return { attend: sorted.filter((g) => g.admitted), wait: sorted.filter((g) => !g.admitted) }
}

/**
 * 마감 처리. 회원을 모두 앉히고도 자리가 남으면 대기 중인 게스트를 순번대로 참석으로 바꾼다.
 * 여러 번 실행해도 결과가 같고, 바뀐 것이 없으면 받은 배열을 그대로 돌려준다.
 */
export function closeProcess(votes: Vote[], guests: Guest[], capacity: number | null, inCapacity: boolean): Guest[] {
  if (!competes(capacity, inCapacity)) return guests
  const members = votes.filter((v) => v.choice !== 'no').length
  const admitted = guests.filter((g) => g.admitted).length
  const free = capacity - admitted - members
  if (free <= 0) return guests
  const next = new Set(guests.filter((g) => !g.admitted).sort(bySeq).slice(0, free))
  if (next.size === 0) return guests
  return guests.map((g) => (next.has(g) ? { ...g, admitted: true } : g))
}

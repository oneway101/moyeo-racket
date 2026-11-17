import { describe, expect, it } from 'vitest'
import { cancelLate, lineUp, pickAttend, pickNo, placeOf, previewWait, setLate, type Vote, type Voter } from './roster'

const who = (id: string): Voter => ({ id, name: id, nick: '' })
const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map(who)
const ids = (votes: Vote[]) => votes.map((v) => v.memberId).join('')
const attendAll = (...people: Voter[]) => people.reduce<Vote[]>((votes, p) => pickAttend(votes, p), [])

describe('선착순과 대기', () => {
  it('누른 순서대로 순번을 받는다', () => {
    const line = lineUp(attendAll(a, b, c), null)
    expect(ids(line.attend)).toBe('abc')
    expect(line.wait).toHaveLength(0)
  })

  it('정원이 차면 대기가 되고 대기 순번이 붙는다', () => {
    const line = lineUp(attendAll(a, b, c, d), 2)
    expect(ids(line.attend)).toBe('ab')
    expect(ids(line.wait)).toBe('cd')
    expect(placeOf(line, 'd')).toEqual({ state: 'wait', no: 2 })
  })

  it('정원이 없으면 모두 참석이고 대기가 없다', () => {
    const line = lineUp(attendAll(a, b, c, d, e), null)
    expect(line.attend).toHaveLength(5)
    expect(line.wait).toHaveLength(0)
  })

  it('취소자가 생기면 대기 1번이 자동으로 참석이 된다', () => {
    let votes = attendAll(a, b, c, d)
    votes = pickAttend(votes, a) // a가 참석을 한 번 더 눌러 취소
    const line = lineUp(votes, 2)
    expect(ids(line.attend)).toBe('bc')
    expect(ids(line.wait)).toBe('d')
  })

  it('불참으로 바꿔도 대기 1번이 참석이 된다', () => {
    const votes = pickNo(attendAll(a, b, c), b)
    const line = lineUp(votes, 2)
    expect(ids(line.attend)).toBe('ac')
    expect(ids(line.no)).toBe('b')
  })
})

describe('늦참', () => {
  it('늦참자는 순번과 상관없이 정시 참석자 뒤에 선다', () => {
    let votes = setLate([], a, '07:30') // a가 가장 먼저 늦참
    votes = pickAttend(votes, b)
    votes = pickAttend(votes, c)
    expect(ids(lineUp(votes, null).attend)).toBe('bca')
  })

  it('늦참자끼리는 순번대로 선다', () => {
    let votes = setLate([], a, '07:30')
    votes = setLate(votes, b, '07:20')
    expect(ids(lineUp(votes, null).attend)).toBe('ab')
  })

  it('정원이 찬 모임에 정시 참석자가 들어오면 맨 뒤의 늦참자가 대기로 내려간다', () => {
    let votes = attendAll(a)
    votes = setLate(votes, b, '07:30')
    votes = pickAttend(votes, c)
    const line = lineUp(votes, 2)
    expect(ids(line.attend)).toBe('ac')
    expect(ids(line.wait)).toBe('b')
  })

  it('참석에서 늦참으로 바꾸면 순번은 유지하지만 늦참자 줄로 옮겨져 대기가 될 수 있다', () => {
    let votes = attendAll(a, b, c)
    const before = votes.find((v) => v.memberId === 'a')!.seq
    votes = setLate(votes, a, '07:30')
    expect(votes.find((v) => v.memberId === 'a')!.seq).toBe(before)
    const line = lineUp(votes, 2)
    expect(ids(line.attend)).toBe('bc')
    expect(ids(line.wait)).toBe('a')
  })

  it('먼저 순번을 받은 사람이 늦참으로 바꾸면 늦참자 줄에서는 앞에 선다', () => {
    let votes = attendAll(a)
    votes = setLate(votes, b, '07:30')
    votes = setLate(votes, a, '07:40') // a의 순번이 b보다 앞이다
    expect(ids(lineUp(votes, null).attend)).toBe('ab')
  })

  it('늦참을 취소하면 순번을 새로 받아 정시 참석자 맨 뒤로 간다', () => {
    let votes = attendAll(a, b)
    votes = setLate(votes, a, '07:30')
    votes = pickAttend(votes, c)
    votes = cancelLate(votes, a)
    expect(ids(lineUp(votes, null).attend)).toBe('bca')
    expect(votes.find((v) => v.memberId === 'a')!.lateTime).toBeNull()
  })

  it('도착 시간만 고치면 순번이 그대로다', () => {
    let votes = setLate([], a, '07:30')
    votes = setLate(votes, b, '07:30')
    votes = setLate(votes, a, '08:00')
    expect(ids(lineUp(votes, null).attend)).toBe('ab')
    expect(votes.find((v) => v.memberId === 'a')!.lateTime).toBe('08:00')
  })
})

describe('다시 누르기와 바꾸기', () => {
  it('참석을 한 번 더 누르면 미정으로 돌아가고, 다시 참석하면 맨 뒤 순번을 받는다', () => {
    let votes = attendAll(a, b)
    votes = pickAttend(votes, a)
    expect(placeOf(lineUp(votes, null), 'a').state).toBe('none')
    votes = pickAttend(votes, a)
    expect(ids(lineUp(votes, null).attend)).toBe('ba')
  })

  it('늦참인 사람이 참석을 누르면 투표가 취소된다', () => {
    const votes = pickAttend(setLate([], a, '07:30'), a)
    expect(votes).toHaveLength(0)
  })

  it('불참을 한 번 더 누르면 미정으로 돌아간다', () => {
    const votes = pickNo(pickNo([], a), a)
    expect(votes).toHaveLength(0)
  })

  it('불참에서 참석으로 바꾸면 그때 순번을 받는다', () => {
    let votes = pickNo([], a)
    votes = pickAttend(votes, b)
    votes = pickAttend(votes, a)
    expect(ids(lineUp(votes, null).attend)).toBe('ba')
  })

  it('한 사람은 표가 하나뿐이다', () => {
    let votes = pickAttend([], a)
    votes = pickNo(votes, a)
    votes = setLate(votes, a, '07:30')
    expect(votes).toHaveLength(1)
  })
})

describe('미리 알려 주기', () => {
  it('정원이 찼으면 지금 참석할 때 대기 몇 번이 되는지 알려 준다', () => {
    const votes = attendAll(a, b, c)
    expect(previewWait(votes, 2, d, 'attend')).toBe(2)
  })

  it('자리가 남았으면 0이다', () => {
    expect(previewWait(attendAll(a), 2, d, 'attend')).toBe(0)
    expect(previewWait(attendAll(a, b, c), null, d, 'attend')).toBe(0)
  })

  it('정원이 찼어도 맨 뒤가 늦참자면 정시 참석자는 바로 참석이 된다', () => {
    const votes = setLate(attendAll(a), b, '07:30')
    expect(previewWait(votes, 2, c, 'attend')).toBe(0)
  })

  it('참석 중에 늦참으로 바꾸면 대기가 되는 경우를 알려 준다', () => {
    const votes = attendAll(a, b, c)
    expect(previewWait(votes, 2, a, 'late')).toBe(1)
    expect(previewWait(votes, 3, a, 'late')).toBe(0)
  })

  it('늦참을 취소하면 대기가 되는 경우를 알려 준다', () => {
    let votes = setLate([], a, '07:30')
    votes = setLate(votes, b, '07:30')
    votes = pickAttend(votes, c)
    // 정원 2: c(정시), a(늦참)가 참석이고 b가 대기. b가 정시로 바꾸면 c, b가 참석이 되고 a가 내려간다
    expect(previewWait(votes, 2, b, 'attend')).toBe(0)
    // 정원 1: c만 참석. a가 정시로 바꿔도 c 뒤라 대기 1번
    expect(previewWait(votes, 1, a, 'attend')).toBe(1)
  })

  it('미리 보기는 실제 투표를 바꾸지 않는다', () => {
    const votes = attendAll(a, b)
    previewWait(votes, 1, c, 'attend')
    expect(votes).toHaveLength(2)
  })
})

import { addGuest, closeProcess, guestLine, memberSeats, removeGuest, type Guest } from './roster'

describe('게스트', () => {
  const names = (gs: Guest[]) => gs.map((g) => g.name).join(',')

  it('회원 한 명에 게스트는 한 명까지다', () => {
    let guests = addGuest([], a, '민준')
    guests = addGuest(guests, a, '서윤')
    expect(names(guests)).toBe('민준')
  })

  it('이름이 비었으면 등록되지 않고, 20자까지만 받는다', () => {
    expect(addGuest([], a, '   ')).toHaveLength(0)
    expect(addGuest([], a, '가'.repeat(30))[0].name).toHaveLength(20)
  })

  it('정원에 포함되는 게스트는 자리가 남아도 마감 전에는 대기다', () => {
    const guests = addGuest([], a, '민준')
    const line = guestLine(guests, 8, true)
    expect(line.attend).toHaveLength(0)
    expect(names(line.wait)).toBe('민준')
  })

  it('정원에 포함되지 않는 게스트는 바로 참석이고 회원 자리를 줄이지 않는다', () => {
    const guests = addGuest([], a, '민준')
    expect(names(guestLine(guests, 2, false).attend)).toBe('민준')
    expect(memberSeats(2, guests, false)).toBe(2)
  })

  it('정원이 없는 모임에서는 정원 포함 여부와 상관없이 게스트가 바로 참석이다', () => {
    const guests = addGuest([], a, '민준')
    expect(names(guestLine(guests, null, true).attend)).toBe('민준')
    expect(memberSeats(null, guests, true)).toBeNull()
  })

  it('마감 처리에서 자리가 남으면 게스트가 등록한 순서대로 참석이 된다', () => {
    let guests = addGuest([], a, '민준')
    guests = addGuest(guests, b, '서윤')
    guests = addGuest(guests, c, '지우')
    guests = closeProcess(attendAll(a, b, c), guests, 5, true) // 회원 3명, 남는 자리 2
    const line = guestLine(guests, 5, true)
    expect(names(line.attend)).toBe('민준,서윤')
    expect(names(line.wait)).toBe('지우')
  })

  it('회원이 정원을 채우면 게스트는 참석이 되지 않는다', () => {
    const guests = closeProcess(attendAll(a, b, c), addGuest([], a, '민준'), 3, true)
    expect(guestLine(guests, 3, true).attend).toHaveLength(0)
  })

  it('마감 처리는 여러 번 실행해도 결과가 같다', () => {
    const votes = attendAll(a, b)
    const once = closeProcess(votes, addGuest(addGuest([], a, '민준'), b, '서윤'), 3, true)
    const twice = closeProcess(votes, once, 3, true)
    expect(twice).toBe(once)
    expect(names(guestLine(twice, 3, true).attend)).toBe('민준')
  })

  it('마감 뒤 빈 자리가 생기면 대기 중인 회원이 먼저, 그다음 게스트가 참석이 된다', () => {
    let votes = attendAll(a, b, c) // 정원 2: a, b 참석, c 대기
    let guests = closeProcess(votes, addGuest([], a, '민준'), 2, true)
    expect(guestLine(guests, 2, true).attend).toHaveLength(0)

    votes = votes.filter((v) => v.memberId !== 'a') // 운영진이 a를 취소 처리
    guests = closeProcess(votes, guests, 2, true)
    expect(ids(lineUp(votes, memberSeats(2, guests, true)).attend)).toBe('bc') // 회원 c가 먼저
    expect(guestLine(guests, 2, true).attend).toHaveLength(0)

    votes = votes.filter((v) => v.memberId !== 'b') // 한 명 더 취소
    guests = closeProcess(votes, guests, 2, true)
    expect(names(guestLine(guests, 2, true).attend)).toBe('민준') // 이제 게스트 차례
  })

  it('데려온 회원이 취소해도 게스트는 명단에 남는다', () => {
    let votes = attendAll(a)
    const guests = addGuest([], a, '민준')
    votes = pickAttend(votes, a) // a가 투표를 취소
    expect(votes).toHaveLength(0)
    expect(names(guestLine(guests, 4, true).wait)).toBe('민준')
  })

  it('투표를 다시 열어도 이미 참석이 된 게스트는 그대로이고, 그만큼 회원 자리가 줄어든다', () => {
    const guests = closeProcess(attendAll(a), addGuest([], a, '민준'), 2, true)
    expect(memberSeats(2, guests, true)).toBe(1)
    const line = lineUp(attendAll(a, b), memberSeats(2, guests, true)) // 다시 열린 뒤 b가 참석
    expect(ids(line.attend)).toBe('a')
    expect(ids(line.wait)).toBe('b')
    expect(names(guestLine(guests, 2, true).attend)).toBe('민준')
  })

  it('게스트를 취소하면 명단에서 지워져 다시 등록할 수 있다', () => {
    let guests = addGuest([], a, '민준')
    guests = removeGuest(guests, 'a')
    expect(guests).toHaveLength(0)
    expect(names(addGuest(guests, a, '서윤'))).toBe('서윤')
  })
})

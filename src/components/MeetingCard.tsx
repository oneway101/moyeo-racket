import { Link } from 'react-router-dom'
import type { Meeting } from '../data/meetings'
import { attendLine, myStatusOf } from '../data/status'
import type { Roster } from '../data/votes'
import { dateParts, formatKstDay, formatSpan, kstParts } from '../data/time'

const peopleIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const clockIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
)

interface Props {
  meeting: Meeting
  roster: Roster
  now: number
  /** big: 일간, small: 주간과 월간 */
  size: 'big' | 'small'
  /** 주간에서는 한 줄 높이를 맞추려고 최소 인원 안내를 뺀다 */
  hideMin?: boolean
}

/** 홈 달력의 모임 카드. 내 상태가 오른쪽 위에 가장 먼저 보인다 */
export function MeetingCard({ meeting: m, roster, now, size, hideMin }: Props) {
  const status = myStatusOf(m, roster)
  const open = m.status === 'open'
  const p = kstParts(m.at)
  const when = size === 'big' ? `${p.month}/${p.day}(${dateParts(p.date).wd}) ${p.time}` : p.time
  const left = open ? `${formatSpan(new Date(m.closesAt).getTime() - now)} 남음` : `${formatKstDay(m.closesAt)} 마감`

  return (
    <Link to={`/meetings/${m.id}`} className={`vote-card vote-card--${size} vote-card--${status.kind}`}>
      <span className="vote-status">{status.text}</span>
      <span className="vote-when">{when}</span>
      <span className="vote-title">{m.title}</span>
      <span className="vote-foot">
        <span className="vote-count">{peopleIcon}{attendLine(m, roster)}</span>
        <span className={open ? 'vote-left vote-left--open' : 'vote-left'}>{open && clockIcon}{left}</span>
      </span>
      {open && m.minPeople && !hideMin && <span className="vote-min">최소 {m.minPeople}명 · 미달 시 자동 취소</span>}
      {roster.canceled && !hideMin && <span className="vote-min vote-min--gray">최소 {m.minPeople}명 미달로 취소됨</span>}
    </Link>
  )
}

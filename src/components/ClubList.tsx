import type { MyClub } from '../data/clubs'
import { displayName } from '../data/clubs'

interface Props {
  clubs: MyClub[]
  myName: string
  currentId: string | null
  onPick: (club: MyClub) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** 내 클럽 목록. 지금 보는 클럽, 운영진, 승인 대기를 표시한다 */
export function ClubList({ clubs, myName, currentId, onPick }: Props) {
  return (
    <ul className="club-list">
      {clubs.map((club) => {
        const waiting = club.status === 'pending'
        const on = club.id === currentId
        return (
          <li key={club.id}>
            <button
              className={`club-item${on ? ' club-item--on' : ''}${waiting ? ' club-item--waiting' : ''}`}
              aria-pressed={waiting ? undefined : on}
              onClick={() => onPick(club)}
            >
              <span className="avatar" aria-hidden="true">{club.name[0]}</span>
              <span className="club-item-text">
                <strong>{club.name}</strong>
                <span>
                  {waiting
                    ? `${formatDate(club.requestedAt)} 신청`
                    : `${displayName(myName, club.nick)} · 회원 ${club.memberCount}명`}
                </span>
              </span>
              {club.role === 'admin' && !waiting && <span className="badge badge--admin">운영진</span>}
              {waiting && <span className="badge badge--waiting">승인 대기</span>}
              {on && (
                <svg role="img" aria-label="지금 보는 클럽" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-700)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

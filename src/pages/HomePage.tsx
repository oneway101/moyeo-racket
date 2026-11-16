import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClubList } from '../components/ClubList'
import { Sheet } from '../components/Sheet'
import { useAuth } from '../data/auth'
import { useClubs } from '../data/clubs'

export function HomePage() {
  const { account } = useAuth()
  const { current, myClubs, switchClub } = useClubs()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (!current) return null

  return (
    <>
      <header className="hero">
        <div className="hero-ring" />
        <div className="hero-ball" />
        <h1>
          <button
            className="club-switch"
            aria-haspopup="dialog"
            aria-label={`${current.name}, 클럽 바꾸기`}
            onClick={() => setSheetOpen(true)}
          >
            <span>{current.name}</span>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </h1>
      </header>
      <div className="section">
        <div className="card">
          <strong>아직 만드는 중이에요</strong>
          <span className="muted">다음 단계에서 달력과 모임 목록이 여기에 들어가요.</span>
        </div>
      </div>

      {sheetOpen && (
        <Sheet title="내 클럽" onClose={() => setSheetOpen(false)}>
          <ClubList
            clubs={myClubs}
            myName={account?.name ?? ''}
            currentId={current.id}
            onPick={(club) => {
              setSheetOpen(false)
              if (club.status === 'pending') navigate(`/clubs/${club.id}/pending`)
              else switchClub(club.id)
            }}
          />
          <button className="btn btn--outline" onClick={() => navigate('/clubs/enter')}>
            다른 클럽 가입하거나 만들기
          </button>
          <button className="btn btn--ghost" onClick={() => setSheetOpen(false)}>
            닫기
          </button>
        </Sheet>
      )}
    </>
  )
}

import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { EntryLayout } from '../../components/EntryLayout'
import { useClubs } from '../../data/clubs'

/** 가입 신청 뒤 운영진 승인을 기다리는 화면 */
export function ClubPendingPage() {
  const { id } = useParams()
  const { getMyClub, checkApproval } = useClubs()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [notYet, setNotYet] = useState(false)
  const club = id ? getMyClub(id) : null

  if (!club) return <Navigate to="/clubs" replace />
  if (club.status === 'approved' && !checking) return <Navigate to="/" replace />

  const check = async () => {
    setChecking(true)
    setNotYet(false)
    const approved = await checkApproval(club.id)
    setChecking(false)
    if (approved) navigate('/', { replace: true })
    else setNotYet(true)
  }

  return (
    <EntryLayout kicker={club.name} title="거의 다 됐어요">
      <div className="alert alert--info alert--big">
        <strong>{club.name}에 가입 신청했어요.</strong>
        <span>운영진의 승인을 기다려 주세요.</span>
      </div>
      {notYet && (
        <div role="status" className="alert alert--plain">
          아직 승인 전이에요. 조금 뒤에 다시 확인해 주세요.
        </div>
      )}
      <span className="grow" />
      <button className="btn btn--primary" onClick={check} disabled={checking}>
        {checking ? '확인하는 중…' : '승인 확인하기'}
      </button>
      <button className="btn btn--ghost" onClick={() => navigate('/clubs')}>
        내 클럽 보기
      </button>
    </EntryLayout>
  )
}

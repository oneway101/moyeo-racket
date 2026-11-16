import { useNavigate } from 'react-router-dom'
import { ClubList } from '../../components/ClubList'
import { EntryLayout } from '../../components/EntryLayout'
import { useAuth } from '../../data/auth'
import { useClubs } from '../../data/clubs'

/** 내 클럽 목록. 클럽을 골라 들어가거나 다른 클럽에 가입한다 */
export function ClubsPage() {
  const { account } = useAuth()
  const { myClubs, current, switchClub } = useClubs()
  const navigate = useNavigate()

  return (
    <EntryLayout
      kicker={`${account?.name} 님`}
      title="내 클럽"
      size="short"
      onBack={current ? () => navigate('/') : undefined}
    >
      <span className="hint">클럽을 누르면 그 클럽의 모임을 볼 수 있어요.</span>
      <ClubList
        clubs={myClubs}
        myName={account?.name ?? ''}
        currentId={current?.id ?? null}
        onPick={(club) => {
          if (club.status === 'pending') {
            navigate(`/clubs/${club.id}/pending`)
          } else {
            switchClub(club.id)
            navigate('/')
          }
        }}
      />
      <span className="grow" />
      <div className="btn-row">
        <button className="btn btn--outline" onClick={() => navigate('/clubs/enter')}>
          초대 코드로 가입
        </button>
        <button className="btn btn--outline" onClick={() => navigate('/clubs/new')}>
          새 클럽 만들기
        </button>
      </div>
    </EntryLayout>
  )
}

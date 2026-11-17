import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Hero } from '../components/Hero'
import { useMeetings } from '../data/meetings'
import { formatKst } from '../data/time'

/** 모임 상세. 투표와 명단은 다음 단계에서 들어간다 */
export function MeetingDetailPage() {
  const { id } = useParams()
  const { getMeeting } = useMeetings()
  const navigate = useNavigate()
  const meeting = id ? getMeeting(id) : null

  // 시작 전 모임은 회원에게 보이지 않는다
  if (!meeting || meeting.status === 'ready') return <Navigate to="/" replace />

  return (
    <>
      <Hero title={meeting.title} onBack={() => navigate('/')} backLabel="홈으로 돌아가기" sub={formatKst(meeting.at)} />
      <div className="section">
        <div className="card">
          <strong>아직 만드는 중이에요</strong>
          <span className="muted">다음 단계에서 참석 투표와 명단이 여기에 들어가요.</span>
        </div>
      </div>
    </>
  )
}

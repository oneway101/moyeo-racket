import { useNavigate } from 'react-router-dom'
import { Hero } from '../../components/Hero'

export function MeetingsPage() {
  const navigate = useNavigate()
  return (
    <>
      <Hero title="모임 관리" dark onBack={() => navigate('/admin')} backLabel="관리로 돌아가기" />
      <div className="section">
        <div className="card">
          <strong>아직 만드는 중이에요</strong>
          <span className="muted">다음 단계에서 모임 만들기와 목록이 여기에 들어가요.</span>
        </div>
      </div>
    </>
  )
}

import { Hero } from '../components/Hero'

export function AdminPage() {
  return (
    <>
      <Hero title="관리" dark />
      <div className="section">
        <div className="card">
          <strong>아직 만드는 중이에요</strong>
          <span className="muted">모임 관리, 회원 관리, 클럽 설정이 여기에 들어가요.</span>
        </div>
      </div>
    </>
  )
}

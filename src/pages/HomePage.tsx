import { Hero } from '../components/Hero'

export function HomePage() {
  return (
    <>
      <Hero title="한강 테니스 클럽" />
      <div className="section">
        <div className="card">
          <strong>아직 만드는 중이에요</strong>
          <span className="muted">다음 단계에서 달력과 모임 목록이 여기에 들어가요.</span>
        </div>
      </div>
    </>
  )
}

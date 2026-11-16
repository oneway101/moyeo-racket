import { Hero } from '../components/Hero'

export function MyInfoPage() {
  return (
    <>
      <Hero title="내 정보" />
      <div className="section">
        <div className="card">
          <strong>아직 만드는 중이에요</strong>
          <span className="muted">이름과 별명, 알림 설정, 내 클럽이 여기에 들어가요.</span>
        </div>
      </div>
    </>
  )
}

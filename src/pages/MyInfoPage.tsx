import { useNavigate } from 'react-router-dom'
import { Hero } from '../components/Hero'
import { useAuth } from '../data/auth'

export function MyInfoPage() {
  const { account, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <>
      <Hero title="내 정보" />
      <div className="section">
        <div className="card">
          <strong>{account?.name}</strong>
          <span className="muted">별명, 알림 설정, 내 클럽은 다음 단계에서 여기에 들어가요.</span>
        </div>
        <button
          className="btn btn--ghost"
          onClick={() => {
            logout()
            navigate('/', { replace: true })
          }}
        >
          로그아웃
        </button>
      </div>
    </>
  )
}

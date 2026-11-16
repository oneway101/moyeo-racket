import { Link } from 'react-router-dom'
import { Hero } from '../components/Hero'
import { useClubs } from '../data/clubs'

const chevron = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-600)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
)
const icon = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

/** 관리 첫 화면. 운영진에게만 보인다 */
export function AdminPage() {
  const { current, applicants } = useClubs()

  return (
    <>
      <Hero title="관리" dark sub={current?.name} />
      <div className="section">
        <Link to="/admin/meetings" className="menu-card">
          <span className="menu-icon menu-icon--lime">
            <svg {...icon}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
          </span>
          <span className="menu-text">
            <strong>모임 관리</strong>
            <span>모임 만들기, 명단 관리, 정기 모임</span>
          </span>
          {chevron}
        </Link>
        <Link to="/admin/members" className="menu-card">
          <span className="menu-icon menu-icon--green">
            <svg {...icon}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </span>
          <span className="menu-text">
            <strong>
              회원 관리
              {applicants.length > 0 && (
                <span className="count-badge" aria-label={`승인 대기 ${applicants.length}명`}>{applicants.length}</span>
              )}
            </strong>
            <span>가입 승인, 운영진 지정, 탈퇴 처리</span>
          </span>
          {chevron}
        </Link>
        <Link to="/admin/club" className="menu-card">
          <span className="menu-icon menu-icon--gray">
            <svg {...icon}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
          </span>
          <span className="menu-text">
            <strong>클럽 설정</strong>
            <span>초대 링크, 클럽 이름</span>
          </span>
          {chevron}
        </Link>
      </div>
    </>
  )
}

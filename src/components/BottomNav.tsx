import { NavLink } from 'react-router-dom'
import { HomeIcon, ShieldIcon, UserIcon } from './Icons'

/** 하단 메뉴. "관리"는 지금 보는 클럽의 운영진에게만 보인다 */
export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  return (
    <nav className="nav" aria-label="주 메뉴">
      <NavLink to="/" end>
        <HomeIcon />홈
      </NavLink>
      <NavLink to="/me">
        <UserIcon />내 정보
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin">
          <ShieldIcon />관리
        </NavLink>
      )}
    </nav>
  )
}

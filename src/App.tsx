import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { AuthProvider, useAuth } from './data/auth'
import { ClubsProvider, useClubs } from './data/clubs'
import { MeetingsProvider } from './data/meetings'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MeetingDetailPage } from './pages/MeetingDetailPage'
import { MyInfoPage } from './pages/MyInfoPage'
import { ClubEnterPage } from './pages/club/ClubEnterPage'
import { ClubInvitePage } from './pages/club/ClubInvitePage'
import { ClubJoinPage } from './pages/club/ClubJoinPage'
import { ClubNewPage } from './pages/club/ClubNewPage'
import { ClubPendingPage } from './pages/club/ClubPendingPage'
import { ClubsPage } from './pages/club/ClubsPage'
import { ClubSettingsPage } from './pages/admin/ClubSettingsPage'
import { MeetingFormPage } from './pages/admin/MeetingFormPage'
import { MeetingsPage } from './pages/admin/MeetingsPage'
import { MembersPage } from './pages/admin/MembersPage'

/** 클럽을 고르거나 가입하는 화면인지. 이 화면들에는 하단 메뉴가 없다 */
function isClubEntryPath(path: string): boolean {
  return path === '/clubs' || path.startsWith('/clubs/') || path.startsWith('/join/')
}

function Screens() {
  const { account } = useAuth()
  const { current, myClubs } = useClubs()
  const { pathname } = useLocation()

  // 로그인 전이거나 아직 실명을 적지 않았으면 로그인 화면만 보인다.
  // 초대 링크(/join/코드)로 들어온 경우 주소는 그대로라서 로그인 뒤 가입 화면으로 이어진다
  if (!account?.name) return <LoginPage />

  const entry = isClubEntryPath(pathname)
  // 가입이 승인된 클럽이 없으면 클럽 화면으로 보낸다
  if (!current && !entry) return <Navigate to={myClubs.length > 0 ? '/clubs' : '/clubs/enter'} replace />

  const isAdmin = current?.role === 'admin'

  return (
    <>
      <main className={entry ? 'app-main app-main--entry' : 'app-main'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/me" element={<MyInfoPage />} />
          <Route path="/meetings/:id" element={<MeetingDetailPage />} />
          <Route path="/admin" element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
          <Route path="/admin/meetings" element={isAdmin ? <MeetingsPage /> : <Navigate to="/" replace />} />
          <Route path="/admin/meetings/new" element={isAdmin ? <MeetingFormPage key="new" /> : <Navigate to="/" replace />} />
          <Route path="/admin/meetings/:id/edit" element={isAdmin ? <MeetingFormPage key="edit" /> : <Navigate to="/" replace />} />
          <Route path="/admin/members" element={isAdmin ? <MembersPage /> : <Navigate to="/" replace />} />
          <Route path="/admin/club" element={isAdmin ? <ClubSettingsPage /> : <Navigate to="/" replace />} />
          <Route path="/clubs" element={myClubs.length > 0 ? <ClubsPage /> : <Navigate to="/clubs/enter" replace />} />
          <Route path="/clubs/enter" element={<ClubEnterPage />} />
          <Route path="/clubs/new" element={<ClubNewPage />} />
          <Route path="/clubs/:id/invite" element={<ClubInvitePage />} />
          <Route path="/clubs/:id/pending" element={<ClubPendingPage />} />
          <Route path="/join/:code" element={<ClubJoinPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!entry && <BottomNav isAdmin={isAdmin} />}
    </>
  )
}

function WithClubs({ children }: { children: ReactNode }) {
  const { account } = useAuth()
  return (
    <ClubsProvider myName={account?.name ?? ''}>
      <MeetingsProvider>{children}</MeetingsProvider>
    </ClubsProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WithClubs>
          <div className="app">
            <Screens />
          </div>
        </WithClubs>
      </AuthProvider>
    </BrowserRouter>
  )
}

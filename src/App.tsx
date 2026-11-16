import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { AuthProvider, useAuth } from './data/auth'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MyInfoPage } from './pages/MyInfoPage'

function Screens() {
  const { account } = useAuth()
  // 클럽 기능을 만들기 전까지는 운영진으로 고정해 둔다
  const isAdmin = true

  // 로그인 전이거나 아직 실명을 적지 않았으면 로그인 화면만 보인다
  if (!account?.name) return <LoginPage />

  return (
    <>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/me" element={<MyInfoPage />} />
          <Route path="/admin" element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav isAdmin={isAdmin} />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <Screens />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

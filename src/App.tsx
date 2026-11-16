import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import { MyInfoPage } from './pages/MyInfoPage'

export default function App() {
  // 로그인과 클럽 기능을 만들기 전까지는 운영진으로 고정해 둔다
  const isAdmin = true

  return (
    <BrowserRouter>
      <div className="app">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/me" element={<MyInfoPage />} />
            <Route path="/admin" element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav isAdmin={isAdmin} />
      </div>
    </BrowserRouter>
  )
}

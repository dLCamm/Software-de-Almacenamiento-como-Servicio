import { Navigate, Route, Routes } from 'react-router-dom'

import LandingPage from './pages/Landing/LandingPage'
import AuthPage from './pages/Auth/AuthPage'
import DashboardPageClient from './pages/client/DashboardPage'
import SharedFilePage from './pages/shared/SharedFilePage'
import ProtectedRoute from './routes/ProtectedRoute'


export default function App() {
  return (
    <Routes>

      <Route path="/" element={<LandingPage />}/>
      <Route path="/login" element={<AuthPage />}/>
      <Route path="/register" element={<AuthPage />}/>
      <Route path="/recover-password" element={<AuthPage />}/>
      <Route path="/app/client" element={ <ProtectedRoute> <DashboardPageClient /> </ProtectedRoute>}/>
      <Route path="/share" element={<SharedFilePage />}/>
      <Route path="*" element={<Navigate to="/" replace />}/>

    </Routes>
  )
}

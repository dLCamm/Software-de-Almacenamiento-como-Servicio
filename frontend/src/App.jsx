import { Navigate, Route, Routes } from 'react-router-dom'

import LandingPage from './pages/Landing/LandingPage'
import AuthPage from './pages/Auth/AuthPage'
import DashboardPageClient from './pages/client/DashboardPage'
import BillingPage from './pages/client/billing/BillingPage'
import SharedFilePage from './pages/shared/SharedFilePage'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'
import AdminPlansPage from './pages/admin/plans/AdminPlansPage'
import ManagedUserDetailPage from './pages/admin/management/ManagedUserDetailPage'
import ManagedUsersPage from './pages/admin/management/ManagedUsersPage'
import StaffRoute from './routes/StaffRoute'
import ClientLayout from './layouts/ClientLayout'


export default function App() {
  return (
    <Routes>

      <Route path="/" element={<LandingPage />}/>
      <Route path="/login" element={<AuthPage />}/>
      <Route path="/register" element={<AuthPage />}/>
      <Route path="/recover-password" element={<AuthPage />}/>
      {/* Todas las páginas dentro de ClientLayout comparten la barra lateral */}
      <Route element={<ProtectedRoute><ClientLayout /></ProtectedRoute>}>
        <Route path="/app/client" element={<DashboardPageClient />}/>
        <Route path="/app/client/billing/:section?" element={<BillingPage />}/>
        <Route path="/app/admin" element={<Navigate to="/app/admin/usuarios" replace />}/>
        <Route path="/app/admin/planes" element={<AdminRoute><AdminPlansPage /></AdminRoute>}/>
        <Route path="/app/admin/usuarios" element={<StaffRoute><ManagedUsersPage /></StaffRoute>}/>
        <Route path="/app/admin/usuarios/:userId" element={<StaffRoute><ManagedUserDetailPage /></StaffRoute>}/>
      </Route>
      <Route path="/share" element={<SharedFilePage />}/>
      <Route path="*" element={<Navigate to="/" replace />}/>

    </Routes>
  )
}

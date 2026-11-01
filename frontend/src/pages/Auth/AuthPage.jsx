import { useLocation, useNavigate } from 'react-router-dom'

import { CubeLogoIcon } from '../../components/icons'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import RecoverForm from './RecoverForm'
import ResetPasswordForm from './ResetPasswordForm'
import VerifyEmailForm from './VerifyEmailForm'

import ThemeToggle from '../../components/ThemeToggle'
import './AuthPage.css'


export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const isLogin = location.pathname === '/login'
  const isRegister = location.pathname === '/register'
  const isRecover = location.pathname === '/recover-password'
  const isReset = location.pathname === '/reset-password'
  const isVerify = location.pathname === '/verify-email'
  const isResend = location.pathname === '/resend-verification'
  const params = new URLSearchParams(location.search)
  const requestedPlan = new URLSearchParams(location.search).get('plan')
  const selectedPlan = ['free', 'pro', 'business'].includes(requestedPlan) ? requestedPlan : 'free'

  // El administrador entra directo a su panel; los demás, a Mis Archivos.
  function handleAuthenticated(data) {
    navigate(data?.user?.role === 'ADMIN' ? '/app/admin/inicio' : '/app/client')
  }

  function handleCompleted(message) {
    navigate('/login', { replace: true, state: { notice: message } })
  }

  function goToVerification(email = '') {
    navigate('/resend-verification', { state: { email } })
  }

  return (
    <div className="auth-page">
      <ThemeToggle className="auth-page__theme" />

      {/* Logo / regreso al inicio */}
      <div className="auth-page__brand">

        <button
          type="button"
          className="auth-page__logo"
          onClick={() => navigate('/')}
          aria-label="Ir al inicio"
        >
          <CubeLogoIcon />
        </button>

        <h1>Kubo</h1>

        <p>Tu almacenamiento en la nube</p>

      </div>


      <div className="auth-card">

        {/* Solo mostrar tabs en Login y Registro */}
        {(isLogin || isRegister) && (
          <nav
            className="auth-tabs"
            role="tablist"
            aria-label="Autenticación"
          >

            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={`auth-tabs__item${isLogin ? ' is-active' : ''}`}
              onClick={() => navigate('/login')}
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={`auth-tabs__item${isRegister ? ' is-active' : ''}`}
              onClick={() => navigate('/register')}
            >
              Registrarse
            </button>

          </nav>
        )}


        <div className="auth-card__panel">

          {isLogin && (
            <LoginForm
              onGoToRegister={() => navigate('/register')}
              onForgotPassword={() => navigate('/recover-password')}
              onAuthenticated={handleAuthenticated}
              onResendVerification={goToVerification}
              notice={location.state?.notice}
            />
          )}


          {isRegister && (
            <RegisterForm
              selectedPlan={selectedPlan}
              onSwitchTab={() => navigate('/login')}
              onResendVerification={goToVerification}
            />
          )}


          {isRecover && (
            <RecoverForm
              onGoToLogin={() => navigate('/login')}
            />
          )}

          {isResend && (
            <RecoverForm
              key="verification"
              verification
              initialEmail={location.state?.email || ''}
              onGoToLogin={() => navigate('/login')}
            />
          )}

          {isReset && (
            <ResetPasswordForm
              key={location.search}
              uid={params.get('uid')}
              token={params.get('token')}
              onCompleted={handleCompleted}
              onRequestNew={() => navigate('/recover-password', { replace: true })}
            />
          )}

          {isVerify && (
            <VerifyEmailForm
              key={location.search}
              uid={params.get('uid')}
              token={params.get('token')}
              onCompleted={handleCompleted}
              onRequestNew={() => navigate('/resend-verification', { replace: true })}
            />
          )}

        </div>

      </div>

    </div>
  )
}

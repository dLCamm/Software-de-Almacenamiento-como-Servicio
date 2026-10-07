import { useLocation, useNavigate } from 'react-router-dom'

import { CubeLogoIcon } from '../../components/icons'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import RecoverForm from './RecoverForm'

import './AuthPage.css'


export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const isLogin = location.pathname === '/login'
  const isRegister = location.pathname === '/register'
  const isRecover = location.pathname === '/recover-password'
  const requestedPlan = new URLSearchParams(location.search).get('plan')
  const selectedPlan = ['free', 'pro', 'business'].includes(requestedPlan) ? requestedPlan : 'free'

  function handleAuthenticated() {
    navigate('/app/client')
  }

  return (
    <div className="auth-page">

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
        {!isRecover && (
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
            />
          )}


          {isRegister && (
            <RegisterForm
              selectedPlan={selectedPlan}
              onSwitchTab={() => navigate('/login')}
            />
          )}


          {isRecover && (
            <RecoverForm
              onGoToLogin={() => navigate('/login')}
            />
          )}

        </div>

      </div>

    </div>
  )
}
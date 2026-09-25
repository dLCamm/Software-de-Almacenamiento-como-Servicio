import { useState } from 'react'
import { CubeLogoIcon } from '../../components/icons'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import RecoverForm from './RecoverForm'
import ProfilePreview from './ProfilePreview'
import './AuthPage.css'

const TABS = [
  { id: 'login', label: 'Iniciar sesión' },
  { id: 'register', label: 'Registrarse' },
  { id: 'recover', label: 'Recuperar cuenta' },
  { id: 'profile', label: 'Mi perfil' },
]

export default function AuthPage({ onAuthenticated, onGoHome, initialTab = 'login' }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  return (
    <div className="auth-page">
      <div className="auth-page__brand">
        <button
          type="button"
          className="auth-page__logo"
          onClick={onGoHome}
          disabled={!onGoHome}
          aria-label="Ir al inicio"
        >
          <CubeLogoIcon />
        </button>
        <h1>Kubo</h1>
        <p>Tu almacenamiento en la nube</p>
      </div>

      <div className="auth-card">
        <nav className="auth-tabs" role="tablist" aria-label="Autenticación">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`auth-tabs__item${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="auth-card__panel">
          {activeTab === 'login' && (
            <LoginForm
              onSwitchTab={setActiveTab}
              onAuthenticated={onAuthenticated}
            />
          )}
          {activeTab === 'register' && <RegisterForm onSwitchTab={setActiveTab} />}
          {activeTab === 'recover' && <RecoverForm onSwitchTab={setActiveTab} />}
          {activeTab === 'profile' && <ProfilePreview onSwitchTab={setActiveTab} />}
        </div>
      </div>
    </div>
  )
}

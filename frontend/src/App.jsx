import { useState } from 'react'
import LandingPage from './pages/Landing/LandingPage'
import AuthPage from './pages/Auth/AuthPage'

export default function App() {
  const [view, setView] = useState('landing')

  if (view === 'landing') {
    return (
      <LandingPage
        onGoToLogin={() => setView('login')}
        onGoToRegister={() => setView('register')}
      />
    )
  }

  return (
    <AuthPage
      initialTab={view === 'register' ? 'register' : 'login'}
      onGoHome={() => setView('landing')}
    />
  )
}
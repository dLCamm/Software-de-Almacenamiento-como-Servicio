import { useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'

import './DashboardPage.css'


export default function WelcomePage() {
  const navigate = useNavigate()

  function handleLogout() {
    logout()

    navigate('/login')
  }

  return (
    <div className="welcome-page">

      <div className="welcome-card">

        <div className="welcome-card__icon">
          ✓
        </div>

        <h1>Inicio de sesión exitoso</h1>

        <p>
          Has ingresado correctamente a Kubo.
        </p>

        <button
          type="button"
          className="btn btn--primary"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>

      </div>

    </div>
  )
}
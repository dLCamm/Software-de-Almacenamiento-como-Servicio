import './PageLoading.css'

/** Esqueleto que ocupa el área principal mientras se confirma la sesión y el rol. */
export default function PageLoading() {
  return <div className="page-loading" role="status" aria-label="Cargando" aria-busy="true">
    <span className="page-loading__shape page-loading__title" />
    <span className="page-loading__shape page-loading__subtitle" />
    <div className="page-loading__grid" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((item) => <span key={item} className="page-loading__shape page-loading__card" />)}
    </div>
  </div>
}

/** Filas de esqueleto para el menú lateral mientras llega el perfil. */
export function NavLoading() {
  return <div className="nav-loading" aria-hidden="true">
    {[0, 1, 2].map((item) => <span key={item} className="page-loading__shape nav-loading__row" />)}
  </div>
}

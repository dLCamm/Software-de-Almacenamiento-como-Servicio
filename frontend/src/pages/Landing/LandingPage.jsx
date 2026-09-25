import { useState } from 'react'
import {
  CubeLogoIcon,
  ArrowRightIcon,
  UsersIcon,
  ShieldIcon,
  CloudIcon,
  StarIcon,
  LockIcon,
  ShareIcon,
  FolderIcon,
  AdminShieldIcon,
  CheckIcon,
} from '../../components/icons'
import './LandingPage.css'

const NAV_LINKS = [
  { id: 'caracteristicas', label: 'Características' },
  { id: 'precios', label: 'Precios' },
  { id: 'soporte', label: 'Soporte' },
]

const FORMATS = [
  { label: '.PDF', tone: 'red' },
  { label: '.DOCX', tone: 'blue' },
  { label: '.MP3', tone: 'green' },
  { label: '.PNG', tone: 'violet' },
]

const STATS = [
  { icon: UsersIcon, value: '3,490+', label: 'Usuarios activos' },
  { icon: ShieldIcon, value: '99.9%', label: 'Disponibilidad' },
  { icon: CloudIcon, value: '12 TB', label: 'Almacenado' },
  { icon: StarIcon, value: '4.9', label: 'Valoración', suffix: '★' },
]

const FEATURES = [
  {
    icon: LockIcon,
    tone: 'violet',
    title: 'Almacenamiento seguro',
    description:
      'Cifrado de extremo a extremo. Tus archivos están protegidos 24/7 en infraestructura guatemalteca.',
  },
  {
    icon: ShareIcon,
    tone: 'blue',
    title: 'Comparte fácilmente',
    description:
      'Genera enlaces de descarga con expiración configurable. Comparte con quien quieras, cuando quieras.',
  },
  {
    icon: FolderIcon,
    tone: 'amber',
    title: 'Organización total',
    description:
      'Carpetas, renombrado, búsqueda instantánea y archivos temporales con auto-eliminación.',
  },
  {
    icon: AdminShieldIcon,
    tone: 'green',
    title: 'Control de acceso',
    description:
      'Panel de administración completo. Gestiona usuarios, planes y auditorías desde un solo lugar.',
  },
]

const PLANS = [
  { id: 'free', name: 'FREE', price: 'Q0', storage: '5 GB de almacenamiento', cta: 'Seleccionar plan' },
  {
    id: 'pro',
    name: 'PRO',
    price: 'Q149',
    storage: '50 GB de almacenamiento',
    cta: 'Comenzar ahora',
    highlighted: true,
    badge: 'Más popular',
  },
  { id: 'business', name: 'BUSINESS', price: 'Q399', storage: '500 GB de almacenamiento', cta: 'Seleccionar plan', tone: 'green' },
]

export default function LandingPage({ onGoToLogin, onGoToRegister }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav__bar">
          <div className="landing-nav__brand">
            <span className="landing-nav__logo">
              <CubeLogoIcon />
            </span>
            <span className="landing-nav__name">Kubo</span>
          </div>

          <nav className="landing-nav__links" aria-label="Principal">
            {NAV_LINKS.map((link) => (
              <a key={link.id} href={`#${link.id}`}>
                {link.label}
              </a>
            ))}
          </nav>

          <button type="button" className="btn btn--ghost landing-nav__cta" onClick={onGoToLogin}>
            <ArrowRightIcon className="btn__icon" />
            Iniciar sesión
          </button>

          <button
            type="button"
            className="landing-nav__toggle"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {menuOpen && (
          <div className="landing-nav__mobile">
            {NAV_LINKS.map((link) => (
              <a key={link.id} href={`#${link.id}`} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setMenuOpen(false)
                onGoToLogin?.()
              }}
            >
              Iniciar sesión
            </button>
          </div>
        )}
      </header>

      <main>
        <section className="hero">
          <span className="hero__badge">
            <span className="hero__badge-dot" />
            Plataforma #1 de almacenamiento en Guatemala
          </span>

          <h1 className="hero__title">
            Tu nube segura, <span className="hero__title-accent">siempre disponible</span>
          </h1>

          <p className="hero__subtitle">
            Sube, organiza y comparte documentos, audios e imágenes con total seguridad. Planes
            desde <strong>Q0/mes</strong> — sin tarjeta requerida.
          </p>

          <div className="hero__actions">
            <button type="button" className="btn btn--primary btn--lg" onClick={onGoToRegister}>
              Crear cuenta gratis
            </button>
            <button type="button" className="btn btn--secondary btn--lg">
              Ver demostración
              <ArrowRightIcon className="btn__icon" />
            </button>
          </div>

          <div className="hero__formats">
            <span>Formatos aceptados:</span>
            <div className="hero__format-list">
              {FORMATS.map((format) => (
                <span key={format.label} className={`format-badge format-badge--${format.tone}`}>
                  {format.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="stats" aria-label="Estadísticas">
          {STATS.map((stat) => (
            <div key={stat.label} className="stats__card">
              <stat.icon className="stats__icon" aria-hidden="true" />
              <div className="stats__value">
                {stat.value}
                {stat.suffix && <span className="stats__suffix">{stat.suffix}</span>}
              </div>
              <div className="stats__label">{stat.label}</div>
            </div>
          ))}
        </section>

        <section className="features" id="caracteristicas">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Por qué elegir Kubo</span>
            <h2>Todo lo que necesitas en un solo lugar</h2>
          </div>

          <div className="features__grid">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="feature-card">
                <div className={`feature-card__icon feature-card__icon--${feature.tone}`}>
                  <feature.icon aria-hidden="true" />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pricing" id="precios">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Precios simples y transparentes</span>
            <h2>Elige el plan que más te conviene</h2>
          </div>

          <div className="pricing__grid">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`plan-card${plan.highlighted ? ' plan-card--highlighted' : ''}`}
              >
                {plan.badge && <span className="plan-card__badge">{plan.badge}</span>}
                <span className={`plan-card__name${plan.tone ? ` plan-card__name--${plan.tone}` : ''}`}>
                  {plan.name}
                </span>
                <div className="plan-card__price">
                  {plan.price}
                  <span>/mes</span>
                </div>
                <p className="plan-card__storage">{plan.storage}</p>
                <button
                  type="button"
                  className={`btn btn--block ${plan.highlighted ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={plan.highlighted ? onGoToRegister : undefined}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <p className="pricing__more">
            ¿Necesitas más?{' '}
            <a href="#planes-completos">
              Ver todos los beneficios
              <ArrowRightIcon className="link-icon" />
            </a>
          </p>
        </section>

        <section className="final-cta" id="soporte">
          <div className="final-cta__checks">
            <CheckIcon />
            <CheckIcon />
            <CheckIcon />
          </div>
          <h2>Empieza hoy mismo — gratis</h2>
          <p>Sin tarjeta de crédito. Sin compromisos. Cancela cuando quieras.</p>
          <button type="button" className="btn btn--primary btn--lg" onClick={onGoToRegister}>
            Crear cuenta gratis
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-nav__brand">
          <span className="landing-nav__logo landing-nav__logo--sm">
            <CubeLogoIcon />
          </span>
          <span className="landing-nav__name">Kubo</span>
        </div>
        <p>© {new Date().getFullYear()} Kubo. Tu almacenamiento en la nube.</p>
      </footer>
    </div>
  )
}

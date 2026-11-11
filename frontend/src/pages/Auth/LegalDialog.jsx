import { useEffect } from 'react'
import './LegalDialog.css'

const UPDATED = '10 de noviembre de 2026'

const DOCUMENTS = {
  terminos: {
    title: 'Términos de Servicio',
    sections: [
      {
        heading: '1. Aceptación',
        body: [
          'Al crear una cuenta o usar Kubo aceptas estos Términos de Servicio y la Política de Privacidad. Si no estás de acuerdo con ellos, no debes usar la plataforma.',
        ],
      },
      {
        heading: '2. El servicio',
        body: [
          'Kubo es una plataforma de almacenamiento en la nube que te permite subir, organizar, descargar y compartir archivos en formato PDF, DOCX, MP3 y PNG.',
          'Las funciones disponibles dependen de tu plan. Algunas, como compartir enlaces y los archivos temporales, solo están incluidas en los planes de pago.',
        ],
      },
      {
        heading: '3. Tu cuenta',
        body: [
          'Para usar Kubo debes registrarte con un correo electrónico válido y verificarlo. Eres responsable de mantener tu contraseña en secreto y de toda la actividad que ocurra en tu cuenta.',
          'Si detectas un acceso no autorizado, cambia tu contraseña desde Configuración y avísanos lo antes posible.',
        ],
      },
      {
        heading: '4. Planes y pagos',
        body: [
          'Toda cuenta nueva inicia con el plan FREE (5 GB). Puedes cambiar a un plan de pago (PRO, PREMIUM o BUSINESS) desde Planes y Facturación.',
          'Los planes de pago se cobran de forma mensual en quetzales. El nuevo plan se activa únicamente cuando el pago es aprobado.',
        ],
      },
      {
        heading: '5. Uso aceptable',
        body: [
          'No puedes usar Kubo para almacenar o compartir contenido ilegal, malicioso o que infrinja derechos de terceros, ni para intentar acceder a cuentas o archivos que no te pertenecen.',
          'Tampoco puedes interferir con el funcionamiento de la plataforma ni usarla para distribuir spam o software dañino.',
        ],
      },
      {
        heading: '6. Tu contenido',
        body: [
          'Los archivos que subes siguen siendo tuyos. Solo los almacenamos y procesamos para prestarte el servicio: guardarlos, mostrarte la vista previa y entregarlos a quien tú decidas compartirlos.',
          'Cuando compartes un enlace, cualquier persona que lo tenga puede descargar el archivo hasta que el enlace expire.',
        ],
      },
      {
        heading: '7. Papelera y eliminación',
        body: [
          'Los archivos que eliminas pasan a la papelera y se borran de forma definitiva después de 30 días. Los archivos temporales se eliminan automáticamente al vencer su plazo. Un archivo borrado definitivamente no se puede recuperar.',
        ],
      },
      {
        heading: '8. Suspensión de cuentas',
        body: [
          'El equipo de administración y soporte puede desactivar una cuenta que incumpla estos términos o que represente un riesgo para la plataforma o para otros usuarios.',
        ],
      },
      {
        heading: '9. Limitación de responsabilidad',
        body: [
          'Hacemos lo posible por mantener Kubo disponible y tus archivos seguros, pero el servicio se ofrece "tal cual". Te recomendamos conservar copias de los archivos importantes.',
        ],
      },
      {
        heading: '10. Cambios a estos términos',
        body: [
          'Podemos actualizar estos términos. Si el cambio es importante, te avisaremos por correo o dentro de la plataforma. Seguir usando Kubo después del aviso significa que aceptas la nueva versión.',
        ],
      },
    ],
  },
  privacidad: {
    title: 'Política de Privacidad',
    sections: [
      {
        heading: '1. Información que recopilamos',
        body: [
          'Datos de tu cuenta: nombre, apellido, correo electrónico y contraseña. La contraseña se guarda cifrada y nadie puede leerla, ni siquiera nuestro equipo.',
          'Tus archivos y la información sobre ellos: nombre, tamaño, tipo, carpeta y fechas.',
          'Datos de pago: el plan, el monto, la fecha, el estado y la referencia de cada transacción. No guardamos el número de tu tarjeta, su fecha de vencimiento ni su código de seguridad.',
          'Registro de actividad: acciones importantes de la cuenta, como inicios de sesión, cambios de plan o archivos eliminados, para seguridad y auditoría.',
        ],
      },
      {
        heading: '2. Para qué usamos tu información',
        body: [
          'Para crear y proteger tu cuenta, almacenar tus archivos, procesar tus pagos, enviarte correos de verificación y de recuperación de contraseña, y darte soporte cuando lo necesites.',
          'No vendemos tu información ni la usamos para publicidad.',
        ],
      },
      {
        heading: '3. Quién puede ver tus datos',
        body: [
          'El equipo de soporte y administración puede consultar los datos de tu cuenta y tu historial de pagos para ayudarte o resolver problemas. No abren el contenido de tus archivos.',
          'Tus archivos solo los ve otra persona si tú le compartes un enlace.',
        ],
      },
      {
        heading: '4. Dónde se guarda',
        body: [
          'Tu información se guarda en servidores en la nube con acceso restringido, y la conexión con Kubo está cifrada (HTTPS). Los enlaces para compartir archivos son temporales y vencen automáticamente.',
        ],
      },
      {
        heading: '5. Cuánto tiempo la conservamos',
        body: [
          'Conservamos tus datos mientras tu cuenta esté activa. Los archivos eliminados permanecen 30 días en la papelera antes de borrarse de forma definitiva. Algunos registros de pagos y de actividad pueden conservarse más tiempo por motivos de seguridad y control.',
        ],
      },
      {
        heading: '6. Tus derechos',
        body: [
          'Puedes consultar y actualizar tus datos desde Configuración, descargar tus archivos en cualquier momento y solicitar la eliminación de tu cuenta escribiendo al correo de contacto.',
        ],
      },
      {
        heading: '7. Cookies y almacenamiento local',
        body: [
          'Usamos el almacenamiento del navegador solo para mantener tu sesión iniciada y recordar preferencias como el modo claro u oscuro. No usamos cookies de rastreo ni de publicidad.',
        ],
      },
      {
        heading: '8. Cambios a esta política',
        body: [
          'Si cambiamos esta política de forma importante, te lo comunicaremos por correo o dentro de la plataforma.',
        ],
      },
      {
        heading: '9. Contacto',
        body: [
          'Si tienes dudas sobre tu privacidad, escríbenos a kuboalmacenamiento@gmail.com.',
        ],
      },
    ],
  },
}

/** Ventana con los Términos de Servicio o la Política de Privacidad. */
export default function LegalDialog({ type, onClose }) {
  const doc = DOCUMENTS[type]

  useEffect(() => {
    if (!doc) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc, onClose])

  if (!doc) return null

  return (
    <div className="legal-backdrop" onClick={onClose}>
      <section
        className="legal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="legal-dialog__header">
          <span className="legal-dialog__icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {type === 'privacidad'
                ? <><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>
                : <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>}
            </svg>
          </span>
          <div className="legal-dialog__heading">
            <h2 id="legal-title">{doc.title}</h2>
            <p>Última actualización: {UPDATED}</p>
          </div>
          <button type="button" className="legal-dialog__close" onClick={onClose} aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div className="legal-dialog__body">
          {doc.sections.map((section) => {
            const [, number, title] = section.heading.match(/^(\d+)\.\s*(.*)$/) || [null, '', section.heading]
            return (
              <section className="legal-section" key={section.heading}>
                <h3>{number && <span className="legal-section__number">{number}</span>}{title}</h3>
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            )
          })}
        </div>
        <footer className="legal-dialog__footer">
          <p className="legal-dialog__note">Kubo · Tu almacenamiento en la nube</p>
          <button type="button" className="legal-dialog__ok" onClick={onClose}>Entendido</button>
        </footer>
      </section>
    </div>
  )
}

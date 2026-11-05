# Reporte de carencias visuales del frontend — Kubo

**Fecha:** 4 de noviembre de 2026
**Rama revisada:** `develop`
**Método:** recorrido en navegador (Playwright, 1440×900 y 390×844, modo claro) con la cuenta de cliente PRO, más revisión del código de las vistas de administración (la contraseña de administrador compartida no coincidió con la base de datos, por eso esa parte se revisó desde el código).

Cada hallazgo indica **qué falta**, **dónde** y **qué se propone**. La prioridad va de **Alta** (afecta la comprensión o la confianza del usuario) a **Baja** (pulido).

---

## 1. Resumen

| Prioridad | Cantidad | Temas principales |
|---|---|---|
| Alta | 7 | Pantallas en blanco al cargar, textos técnicos visibles al cliente, comparación de planes, vista previa de archivos, móvil |
| Media | 10 | Barra de almacenamiento, compartir sin opciones, papelera, pasos del pago, identidad de marca |
| Baja | 8 | Microcopys, iconografía, título de pestaña, avatar |

Lo que ya funciona bien: modo claro/oscuro con tokens (`styles/theme.css`), skeletons en Planes y Mis Archivos, superposición de arrastrar y soltar, estados vacíos con texto útil, diálogo de confirmación al eliminar planes, mensajes de error en español en casi todas las vistas.

---

## 2. Hallazgos de prioridad alta

### A1. La app se ve en blanco mientras carga
- **Dónde:** `layouts/ClientLayout.jsx` y todas las rutas `/app/*`.
- **Qué pasa:** al entrar o recargar, durante 2–15 segundos solo aparecen el logo, "Modo oscuro", "Configuración" y "Cerrar sesión". El menú principal y el contenido no se dibujan hasta que responde `getProfile()`. En móvil se ve una pantalla completamente vacía con el botón ☰.
- **Propuesta:** mostrar un skeleton del menú lateral (3 filas) y del área principal mientras llega el perfil. Reutilizar `.file-skeleton__shape`.

### A2. Textos técnicos visibles para el cliente
- **Dónde:**
  - Resumen de facturación: *"La API actual informa el uso total, pero no separa el almacenamiento por tipo de archivo."*
  - Método de pago: *"El contrato actual de la API solo procesa pagos con tarjeta; las otras opciones aparecen deshabilitadas."*
  - Checkout: *"Pago de prueba procesado por la API configurada."* y *"La API no proporciona la fecha del próximo cobro."*
  - Historial: referencias con prefijo `MOCK-…`.
- **Propuesta:** reemplazar por lenguaje de usuario ("Pronto podrás ver el desglose por tipo de archivo", "Por ahora solo aceptamos tarjeta"). La tarjeta "Desglose por tipo" debería ocultarse o mostrar el desglose que ya calcula la vista de Estadísticas del administrador.

### A3. La comparación de planes no muestra qué le falta al plan Free
- **Dónde:** `billing/components/BillingPlans.jsx` y la sección de precios del landing.
- **Qué pasa:** el plan FREE lista solo lo que incluye; no indica que **no** permite compartir enlaces ni archivos temporales. El cliente lo descubre al no encontrar la opción.
- **Propuesta:** tabla o lista con ✓ / ✗ por función (almacenamiento, compartir, temporales) igual en todos los planes. Además, los beneficios no son homogéneos: PREMIUM no lista "Gestión de archivos" ni "Gestión de carpetas", lo que sugiere que no las incluye.

### A4. No hay vista previa de archivos
- **Dónde:** `dashboard/components/FileCard.jsx`.
- **Qué pasa:** hacer clic en cualquier archivo lo **descarga** de inmediato. No hay miniaturas para PNG ni reproductor para MP3, aunque la página pública de enlaces compartidos (`shared/SharedFilePage.jsx`) sí reproduce audio. RF-06 pide "visualizar".
- **Propuesta:** panel lateral o modal de vista previa (imagen, PDF embebido, reproductor de audio) con botón "Descargar". Miniaturas en la cuadrícula para PNG.

### A5. Mensaje de error en inglés en el inicio de sesión
- **Dónde:** `Auth/LoginForm.jsx`.
- **Qué pasa:** con credenciales incorrectas aparece *"No active account found with the given credentials"* (mensaje por defecto de SimpleJWT).
- **Propuesta:** traducir en el frontend: "Correo o contraseña incorrectos. Revisa tus datos o recupera tu contraseña."

### A6. Barra de herramientas desbordada en escritorio
- **Dónde:** cabecera de Mis Archivos (1440 px).
- **Qué pasa:** el botón "Papelera" queda cortado en el borde derecho y el buscador trunca su placeholder ("Buscar archivos y car").
- **Propuesta:** agrupar acciones secundarias (tipo, temporal, vista, papelera) en una segunda fila o en un menú; mover "Papelera" al menú lateral como sección propia.

### A7. Navegación móvil incompleta
- **Dónde:** `ClientLayout.css` a 390 px.
- **Qué pasa:** no hay barra superior con la marca; el botón ☰ flota abajo a la izquierda encima de las tarjetas; "Nueva carpeta" se trunca a "Nueva carpe…"; "Papelera" baja a una fila sola.
- **Propuesta:** barra superior fija con logo + ☰ + avatar; botón flotante "+" para subir/crear carpeta.

---

## 3. Hallazgos de prioridad media

| # | Dónde | Qué falta | Propuesta |
|---|---|---|---|
| M1 | Barra de almacenamiento (Mis Archivos y menú lateral) | Con uso bajo (0.03 %) la barra es invisible; no separa por color lo "eliminable" (papelera) del resto, como pide RF‑03. | Ancho mínimo visible del relleno; segmento de otro color para lo que está en papelera; colores de advertencia al 80 % y 95 %. |
| M2 | Diálogo "Enlace para compartir" | El enlace se crea al instante con 7 días fijos; no se puede elegir la duración aunque el landing dice "expiración configurable" y RF‑11 pide enlaces fijos o temporales. | Selector de duración (1 día, 7 días, 14 días) antes de generar; mostrar fecha exacta de expiración. |
| M3 | Papelera | No hay "Vaciar papelera" ni "Restaurar todo"; "Eliminar definitivamente" está deshabilitado hasta cumplir 30 días sin explicarlo en el botón. | Acciones masivas; tooltip visible o texto junto al botón deshabilitado. |
| M4 | Mis Archivos | No hay ruta de navegación (breadcrumbs) dentro de carpetas, ni opción "Mover a carpeta", ni selección múltiple. | Breadcrumb encima de la cuadrícula; "Mover a…" en el menú ⋮; casillas de selección. |
| M5 | Método de pago | El indicador de pasos solo nombra el paso 1; los pasos 2 y 3 no tienen etiqueta. La opción deshabilitada "Transferencia" muestra el radio relleno, parece seleccionada. Ambas opciones usan el mismo icono. | Etiquetar los 3 pasos ("Método", "Datos", "Confirmar"); radio vacío y opacidad en opciones deshabilitadas; icono de banco para transferencia. |
| M6 | Saludo "Hola, …" en Mis Archivos | Aparece después de cargar y empuja todo el contenido hacia abajo (salto de diseño). | Reservar su altura con un skeleton. |
| M7 | Botón "Ampliar almacenamiento · desde Q149" | Se muestra igual a un usuario que ya está en PRO (Q149). | Mostrar el siguiente plan ("Pasar a PREMIUM · Q249") u ocultarlo en el plan más alto. |
| M8 | Plan Free en "Planes" | El botón dice "Contratar" en el plan gratuito, que no requiere pago. | "Cambiar a Free" o "Plan base" con explicación. |
| M9 | Historial de pagos | La referencia parece enlace (color morado) pero no abre nada; no hay comprobante descargable. | Abrir detalle del pago o generar comprobante PDF. |
| M10 | Notificaciones | Los avisos (subida correcta, archivo a papelera) aparecen como texto en la página; no hay sistema de toasts consistente ni progreso de subida por archivo. | Toasts con acción "Deshacer" al mover a papelera; barra de progreso por archivo. |

---

## 4. Hallazgos de prioridad baja

| # | Dónde | Detalle |
|---|---|---|
| B1 | `index.html` | El título de la pestaña es **"frontend"** en todas las páginas. Debería ser "Kubo" y cambiar por sección ("Mis archivos · Kubo"). |
| B2 | Favicon | Usa el icono por defecto de Vite. Usar el cubo de Kubo. |
| B3 | Configuración | No hay foto/avatar ni iniciales; no hay opción para eliminar la cuenta. |
| B4 | Iconos de archivos | El MP3 usa un icono circular distinto al estilo "hoja" de PDF/DOC/PNG; DOC y DOCX comparten etiqueta "DOC". |
| B5 | Landing | Estadísticas inventadas (3,490+ usuarios, 12 TB, 4.9★) y el sello "Plataforma #1 en Guatemala"; conviene quitarlas o marcarlas como ilustrativas para la entrega. "Ver demostración" no lleva a una demo. |
| B6 | Landing | "Cifrado de extremo a extremo" no corresponde a lo implementado (MinIO + enlaces prefirmados); ajustar el texto. |
| B7 | Resumen de facturación | "Plan actual: PRO" se repite tres veces en la misma pantalla. El anillo de 0.03 % muestra un tope cuadrado; usar `stroke-linecap: round`. |
| B8 | Identidad visual | Tipografía y morado (#4F46E5 aprox.) son los valores habituales de plantillas SaaS; las tarjetas tienen todas el mismo radio y sombra. Para diferenciar a Kubo se puede usar el cubo como motivo (esquinas isométricas en estados vacíos, ilustración del hero), una tipografía de titulares propia y un color secundario para la papelera/temporales. |

---

## 5. Vistas de administración (revisión de código)

- **Inicio:** las tarjetas de resumen solo aparecen cuando llegan los datos; no hay skeleton (salto de diseño). Las flechas "→" de los accesos rápidos son texto, no iconos.
- **Estadísticas:** no hay gráficas de tendencia (ingresos por mes, altas de usuarios); RF‑15 pide ingresos mensuales y tasa de cancelación.
- **Usuarios / Pagos / Auditoría:** tablas sin ordenamiento por columna ni exportación (CSV/PDF).
- **Planes:** el formulario permite reordenar beneficios con botones ▲▼ pero no hay vista previa de cómo verá la tarjeta el cliente.
- **Soporte:** no tiene un inicio propio; entra directo a la lista de usuarios.

---

## 6. Orden sugerido de trabajo

1. A1, A5, B1, B2 — cambios pequeños con mucho impacto en la primera impresión.
2. A2, A3, M7, M8 — copy y comparación de planes (refuerzan las limitaciones del plan Free).
3. A6, A7 — distribución de la barra de herramientas y navegación móvil.
4. A4, M2, M4 — vista previa, duración de enlaces, breadcrumbs.
5. M1, M3, M5, M9, M10 y el resto.

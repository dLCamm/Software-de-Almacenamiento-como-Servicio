# Despliegue para la presentación

Kubo se levanta en Docker en una computadora del equipo y se publica con
**Cloudflare Tunnel** (gratis, sin cuenta). Todo se sirve desde un solo origen:

| Ruta       | Va a                         |
|------------|------------------------------|
| `/`        | Frontend (React compilado, Nginx) |
| `/api/`    | Backend Django (gunicorn)    |
| `/minio/`  | MinIO (descargas y vistas previas) |

## Requisitos

- Docker Desktop encendido.
- `backend/.env` con los datos de Supabase (`DB_*`) y `DJANGO_SECRET_KEY`.
- Para que lleguen los correos de verificación, agregar SMTP al `backend/.env`
  (por ejemplo Gmail con una contraseña de aplicación):

  ```
  MAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
  EMAIL_HOST=smtp.gmail.com
  EMAIL_PORT=587
  EMAIL_USE_TLS=True
  EMAIL_HOST_USER=correo@gmail.com
  EMAIL_HOST_PASSWORD=contraseña-de-aplicación
  DEFAULT_FROM_EMAIL=Kubo <correo@gmail.com>
  ```

  Sin esto, el enlace de verificación solo aparece en
  `docker compose -f docker-compose.prod.yml logs backend`.

## Levantarlo

En PowerShell, desde la carpeta del repo:

```powershell
.\desplegar.ps1
```

Al terminar muestra el enlace público (`https://...trycloudflare.com`) y el
local (`http://localhost:8080`).

Si PowerShell bloquea el script:
`powershell -ExecutionPolicy Bypass -File .\desplegar.ps1`

## Importante

- El enlace funciona **solo mientras la computadora y Docker estén encendidos**.
- **Cambia cada vez** que se reinicia el contenedor `cloudflared`. Levántenlo
  poco antes de presentar y no lo detengan.
- Los archivos subidos se guardan en el mismo volumen de MinIO que usa el
  entorno de desarrollo, así que no se pierden.
- Límite por archivo: 100 MB.

## Apagarlo

```powershell
docker compose -f docker-compose.prod.yml down
```

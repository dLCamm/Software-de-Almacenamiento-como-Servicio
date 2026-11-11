# Despliegue

Hay dos formas, las dos con `docker-compose.prod.yml`:

- **Azure (recomendada):** una VM siempre encendida con enlace fijo.
- **Computadora del equipo + Cloudflare Tunnel:** gratis, pero el enlace
  cambia en cada arranque y la computadora debe quedar encendida.

Todo se sirve desde un solo origen:

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

## Opción A: VM en Azure (Ubuntu)

```bash
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

# Código (rama de despliegue)
git clone -b deploy/presentacion https://github.com/dLCamm/Software-de-Almacenamiento-como-Servicio.git kubo
cd kubo
nano backend/.env        # pegar el mismo .env que usan en local

# Configuración del servidor (una sola vez; cambiar el dominio por el de la VM)
cat > .env <<'CFG'
HTTP_PORT=8080
COMPOSE_PROFILES=https
DOMAIN=<nombre>.<region>.cloudapp.azure.com
PUBLIC_URL=https://<nombre>.<region>.cloudapp.azure.com
CFG

# Levantar (Caddy obtiene el certificado https solo; abrir puertos 80 y 443 en Azure)
docker compose -f docker-compose.prod.yml up -d --build
```

Actualizar después de nuevos cambios:

```bash
cd kubo && git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml restart frontend
```

Los contenedores se vuelven a levantar solos si la VM se reinicia.
**Apaguen o eliminen la VM después de la presentación** para no gastar crédito.

## Opción B: computadora del equipo + Cloudflare Tunnel

En PowerShell, desde la carpeta del repo:

```powershell
.\desplegar.ps1
```

Al terminar muestra el enlace público (`https://...trycloudflare.com`) y el
local (`http://localhost:8080`).

Si PowerShell bloquea el script:
`powershell -ExecutionPolicy Bypass -File .\desplegar.ps1`

### Importante (opción B)

- El enlace funciona **solo mientras la computadora y Docker estén encendidos**.
- **Cambia cada vez** que se reinicia el contenedor `cloudflared`. Levántenlo
  poco antes de presentar y no lo detengan.
- Los archivos subidos se guardan en el mismo volumen de MinIO que usa el
  entorno de desarrollo, así que no se pierden.
- Límite por archivo: 100 MB.

## Apagarlo

```powershell
docker compose -f docker-compose.prod.yml --profile tunnel down
```

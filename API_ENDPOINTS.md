# Guía de Integración API Backend para Frontend — VaultDrive

Esta guía documenta todos los endpoints disponibles en el backend de VaultDrive, su estructura de datos, formatos de petición y respuesta, y consideraciones de autenticación para su consumo desde el frontend.

---

## 1. Configuración General

- **Base URL Local:** `http://localhost:8000` (definida comúnmente en el frontend mediante `VITE_API_URL`).
- **Formato por defecto:** `application/json` (excepto subida de archivos que usa `multipart/form-data`).
- **Esquema de Autenticación:** JSON Web Tokens (JWT).
  - Todos los endpoints de `/api/storage/` requieren un token válido.
  - Los endpoints protegidos requieren enviar el header HTTP:
    ```http
    Authorization: Bearer <access_token>
    ```

---

## 2. Almacenamiento de Binarios (MinIO Object Storage)

El backend utiliza una arquitectura desacoplada para los archivos:
- **Base de Datos Relacional (PostgreSQL):** Almacena únicamente los **metadatos** (nombre original, extensión, tamaño, fecha de subida, carpeta contenedora, usuario propietario y estado).
- **MinIO (Object Storage compatible con S3):** Almacena físicamente los **archivos binarios**.

### Tecnologías y Librerías utilizadas:
1. **`minio==7.2.15`** (en `backend/requirements.txt`): El SDK oficial de MinIO para Python.
2. **`filetype==1.2.0`**: Para inspeccionar los primeros bytes (magic numbers) y verificar el formato binario real antes de subirlo.
3. **Contenedor MinIO:**
   - **Puerto API S3:** `http://localhost:9000`
   - **Consola Web MinIO:** `http://localhost:9001` (Credenciales por defecto: `minioadmin` / `minioadmin`).
   - **Bucket:** `vaultdrive-storage`.

### Cómo interactúa el backend con los binarios:
- **Guardado (`put_object`):** Se ubican dentro del bucket organizados por clave:
  `usuarios/{user_id}/archivos/{uuid}.{ext}`.
- **Descarga Streaming (`get_object`):** El backend recupera el stream desde MinIO y lo canaliza directamente al frontend con `FileResponse` sin saturar memoria RAM.
- **Enlaces Compartidos (`presigned_get_object`):** MinIO genera una URL pública firmada criptográficamente con vencimiento temporal (`X-Amz-Signature`), permitiendo que el navegador descargue directamente desde MinIO sin pasar por Django.

---

## 3. Mapa de Rutas en el Código Fuente

Para consultar validaciones o lógica interna en el repositorio:

| Módulo | Archivo de Rutas | Vistas / Controladores | Serializadores y Modelos |
| :--- | :--- | :--- | :--- |
| **Enrutador Principal** | `backend/config/urls.py` | — | — |
| **Autenticación y Usuarios** | `backend/users/urls.py` | `backend/users/views.py` | `backend/users/serializers.py` |
| **Almacenamiento (Storage)** | `backend/storage/urls.py` | `backend/storage/views.py` | `backend/storage/serializers.py` |
| **Health Check** | `backend/config/urls.py` | `backend/core/views.py` | — |

---

## 3. Endpoints de Autenticación (`/api/auth/`)

### 3.1. Registro de Usuario
- **Ruta:** `POST /api/auth/register/`
- **Autenticación:** Pública.
- **Request Body (JSON):**
  ```json
  {
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan.perez@example.com",
    "password": "Password123!",
    "password_confirm": "Password123!"
  }
  ```
- **Respuestas:**
  - `201 Created`:
    ```json
    {
      "id": 1,
      "first_name": "Juan",
      "last_name": "Pérez",
      "email": "juan.perez@example.com",
      "role": "client"
    }
    ```
  - `400 Bad Request`: Si el correo ya existe o las contraseñas no coinciden.

---

### 3.2. Inicio de Sesión (Login)
- **Ruta:** `POST /api/auth/login/`
- **Autenticación:** Pública.
- **Request Body (JSON):**
  ```json
  {
    "email": "juan.perez@example.com",
    "password": "Password123!"
  }
  ```
- **Respuestas:**
  - `200 OK`:
    ```json
    {
      "refresh": "eyJhbGciOi...",
      "access": "eyJhbGciOi...",
      "user": {
        "id": 1,
        "first_name": "Juan",
        "last_name": "Pérez",
        "email": "juan.perez@example.com",
        "role": "client"
      }
    }
    ```
  - `401 Unauthorized`: Credenciales inválidas.

---

### 3.3. Refresco de Token de Acceso
- **Ruta:** `POST /api/auth/token/refresh/`
- **Autenticación:** Pública.
- **Request Body (JSON):**
  ```json
  {
    "refresh": "<refresh_token>"
  }
  ```
- **Respuestas:**
  - `200 OK`:
    ```json
    {
      "access": "<nuevo_access_token>"
    }
    ```
  - `401 Unauthorized`: Token de refresco expirado o inválido.

---

### 3.4. Obtener Perfil del Usuario Autenticado
- **Ruta:** `GET /api/auth/me/`
- **Autenticación:** Requerida (`Bearer <access_token>`).
- **Respuestas:**
  - `200 OK`:
    ```json
    {
      "id": 1,
      "first_name": "Juan",
      "last_name": "Pérez",
      "email": "juan.perez@example.com",
      "role": "client",
      "is_email_verified": false,
      "is_active": true,
      "created_at": "2026-09-30T10:00:00Z"
    }
    ```

---

## 4. Endpoints de Almacenamiento: Archivos (`/api/storage/files/`)

### 4.1. Subir Archivo
- **Ruta:** `POST /api/storage/files/upload/`
- **Autenticación:** Requerida.
- **Content-Type:** `multipart/form-data`
- **Parámetros del FormData:**
  - `archivo` *(File, Requerido)*: Objeto del archivo a cargar.
  - `carpeta_id` *(UUID string, Opcional)*: ID de la carpeta destino. Si se omite, se guarda en la raíz.
  - `es_temporal` *(Boolean, Opcional, Default: `false`)*: Marca si el archivo expirará automáticamente.
  - `tiempo_vida_dias` *(Integer, Opcional, Default: `14`)*: Días de validez (1 a 365) si es temporal.
- **Respuestas:**
  - `201 Created`:
    ```json
    {
      "message": "Archivo cargado y persistido exitosamente.",
      "archivo": {
        "id": "e3b0c442-98fc-1c14-9afbf4c8996fb924",
        "nombre_original": "informe_mensual.pdf",
        "extension": "pdf",
        "mime_type": "application/pdf",
        "tamano_bytes": 2048576,
        "tamano_legible": "1.95 MB",
        "carpeta": null,
        "carpeta_nombre": null,
        "es_temporal": false,
        "fecha_expiracion": null,
        "estado": "activo",
        "fecha_subida": "2026-09-30T12:30:00Z"
      }
    }
    ```
  - `400 Bad Request`: Formato no permitido o datos inválidos.
  - `413 Request Entity Too Large`: Cuota de almacenamiento excedida.

---

### 4.2. Listar Archivos
- **Ruta:** `GET /api/storage/files/`
- **Autenticación:** Requerida.
- **Query Parameters (Opcionales):**
  - `carpeta_id`: UUID de la carpeta a consultar, o `root` para consultar solo los archivos raíz.
  - `q`: Cadena de texto para buscar por coincidencia en el nombre original.
  - `formato`: Extensión sin punto para filtrar por tipo (ej. `pdf`, `png`, `zip`).
- **Ejemplo:** `GET /api/storage/files/?carpeta_id=root&q=reporte&formato=pdf`
- **Respuestas:**
  - `200 OK`: Lista de archivos con la estructura de `FileDetailSerializer`.

---

### 4.3. Detalle de un Archivo
- **Ruta:** `GET /api/storage/files/<uuid:file_id>/`
- **Autenticación:** Requerida.
- **Respuestas:**
  - `200 OK`: Objeto con metadatos del archivo.
  - `404 Not Found`: Si el archivo no existe o pertenece a otro usuario.

---

### 4.4. Descargar Archivo Directo
- **Ruta:** `GET /api/storage/files/<uuid:file_id>/download/`
- **Autenticación:** Requerida.
- **Respuestas:**
  - `200 OK`: Stream binario del archivo con encabezado:
    ```http
    Content-Disposition: attachment; filename="informe_mensual.pdf"
    ```
  - Permite la descarga nativa en el navegador mediante `window.open(...)` o `<a download>`.

---

### 4.5. Compartir Archivo (Enlace Público Temporal)
- **Ruta:** `POST /api/storage/files/<uuid:file_id>/share/`
- **Autenticación:** Requerida.
- **Request Body (JSON, Opcional):**
  ```json
  {
    "expiracion_segundos": 86400
  }
  ```
  *(Por defecto dura 1,209,600 segundos = 14 días si no se especifica).*
- **Respuestas:**
  - `200 OK`:
    ```json
    {
      "download_url": "http://minio:9000/vaultdrive-storage/...?X-Amz-Signature=...",
      "expira_en_segundos": 86400
    }
    ```

---

### 4.6. Eliminar Archivo
- **Ruta:** `DELETE /api/storage/files/<uuid:file_id>/`
- **Autenticación:** Requerida.
- **Query Parameters (Opcionales):**
  - `permanente`: `true` o `false` (default: `false`).
    - Si es `false`: Mueve a la papelera durante 30 días.
    - Si es `true`: Elimina definitivamente solo si ya se cumplieron los 30 días en papelera.
- **Respuestas:**
  - `200 OK`:
    ```json
    {
      "message": "Archivo movido a la papelera."
    }
    ```
  - `409 Conflict`: El archivo todavía no cumple los 30 días de retención.

### 4.7. Papelera: listar, restaurar y eliminar
- **Listar:** `GET /api/storage/trash/`
- **Restaurar archivo:** `POST /api/storage/files/<uuid:file_id>/restore/`
- **Restaurar carpeta y su contenido:** `POST /api/storage/folders/<uuid:folder_id>/restore/`
- **Autenticación:** Requerida.
- **Respuesta del listado (`200 OK`):**
  ```json
  [
    {
      "id": "e3b0c442-98fc-1c14-9afbf4c8996fb924",
      "tipo": "archivo",
      "nombre": "informe.pdf",
      "extension": "pdf",
      "tamano_bytes": 2048576,
      "fecha_papelera": "2026-10-01T12:30:00Z",
      "fecha_eliminacion": "2026-10-31T12:30:00Z"
    }
  ]
  ```
- Las carpetas se muestran como un único elemento; sus subcarpetas y archivos se conservan y se restauran junto con ellas.
- Los elementos se purgan automáticamente de PostgreSQL y MinIO al cumplirse 30 días. El servicio de limpieza en Docker Compose ejecuta la tarea diariamente.
- Un conflicto de nombre o una carpeta original que ya no está disponible devuelve `409 Conflict` al restaurar. El borrado permanente solicitado antes de cumplir el plazo también devuelve `409 Conflict`.

---

## 5. Endpoints de Almacenamiento: Carpetas (`/api/storage/folders/`)

### 5.1. Listar Carpetas
- **Ruta:** `GET /api/storage/folders/`
- **Autenticación:** Requerida.
- **Query Parameters (Opcionales):**
  - `parent_id`: UUID de la carpeta contenedora. Si se omite, retorna las carpetas de primer nivel (raíz).
- **Respuestas:**
  - `200 OK`:
    ```json
    [
      {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "nombre": "Contabilidad",
        "carpeta_padre": null,
        "fecha_creacion": "2026-09-30T09:00:00Z",
        "estado": "activo",
        "subcarpetas_count": 2,
        "archivos_count": 8
      }
    ]
    ```

---

### 5.2. Crear Carpeta
- **Ruta:** `POST /api/storage/folders/`
- **Autenticación:** Requerida.
- **Request Body (JSON):**
  ```json
  {
    "nombre": "Facturas 2026",
    "carpeta_padre_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }
  ```
  *(Usa `"carpeta_padre_id": null` para crear en la raíz).*
- **Respuestas:**
  - `201 Created`: Objeto de la carpeta creada.
  - `409 Conflict`: Ya existe una carpeta con ese nombre en la misma ubicación.

---

### 5.3. Renombrar Carpeta
- **Ruta:** `PATCH /api/storage/folders/<uuid:folder_id>/`
- **Autenticación:** Requerida.
- **Request Body (JSON):**
  ```json
  {
    "nuevo_nombre": "Facturas Q3 2026"
  }
  ```
- **Respuestas:**
  - `200 OK`: Objeto de la carpeta actualizado.
  - `409 Conflict`: Nombre duplicado en el mismo nivel.

---

### 5.4. Eliminar Carpeta
- **Ruta:** `DELETE /api/storage/folders/<uuid:folder_id>/`
- **Autenticación:** Requerida.
- **Query Parameters (Opcionales):**
  - `permanente`: `true` o `false` (default: `false`).
    - Si es `false`: Mueve la carpeta y todo su contenido a la papelera durante 30 días.
    - Si es `true`: Elimina definitivamente la carpeta y sus binarios solo después de cumplir los 30 días.
- **Respuestas:**
  - `200 OK`:
    ```json
    {
      "message": "Carpeta eliminada exitosamente."
    }
    ```
  - `409 Conflict`: El plazo de retención no ha concluido o la carpeta debe eliminarse desde su elemento superior en la papelera.

---

## 6. Cuota y Métricas de Espacio (`/api/storage/usage/`)

### 6.1. Consultar Espacio Utilizado
- **Ruta:** `GET /api/storage/usage/`
- **Autenticación:** Requerida.
- **Descripción:** Calcula en tiempo real el espacio ocupado por el usuario frente a su límite contratado. Los archivos en papelera siguen ocupando cuota hasta su eliminación definitiva.
- **Respuestas:**
  - `200 OK`:
    ```json
    {
      "usado_bytes": 524288000,
      "maximo_bytes": 5368709120,
      "disponible_bytes": 4844421120,
      "porcentaje_usado": 9.77
    }
    ```

---

## 7. Health Check del Servicio (`/api/health/`)

### 7.1. Comprobar Disponibilidad
- **Ruta:** `GET /api/health/`
- **Autenticación:** Pública.
- **Respuestas:**
  - `200 OK`:
    ```json
    {
      "status": "ok",
      "service": "VaultDrive API"
    }
    ```

---

## 8. Guía Rápida de Integración en Frontend (Ejemplos con `fetch` / `axios`)

### Configurar Axios con Interceptor de Token:
```javascript
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Adjuntar Token JWT automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Ejemplo: Subida de Archivo
```javascript
export async function uploadFile(file, folderId = null, isTemporary = false) {
  const formData = new FormData();
  formData.append('archivo', file);
  if (folderId) formData.append('carpeta_id', folderId);
  if (isTemporary) formData.append('es_temporal', 'true');

  const response = await api.post('/api/storage/files/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
```

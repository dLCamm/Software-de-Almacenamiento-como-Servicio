# Informe de integración para Frontend: administración y auditoría

El backend dispone de endpoints para consultar auditoría y estadísticas globales. Este informe resume el contrato disponible para integrar el panel administrativo. La documentación general de la API está en [API_ENDPOINTS.md](./API_ENDPOINTS.md).

## Autenticación y permisos

Todas las rutas requieren un JWT válido:

```http
Authorization: Bearer <access_token>
```

El usuario debe tener el rol `ADMIN`, en concordancia con las rutas administrativas existentes. `is_staff` no es requisito.

- Sin autenticación válida: `401 Unauthorized`.
- Usuario autenticado sin `is_staff`: `403 Forbidden`.

## Endpoints

### Auditoría

```http
GET /api/admin/audit/
```

Parámetros opcionales:

| Parámetro | Descripción |
| --- | --- |
| `action` | Acción exacta, por ejemplo `file.upload` o `auth.login`. |
| `resource_type` | Tipo de recurso: `file`, `folder`, `payment` o `user`. |
| `page` | Número de página. |
| `page_size` | Elementos por página; predeterminado `50`, máximo `100`. |

Ejemplo: `GET /api/admin/audit/?action=file.upload&page=1&page_size=25`

Respuesta `200 OK`:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "actor_id": 12,
      "actor_email": "cliente@example.com",
      "action": "file.upload",
      "resource_type": "file",
      "resource_id": "e3b0c442-98fc-1c14-9afbf4c8996fb924",
      "details": {
        "extension": "pdf",
        "tamano_bytes": 2048576
      },
      "created_at": "2026-10-26T12:30:00Z"
    }
  ]
}
```

`actor_id` y `actor_email` pueden ser `null` si se eliminó la cuenta. `details` varía según la acción. Se registran registros e inicios de sesión exitosos, operaciones de archivos y carpetas, pagos procesados y cambios de plan. No se guardan datos de tarjetas, tokens ni URL firmadas.

### Estadísticas generales

```http
GET /api/admin/statistics/
```

Respuesta `200 OK`:

```json
{
  "usuarios": {
    "total": 120,
    "clientes": 114,
    "clientes_activos": 110,
    "por_rol": {
      "CLIENT": 114,
      "SUPPORT": 4,
      "ADMIN": 2
    }
  },
  "ingresos": {
    "total_aprobado": "1490.00",
    "pagos_aprobados": 10
  },
  "pagos": {
    "aprobados": 10,
    "rechazados": 2
  },
  "almacenamiento": {
    "archivos_activos_y_en_papelera": 50,
    "usado_bytes": 524288000
  }
}
```

`total_aprobado` es la suma histórica de pagos aprobados. No se indica moneda porque el modelo de pagos no la almacena. El almacenamiento incluye archivos activos y en papelera; excluye los eliminados definitivamente.

### Almacenamiento global por extensión

```http
GET /api/admin/statistics/storage-by-type/
```

Respuesta `200 OK`:

```json
{
  "total_usado_bytes": 524288000,
  "tipos": [
    {
      "extension": "pdf",
      "archivos_count": 20,
      "usado_bytes": 314572800
    },
    {
      "extension": "png",
      "archivos_count": 30,
      "usado_bytes": 209715200
    }
  ]
}
```

Agrupa por extensión los archivos de todos los usuarios. Incluye activos y en papelera; excluye los eliminados definitivamente.

## Recomendaciones para la interfaz

- Implementar estados de carga, vacío y error, incluyendo respuestas `401` y `403`.
- Convertir los campos `*_bytes` a una unidad legible para mostrarlos.
- Tratar `total_aprobado` como un importe decimal; no asumir una moneda.
- Usar `count`, `next` y `previous` para paginar la auditoría.
- Para consultar el uso de almacenamiento de un usuario individual, continuar usando `GET /api/storage/usage/`. El endpoint por extensión entrega métricas globales y es exclusivo para administradores.

## Resumen

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/admin/audit/` | Consultar y filtrar eventos de auditoría. |
| `GET` | `/api/admin/statistics/` | Consultar usuarios, pagos, ingresos y almacenamiento. |
| `GET` | `/api/admin/statistics/storage-by-type/` | Consultar uso global agrupado por extensión. |

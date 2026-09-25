# Bitácora del Proyecto — Kubo

## Estado actual

El repositorio contiene un frontend React con Vite y una API Django REST Framework. El backend dispone de autenticación mediante JWT, registro de usuarios y consulta del usuario autenticado. La recuperación de contraseña todavía no está implementada en la API.

## Trabajo realizado

### Frontend

- Se sustituyó la pantalla inicial de Vite por la interfaz oscura de Kubo para **Registrarse** y **Recuperar cuenta**, con navegación lateral, indicador de almacenamiento y espacio reservado para la imagen conjunta de logo y nombre de Kubo.
- Se ajustó la composición visual: el selector de secciones se ubica debajo de la marca, la barra superior se mantiene sin controles y ambas pantallas usan la paleta negro/gris con acento violeta de la referencia visual.
- Se agregaron validaciones de interfaz para nombre, apellido, correo, contraseña, confirmación y aceptación de términos en el registro.
- Se incorporaron estados de carga, éxito y error, además de un diseño adaptable para escritorio y móvil.
- La pantalla de recuperación valida el formato del correo y comunica de manera explícita que el servicio aún no está disponible. El control de reenvío permanece deshabilitado porque la API no ofrece esa operación.

### Integración con backend

- Se creó el servicio de autenticación del frontend que utiliza `VITE_API_URL` (con `http://localhost:8000` como valor de desarrollo) y conecta el formulario de registro con `POST /api/auth/register/`.
- El payload enviado se adapta al serializador existente: `first_name`, `last_name`, `email`, `password` y `password_confirm`.
- Los errores de validación devueltos por Django REST Framework, incluidos los de correo duplicado y confirmación de contraseña, se muestran en el formulario.
- La inspección del backend confirmó que no existen endpoints para solicitar o reenviar recuperación de contraseña, ni flujo de correo de recuperación; por ello no se emitieron solicitudes a rutas inexistentes.

### Dependencias / configuración

- No se agregaron dependencias. La integración usa `fetch`, disponible en el navegador.

## Pendientes conocidos

- Implementar en el backend un flujo seguro de recuperación de contraseña y, cuando exista, conectar la solicitud y el reenvío desde el frontend.
- Sustituir los espacios reservados por el recurso gráfico oficial de logo y nombre de Kubo cuando esté disponible.

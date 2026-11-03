# Administración: US35, US36 y US38

La aplicación principal agrega `/admin/usuarios` (ciudadanos y abogados) y `/admin/padron`. El listado de abogados también permite suspender y rehabilitar. Cada operación requiere confirmación y un JWT firmado con `rol=ADMIN`; ocultar botones no sustituye la autorización del backend.

## Suspender y rehabilitar

- `POST /api/admin/{ciudadanos|abogados}/{id}/suspender`
- `POST /api/admin/{ciudadanos|abogados}/{id}/rehabilitar`
- Cuerpo JSON: `{ "confirmacion": true }`.
- Respuesta: `{ "id": 7, "estadoCuenta": "SUSPENDIDO" }` (o el estado resultante).

Se pueden suspender cuentas REGISTRADO o PENDIENTE; repetir la suspensión es idempotente. Solo se rehabilita SUSPENDIDO. BAJA no se puede reactivar con estas operaciones. Los IDs y los estados se verifican bajo bloqueo de fila y transacción.

La rehabilitación devuelve REGISTRADO si se mantienen los requisitos; en caso contrario devuelve PENDIENTE. En abogados se revalida el padrón actual, sin aprobar manualmente identidad ni matrícula. La suspensión revoca el acceso temporal al registro, bloquea login y los endpoints privados aun con un JWT emitido antes de suspender, y evita reactivaciones por resultados tardíos de identidad. Las rutas públicas continúan siendo públicas. Un JWT anterior puede volver a servir tras la rehabilitación hasta su vencimiento.

No se agregan tablas ni columnas. SUSPENDIDO se crea en el catálogo `estado` al realizar la primera suspensión, serializando esa creación sobre la fila REGISTRADO. No se conserva un historial ni motivo administrativo en esta versión.

## Actualizar padrón

- `GET /api/admin/abogados/padron`: filas actuales, matrículas almacenadas (incluidas las históricas retiradas) y versiones SHA-256 del archivo.
- `POST /api/admin/abogados/padron`: multipart con `archivo` y `confirmacion=true`.
- Solo `.xlsx`, hasta 8 MiB y 30000 filas de evidencia, con las cinco hojas y el formato de Río Tercero que ya interpreta el importador. No es un importador genérico para otros colegios.

El archivo se interpreta completamente antes de escribir. La sustitución de `padron_evidencia` y la actualización de `padron` se realizan en una transacción con reversión ante errores. Las filas padre referenciadas se conservan y las matrículas ausentes del archivo quedan INACTIVO. Las evidencias del archivo anterior se reemplazan; esta versión no conserva sus archivos ni un historial de importaciones. Los contenidos ambiguos continúan requiriendo revisión según el validador existente.

La nueva evidencia se usa en registro, login, recomendaciones y rehabilitación de abogados. No reescribe masivamente las cuentas ni revoca por sí sola JWT de abogados con una sesión existente. La suspensión administrativa es una operación distinta.

Ante un timeout, consultar el estado antes de reintentar: el navegador no puede asegurar si el servidor llegó a confirmar la operación. No hay reintentos automáticos de escrituras.

## Entornos y despliegue

El entorno EP06 de `http://localhost:5180` incluye ahora las tres funciones y mantiene su login `admin.ep06@example.com` y contraseña existentes. Usa el nuevo perfil `admin-gestion-test`, con una guarda de arranque que exige sus bases y usuarios EP06, `ddl-auto=validate` y servicios externos deshabilitados. El perfil histórico `admin-readonly-test` sigue excluyendo los controladores de escritura; `abogados-dev` también los excluye.

El proxy aislado permite únicamente las consultas administrativas, los POST de suspensión/rehabilitación y la carga del padrón. No permite registro, perfiles personales, Didit, Lexi ni recomendaciones. El script `docker/admin-readonly/init/02-enable-gestion.sql` verifica propietario, base y cuentas sintéticas antes de habilitar permisos: UPDATE de cuentas, INSERT/UPDATE de estados y modificación del padrón de abogados. No concede DDL, creación/borrado de cuentas ni escritura de verificaciones. No modifica las bases del entorno principal ni sus credenciales.

Las pruebas nuevas utilizan repositorios simulados, JWT de prueba y Excel sintéticos en H2. No se necesitan importaciones reales ni suspender cuentas reales para validarlas. No hay migraciones de esquema.

# EP06 — fase 1 administrativa de solo lectura

US35, US36 y US38 ya están habilitadas también en el entorno aislado de localhost:5180: ver [ADMIN-GESTION.md](ADMIN-GESTION.md). Este documento conserva como referencia la fase original de solo lectura; el perfil activo del entorno es ahora admin-gestion-test.

Implementación en código, sin desplegar. No requiere cambios de entidades ni de
esquema. No se modificaron Compose, Nginx, el workflow, los datos de Didit ni la
configuración del entorno de recomendaciones de 5175.

## Pantallas y autenticación

- `/admin/iniciar-sesion`: login existente con `tipoCuenta=ADMIN`.
- `/admin`: indicadores de ciudadanos y abogados, con carga y errores independientes.
- `/admin/abogados`: búsqueda por nombre o apellido, filtros de cuenta/identidad/
  matrícula, paginación y acceso al resultado local de identidad.
- `/admin/identidad`: búsqueda por nombre/apellido y selección paginada de ciudadanos
  o abogados. Los IDs se usan internamente; se conservan los enlaces desde abogados.

El login administrativo ahora conduce al panel. El menú del usuario ADMIN ofrece
el acceso al panel. Las rutas React rechazan otras sesiones, pero la autorización
efectiva se verifica también en cada backend mediante el claim firmado `rol=ADMIN`.
No hay registro de administradores ni cambios en el aprovisionamiento existente.

## Endpoints nuevos

Todos usan `Authorization: Bearer <JWT ADMIN>` y solo admiten GET.

| Servicio | Ruta |
| --- | --- |
| Ciudadanos | `/api/admin/ciudadanos/indicadores` |
| Ciudadanos | `/api/admin/ciudadanos` |
| Ciudadanos | `/api/admin/ciudadanos/{id}/identidad` |
| Abogados | `/api/admin/abogados/indicadores` |
| Abogados | `/api/admin/abogados` |
| Abogados | `/api/admin/abogados/{id}/identidad` |

Listado: `q`, `estado`, `identidad`, `matricula`, `pagina` (desde 0) y `tamano`
(1–100, predeterminado 20). Orden fijo por apellido, nombre e ID; `%`, `_` y `!`
se tratan literalmente en la búsqueda. Los filtros son parámetros ligados de JPQL.
Respuesta: `contenido`, `pagina`, `tamano`, `total`, `paginas`.

El listado de ciudadanos admite `q`, `pagina` y `tamano` (predeterminado 10,
máximo 100), ordenado por apellido, nombre e ID. Su DTO tiene solo `id`, `nombre`,
`apellido`, `estadoCuenta` y `estadoIdentidad`. Tiene la misma autorización ADMIN
y encabezados de no caché que el resto de las consultas.

El DTO de abogado contiene únicamente ID, nombre, apellido, estados de cuenta,
identidad y matrícula, indicador de matrícula verificada y fecha de registro.
No devuelve DNI, correo, teléfono, contraseñas, tokens, URLs Didit ni documentos.

Identidad devuelve ID, estado de cuenta, resultado local de identidad, estado local
de sesión, inicio, última consulta y fecha de consentimiento. Si no existe sesión,
devuelve `SIN_SESION` y fechas nulas; cuenta inexistente devuelve 404. No se consulta
al proveedor ni se inicia ninguna sesión. La última consulta no es fecha de aprobación.

Sin JWT válido: 401. JWT válido con rol distinto, ausente o con otra capitalización:
403. Métodos de escritura: rechazados. Respuestas exitosas: `Cache-Control: no-store`.
Los controladores usan transacciones de lectura y no llaman métodos de escritura.

Los indicadores cuentan todos los registros por estado, incluidas solicitudes
pendientes de abogados; no afirman habilitación profesional ni validan el padrón.
Los datos de ambos servicios corresponden a consultas independientes.

## Pruebas aisladas sin SQL

Desde la raíz, con Java 21, Maven y Node instalados:

```powershell
$repositorioPruebas = Join-Path $PWD '.m2/repository-tests'
mvn.cmd -o "-Dmaven.repo.local=$repositorioPruebas" -f microservicio-abogados/pom.xml "-Dtest=AdminLecturaTest,AdminConsultasTest" test
mvn.cmd -o "-Dmaven.repo.local=$repositorioPruebas" -f microservicio-ciudadanos/pom.xml "-Dtest=AdminLecturaTest,AdminConsultasTest" test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
```

TypeScript, desde `frontend`: `npx.cmd tsc --noEmit`.
`-o` usa exclusivamente las dependencias locales: si faltan, Maven falla sin
descargarlas. En esta máquina ya están disponibles en esa caché.

`AdminLecturaTest` crea un contexto Spring MVC restringido, con las cadenas reales
de seguridad y JWT firmados de prueba. Los repositorios están simulados. No inicia
Spring Boot completo, datasource, JPA, jobs, Didit ni servidores HTTP externos.

`AdminConsultasTest` valida las consultas JPQL contra las entidades usando Hibernate
offline, DDL desactivado y un ConnectionProvider que falla si alguien intenta
obtener una conexión JDBC. No ejecuta consultas ni cambios de esquema.

No ejecutar la suite backend completa bajo la restricción actual: otras pruebas
preexistentes sí usan H2 y ejecutan SQL.

Las pruebas frontend verifican roles, rutas y formularios renderizados, estados de
carga, GET autenticados, codificación, cancelación y errores con respuestas simuladas.
El renderizado de pruebas sustituye el contexto de sesión; no crea un login alternativo
ni forma parte de la aplicación publicada.

Evidencias: reportes `target/surefire-reports/*Admin*.xml` y salida TAP del frontend.
No incluir JWT o secretos reales en Jira ni en capturas.

## Prueba visual/Postman posterior

La prueba automatizada anterior está lista y no toca bases. La comprobación manual
integral en navegador/Postman queda pendiente de autorizar y preparar procesos
separados con repositorios de prueba o una base descartable. No iniciar los servicios
con la configuración habitual: actualmente contiene `ddl-auto=update` y tareas de
arranque que pueden escribir, aunque estos endpoints sean de lectura.

Para esa futura instancia se deben utilizar puertos, secretos y datos propios,
sin compartir los de 5173/5175 ni conectar a PostgreSQL real. Mantener Didit y la
importación del padrón desactivados, y usar `ddl-auto=validate` si hubiera base.

El cliente administrativo admite `VITE_ADMIN_CIUDADANOS_URL` y
`VITE_ADMIN_ABOGADOS_URL` para dirigir sus consultas a instancias separadas. Los
valores predeterminados siguen siendo localhost:8080 y localhost:8082; no se alteró
el login existente ni su URL. CORS conserva el origen habitual localhost:5173.
La futura prueba visual en otro puerto requiere ajustar el origen únicamente en
la instancia de prueba y enrutar el login a autenticación de prueba.

En Postman, verificar los seis GET con token ADMIN, sin token y con tokens de
ciudadano/abogado; filtros, paginación, 404, datos ausentes y campos prohibidos.
No se creó ni ejecutó una colección contra servicios reales.

## Límites deliberados

- No se valida el esquema instalado ni el rendimiento real de PostgreSQL en esta fase.
- La búsqueda es por nombre o apellido, sin búsqueda por datos personales sensibles.
- El selector consulta los listados existentes sin cargar datos sensibles. Cancela
  peticiones y descarta respuestas tardías al cambiar de tipo, búsqueda o selección.
- Los estados de identidad y matrícula son los almacenados; no se sincronizan.
- No se introduce auditoría persistente ni ninguna función administrativa de escritura.
- El controlador y la cadena administrativa de abogados no se registran con el
  perfil `abogados-dev`, para conservar el aislamiento de las recomendaciones.
- No se modificó la configuración existente `ddl-auto=update`; tampoco se inició
  ninguna aplicación contra una base. Su eliminación del despliegue habitual
  sigue siendo una precaución pendiente antes de desplegar.

## Archivos de esta fase

Frontend: `src/pages/Admin.tsx`, `src/services/adminService.js`,
`src/services/adminService.test.js`, `src/services/adminPantallas.test.js`,
`src/App.tsx`, `src/Navbar.tsx`, `src/pages/Login.tsx`, `src/ui.tsx`.

En cada backend: `config/AdminReadSecurity.java`, `config/SecurityConfig.java`,
`controller/AdminLecturaController.java`, su repositorio de cuentas existente,
`AdminLecturaTest.java` y `AdminConsultasTest.java`.

Documentación: este archivo. Los cambios previos en otros archivos del árbol
de trabajo se preservaron y no corresponden a esta fase.

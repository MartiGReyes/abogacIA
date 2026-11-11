# Home del abogado: implementación y prueba aislada

Implementado el 10/11/2026 sobre el frontend React/Vite y el microservicio de abogados existentes. El abogado inicia sesión mediante el login normal, navega a `/` y ve directamente su dashboard. Volver al inicio o recargar `/` mantiene ese Home mientras su sesión esté vigente. Ciudadanos y administradores conservan sus rutas de navegación. `/dashboard-abogado` es un alias protegido de `/`; el detalle usa `/dashboard-abogado/asesoramientos/:id`.

## Probar ahora

El entorno de prueba quedó iniciado en **http://localhost:5181/iniciar-sesion**.

1. Seleccionar **Abogado**.
2. Correo: **abogado1.dashboard@example.com**.
3. Contraseña: **Dashboard-Prueba-2026!**.
4. Presionar **Iniciar sesión**. Debe abrir `/` y mostrar **Hola, Prueba**, indicadores, gráficos y detalle de actividad. No es necesario navegar a otra pantalla.
5. Recargar `/` y pulsar el logo: continúa en el Home profesional.
6. Cambiar períodos, filtrar finalizados por fecha de finalización, seleccionar ingresos por asesoramiento y abrir el detalle de un caso para consultar sus cuotas y total del rango.

Todas estas identidades son sintéticas, exclusivas del nuevo entorno. La franja visible lo indica. No se importaron cuentas, padrón ni datos reales.

| Correo | Uso | Contraseña |
| --- | --- | --- |
| abogado1.dashboard@example.com | Actividad, dos áreas, cuotas, valoraciones, ARS/USD | Dashboard-Prueba-2026! |
| abogado2.dashboard@example.com | Datos distintos para comprobar aislamiento | Dashboard-Prueba-2026! |
| abogado3.dashboard@example.com | Cuenta sin actividad: vacíos y promedio nulo | Dashboard-Prueba-2026! |

En la carga inicial, el abogado 1 tiene dos solicitudes aceptadas en los últimos 30 días, un finalizado en ese rango y promedio 4/5 con dos valoraciones. Sus ingresos históricos son ARS 25.000 y USD 25, separados. Dos cuotas legítimas de ARS 10.000 del mismo caso suman ARS 20.000; operaciones pendientes, canceladas y rechazadas no cuentan. Las fechas de fixtures son relativas a la primera inicialización: los conteos del rango cambiarán con el paso del tiempo. El histórico permanece. Para revisar toda la actividad elegir últimos 3 meses o un rango que incluya la fecha inicial.

## Iniciar o detener exclusivamente este entorno

Desde la raíz del repositorio `abogacIA`, con Docker Desktop activo:

```powershell
# Solo en una instalación nueva, si aún no existe docker/dashboard-test/.env:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/dev/Preparar-Dashboard.ps1

# Iniciar / actualizar únicamente este proyecto:
docker compose --env-file docker/dashboard-test/.env -f docker-compose.dashboard-test.yml up -d --build

# Ver estado:
docker compose --env-file docker/dashboard-test/.env -f docker-compose.dashboard-test.yml ps

# Detener conservando todos los datos:
docker compose --env-file docker/dashboard-test/.env -f docker-compose.dashboard-test.yml stop
```

No combinar este Compose con otros. El preparador genera secretos independientes y rechaza sobrescribir su `.env`, que está ignorado por Git. No volver a ejecutar los SQL de inicialización sobre tablas o fixtures ya cargados. En otra máquina debe estar libre el puerto 5181; no detener servicios ajenos para liberarlo.

Proyecto `abogacia-dashboard-test`, volumen `abogacia-dashboard-test_dashboard_test_data`, base `dashboard_abogados_test`. PostgreSQL, autenticación y abogados no publican puertos al host. Solo el frontend publica `127.0.0.1:5181`. La red privada es interna y no se conecta a redes habituales. El proxy permite únicamente login y lecturas del perfil/dashboard. No accede a n8n, RAG, Didit, recomendaciones o EP06. El frontend es el código principal completo, compilado con URLs relativas de este entorno; no hay una aplicación profesional paralela.

La inicialización usa un propietario aislado y concede al runtime `dashboard_reader` solamente lectura. El perfil `dashboard-test` exige URL, usuario y perfil exactos, `ddl-auto=validate`, inicialización SQL automática deshabilitada y reconciliación/importación desactivadas antes de inicializar JPA.

## Funcionalidades y fuentes

| Funcionalidad | Implementación |
| --- | --- |
| Home profesional | Encabezado personalizado, layout/NavBar/estilos actuales, cargas, errores y reintento |
| Solicitudes aceptadas | Estado ACEPTADA y fecha de aceptación, filtros, orden/paginación y enlace al asesoramiento cuando existe |
| Finalizados | Estado FINALIZADO y fecha de finalización explícitos; detalle con duración calendario |
| Por área | Área persistida en cada solicitud, cantidad y porcentaje del total del período |
| Por período | 30 días, 3/6/12 meses y rango personalizado; series separadas de inicios y finalizaciones |
| Valoraciones | Promedio, cantidad y distribución 1–5; sin filas, promedio null y «Sin valoraciones todavía» |
| Ingreso acumulado | Operaciones COBRADO, histórico por moneda; subtotal del rango separado |
| Ingreso mensual | Mes completo seleccionado, anterior, variación o ausencia de base; gráfico de 12 meses |
| Ingreso por asesoramiento/período | Una fila por caso/moneda, total cobrado del rango, orden por importe, detalle paginado de cuotas y total del rango |

El filtro de área afecta métricas, series, ingresos y listados. El gráfico comparativo de áreas conserva todas las áreas del período y lo informa explícitamente. Histórico no se limita por el filtro de fechas. El mes seleccionado es independiente del rango global. Los gráficos temporales incluyen tabla textual desplegable accesible. El menú del abogado vuelve a su Home; no lo envía al historial de demostración existente.

Todas las fechas se filtran en calendario argentino (`America/Argentina/Buenos_Aires`), con comienzo inclusivo y comienzo del día siguiente exclusivo. Últimos 30 días = hoy y los 29 anteriores; meses = rango móvil con ajuste del último día válido. El rango máximo es de cinco años. Las fechas base se explican en pantalla y en la propuesta de Etapa A. La duración mostrada es tiempo calendario transcurrido, no horas trabajadas.

## Backend y modelo

Endpoints GET bajo `/api/abogados/me/dashboard`: `resumen`, `solicitudes`, `asesoramientos`, `por-area`, `por-periodo`, `valoraciones`, `ingresos/mensuales`, `ingresos/por-asesoramiento`, `asesoramientos/{id}` y `asesoramientos/{id}/pagos`.

Filtros: `desde`, `hasta`, `area`, `estado`, `fechaBase=inicio|finalizacion`, `pagina`, `tamano` (máximo 100), `orden=fecha|importe|id`, `direccion=asc|desc`; ingresos añade `moneda`, mensual `mes=YYYY-MM`. `orden=importe` corresponde a ingresos/pagos. Los pagos se filtran por fecha de cobro; pendientes sin esa fecha quedan fuera de ese listado y nunca integran ingresos.

Cada consulta exige JWT válido, claim `rol=ABOGADO` y cuenta REGISTRADO vigente, resuelta por `sub`. Ningún ID de abogado recibido del cliente identifica al titular. Los detalles ajenos devuelven 404; otros roles o cuentas no habilitadas, 403; JWT inválido/ausente, 401. Las consultas llevan el titular hasta la relación con solicitud; respuestas `no-store`. El ciudadano se representa por referencia técnica, sin DNI, teléfono, correo ni domicilio.

El modelo SQL canónico es `microservicio-abogados/src/main/resources/db/dashboard-v1.sql`: solicitud, asesoramiento, valoración y pago, con PK/FK locales, índices, checks de estados/fechas/puntuación y operación única para idempotencia. Ciudadanos es una referencia lógica entre bases. Los repositorios usan JDBC parametrizado dentro del microservicio existente, con agregaciones/paginación en PostgreSQL y transacciones de lectura REPEATABLE_READ. Pagos y valoraciones se agregan por separado para impedir multiplicación de filas. Los decimales se entregan como strings exactos; la conversión numérica del navegador sirve para formato/gráficos, no para calcular totales contables.

Se eligió SQL explícito sin nuevas entidades JPA para que `ddl-auto=update` habitual **no cree estas tablas al reiniciar accidentalmente**. El SQL no está en una ubicación de autoejecución y solo fue aplicado en la base nueva de prueba. No hay migración ni despliegue autorizado sobre bases habituales. Hasta instalar el esquema mediante un cambio posterior autorizado, el entorno habitual no dispone del dominio nuevo; una consulta fallida muestra error, no cifras simuladas.

El alcance implementado es de lectura: no se agregaron flujos de crear/aceptar/finalizar casos, valorar o cobrar, ni proveedor de pagos. Para actividad habitual habrá que integrar escrituras legítimas que respeten las reglas transaccionales de la propuesta (titular del caso, solicitud aceptada, valoración del ciudadano tras finalizar, especialidad válida y clave canónica de cobro). Los fixtures demuestran el dashboard con registros persistidos en aislamiento; no sustituyen esa integración. No se implementaron reembolsos ni conversión entre monedas.

## Validación

- Backend: suite preexistente más filtros y seguridad nuevos; reportes acumulados de Surefire: **143 pruebas, 0 fallos, 0 errores, 0 omitidas**. La suite completa pasó con H2; las nuevas pruebas de seguridad/fechas se ejecutaron además de forma dirigida.
- Frontend: **56 pruebas de servicios aprobadas**, TypeScript sin emisión, oxlint y compilación Vite correctos.
- PostgreSQL 17 + servicios aislados: **8 pruebas HTTP aprobadas** con login real, métricas, filtros, listas, cuotas, roles, JWT inválidos, aislamiento y vacíos; **2 pruebas de correspondencia de esquema/aislamiento** aprobadas.
- SQL: restricciones de operación única, puntuación, fechas obligatorias y permisos de solo lectura comprobadas en transacción con rollback.
- Chromium: **10 pruebas aprobadas**, incluyendo entrada directa al Home, recarga, detalle, carga/error/reintento, cuenta vacía, filtros, rutas protegidas, 360/768/1440 px y regresión de navegación de ciudadanos/administradores. Estas dos regresiones de otros roles usan fixtures de UI, sin emitir tokens hacia servicios reales.
- Capturas responsive revisadas visualmente, guardadas localmente en `frontend/test-results/`. No se realizó una auditoría exhaustiva con lector de pantalla ni prueba de carga a escala productiva.

Repetir verificaciones (con el entorno aislado activo para HTTP/navegador):

```powershell
node --test docker/dashboard-test/api.test.mjs docker/dashboard-test/isolation.test.mjs
Get-Content docker/dashboard-test/constraints.test.sql | docker compose --env-file docker/dashboard-test/.env -f docker-compose.dashboard-test.yml exec -T postgres-dashboard psql -X -v ON_ERROR_STOP=1 -U dashboard_owner -d dashboard_abogados_test
mvn.cmd -f microservicio-abogados/pom.xml test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
Push-Location frontend
.\node_modules\.bin\tsc.cmd --noEmit
# En una máquina nueva: npm.cmd ci y npm.cmd exec -- playwright install chromium
npm.cmd run test:dashboard
Pop-Location
```

## Archivos agregados o modificados

Frontend:

- `frontend/src/App.tsx`
- `frontend/src/Navbar.tsx`
- `frontend/src/pages/LawyerDashboard.tsx`
- `frontend/src/services/dashboardAbogadoService.js`
- `frontend/src/services/dashboardAbogadoService.test.js`
- `frontend/e2e/dashboard.spec.ts`
- `frontend/playwright.config.ts`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/.gitignore`

Backend:

- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/dashboard/DashboardController.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/dashboard/DashboardRepository.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/dashboard/DashboardTestGuard.java`
- `microservicio-abogados/src/main/resources/application-dashboard-test.properties`
- `microservicio-abogados/src/main/resources/db/dashboard-v1.sql`
- `microservicio-abogados/src/test/java/com/abogacia/microservicio_abogados/dashboard/DashboardFiltroTest.java`
- `microservicio-abogados/src/test/java/com/abogacia/microservicio_abogados/dashboard/DashboardSecurityTest.java`

Entorno y documentación:

- `docker-compose.dashboard-test.yml`
- `docker/dashboard-test/init/10-schema.sql`
- `docker/dashboard-test/init/20-fixtures.sql`
- `docker/dashboard-test/frontend.Dockerfile`
- `docker/dashboard-test/nginx.conf`
- `docker/dashboard-test/api.test.mjs`
- `docker/dashboard-test/isolation.test.mjs`
- `docker/dashboard-test/constraints.test.sql`
- `scripts/dev/Preparar-Dashboard.ps1`
- `.dockerignore`
- `DASHBOARD-ABOGADO-ETAPA-A.md` (auditoría anterior, con enlace de seguimiento)
- `DASHBOARD-ABOGADO.md` (este documento)

Se generó también `docker/dashboard-test/.env` local, ignorado por Git, con secretos exclusivos de prueba. Artefactos de compilación, logs y capturas quedan en carpetas ignoradas. No se modificaron los Compose habituales, EP06, abogados-dev, sus datos, n8n ni RAG.

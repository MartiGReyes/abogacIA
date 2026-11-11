# Dashboard del abogado: auditoría y propuesta (Etapa A)

Seguimiento: la Etapa B fue autorizada posteriormente con el dashboard como Home del abogado en `/`. La implementación y sus pruebas se documentan en `DASHBOARD-ABOGADO.md`; este informe conserva la auditoría original.

Fecha: 10/11/2026. Estado: propuesta pendiente de autorización. No se implementó la Etapa B.

## Alcance y conclusión

Se inspeccionaron los tres microservicios, entidades, repositorios, controladores, seguridad, configuraciones, frontend, pruebas, Compose, documentación y definiciones de tablas de los SQL versionados. Del backup se consultaron únicamente los nombres de las tablas, sin extraer registros. No se consultaron bases en ejecución; la conclusión describe lo verificable en el repositorio, no certifica el esquema vivo ni la existencia de datos externos.

No existe un dashboard profesional ni un dominio persistido de solicitudes de asesoramiento, asesoramientos, valoraciones o pagos en los archivos examinados. Con las tablas actuales se puede implementar el acceso profesional y el saludo con el nombre real; ninguno de los indicadores de actividad e ingresos solicitados tiene una fuente persistida disponible en el código actual.

No se ejecutaron servicios, contenedores, migraciones ni pruebas durante esta auditoría. No se modificaron código, entidades, configuración, bases, volúmenes, EP06, Lexi, n8n o RAG. El único archivo agregado es este informe.

## 1. Evidencia y capacidades existentes

| Aspecto | Evidencia del repositorio | Consecuencia |
| --- | --- | --- |
| Dashboard profesional | `frontend/src/App.tsx` no registra una ruta profesional de dashboard | Se necesita pantalla y ruta nuevas |
| Perfil propio | `PerfilAbogadoController`, GET `/api/abogados/me`; `abogadoService.js` | Nombre, apellido y perfil persistidos disponibles |
| Identidad | `LoginController`: JWT firmado HS256, emisor `abogacia-auth`, `sub` = ID técnico, claim `rol`; respuesta incluye `idUsuario` | El backend debe resolver al titular desde `sub`, nunca desde el ID enviado por React |
| Validación JWT | `SecurityConfig` de abogados valida firma, emisor y tiempos; cadena `/api/abogados/me/**` | Conviene alojar los endpoints bajo ese prefijo y agregar autorización profesional explícita |
| Cuenta habilitada | `PerfilAbogadoController.titular` exige rol ABOGADO, ID válido, cuenta con contraseña y estado REGISTRADO | Reutilizar mediante un servicio de titularidad; actualmente es un método privado |
| Solicitudes actuales | `IniciarSolicitudRequest`, `/verificacion/solicitud`, `AbogadoRegistrado.esSolicitud()` | Son registros profesionales incompletos; no son pedidos de asesoramiento |
| Contacto Lexi | `contactoPrueba.js`: simulación sin red ni almacenamiento, restringida a `perfilPrueba` | No contabilizar contactos como solicitudes ni asesoramientos |
| Asesoramientos | No hay entidades, repositorios ni endpoints de este dominio | Faltan estado, fechas, relación con solicitud y detalle |
| Especialidades | `AbogadoRegistrado.especialidades`, colección `abogado_especialidades(id_abogado, especialidad)` de textos | Existen especialidades reales; no existe entidad catálogo de áreas |
| Validación de categorías | Registro presenta opciones; modificación del perfil admite textos de especialidades | No asumir un catálogo central cerrado; usar valores persistidos y validar en servidor |
| Valoraciones | No hay entidad ni repositorio; `demoData.ts` contiene ratings de demostración | No calcular promedios desde tarjetas o mocks |
| Dinero | `AbogadoRegistrado.honorarios` es BigDecimal del perfil; no hay pagos/cobros persistidos | Honorarios publicados no son ingresos |
| Historial | `pages/History.tsx` usa `MOCK_HISTORY` | No reutilizarlo como historial de asesoramientos reales |
| Administración | `pages/Admin.tsx`, `AdminLecturaController`, consultas agregadas/paginadas en repositorios | Hay patrones aprovechables; sus totales son cuentas, no actividad profesional |
| Persistencia adicional | Estado, padrón, evidencia y verificación de identidad; ciudadanos en base propia | No hay relaciones de asesoramiento que puedan inferirse de esas tablas |

La documentación contiene descripciones de fases anteriores: por ejemplo, `ABOGADOS.md` dice en un tramo que abogados aún no usa JWT, pero el código actual sí protege el perfil con JWT. Se priorizó el código. EP06 también evolucionó de lectura a gestión; no se lo reutilizará ni modificará.

### Implementable con el esquema actual

Acceso exclusivo profesional, encabezado con nombre real, navegación, estructura responsive, filtros visuales y estados de carga/error. Las secciones sin fuente podrían mostrarse explícitamente como «Información todavía no disponible». No corresponde presentar ceros como si se hubiese consultado un dominio existente.

### Requiere estructuras nuevas

Todas las métricas de solicitudes aceptadas, finalizados, asesoramientos por área/período, valoraciones e ingresos, junto con sus tablas y detalles. Una vez creado y consultado el dominio real, un resultado sin filas sí puede mostrar conteo cero, ingreso cero y «Sin valoraciones todavía» con promedio nulo.

## 2. Modelo mínimo propuesto

Propietario: microservicio de abogados, en su base. No requiere cambiar las entidades de cuentas existentes. Cada solicitud se dirige a un abogado; una solicitud aceptada puede originar como máximo un asesoramiento. No se incluye derivación entre abogados en esta primera versión.

| Relación | Cardinalidad y regla |
| --- | --- |
| Abogado → solicitud | 1:N, FK local al ID técnico existente |
| Ciudadano → solicitud | 1:N, referencia lógica al ID de ciudadanos; sin FK entre bases |
| Solicitud → asesoramiento | 1:0..1, UNIQUE sobre solicitud; solo crear al aceptar |
| Asesoramiento → valoración | 1:0..1; únicamente del ciudadano de la solicitud y tras finalizar |
| Asesoramiento → pago | 1:N, permite cuotas diferentes; cada operación real tiene clave única |

El área es una copia del texto de especialidad persistido, validada al crear la solicitud contra las especialidades del abogado. Queda inmutable para conservar la historia aunque cambie el perfil. No se crea un catálogo inventado ni se agrupa cada caso por todas las especialidades del profesional. Las variantes históricas no se fusionarán arbitrariamente; una normalización futura requerirá una decisión específica.

### SQL de diseño, no ejecutado

Los nombres de tablas/columnas de cuentas deben verificarse contra los metadatos antes de preparar el baseline aislado. Este bloque propone el esquema; no es una migración autorizada para bases existentes.

```sql
CREATE TABLE solicitud_asesoramiento (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_abogado bigint NOT NULL REFERENCES abogados_registrados(id_abogado),
  id_ciudadano bigint NOT NULL CHECK (id_ciudadano > 0), -- referencia lógica externa
  area_juridica varchar(100) NOT NULL CHECK (length(trim(area_juridica)) > 0),
  descripcion varchar(4000) NOT NULL,
  estado varchar(12) NOT NULL CHECK (estado IN ('PENDIENTE','ACEPTADA','RECHAZADA','CANCELADA')),
  creada_en timestamptz NOT NULL,
  aceptada_en timestamptz,
  version bigint NOT NULL DEFAULT 0,
  CHECK ((estado = 'ACEPTADA') = (aceptada_en IS NOT NULL)),
  CHECK (aceptada_en IS NULL OR aceptada_en >= creada_en)
);
CREATE TABLE asesoramiento (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_solicitud bigint NOT NULL UNIQUE REFERENCES solicitud_asesoramiento(id),
  estado varchar(12) NOT NULL CHECK (estado IN ('EN_CURSO','FINALIZADO','CANCELADO')),
  iniciado_en timestamptz NOT NULL,
  finalizado_en timestamptz,
  version bigint NOT NULL DEFAULT 0,
  CHECK ((estado = 'FINALIZADO') = (finalizado_en IS NOT NULL)),
  CHECK (finalizado_en IS NULL OR finalizado_en >= iniciado_en)
);
CREATE TABLE valoracion_asesoramiento (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_asesoramiento bigint NOT NULL UNIQUE REFERENCES asesoramiento(id),
  puntuacion smallint NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  creada_en timestamptz NOT NULL
);
CREATE TABLE pago_asesoramiento (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_asesoramiento bigint NOT NULL REFERENCES asesoramiento(id),
  clave_operacion varchar(160) NOT NULL UNIQUE,
  importe numeric(19,2) NOT NULL CHECK (importe > 0),
  moneda char(3) NOT NULL CHECK (moneda ~ '^[A-Z]{3}$'),
  estado varchar(12) NOT NULL CHECK (estado IN ('PENDIENTE','COBRADO','CANCELADO','RECHAZADO')),
  registrado_en timestamptz NOT NULL,
  cobrado_en timestamptz,
  version bigint NOT NULL DEFAULT 0,
  CHECK ((estado = 'COBRADO') = (cobrado_en IS NOT NULL)),
  CHECK (cobrado_en IS NULL OR cobrado_en >= registrado_en)
);
CREATE INDEX ix_solicitud_titular_aceptada ON solicitud_asesoramiento
  (id_abogado, aceptada_en, id) WHERE aceptada_en IS NOT NULL;
CREATE INDEX ix_solicitud_titular_creada ON solicitud_asesoramiento(id_abogado, creada_en, id);
CREATE INDEX ix_asesoramiento_inicio ON asesoramiento(iniciado_en, id);
CREATE INDEX ix_asesoramiento_fin ON asesoramiento(finalizado_en, id)
  WHERE estado = 'FINALIZADO';
CREATE INDEX ix_valoracion_fecha ON valoracion_asesoramiento(creada_en, id_asesoramiento);
CREATE INDEX ix_pago_asesoramiento_fecha ON pago_asesoramiento(id_asesoramiento, cobrado_en, id);
CREATE INDEX ix_pago_cobrado ON pago_asesoramiento(moneda, cobrado_en, id_asesoramiento)
  WHERE estado = 'COBRADO';
```

Las reglas entre tablas (solicitud aceptada para crear asesoramiento, identidad del autor de valoración, finalización previa) deben aplicarse transaccionalmente en el futuro flujo de escritura. Los endpoints de lectura no crean ni aceptan solicitudes ni registran cobros. Las cuatro tablas no bastan por sí solas para producir actividad real: esos flujos de negocio aún no existen y deben definirse en una tarea posterior o autorizarse expresamente como ampliación. En la Etapa B los fixtures aislados permitirán verificar el dashboard; el entorno habitual seguirá sin actividad hasta integrar una fuente legítima de escrituras.

`clave_operacion` debe identificar el cobro real de forma canónica, incluyendo proveedor cuando corresponda. Una retransmisión conserva la clave; cuotas reales distintas usan claves distintas. No se usarán `SUM(DISTINCT importe)` ni deduplicación por monto. No se incluye cobro con tarjeta, proveedor de pagos, reembolsos o reversos en este mínimo: su incorporación exige extender el modelo y definir ingreso neto antes de operar ese flujo.

## 3. Semántica de métricas y fechas

Zona de calendario: `America/Argentina/Buenos_Aires`; almacenamiento en UTC con timestamptz/Instant. La API recibe fechas locales YYYY-MM-DD y convierte `[desde, hasta]` a límites de instantes `[inicioDesde, inicioDiaPosteriorHasta)`, sin aplicar funciones a columnas en filtros. Validar orden, fechas y un rango máximo propuesto de 5 años.

| Métrica | Fuente y fecha |
| --- | --- |
| Solicitudes aceptadas | Solicitudes con estado ACEPTADA, por `aceptada_en`; no pierden esa condición al finalizar el asesoramiento |
| Asesoramientos finalizados | Estado FINALIZADO explícito, por `finalizado_en`; aceptar no implica finalizar |
| Asesoramientos por área | Todos los asesoramientos iniciados en rango, por `iniciado_en`, agrupados por el área de su solicitud; una categoría por caso |
| Evolución de asesoramientos | Conteo de inicios por `iniciado_en`, con serie separada de finalizaciones por `finalizado_en` |
| Duración | Tiempo calendario transcurrido entre inicio y fin; no representa horas efectivamente trabajadas |
| Valoración | AVG y COUNT de puntuaciones persistidas 1..5, por `creada_en`; distribución 1..5. Sin filas: promedio null, cantidad 0 |
| Ingreso acumulado | Suma de pagos COBRADO por moneda desde el primer registro hasta la consulta; tarjeta rotulada «Histórico», independiente del filtro global |
| Ingreso del período | Suma COBRADO por `cobrado_en` en el rango global, separada del histórico |
| Ingreso mensual | Mes local seleccionado completo por `cobrado_en`; comparado con mes anterior completo, ambos rotulados |

No sumar monedas diferentes ni convertirlas sin una regla autorizada. Cada total identifica moneda y fechas. El mes seleccionado tiene filtro independiente y visible. Si el mes anterior tiene ingreso positivo: `(actual - anterior) / anterior * 100`; con base cero: «Sin base de comparación», no infinito. Un mes sin cobros vale cero en un dominio disponible. Las series completan intervalos sin registros con cero. Últimos 30 días incluye hoy y los 29 días anteriores; 3/6/12 meses son períodos móviles desde la fecha de hoy menos esos meses, con límites devueltos por el backend y visibles. Agregación diaria para 30 días; mensual para rangos largos, indicando meses parciales.

## 4. API propuesta: exclusivamente GET autenticados

Base `/api/abogados/me/dashboard`. Ningún endpoint acepta un titular alternativo.

| Ruta relativa | Función |
| --- | --- |
| `/resumen` | Conteos del período, promedio/cantidad, totales históricos y del período por moneda, disponibilidad y fecha de consulta |
| `/solicitudes` | Listado paginado; filtro estado ACEPTADA, fechas de aceptación, área, orden por aceptación/ID |
| `/asesoramientos` | Listado paginado; estado, área, fechas y `fechaBase=inicio|finalizacion`; orden por fecha/ID |
| `/asesoramientos/{id}` | Detalle propio con solicitud, fechas, área, estado y totales de pagos por moneda |
| `/por-area` | Cantidad, total y porcentaje por área; mismo denominador y período explícitos |
| `/por-periodo` | Series de inicios/finalizaciones; granularidad día/mes |
| `/valoraciones` | Promedio, cantidad y distribución por puntuación |
| `/ingresos/mensuales` | Serie mensual por moneda; mes seleccionado, anterior y variación |
| `/ingresos/por-asesoramiento` | Una fila por asesoramiento y moneda con total cobrado en rango; paginación y orden por total |
| `/asesoramientos/{id}/pagos` | Operaciones paginadas: fecha de cobro, importe, moneda, estado; filtro de fecha sobre cobro |

Filtros comunes donde correspondan: `desde`, `hasta`, `area`, `pagina=0`, `tamano=20` (máximo 100), `orden`, `direccion`; ingresos añade `moneda`, mensual añade `mes=YYYY-MM`. Para listar pagos no cobrados sin fecha de cobro, usar estado sin rango de cobro o un filtro explícito distinto por fecha de registro; nunca sustituir silenciosamente fechas.

Listados: `{contenido, pagina, tamano, total, paginas}`; agregados incluyen período efectivo, zona, fecha base, moneda y `consultadoEn`. Montos se serializan como decimales exactos, sin acumularlos con aritmética flotante de JavaScript. Cero, fuente no disponible y error son resultados distintos; errores nunca se transforman en ceros.

401 para JWT ausente/inválido/vencido; 403 para rol ajeno o cuenta no habilitada; 404 para detalle inexistente o de otro titular; 400 para filtros inválidos. Respuestas sensibles con `Cache-Control: no-store`. Ordenamiento con lista permitida y desempate por ID.

Agregaciones en PostgreSQL mediante proyecciones/consultas parametrizadas, no cargando todas las filas en Java. Filtrar siempre por titular resuelto antes de paginar o agregar. Consultar pagos y valoraciones separadamente o preagregarlos antes de combinarlos: un JOIN plano multiplicaría importes, filas y puntuaciones. Por asesoramiento se suman cuotas únicas válidas, sin duplicar el total al mostrar el detalle. Verificar planes con fixtures de volumen e índices antes de optimizar más.

## 5. Frontend y diseño

Rutas propuestas: `/dashboard-abogado`, `/dashboard-abogado/asesoramientos/:id` y `/dashboard-abogado/ingresos`. Agregar entrada «Mi dashboard» únicamente a ABOGADO en Navbar y navegación móvil; registrar el nombre de página en `ui.tsx`. La protección verifica sesión/rol antes de montar consultas; el backend conserva toda la autoridad.

Archivos nuevos propuestos: `pages/LawyerDashboard.tsx`, `pages/LawyerAdviceDetail.tsx`, `pages/LawyerIncome.tsx`, `components/lawyer-dashboard/*` y `services/dashboardAbogadoService.js`. Componentes: `AbogadoProtegido`, `FiltrosPeriodo`, `Indicador`, `GraficoAreas`, `GraficoPeriodos`, `IngresosMensuales`, `DistribucionValoraciones`, `TablaAsesoramientos` y `TablaIngresos`. Reutilizar `fetchAutenticado`, `useSesion`, `Notice`, `Icon`, `Field`, `.card`, botones y patrones de consulta cancelable de Admin.

Diseño: Manrope; fondo navy, superficies navy-900, acento gold y colores semánticos existentes. Encabezado «Hola, [nombre]» y filtros con etiqueta. Primera fila con cuatro indicadores; centro con barras horizontales por área (cantidad y porcentaje), evolución temporal e ingresos mensuales; parte inferior con pestañas de solicitudes/asesoramientos e ingresos, filtros y paginación. El detalle abre en ruta propia para permitir enlaces y navegación atrás.

Cuatro columnas en escritorio, dos en tablet y una en móvil; gráficos con resumen y tabla textual accesible, sin depender del color ni de hover. Preferir SVG/HTML locales sin nueva dependencia de gráficos. Tablas con caption, encabezados y `aria-sort`; región de desplazamiento horizontal etiquetada cuando sea necesaria. Probar teclado, foco al navegar, mensajes `role=status/alert`, contraste y movimiento reducido. Cambiar filtros cancela consultas anteriores y vuelve a página cero. Un fallo muestra reintento y no conserva métricas anteriores como si fueran del nuevo período.

## 6. Seguridad y riesgos

- Extraer titularidad a un servicio compartido: exigir rol literal ABOGADO y cuenta REGISTRADO vigente en cada consulta. El JWT ya se valida en servidor; leerlo en React no lo valida.
- Los permisos de la cadena `/me/**` actualmente exigen autenticación; el rol se comprueba dentro del controller de perfil. Los nuevos controllers también deben comprobarlo expresamente, mediante el servicio común y/o un matcher específico con autoridad correctamente convertida desde `rol`.
- Consultas de detalle con ID y titular en la misma condición. Para pagos y valoraciones recorrer la relación con la solicitud propia. Probar todos los agregados contra fugas entre abogados.
- No exponer DNI, domicilio, correo, teléfono, decisiones Didit ni texto de Lexi. Inicialmente mostrar solo referencia opaca del ciudadano y descripción de caso propia autorizada; cualquier dato adicional requiere una necesidad definida. La referencia ciudadana no autoriza consultar su perfil completo.
- No confiar en idUsuario local ni en IDs de filtros. No registrar JWT, descripciones del caso o datos personales en logs. No agregar Basic público ni credenciales VITE_.
- Mantener CORS limitado al origen del entorno y consultas GET sin efectos secundarios. No iniciar reconciliación Didit ni importar padrón durante pruebas aisladas.
- `ddl-auto=update` habitual es un riesgo crítico: un arranque con nuevas entidades podría alterar la base. La Etapa B debe compilar/probar en aislamiento; no ejecutar ningún backend habitual con ese código. Antes de cualquier integración futura, preparar cambio controlado de esquema y validación, con autorización específica.
- Falta una fuente transaccional real de actividad y cobros. El dashboard de lectura no puede resolver esa ausencia. No habilitar un endpoint de escritura improvisado para poblar números.

## 7. Plan de implementación y pruebas, sujeto a autorización

1. Aprobar modelo, métricas y alcance de lectura. Preparar SQL revisable y contrato DTO. Confirmar que aceptar/finalizar/valorar/cobrar en uso habitual queda fuera de este dashboard y necesita integración posterior.
2. Crear perfil `dashboard-test` y Compose independiente `abogacia-dashboard-test`, sin combinar archivos existentes. PostgreSQL 17 privado, base `dashboard_abogados_test`, volumen y secretos nuevos; frontend ligado a loopback, puerto sugerido 5181 previa comprobación. No compartir redes, volúmenes o credenciales con habitual, recomendaciones ni EP06. Sin dependencia de n8n/RAG.
3. Baseline SQL exclusivo de una base nueva; runtime con SELECT y `ddl-auto=validate`, importación y reconciliación deshabilitadas. Guardas de perfil/base/usuario previas a JPA. Identidades y cuentas sintéticas claramente rotuladas; jamás reutilizar `perfiles_prueba` de recomendaciones como abogados reales. Tokens de test firmados solo con clave de ese entorno; sin endpoint público que los emita arbitrariamente.
4. Implementar repositorios, servicio de titularidad, DTO y controladores GET; posteriormente pantalla, gráficos y tablas. No modificar configuración habitual para apuntarla al entorno de prueba.
5. Ejecutar pruebas unitarias y de integración aisladas y verificar PostgreSQL 17 real para SQL, zonas, restricciones y agregaciones. H2 existente sirve para regresiones, no acredita compatibilidad de todas las consultas PostgreSQL.
6. Verificar frontend con pruebas DOM y navegación reales (agregar herramientas de test cuando se autorice), lint, compilación y comprobación TypeScript explícita: el script build actual solo ejecuta Vite. Registrar resultados y limitaciones.
7. Entregar archivos cambiados, instrucciones de ejecución exclusivamente aislada y comprobaciones. No desplegar ni migrar entornos habituales. Si el arranque aislado requiere aprobación del entorno, dejarlo preparado y distinguir pruebas ejecutadas de pendientes.

### Pruebas existentes

Backend: JUnit/Spring Boot, MockMvc y Spring Security; H2 con `create-drop` bajo recursos de test. Ejemplos: `SuspensionCuentaTest` (JWT existente bloqueado tras suspensión), `RegistroAbogadoTest`, `RecomendacionesTest`, `AdminLecturaTest`, `AdminConsultasTest`, suites de Didit/padrón, `LoginTest` en autenticación y `SeguridadTest` en ciudadanos. Hay pruebas de aislamiento, esquema y archivos para recomendaciones y EP06. Algunas pruebas de padrón dependen de un archivo externo y pueden omitirse.

Frontend: `node --test src/services/*.test.js`; autenticación/expiración, servicios, recomendaciones, simulación de contacto, administración, identidad y proxy. `oxlint` y Vite. No se encontró una suite de renderizado React ni pruebas de navegador responsive configuradas en package.json. La existencia de pruebas no implica que estén aprobadas hoy: no se ejecutaron en Etapa A.

### Matriz de aceptación nueva

| Caso | Verificación con fixtures sintéticos |
| --- | --- |
| Acceso | Sin JWT, vencido, firma/emisor incorrectos, Basic, ADMIN y CIUDADANO rechazados; ABOGADO habilitado permitido; suspensión/baja posterior al token bloquea acceso |
| Aislamiento | Dos abogados con casos, puntuaciones y cobros distintos; todos los GET, detalles y agregados devuelven exclusivamente el titular |
| Aceptación/finalización | Pendientes no cuentan; aceptada sin finalización no es finalizada; finalización no borra la aceptación histórica |
| Áreas | Valores persistidos, un caso por área, total/porcentaje correctos, perfil multiespecialidad sin duplicación |
| Fechas | Límites de medianoche local, fin inclusivo convertido a exclusivo, mes/año/bisiesto, rangos inválidos, fecha base de cada métrica |
| Valoraciones | Media, distribución, cero filas con promedio null, puntuaciones inválidas rechazadas, una valoración por caso |
| Ingresos | Excluir pendientes/cancelados/rechazados, meses sin cobros, monedas separadas, cambio de año, comparación con base cero |
| Duplicación | Repetir clave de operación se rechaza; dos cuotas iguales legítimas se suman; múltiples pagos no multiplican promedios o asesoramientos |
| Listados | Paginación estable, filtros y orden por importe/fechas; total por caso y total global coherentes con todas las páginas |
| UX | Carga, error y reintento, vacío, fuente no disponible, cancelación de respuesta tardía, cambio de filtros y expiración de sesión |
| Accesibilidad/responsive | 360, 768 y 1440 px; zoom 200 %, teclado, foco, tablas de datos accesibles, etiquetas y ausencia de desbordamiento general |
| Aislamiento de infraestructura | Rechazo de URL/usuario habituales y EP06, ninguna conexión externa, runtime sin escritura, esquema validado sin actualización automática |

## Autorización pendiente

La instrucción del usuario exige: «Detenete al finalizar la Etapa A y esperá mi autorización». Se solicita autorización para implementar la Etapa B sobre este modelo y preparar/probar únicamente un entorno nuevo y aislado. Esa autorización no comprende migraciones ni despliegues habituales, cambios en EP06 o integración con proveedores de pago, ni nuevos flujos de escritura de negocio fuera del alcance de lectura descrito.

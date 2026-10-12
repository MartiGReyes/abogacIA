# US06 — Registrar abogado

## Flujo vigente (12/10/2026): Didit primero

Reemplaza el alta en un solo paso (`POST /api/abogados`) y el acceso con correo y contraseña (`/verificacion/acceso`), que se eliminaron. Las secciones siguientes describen la Etapa 1 original; donde contradigan esta sección, vale esta.

| Paso (frontend `/registro-abogado`) | Endpoint (8082) | Qué hace |
| --- | --- | --- |
| 1. Datos básicos | POST `/api/abogados/verificacion/solicitud` `{dni, mail, nroCelular}` | Crea una *solicitud* (cuenta sin contraseña) y devuelve un token temporal de 60 minutos. Una solicitud anterior sin cuenta creada con el mismo DNI o correo se reemplaza; una cuenta existente devuelve 409. |
| 2. Validación Didit | `/aviso`, `/sesion`, `/estado`, `/consultar` con `X-Registro-Token` | Igual que antes. Didit vuelve a `/registro-abogado`. Si aprueba y el DNI del documento coincide, se guardan nombre, apellido, fecha de nacimiento, género y domicilio **leídos del documento** (`first_name`, `last_name`, `date_of_birth`, `gender`, `formatted_address`/`address`) y `/estado` los devuelve en `datos` para que el titular los revise. |
| 3. Datos profesionales | — (se envían en el paso 4) | Varias especialidades (lista cerrada de 8), matrícula y colegio. Formato provisional de matrícula: `([0-9]{1,3}-)?[0-9]{1,6}`; queda PENDIENTE_REVISION salvo que el padrón local la valide. |
| 4. Crear cuenta | POST `/api/abogados/verificacion/cuenta` con `X-Registro-Token` | Exige identidad APROBADA. Guarda datos profesionales y contraseña, revoca el token y envía un código de **6 dígitos** (BCrypt, 30 minutos, 5 intentos). Nombre y demás datos personales nunca vienen del navegador. |
| 5. Confirmar email | POST `/api/abogados/confirmar` `{mail, codigo}` | Sin cambios. |

La cuenta pasa a REGISTRADO solo con correo confirmado, identidad APROBADA y matrícula VALIDADA; mientras no haya fuente de matrículas queda PENDIENTE. El Excel del padrón fue descartado como fuente; `PadronTest` se omite si el archivo no está. El aviso de privacidad informa que se conservan los datos leídos del documento.

## Alcance y documentación revisada

Se revisaron la consigna adjunta de US06, los diagramas de secuencia, clases y datos aportados en el chat, `AUTENTICACION.md`, el registro/confirmación/seguridad de ciudadanos, autenticación, React y las cinco hojas del archivo `PADRON-RIO-TERCERO-ENERO.xlsx`.

No se encontraron documentos adicionales de criterios de aceptación, tareas del sprint ni diseños específicos de pantallas en el repositorio. La interfaz sigue las convenciones del frontend existente. Los diagramas muestran especialidad como atributo de texto; no muestran una relación muchos a muchos. No se inventó un catálogo de especialidades.

Diferencias resueltas:

- Se conservaron `AbogadoRegistrado`, `Estado` y `AbogadoRepository`. Se agregaron fecha de nacimiento, género, domicilio, especialidad, honorarios y dirección profesional que faltaban respecto del modelo.
- Se conserva el ID técnico existente para JPA/JWT. El DNI continúa siendo único; la matrícula mantiene su formato completo. Cambiar a una clave primaria compuesta rompería innecesariamente la estructura actual.
- Se agregó la relación muchos a uno con `Padron` y su evidencia de origen. El Excel distribuye identidad y estado entre hojas; un solo booleano del padrón no basta para conservar información contradictoria.
- Los booleanos anteriores `dniVerificado` y `matriculaVerificada` se mantienen por compatibilidad, pero no autorizan el login. La autorización usa los resultados separados y el estado de cuenta.
- El actor externo de colegio del UML se sustituye por la consulta local del padrón autorizada por la consigna. No hay API oficial ni consulta en tiempo real.
- Didit Etapa 1 se inicia después de guardar la solicitud y confirmar el correo. El workflow vigente incluye documento, prueba de vida y Face Match. La cuenta permanece PENDIENTE hasta comprobar las tres verificaciones y el padrón vigente.
- La confirmación conserva la interfaz de correo y la opción de consola de ciudadanos, con un código aleatorio de 192 bits, hash BCrypt, vencimiento y límite de intentos. No devuelve códigos en REST.
- La rama ABOGADO del login deja de devolver 501 y llama al servicio de abogados usando el mismo Basic interno que ciudadanos.

Consulta, modificación, baja de abogados, búsqueda profesional, administración, reenvío de confirmación y recuperación de contraseñas no forman parte de esta implementación.

## Arquitectura y entidades

- Abogados: Spring Boot 4.1.1 / Java 21, puerto 8082, PostgreSQL `abogacia_abogados`.
- Autenticación: puerto 8081, sin base propia. Firma el JWT HS256 existente con rol ABOGADO e `idUsuario` igual al ID técnico de la cuenta.
- Ciudadanos: conserva puerto 8080 y su implementación.
- React: puerto 5173, nueva ruta `/registro-abogado`; conserva las rutas actuales.

`AbogadoRegistrado` tiene una relación muchos a uno con `Estado` y con `Padron`. `Padron` identifica la matrícula y resume los estados observados. `PadronEvidencia` conserva matrícula, DNI, nombre completo, estado, hoja, fila y SHA-256 del archivo. No guarda domicilios, teléfonos o correos del padrón porque no se necesitan para el cotejo. La evidencia se consulta por matrícula y conserva duplicados para detectar discrepancias.

Estado de cuenta: PENDIENTE, REGISTRADO, BAJA, siguiendo ciudadanos. La inicialización crea los estados que falten.

Verificaciones independientes:

| Verificación | Valores |
| --- | --- |
| Correo | `correoConfirmado` true/false |
| DNI | PENDIENTE, APROBADA, RECHAZADA |
| Matrícula | VALIDADA, PENDIENTE_REVISION; INEXISTENTE, INACTIVA y DNI_DISTINTO rechazan el registro |

Solo correo confirmado + DNI APROBADA + matrícula VALIDADA pasan a REGISTRADO. BAJA nunca se reactiva desde este flujo. El login también consulta la evidencia local actual: actualizar el padrón puede bloquear nuevos logins aunque una cuenta conserve un resultado anterior. No existe un endpoint público para escribir resultados, sesiones Didit o estados.

## Endpoints

| Método y ruta | Acceso | Resultado |
| --- | --- | --- |
| POST `/api/abogados` | Público | 201, estados del registro |
| POST `/api/abogados/confirmar` | Público, correo y código secreto | 200, estados actualizados |
| POST `/api/interno/abogados/validar-credenciales` | Basic, rol INTERNAL | 200, únicamente `idAbogado` |
| POST `/api/auth/login` (8081) | Público | JWT, rol, idUsuario |

Errores de validación: 400 con `error`; conflicto concurrente de datos únicos: 409; credenciales incorrectas o cuenta no habilitada: 401 genérico; servicio de cuentas inaccesible: 503. Campos adicionales desconocidos, incluidos booleanos de verificación, producen 400. El hash y el código nunca aparecen en los DTO de respuesta. Los DTO con secretos ocultan su contenido en `toString`.

Confirmación: `{ "mail": "ana@example.com", "codigo": "<código recibido>" }`. El código solo sirve para ese correo, vence en 30 minutos, permite cinco intentos y se elimina al usarlo. El bloqueo de fila protege el contador frente a solicitudes concurrentes. No se implementó reenvío; un código vencido requiere resolver el registro por un procedimiento administrativo futuro.

Login central: `{ "mail": "ana@example.com", "contrasena": "<contraseña elegida>", "tipoCuenta": "ABOGADO" }`. Un usuario pendiente recibe 401 aunque tenga correo confirmado y una matrícula válida. Las funcionalidades profesionales futuras deben validar el JWT, el rol y el estado vigente de la cuenta antes de autorizar operaciones.

## Variables de entorno

| Variable | Servicio | Uso / valor predeterminado |
| --- | --- | --- |
| DB_PASSWORD | Abogados | Obligatoria, contraseña PostgreSQL |
| DB_USERNAME | Abogados | postgres |
| INTERNAL_USERNAME | Abogados y autenticación | Misma cuenta técnica que ciudadanos |
| INTERNAL_PASSWORD | Abogados y autenticación | Mismo secreto técnico que ciudadanos |
| JWT_SECRET | Autenticación y ciudadanos | Mantener el valor compartido existente; abogados todavía no expone operaciones con JWT |
| ABOGADOS_URL | Autenticación | http://localhost:8082 |
| ABOGADOS_CORREO_CONSOLA | Abogados | false; true permite correo de desarrollo por consola |
| PADRON_IMPORTAR | Abogados | false; true importa al iniciar |
| PADRON_ARCHIVO | Abogados | ../PADRON-RIO-TERCERO-ENERO.xlsx; preferir ruta absoluta |
| VITE_ABOGADOS_URL | Frontend | http://localhost:8082; no contiene secretos |

Los secretos se configuran en el proceso/IDE, no en archivos versionados. `AUTENTICACION.md` explica cómo generar los secretos compartidos. CORS permite únicamente `http://localhost:5173`. Basic se usa con HTTP local en desarrollo; un despliegue requiere HTTPS y acceso de red restringido, siguiendo autenticación existente.

El envío real de correo no está implementado. Con consola deshabilitada el registro devuelve 503 y revierte la transacción; evita guardar una cuenta sin entregar su código. Habilitar consola solo en desarrollo. El archivo y la base del padrón contienen información personal; no hay endpoints públicos de padrón y el Excel queda excluido de Git.

## Iniciar y actualizar el padrón

La base `abogacia_abogados` ya debe existir. Definir DB_PASSWORD y las mismas credenciales internas que autenticación. Desde la raíz, en la terminal de abogados:

```powershell
$env:ABOGADOS_CORREO_CONSOLA = 'true'
$env:PADRON_ARCHIVO = (Resolve-Path -LiteralPath './PADRON-RIO-TERCERO-ENERO.xlsx').Path
$env:PADRON_IMPORTAR = 'true'
mvn -f microservicio-abogados/pom.xml spring-boot:run
```

La importación ocurre al iniciar y es transaccional: primero analiza todas las hojas, luego sustituye la evidencia. Un error aborta el inicio y conserva la evidencia anterior. No se borran las cuentas ni las filas padre de padrón referenciadas. Una matrícula retirada deja de tener evidencia y no permite login. El SHA-256 identifica exactamente la versión importada; el nombre del archivo no permite afirmar una fecha de vigencia oficial.

Para actualizar: detener abogados, obtener una nueva versión autorizada del archivo, conservar una copia privada del original si hace falta, revisar cambios de formato y reiniciar con PADRON_IMPORTAR=true. Después del primer inicio correcto puede deshabilitarse la importación; PostgreSQL conserva la evidencia. No ejecutar la actualización desde varios procesos simultáneos ni durante un importador de otro origen. Una nueva estructura exige revisar el importador y sus pruebas, no adivinar columnas.

Iniciar autenticación y frontend en otras terminales:

```powershell
mvn -f microservicio-autenticacion/pom.xml spring-boot:run
npm.cmd --prefix frontend run dev
```

No es necesario iniciar ciudadanos para registrar un abogado, pero sí para probar el login de ciudadanos. No se ejecutó esta implementación contra la base PostgreSQL del usuario: las pruebas usan H2. La configuración existente `ddl-auto=update` agrega columnas/tablas; hacer respaldo antes de aplicarla a una base con datos. Las nuevas columnas primitivas tienen valores por defecto y las verificaciones ausentes en cuentas anteriores no habilitan login.

## Interpretación del Excel real

Se importan 2.690 filas de evidencia del archivo suministrado; no representan 2.690 abogados distintos.

| Hoja | Columnas usadas |
| --- | --- |
| Hoja1 | A Mat, B Apellido y Nombre, C DNI; sin estado |
| Hoja2 | A matrícula, B nombre completo, C estado; sin DNI |
| Anexo dentro de Hoja2 | B MP, C nombre completo, E Estado, G DNI; cabecera en fila 556 |
| Hoja3 | B matrícula, C nombre completo, E estado; sin DNI |
| Hoja4 | B MP, C nombre completo, E Estado, G DNI; cabecera en fila 1 |
| Hoja5 | A matrícula, B nombre completo, D estado; sin DNI |

Las hojas sin cabecera siguen el formato observado del archivo. Se omiten filas sin matrícula y se rechazan matrículas no compatibles con `10-NNN`. DNI: se eliminan puntos, comas y espacios; un valor no vacío inválido exige revisión. `ACTIVA` se normaliza a `ACTIVO`. Solo ACTIVO, con DNI suficiente y coincidente y evidencia no contradictoria, permite VALIDADA.

El cotejo exige matrícula completa y colegio de Río Tercero / Córdoba. No usa coincidencias parciales ni nombres como sustituto de DNI. Los nombres se normalizan por acentos, signos y espacios para detectar contradicciones entre filas. No se separan arbitrariamente apellido y nombre cuando la fuente no proporciona columnas separadas.

Si hay más de un DNI, estado o nombre normalizado por matrícula, se deja PENDIENTE_REVISION. La coincidencia activa en una hoja no prevalece sobre una suspensión/cancelación en otra. Estados desconocidos, jurisdicción fuera del padrón, DNI ausente o padrón no importado también quedan pendientes. Matrícula inexistente en un padrón cargado, DNI distinto o estado inactivo conocido se rechazan. No hay pantalla ni endpoint administrativo de resolución de ambigüedades en US06.

## Didit — Etapa 1 implementada

Workflow publicado indicado por el proyecto: `cf23be90-8ae5-4f2f-ac62-f2059ed159b2`. El ID se configura mediante DIDIT_WORKFLOW_ID, sin valor fijo en el código. El alcance vigente reemplaza el workflow documental anterior: **documento argentino + prueba de vida + Face Match**, todos obligatorios. No se consultó la consola privada ni se ejecutaron verificaciones reales durante la implementación.

Referencias oficiales consultadas el 11/10/2026: [crear sesión](https://docs.didit.me/sessions-api/create-session), [consultar decisión](https://docs.didit.me/sessions-api/retrieve-session), [modelo de resultados](https://docs.didit.me/reference/data-models), [estados](https://docs.didit.me/integration/verification-statuses). Se utiliza API v3, no endpoints antiguos v2.

### Acceso y consentimiento

El titular confirma primero el correo y luego accede a `/verificar-identidad` con correo y contraseña. Abogados verifica BCrypt y emite un token opaco aleatorio de 256 bits, con duración de 15 minutos y alcance exclusivo del registro propio. La base almacena SHA-256 del token. Cada acceso nuevo invalida el anterior; el endpoint de cierre lo revoca en servidor. React conserva únicamente token y vencimiento en sessionStorage, separado de la sesión profesional. No guarda la contraseña ni pone tokens en URLs.

La autorización nunca depende de un ID de abogado o sesión enviados por React. El token identifica la cuenta vinculada. Cuenta dada de baja, correo pendiente, credenciales inválidas y token vencido se rechazan. Los errores de acceso son genéricos; hay un límite de diez intentos por IP y por hash de correo en quince minutos. El limitador es local al proceso y acotado a 10.000 entradas; una instalación con varias réplicas necesita un limitador compartido en Etapa 2.

Antes de iniciar Didit se exige una casilla no preseleccionada y la versión vigente del aviso. El servidor persiste aceptación, fecha, versión y SHA-256 del texto. Mantener un archivo privado/versionado de los avisos aprobados para poder recuperar el texto correspondiente al hash. Cambiar la versión cada vez que cambie su contenido. La política debe informar documento, captura facial, prueba de vida, Face Match, responsable, finalidad, contacto, conservación/eliminación, ubicación/transferencias y uso para modelos.

**El aviso está bloqueado por defecto. No hay una política de conservación aprobada incorporada al proyecto.** Las variables de privacidad deben describir las condiciones realmente configuradas/contratadas en Didit. DIDIT_PRIVACY_READY=true expresa que el responsable revisó y aprobó ese aviso; no basta con rellenar ejemplos. Esta etapa no configura la retención ni elimina datos en Didit. Revisar también el [aviso del proveedor](https://didit.me/es/terms/verification-privacy-notice/): no asumir retención nula, eliminación de plantillas o exclusión de entrenamiento por defecto.

### Sesiones, decisión y reconciliación

`DiditClient` crea la sesión mediante POST `https://verification.didit.me/v3/session/`, con header x-api-key, workflow configurado, vendor_data opaco por intento, idioma español, país ARG y tipo esperado ID. La API Key nunca se envía a React ni se incorpora a excepciones, DTO de respuesta o registros. El host API es fijo; el cliente de producción no tiene una opción de redirección a un servidor simulado. El constructor alternativo se usa exclusivamente en tests.

La URL alojada se acepta únicamente si utiliza HTTPS y host exacto verify.didit.me, sin usuario y con puerto estándar. Se conserva porque permite retomar el intento; contiene un token y se trata como información confidencial, entregada exclusivamente al titular. Los DTO que contienen credenciales, enlaces o resultados tienen toString redactado. Se deshabilitan los logs de cliente HTTP; no habilitar trazas de tráfico, headers, binding de parámetros o captura de cuerpos en herramientas externas.

Se persiste una fila `verificacion_identidad` por cuenta: sesión actual, referencia, workflow/versión, URL alojada, estados, fechas, consentimiento y contadores. No se guardan fotos, videos, plantillas, puntajes biométricos ni respuestas completas. Los DTO de proveedor ignoran campos no necesarios, incluidos URLs de medios. Los intentos expirados/abandonados pueden reemplazarse hasta tres veces en total; esta etapa conserva el intento actual y su contador, sin un archivo histórico completo de sesiones.

La creación se reserva bajo bloqueo corto de la cuenta y un lease de treinta segundos; la llamada HTTP ocurre después de cerrar la transacción. Se guarda el resultado en otra transacción, comprobando la operación vigente. Doble clic o solicitud concurrente no crea una segunda sesión. Una creación de resultado incierto mantiene vendor_data y se recupera al retomar, con máximo cinco fallos y espera de treinta segundos; usa la reutilización documentada de sesiones inconclusas de Didit. No republicar el workflow mientras se recupera una creación incierta, porque el proveedor no reutiliza sesiones de versiones anteriores. Si la sesión ya existe, se devuelve la misma vinculación. Un rechazo exige revisión; no se crea automáticamente otra sesión.

GET estado muestra el resumen local. POST consultar obtiene desde el backend GET `/v3/session/{id}/decision/`, autenticado con la API Key. El regreso del navegador no modifica ningún resultado. Se comprueban sesión, workflow y vendor_data. Una operación de consulta tiene lease y no se aplica si la sesión o la operación fueron reemplazadas. El fingerprint local de evidencia reemplaza un ID de webhook: esta etapa no recibe eventos.

Para identidad APROBADA se requieren estado global exacto `Approved`, un único documento aprobado, todos los resultados de liveness y face match presentes y aprobados, método document, país ARG y clase Identity Card. El DNI se obtiene de document_number; si personal_number tiene formato de DNI debe coincidir tras normalización. En DNI argentinos reales Didit informa en personal_number otro identificador (15 dígitos, comprobado el 12/10/2026), que se ignora. Un identificador ausente, inválido o contradictorio mantiene PENDIENTE; no se adivina entre DNI y número de trámite. Se aceptan siete u ocho dígitos, o su formato con puntos de miles; no se eliminan letras, signos arbitrarios ni ceros iniciales. Documento aprobado con DNI diferente al registrado produce RECHAZADA. Campos o estados desconocidos/incompletos nunca habilitan.

La actualización de estado vuelve a validar el padrón local antes de pasar a REGISTRADO. Correo confirmado, identidad APROBADA y matrícula VALIDADA son condiciones simultáneas. BAJA nunca se reactiva. El login central y el Basic interno mantienen su contrato; no hay JWT profesional para una cuenta pendiente.

La tarea de reconciliación se ejecuta cada 60 segundos por defecto, con diez cuentas por lote. Cada sesión pendiente se consulta normalmente cada cinco minutos, con mínimo treinta segundos entre consultas explícitas; tras errores se espera progresivamente entre diez y cuarenta minutos. Máximo 240 consultas y siete días por intento, incluyendo errores. Al alcanzar el límite se informa LIMITE_CONSULTAS y se necesita revisión; no se inventa una decisión. Las sesiones terminales dejan de consultarse automáticamente. La vigilancia continua de cuentas ya aprobadas/Kyc Expired posterior queda pendiente de Etapa 2.

HTTP usa conexión de tres segundos y lectura de ocho segundos, sin seguir redirects. Errores del proveedor producen 503 sanitizado y no habilitan la cuenta. La reconciliación conserva los resultados conocidos y reintenta con espera acotada; errores operativos no se convierten en rechazo biométrico. No mantiene transacciones de PostgreSQL abiertas durante llamadas HTTP; los tests lo verifican.

### Endpoints incorporados (puerto 8082)

| Método y ruta | Autorización / uso |
| --- | --- |
| GET `/api/abogados/verificacion/aviso` | Público; indica si el aviso está disponible |
| POST `/api/abogados/verificacion/acceso` | Correo y contraseña de titular con correo confirmado; entrega token temporal |
| POST `/api/abogados/verificacion/sesion` | Header X-Registro-Token; body consentimiento y avisoVersion |
| GET `/api/abogados/verificacion/estado` | X-Registro-Token; resumen local sin medios ni DNI del proveedor |
| POST `/api/abogados/verificacion/consultar` | X-Registro-Token; consulta autenticada al proveedor, limitada por frecuencia |
| POST `/api/abogados/verificacion/cerrar` | X-Registro-Token; revocación del token |

Las respuestas de estas rutas usan Cache-Control: no-store. CORS conserva localhost:5173 y agrega el header X-Registro-Token. Campos desconocidos en solicitudes tipadas son rechazados. No hay endpoint que permita aprobar un estado desde React, webhook público, acceso público al padrón ni cambio de la autenticación interna.

### Variables adicionales

| Variable | Uso / predeterminado |
| --- | --- |
| DIDIT_API_KEY | Secreto backend; vacío deja el inicio bloqueado |
| DIDIT_WORKFLOW_ID | UUID publicado; vacío deja el inicio bloqueado |
| DIDIT_CALLBACK_URL | http://localhost:5173/verificar-identidad; regreso del navegador, no webhook |
| DIDIT_PRIVACY_READY | false; habilitar solo tras aprobar/configurar el aviso |
| DIDIT_NOTICE_VERSION | Versión vigente no vacía, máximo 100 caracteres |
| DIDIT_DATA_CONTROLLER | Identificación concreta del responsable |
| DIDIT_PRIVACY_CONTACT | Canal real para consultas, retiro y solicitudes sobre datos |
| DIDIT_RETENTION_NOTICE | Plazos y proceso real de conservación/eliminación en Didit, incluyendo plantillas |
| DIDIT_DATA_LOCATION_NOTICE | Ubicación y transferencias reales aplicables |
| DIDIT_MODEL_USE_NOTICE | Política/configuración real sobre uso para mejora de modelos |
| DIDIT_RECONCILIATION_ENABLED | true; false permite desactivar la tarea |
| DIDIT_RECONCILIATION_INTERVAL_MS | 60000; se valida el rango 30000–3600000 ms al iniciar |

No se requieren DIDIT_WEBHOOK_SECRET ni URL pública HTTPS en esta etapa. localhost HTTP se usa solo para desarrollo; usar HTTPS para accesos y tokens en despliegues.

### Probar en localhost

1. Mantener las credenciales internas compartidas entre ciudadanos, autenticación y abogados según AUTENTICACION.md. Usar DB_PASSWORD para la base de abogados.
2. Para una demostración sandbox, usar una base PostgreSQL de desarrollo aislada y una aplicación/workflow sandbox; no mezclar claves sandbox con registros reales. Para el workflow real indicado, comprobar su configuración privada y usar únicamente datos y personas autorizadas. No usar respuestas sintéticas para aprobar registros reales.
3. Configurar DIDIT_API_KEY en el entorno privado del proceso y DIDIT_WORKFLOW_ID. No poner la clave en variables VITE_, consola, código, screenshots ni archivos versionados. El UUID publicado indicado es cf23be90-8ae5-4f2f-ac62-f2059ed159b2; un workflow de otra aplicación sandbox tendrá su propio ID.
4. Configurar las siete variables del aviso (versión, responsable, contacto, retención, ubicación, uso de modelos y READY), con información revisada y concreta. Sin ello la pantalla debe indicar bloqueo y no se inicia una sesión.
5. Iniciar abogados (8082), autenticación (8081) y React (5173). Importar el padrón según la sección anterior y habilitar correo de consola únicamente en desarrollo. No es necesario publicar un webhook.
6. Registrar la solicitud en /registro-abogado y confirmar el correo con su código. El login profesional devuelve 401 mientras esté pendiente.
7. Abrir /verificar-identidad e ingresar correo y contraseña. Leer el aviso, marcar expresamente la casilla y pulsar Iniciar o retomar Didit. El navegador abre el enlace individual del proveedor.
8. Completar documento, prueba de vida y Face Match en el flujo correspondiente. Al regresar, pulsar Consultar decisión de Didit; si transcurrieron menos de treinta segundos desde la operación anterior, se muestra el estado guardado y se puede volver a consultar luego.
9. Aunque se cierre la pestaña, la tarea reconcilia sesiones pendientes. Al vencer el token temporal, volver a ingresar credenciales permite retomar la misma cuenta/sesión.
10. Solo con identidad aprobada, correo confirmado y padrón vigente válido se muestra REGISTRADO y se permite login ABOGADO. Ambigüedades del padrón, rechazo, datos incompletos y errores mantienen el bloqueo. Cerrar acceso temporal revoca el token en servidor.

### Archivos de Etapa 1 y pendientes de Etapa 2

Creados en abogados: didit/DiditConfig.java, DiditClient.java, DiditVerificadorIdentidad.java y ReconciliarDidit.java; entity/VerificacionIdentidad.java; repository/VerificacionIdentidadRepository.java; gestor/VerificacionIdentidadGestor.java; controller/VerificacionIdentidadController.java; test/DiditEtapa1Test.java.

Adaptados en abogados: entity/AbogadoRegistrado.java, repository/AbogadoRepository.java, gestor/VerificarDniAbogadoGestor.java, gestor/RegistrarAbogadoGestor.java, config/SecurityConfig.java, properties principal y de pruebas. No se agregaron dependencias ni se ejecutaron migraciones contra PostgreSQL real. ddl-auto=update agregará columnas/tablas al iniciar: revisar/resguardar la base antes de hacerlo.

Frontend creado: pages/VerificarIdentidad.jsx y services/verificacionIdentidad.test.js. Adaptados: services/abogadoService.js, pages/RegistroAbogado.jsx, pages/IniciarSesion.jsx y App.jsx. No se modificaron estilos. Actualizados ABOGADOS.md y AUTENTICACION.md. Se preservaron los cambios previos del usuario.

Etapa 2: webhook firmado con secreto y recepción durable, gestión administrativa de rechazos/ambigüedades/límites, historial de intentos, vigilancia posterior de aprobaciones, limitador compartido si hay varias réplicas, política aprobada y automatización de eliminación/retención en Didit. También siguen pendientes correo real y verificación manual completa con PostgreSQL/navegador/consola privada del proveedor. La integración de esta etapa usa consultas reales a API, pero su ejecución se probó únicamente con servidor HTTP local simulado y H2.

## Pruebas y archivos

Resultados de Etapa 1 (11/10/2026): abogados 35/35, autenticación 6/6, ciudadanos 10/10 y frontend 10/10; sin fallos ni omisiones. Los tres procesos Maven finalizaron con BUILD SUCCESS. Lint de frontend sin advertencias y build Vite correctos. Las veintidós pruebas añadidas de Didit (incluidas variantes parametrizadas) usan H2 y un servidor HTTP local con credenciales sintéticas efímeras; no se llamó a Didit ni se usaron registros reales. No se realizó una prueba visual de navegador ni se verificó la consola privada del workflow.

```powershell
mvn -f microservicio-abogados/pom.xml test
mvn -f microservicio-autenticacion/pom.xml test
mvn -f microservicio-ciudadanos/pom.xml test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

En este entorno Maven necesitó el argumento `'-Dmaven.repo.local=C:\Users\Usuario\.m2\repository'` para usar la caché existente. No modificar los secretos reales para ejecutar los tests: `src/test/resources/application.properties` usa H2 y credenciales exclusivamente de prueba. La prueba de importación necesita el Excel privado en la raíz y no lo incorpora a los recursos distribuibles.

Resultados verificados el 10/10/2026: abogados 13/13, autenticación 6/6, ciudadanos 10/10 y frontend 6/6; sin fallos ni tests omitidos. Lint y build de Vite correctos. Maven de abogados terminó con BUILD SUCCESS. Se corrigieron durante la implementación un error de imports de tests, la rama 501 anterior y un problema de codificación del texto de jurisdicción. La prueba inicial de contexto intentó usar la configuración PostgreSQL y falló por autenticación antes de la configuración aislada H2; no se ejecutaron cambios sobre esa base. La compilación y las pruebas finales usan la configuración aislada.

Nuevos archivos principales: DTO de registro/respuesta; controladores de registro y credenciales internas; gestores de registro y DNI; configuraciones de estados/seguridad; interfaz de correo y consola; puerto Didit; entidades y repositorios de padrón/evidencia; importador y validador; manejador de errores; `RegistroAbogadoTest`, `PadronTest` y configuración H2; página `RegistroAbogado.jsx`, servicio y tests React; este documento.

Archivos Java creados bajo `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/`:

- `config/RegistroConfig.java`, `config/SecurityConfig.java`.
- `controller/AbogadosController.java`, `controller/ValidarCredencialesAbogadoController.java`.
- `correo/InterfazCorreo.java`, `correo/InterfazCorreoConsola.java`.
- `didit/VerificadorIdentidad.java`.
- `dto/RegistrarAbogadoRequest.java`, `dto/AbogadoResponse.java`.
- `entity/Padron.java`, `entity/PadronEvidencia.java`.
- `exception/GlobalExceptionHandler.java`.
- `gestor/RegistrarAbogadoGestor.java`, `gestor/VerificarDniAbogadoGestor.java`.
- `padron/ImportarPadron.java`, `padron/PadronConfig.java`, `padron/ValidarMatricula.java`.
- `repository/EstadoRepository.java`, `repository/PadronRepository.java`, `repository/PadronEvidenciaRepository.java`.

Tests creados: `microservicio-abogados/src/test/java/com/abogacia/microservicio_abogados/RegistroAbogadoTest.java`, `PadronTest.java` en la misma carpeta y `microservicio-abogados/src/test/resources/application.properties`. Frontend creado: `frontend/src/pages/RegistroAbogado.jsx`, `frontend/src/services/abogadoService.js`, `frontend/src/services/abogadoService.test.js`.

Archivos adaptados: `AbogadoRegistrado.java`, `AbogadoRepository.java`, pom y properties de abogados; `LoginController.java` y `LoginTest.java` de autenticación; `App.jsx`, `IniciarSesion.jsx`, `package.json` de React; `AUTENTICACION.md` y `.gitignore`. Los cambios preexistentes del usuario se conservaron. No hubo commits ni pushes.

Pendientes externos: configuración privada y aviso aprobado de Didit, Etapa 2, envío real de correo y prueba manual completa con PostgreSQL/navegador. La confirmación de consola es una herramienta de desarrollo. El padrón local no garantiza vigencia en tiempo real ni proporciona información completa para todos los profesionales.

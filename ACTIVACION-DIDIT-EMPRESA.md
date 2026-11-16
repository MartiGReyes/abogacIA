# Activación de la nueva cuenta empresarial Didit

**Estado: EXITOSO a nivel de configuración y comprobaciones técnicas.** Finalización: 15/11/2026 23:45:36, Argentina (16/11/2026 02:45:36 UTC). Aplicación: http://localhost:5173/.

## Alcance aplicado

Se recrearon exclusivamente `abogacia-ciudadanos-1` y `abogacia-abogados-1`. Ambos están activos y utilizan exactamente los valores nuevos de `DIDIT_API_KEY` y `DIDIT_WORKFLOW_ID` del `.env` principal. No se muestran valores ni fragmentos de la clave en este informe.

Se reutilizaron las imágenes ya desplegadas, sin reconstruirlas:

| Servicio | ID de imagen SHA-256 | Nuevo contenedor |
|---|---|---|
| Ciudadanos | a984ccf54ff94dd514d7ebd1fcb72d41fdd2a20521c4e812fd8a530950bf5fca | 46629a694a9b |
| Abogados | 105964efa0dc647533bb51dcc571564acf931f5bfef05ee64c978d6fc7405491 | 0bb9ae6347b9 |

La comparación de los entornos efectivos anteriores y posteriores confirmó que solo cambiaron las dos variables Didit. Se conservaron JWT, credenciales internas y PostgreSQL, Gmail/SMTP, URLs, perfiles, callbacks, red, IP, aliases, puertos y HostConfig. No se modificó código de negocio ni lógica de identidad, webhooks o webhook secrets.

## Verificaciones previas

Docker Compose recibe ambas variables del `.env` mediante el bloque compartido x-didit. Los valores nuevos tenían formatos válidos y Compose los resolvió correctamente. La clave tiene formato Live; mediante GET a la API oficial Didit se confirmó HTTP 200, correspondencia del workflow y estado published. El proveedor también informó liveness y face match habilitados.

La consulta fue exclusivamente de metadatos: no se llamó a creación de sesiones, no se inició una verificación y no se ejecutaron comprobaciones biométricas. La respuesta no incluyó un campo environment: la identificación Live se basa en el formato de la clave, no en una consulta independiente a la consola empresarial. No se auditó la totalidad de reglas del workflow ni se modificaron sus ajustes.

Las diferencias entre Compose y los contenedores eran las esperadas: las dos credenciales Didit pendientes y reconciliación automática deshabilitada por el arranque seguro anterior. Gmail y los controles seguros son valores efectivos adicionales documentados en el despliegue previo. Se clonó esa configuración efectiva, sin ejecutar un compose up genérico que pudiera sustituirla.

Ciudadanos no tiene montajes persistentes. Abogados conserva únicamente el bind del padrón en `/padron`, de solo lectura. No se recrearon volúmenes ni bases.

## Resguardo y reversión

Metadatos de plan, huellas y resultados en el directorio privado restringido:

`C:\Users\Usuario\abogacIa\.private-didit-empresa-20261115T234412`

Se conservaron detenidos los contenedores originales con su configuración completa e imágenes:

- `abogacia-ciudadanos-1-anterior-didit-20261115T234412`.
- `abogacia-abogados-1-anterior-didit-20261115T234412`.

No se exportaron sus secretos a archivos nuevos. El plan registra identificadores, red y nombres de variables; las credenciales anteriores siguen recuperables en los contenedores conservados. El procedimiento utilizado permite detener la candidata afectada, restaurar el nombre/red/IP del original y arrancarlo. No restaura ni modifica bases. No fue necesario ejecutarlo.

## Resultados posteriores

| Comprobación | Resultado |
|---|---|
| Ciudadanos y abogados | Arranque completado, procesos activos y endpoints respondiendo |
| Nuevas variables Didit | Coincidencia exacta con el `.env` en ambos servicios |
| Arranque seguro | Hibernate validate, SQL init never, migradores y bootstrap de escritura deshabilitados |
| Gmail | SMTP y recuperación siguen habilitados; todas sus variables preservadas exactamente |
| PostgreSQL | Arranque Hibernate satisfactorio y consultas de solo lectura correctas |
| Datos de ambas bases | Cantidades y huellas de todas las tablas iguales antes/después |
| Aviso de identidad ciudadano y abogado | HTTP 200; disponible=true |
| Catálogo por frontend/gateway | HTTP 200 |
| Perfil sin JWT de ambos tipos | HTTP 401 esperado |
| Endpoint público de login con cuerpo vacío | HTTP 400 de validación esperado |
| Navegador: login y ambos registros | Formularios visibles, sin enviar datos |
| Navegador: recuperación ciudadana y profesional | Formularios visibles y tipo de cuenta correcto |
| Página principal y logo | Disponibles, sin errores JavaScript en el recorrido comprobado |
| Frontend, autenticación, gateway, PostgreSQL, n8n y administración | Mismos contenedores, imágenes y fechas de arranque; no se reiniciaron |

No se usaron contraseñas de usuarios ni se hicieron pruebas de login exitoso. Los secretos JWT permanecieron iguales; no se forzó invalidación de tokens existentes. No se garantiza continuidad de estados efímeros en memoria: los procesos de ciudadanos y abogados se reiniciaron al recrear sus contenedores.

Lexi, gateway, frontend y n8n se conservaron sin cambios. Se comprobó disponibilidad de la página principal y ausencia de errores de navegador, pero **no se repitió una inferencia laboral/divorcio** para evitar llamadas adicionales a Gemini y registros de ejecución. Por tanto, esta activación no aporta una nueva prueba funcional de respuestas de Lexi. La prueba de inferencia anterior sigue documentada en DESPLIEGUE-HABITUAL-GMAIL.md. El catálogo sí se verificó contra los servicios desplegados.

## Seguridad y operaciones excluidas

Se comprobó que la nueva clave no aparece en los archivos del frontend, incluidos sus artefactos locales examinados, ni en los archivos actualmente versionados por Git. `.env` está ignorado y no está versionado. No se hizo commit. Las trazas de arranque de los dos contenedores nuevos no contienen la clave; esto es una comprobación de los logs actuales, no una garantía sobre cualquier log futuro.

Los clientes backend Didit usan el host fijo `https://verification.didit.me`, encabezado x-api-key y redirecciones deshabilitadas. La comprobación remota también se dirigió únicamente a ese host, sin seguir redirecciones. No se envió la clave a otros servicios ni al navegador. Referencia del GET de metadatos: [documentación oficial Get Workflow](https://docs.didit.me/management-api/workflows/get).

Sesiones Didit creadas: **0**. Correos enviados: **0**. No se crearon cuentas, ejecutaron migraciones/seeds ni modificaron Didit, padrón, RAG, n8n o administración. No se desplegó en Internet. No hubo errores de activación ni rollback.

## Prueba manual pendiente

Desde http://localhost:5173/, usar una cuenta propia/autorizada con correo confirmado y verificación de identidad pendiente. Abrir el paso de identidad del registro correspondiente, revisar el aviso y prestar consentimiento; iniciar la verificación y comprobar que abre Didit con la nueva cuenta/workflow. Completar documento y biometría únicamente cuando se autorice el consumo real y luego comprobar que el estado vuelve correctamente a la aplicación.

Revisar también la ruta profesional con una cuenta autorizada: la aprobación Didit no debe sustituir la validación de matrícula ni habilitar el catálogo por sí sola. Esta prueba manual sí crea una sesión y puede consumir créditos; no se ejecutó durante esta activación. No crear otra sesión si ya existe una pendiente sin revisar antes su estado.

El `.env` conserva las nuevas credenciales; una recreación futura debe preservar también los valores efectivos de Gmail y arranque seguro. Procedimiento operativo añadido: `integracion/activar-didit-empresa.mjs`. No debe repetirse sin revisar el estado y preparar un intento autorizado nuevo.

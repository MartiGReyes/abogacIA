# Gmail SMTP — implementación preparada, sin activar

## Estado

Trabajo sobre el proyecto principal. No se desplegaron servicios, no se reiniciaron contenedores, no se aplicaron migraciones ni se enviaron correos reales. No se modificaron cuentas, contraseñas, Didit, padrón, n8n, Gemini ni RAG. Consulta de solo lectura: matrícula 12345 ACTIVO; ambas tablas recuperacion_cuenta todavía ausentes.

## Implementación reutilizada y cambios

Se reutilizan InterfazCorreo, CorreoSmtp, los gestores de registro/confirmación de cada servicio, RecuperacionController, las dos migraciones preparadas y la página RecuperarAcceso. Autenticación conserva el enrutamiento por tipo de cuenta. Las cuentas nativas de ciudadanos y abogados están en bases distintas, con unicidad local de DNI/mail; no se crea una cuenta con dos roles.

- SMTP opt-in con bandera de envío, remitente configurable, Gmail 587, autenticación, STARTTLS obligatorio, comprobación de identidad TLS y tiempos de espera. Perfil `gmail` adicional, no activado. Depuración SMTP deshabilitada. Errores sin incorporar cuerpos ni causas con credenciales.
- Ambos adaptadores envían confirmaciones de registro y recuperación. Mensajes de texto identificados como abogacIA y con el tipo de cuenta. Las plantillas no son HTML.
- Recuperación: enlace al frontend con tipo de cuenta en query y token en fragmento. React lo carga y elimina de la barra/historial; al cambiar de tipo descarta el token. Token aleatorio de 256 bits, hash con prefijo de rol, vencimiento de 15 minutos y eliminación después de uso. Se conserva el mensaje genérico ante solicitud de cuenta desconocida y se revierte la solicitud si SMTP falla, sin revelar el fallo únicamente a cuentas existentes.
- Ciudadano: sustituido Random/código corto en claro por SecureRandom de 256 bits. Se almacena hash SHA-256 con dominio `confirmar-ciudadano` y fecha límite de 30 minutos en `codigo_confirmacion` (varchar 255 existente). La consulta bloquea el registro por hash; verifica vencimiento y correo no confirmado, y elimina el valor al usarlo. El frontend acepta el token de 43 caracteres. No se modifica el estado de cuentas ya confirmadas. Los códigos antiguos pendientes sin fecha dejan de aceptarse: se ofrece reenvío, sin migrar ni confirmar registros automáticamente.
- Abogado: se conserva el código criptográfico de seis dígitos, bcrypt, vencimiento de 30 minutos y cinco intentos. Se conserva el orden del flujo actual: Didit precede a completar los datos profesionales y enviar el correo de confirmación. No se alteró Didit para reordenar ese recorrido. La activación continúa exigiendo correo, identidad y matrícula válidos.
- Endpoint de reenvío en cada servicio: `/api/ciudadanos/correo/reenviar` y `/api/abogados/correo/reenviar`. POST JSON con mail. Respuesta genérica, bloqueo de cuenta, rotación del token y espera mínima de 60 segundos; nunca reabre cuentas confirmadas o suspendidas. Nuevo botón en ambas pantallas.
- Límite local de diez POST por minuto por dirección de conexión y ruta en confirmación/reenvío/recuperación, también para peticiones directas al backend. No confía en X-Forwarded-For. Detrás del gateway, la cuota puede compartirse entre usuarios; requiere observar su comportamiento al desplegar. Es memoria local, no un limitador distribuido.
- El adaptador de consola ya no imprime destinatarios ni tokens en el código preparado. Esto no cambia los contenedores actualmente desplegados.

## Archivos

En ambos microservicios, bajo `src/main/java/com/abogacia/microservicio_<servicio>/`:

- Modificados: `correo/CorreoSmtp.java`, `correo/InterfazCorreoConsola.java`, `recuperacion/RecuperacionController.java`, `config/SecurityConfig.java`.
- Agregados: `correo/ReenviarConfirmacion.java`, `correo/LimiteCorreo.java`, `controller/ReenviarCorreoController.java`.
- Agregado: `src/main/resources/application-gmail.properties`.
- Pruebas: CorreoSmtpTest ampliado; ReenvioSeguroTest, LimiteCorreoTest y RecuperacionActivaTest agregados.

Además en ciudadanos: `correo/TokenCorreo.java`, gestores RegistrarCiudadanoGestor y ConfirmarRegistroGestor, CiudadanoRepository, ConfirmarRegistroRequest, RegistroYConfirmacionGestorTest y TokenCorreoTest.

Frontend: `src/pages/RegisterCitizen.tsx`, `RegisterLawyer.tsx`, `RecuperarAcceso.tsx`; nuevo `src/services/correoService.js`; ensayo `gmail-browser.mjs`. Se restauró exactamente `src/imports/logoabogacIA.png` desde el respaldo del despliegue anterior porque faltaba y rompía el build por la importación existente en Login. No se editó Login ni se desplegó administración; el logo principal nuevo se conserva.

Los scripts `integracion/gmail-preparar.mjs`, `gmail-registro.mjs` y `gmail-reenvio.mjs` registran la preparación: no son comandos de despliegue ni deben repetirse sobre archivos ya preparados.

## Configuración privada

Archivo local creado con ACL restringida a Usuario y SYSTEM:

`C:\Users\Usuario\abogacIa\.private-gmail-smtp\gmail.env`

Completar en un editor local, sin compartirlo ni capturarlo:

| Variable | Valor |
| --- | --- |
| SMTP_FROM | Gmail remitente autorizado |
| SMTP_USERNAME | Dirección Gmail completa |
| SMTP_PASSWORD | Contraseña de aplicación; sin espacios de separación |
| SMTP_HOST | smtp.gmail.com |
| SMTP_PORT | 587 |
| ABOGACIA_FRONTEND_URL | http://localhost:5173 |
| ABOGACIA_CORREO_ADAPTER | smtp |
| ABOGACIA_CORREO_ENABLED | false durante preparación |

El archivo queda fuera del proyecto fuente y no está conectado a los contenedores. No se leyó ni verificó una contraseña ingresada por el usuario. No pegar valores en comandos, informes o chat. No basta editar el archivo para activar correo. En el despliegue autorizado habrá que inyectar estas variables y cargar `gmail` como perfil adicional, conservando toda la configuración segura existente. La recuperación seguirá deshabilitada hasta verificar las migraciones y habilitar `ABOGACIA_RECUPERACION_ENABLED=true` explícitamente. No usar mail.debug ni volcar el entorno a logs.

Gmail requiere verificación en dos pasos para contraseñas de aplicación. Si la política de una cuenta las impide, la alternativa es OAuth 2.0/XOAUTH2 o un proveedor transaccional aprobado, no habilitar acceso inseguro. Referencias: https://support.google.com/mail/answer/185833 y https://developers.google.com/workspace/gmail/imap/imap-smtp .

## Migraciones y rollback

Se necesitan las dos migraciones existentes:

- `integracion/prioridad1/migracion-recuperacion-ciudadanos.sql`: recuperacion_cuenta con FK a ciudadano(id_ciudadano).
- `integracion/prioridad1/migracion-recuperacion-abogados.sql`: recuperacion_cuenta con FK a abogados_registrados(id_abogado).

Ambas crean únicamente la tabla aditiva con cuenta_id PK/FK, token_hash único, vence y solicitada_en. No actualizan cuentas existentes ni requieren importar datos. No hacen falta columnas nuevas para el token ciudadano; se verificó longitud 255 del campo actual. No ejecutar automáticamente ni activar recuperación antes de comprobar la tabla en cada base.

Antes de aplicar, con autorización específica: guardar dump custom de cada base, esquema y configuración privada; verificar índice mediante pg_restore --list, hash del respaldo y restauración en una base descartable. Respaldar imágenes/entorno de ambos servicios y frontend. Registrar cantidades/huellas de las tablas de cuentas y verificaciones antes/después. Mantener ddl-auto=validate, SQL never y Flyway/Liquibase deshabilitados.

Rollback de despliegue: deshabilitar SMTP/recuperación, restaurar imágenes y configuración anterior. Las tablas aditivas pueden permanecer, sin borrarlas automáticamente. La vuelta al código ciudadano anterior no interpretará los tokens nuevos: planificar reenvío tras volver a una versión compatible; no convertir hashes en códigos en claro ni modificar cuentas confirmadas. Para rollback del código preparado, respaldos originales en `.private-gmail-smtp/backup` desde la raíz de trabajo y eliminación revisada de archivos nuevos; no restaurar un árbol completo sobre cambios posteriores. No restaurar dumps completos sobre datos posteriores sin análisis.

## Pruebas y límites

Todas las pruebas siguientes pasaron:

- Ciudadanos: 26 pruebas en CorreoArranqueTest (H2 descartable), CorreoSmtpTest (SMTP simulado), LimiteCorreoTest, ReenvioSeguroTest, TokenCorreoTest, RegistroYConfirmacionGestorTest, RecuperacionActivaTest y RecuperacionSinEscriturasTest.
- Abogados: 33 pruebas en CorreoArranqueTest (H2), CorreoSmtpTest, LimiteCorreoTest, ReenvioSeguroTest, RegistroAbogadoTest, RecuperacionActivaTest y RecuperacionSinEscriturasTest.
- TypeScript, build frontend y 82 pruebas existentes de servicios.
- Chromium en preview temporal 127.0.0.1:5198, APIs simuladas y bloqueo de solicitudes externas: carga de token desde fragmento, limpieza de URL, envío al tipo correcto y descarte al cambiar de cuenta. Preview y navegador detenidos.

Las pruebas de recuperación activa usan JdbcTemplate simulado: verifican generación/hash, respuesta genérica, rechazo sin cambio de contraseña, actualización de la tabla propia y consumo/no reutilización. No constituyen validación de las migraciones y concurrencia en PostgreSQL. El test de uso único simula la ausencia del token tras consumirlo. Las pruebas de registro profesional usan H2 y peticiones locales; no llaman Didit ni Gmail. No se verificó recepción de mensajes, entrega en spam ni un cambio de contraseña en el entorno habitual.

Se completó además el ensayo nativo con PostgreSQL 17 descartable, SMTP local de captura y tres procesos de aplicación de prueba, todos en una red interna nueva, sin datos ni credenciales habituales. Se montaron los JAR compilados de la aplicación existente; no se reconstruyeron imágenes habituales ni se usaron los entornos aislados anteriores.

- 35 comprobaciones en `integracion/gmail-ensayo-resultados.json`: migraciones aplicadas solo en las bases descartables, arranque seguro y validación, igual DNI/mail con contraseñas y JWT independientes, registro y confirmación ciudadana mediante SMTP, imposibilidad de autoaprobar correo/Didit desde el payload, confirmación profesional por correo de reenvío, tokens de registro no intercambiables, recuperación de ambos roles, hashes en PostgreSQL, uso único, nueva contraseña aceptada/anterior rechazada, fallo SMTP con rollback de registro y recuperación, respuesta genérica sin enumeración y dumps restaurados en bases de recuperación nuevas.
- Cinco comprobaciones adicionales en `integracion/gmail-vencimientos-resultados.json`: token ciudadano vencido, reenvío con espera mínima sin rotación inmediata, token anterior rechazado y recuperación vencida sin modificación de contraseña en ambos roles.
- El profesional del ensayo nativo es una fixture SQL con identidad aprobada sintética y padrón sintético; su correo se prueba por reenvío y confirmación. No se hizo una verificación biométrica real. El alta profesional y generación inicial del correo se cubren por las pruebas aisladas de registro existentes y el adaptador SMTP simulado.
- El SMTP de captura del ensayo utiliza transporte sin TLS únicamente dentro de esa red interna, mediante overrides exclusivos de prueba. Esto prueba el flujo SMTP y sus errores, no el handshake STARTTLS ni la autenticación de Gmail. El perfil Gmail preparado mantiene STARTTLS obligatorio y validación TLS.
- Hubo una corrección del ensayo: la identidad aún no verificada se persiste como NULL y se presenta como PENDIENTE. Se comprobó expresamente correo false y estado PENDIENTE; se ajustó la lectura de prueba para esa representación. También se corrigió el selector del test de navegador; no se cambió la aplicación para ocultar fallos.
- Los cinco contenedores nuevos del ensayo quedaron detenidos (PostgreSQL temporal, SMTP y tres aplicaciones). La base temporal usaba tmpfs, sin volúmenes de datos existentes. Se conservan los contenedores detenidos y scripts; no se borraron volúmenes. `integracion/gmail-estado-final.json` confirma que los ocho contenedores habituales siguen activos con los mismos ID, imagen y fecha de arranque.

Pendientes: prueba real STARTTLS/autenticación/entrega de Gmail y recepción en un destinatario expresamente autorizado; aplicación de migraciones y despliegue coordinado con autorización posterior; comprobaciones en el entorno habitual con cuentas autorizadas. No se declara operativo el correo real por disponer de contraseña de aplicación ni por pasar pruebas con SMTP local.

## Autorizaciones siguientes

No se solicita que el usuario comparta secretos. Falta confirmar un destinatario autorizado para las pruebas reales y autorizar esos envíos; por separado, autorizar aplicación de ambas migraciones y despliegue/configuración final. Los componentes que necesitan publicar los cambios son ciudadanos, abogados y frontend; no hay cambios nuevos de código en autenticación o gateway. Antes de desplegar habrá que generar y verificar respaldos actuales de ambas bases e imágenes: los respaldos del ensayo no sustituyen los habituales. Ninguna de estas autorizaciones se presume por disponer de la contraseña de aplicación.

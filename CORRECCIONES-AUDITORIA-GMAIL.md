# Correcciones de la auditoría Gmail

> Validación posterior completada: ver `VALIDACION-FINAL-GMAIL.md`. Las limitaciones de pruebas descritas abajo conservan el historial de la etapa anterior; la versión final y sus imágenes sí fueron verificadas después, sin desplegarlas en el entorno habitual.

## Estado de entrega

Correcciones implementadas en el proyecto principal y compiladas. La última instrucción del usuario pidió omitir pruebas y activar la funcionalidad. Desde esa instrucción no se ejecutaron pruebas: los tres JAR se empaquetaron con `-Dmaven.test.skip=true`; TypeScript y build Vite finalizaron correctamente. El frontend se construyó con las URLs de API relativas habituales.

La activación **no se ejecutó**. La revisión automática rechazó el comando porque combinaba migraciones en bases habituales, recreación de componentes y habilitación SMTP, frente a la prohibición explícita anterior. No se intentó eludir el rechazo. Se requiere autorización específica de esas operaciones antes de volver a solicitar su ejecución.

Los ocho contenedores habituales conservan sus versiones anteriores. No hubo migraciones habituales, cambios de cuentas o contraseñas, nuevos correos reales ni activación de Gmail. Los cinco contenedores descartables de esta última preparación quedaron detenidos.

## 1. Cambio de dirección y verificación

Causa: el editor de perfil modificaba mail manteniendo correoConfirmado y el estado anterior. El mismo defecto existía en el perfil profesional.

CambiarCorreo, en ambos backends, compara las direcciones normalizadas. Si no hay cambio real, no rota códigos, no altera la confirmación y no envía correo. Si hay cambio:

- Actualiza la dirección, marca correo no confirmado y deja la cuenta PENDIENTE.
- Invalida las recuperaciones de esa cuenta, si existe la tabla de recuperación, usando la misma conexión transaccional.
- Rota el código de confirmación y su vencimiento. El hash anterior deja de identificar el registro ciudadano; el bcrypt anterior deja de servir en el profesional.
- Conserva las verificaciones Didit y los datos de matrícula. No modifica la otra cuenta del mismo titular.
- Hace flush de la cuenta antes del envío para detectar conflictos de unicidad. SMTP y los cambios quedan dentro de la transacción del editor: ante fallo se revierten los datos.

React cierra solo la sesión del tipo afectado y dirige a `/confirmar-correo?cuenta=CIUDADANO` o ABOGADO. La nueva pantalla permite confirmar o reenviar el código. La activación sigue dependiendo de los demás requisitos de identidad y matrícula.

## 2. Limitación de altas y envíos

Causa: el filtro solo incluía confirmación/reenvío/recuperación; no cubría el alta ciudadana que envía correo.

Se incorporaron las rutas de alta y completar cuenta al filtro existente. Para las altas hay 30 solicitudes por dirección de conexión durante una ventana de 60 segundos; para las demás rutas protegidas, 120. No se confía en X-Forwarded-For. La ventana quedó anclada al primer intento para no poder repartir una ráfaga entre dos minutos consecutivos. El exceso responde 429 con Retry-After.

Además, CuotaCorreo se aplica en el adaptador SMTP: todas las generaciones, cambios y reenvíos comparten presupuesto. Por servicio/instancia: 20 envíos/minuto y 200/día; por destino normalizado: 3/minuto y 5/hora. Solo se conserva el hash del destino en memoria. Los fallos consumen cuota para impedir un bucle de reintentos. La espera mínima de reenvío por cuenta sigue siendo 60 segundos.

Las cuotas por destino no se eluden mediante mayúsculas o espacios. Un bloqueo de cuota no confirma cuentas; en altas revierte la transacción. Recuperación y reenvío mantienen respuestas genéricas ante cuotas/fallos SMTP para no distinguir cuentas existentes. El alta hace flush antes del SMTP para que el índice rechace una carrera antes de enviar el correo.

Límites restantes: los contadores son locales y se reinician al reiniciar la aplicación. La cuota de IP detrás del gateway se comparte; se amplió para evitar el bloqueo global de diez peticiones previo. Esto está preparado para el desarrollo actual con una instancia de cada servicio; una futura arquitectura con réplicas requerirá contadores compartidos. No se añadieron servicios externos.

## 3. Normalización y concurrencia

Política: `trim()` y minúsculas con Locale.ROOT. No se eliminan puntos ni sufijos `+alias`; no se aplican reglas particulares de Gmail a otros proveedores.

Se normalizan DTO de entrada y setters de mail. Los repositorios comparan lower(trim(mail)); recuperación usa lower(btrim(mail)). Se cubren registro, duplicados, login, acceso temporal de registro, confirmación profesional, reenvío, recuperación y edición. Los records de entrada normalizan antes de Bean Validation. Consultas ambiguas no seleccionan arbitrariamente una cuenta: se devuelve un conflicto controlado o la respuesta genérica de recuperación. Se redactó también el toString de LoginResponse para no incluir JWT en diagnósticos.

Para la carrera entre dos transacciones se prepararon índices únicos funcionales separados, uno por base y tipo. No se modifican/fusionan cuentas existentes. Las mismas direcciones y DNI siguen siendo admisibles entre ciudadano y abogado; no hay índice global.

## Archivos principales

En ambos microservicios, bajo `src/main/java/com/abogacia/microservicio_<tipo>/`:

- Nuevos `correo/CorreoNormalizado.java`, `correo/CuotaCorreo.java`, `correo/CambiarCorreo.java`.
- Cambiados `correo/CorreoSmtp.java`, `correo/LimiteCorreo.java`, repositorio de cuentas, DTO/records de entrada, `recuperacion/RecuperacionController.java`, controlador de reenvío y manejador global de errores.
- Ciudadanos: `gestor/ModificarCiudadanoGestor.java`, `RegistrarCiudadanoGestor.java`, DTO de registro/modificación/credenciales y entidad Ciudadano.
- Abogados: `controller/PerfilAbogadoController.java`, DTO IniciarSolicitudRequest/ModificarAbogadoRequest y entidad AbogadoRegistrado.
- Autenticación: CorreoNormalizado y LoginController (entrada normalizada y respuesta sin token en toString).

Frontend: nueva `src/pages/ConfirmarCorreo.tsx`; cambios en `App.tsx`, `Profile.tsx` y `LawyerProfile.tsx`. Se preservan logo y navegación existentes.

Pruebas preparadas: CorreccionesCorreoTest en ambos backends; ajuste de LimiteCorreoTest a los límites nuevos y de RegistroAbogadoTest al estado pendiente posterior al cambio. Las fuentes iniciales modificadas se respaldaron bajo `.private-correcciones-gmail/backup`. Herramientas de preparación en `integracion/corregir-gmail.mjs` y propuesta de activación en `integracion/activar-gmail.mjs`; no repetir el preparador sobre fuentes ya modificadas.

## Verificación realizada y pendiente

Durante la autorización anterior se ejecutaron pruebas parciales de las correcciones. La ejecución nativa confirmó cambio y reconfirmación de ambas direcciones, invalidación de recuperaciones anteriores, rechazo de token antiguo, conservación de Didit, cambio equivalente sin efectos, independencia de la otra cuenta y normalización/índice en PostgreSQL descartable. La comprobación final de frecuencia de altas no pasó; al revisarla se sustituyó la ventana por minuto calendario por una ventana de 60 segundos anclada al primer intento. No se reejecutó después de la instrucción de omitir pruebas.

Se corrigió además una edición defectuosa del test de perfil y se conservaron las comprobaciones de duplicado antes del cambio de dirección. No se presenta ese test como aprobado en su estado final: no se ejecutó por la última instrucción.

Resultado final verificable de esta etapa: empaquetado de ciudadanos, abogados y autenticación sin ejecutar ni compilar tests; comprobación TypeScript y build de frontend correctos. **No se declara validación funcional completa de la versión final.** No se hicieron pruebas con cuentas habituales ni correos reales.

## Migraciones pendientes: ninguna aplicada al habitual

1. `integracion/prioridad1/migracion-recuperacion-ciudadanos.sql`: tabla de recuperación ciudadana.
2. `integracion/prioridad1/migracion-recuperacion-abogados.sql`: tabla de recuperación profesional.
3. `integracion/gmail/migracion-mail-normalizado-ciudadanos.sql`: índice único de lower(btrim(mail)) en ciudadano.
4. `integracion/gmail/migracion-mail-normalizado-abogados.sql`: índice equivalente en abogados_registrados.

Los índices se prepararon con transacción y lock_timeout de 5 segundos; fallan ante duplicados y no los corrigen automáticamente. Deben aplicarse con las escrituras de los componentes afectados detenidas. Las cuentas y verificaciones existentes no necesitan backfill ni cambios de DNI/mail/contraseña. Si aparecen duplicados antes de aplicar, detener el procedimiento sin fusionar ni editar registros.

## Activación y reversión preparadas

Se conservan nuevos respaldos custom de ambas bases en `.private-activacion-gmail/previo-*.dump`, con tamaño, SHA-256 e índice verificado mediante pg_restore --list. No se sobrescribieron respaldos anteriores. La exportación de las cuatro imágenes anteriores terminó en `.private-activacion-gmail/imagenes-anteriores.tar` y se verificó su índice. No se ejecutó una restauración de prueba por instrucción del usuario.

La propuesta de activación conserva contenedores/imágenes anteriores, clona configuración/red/IP/aliases y añade SMTP en memoria desde el archivo privado. No copia la contraseña a otro archivo ni a imágenes. El archivo gmail.env mantiene ABOGACIA_CORREO_ENABLED=false; solo las dos aplicaciones nuevas recibirían true con autorización. Recuperación se habilitaría tras crear ambas tablas. Arranque seguro, Hibernate validate, SQL never, seeds y migraciones automáticas deshabilitados se conservan.

Componentes afectados: frontend, ciudadanos, abogados y autenticación. No se cambia gateway, PostgreSQL, administración, n8n, Gemini, RAG, Didit o padrón. La actualización conserva el backend de abogados más reciente como base para no perder la corrección de matrícula numérica.

Si falla el arranque, el procedimiento detiene candidatas y restaura nombres, red, IP y ejecución de los contenedores anteriores. Las tablas e índices aditivos no se borran automáticamente; no se restauran dumps completos sobre datos posteriores. Si ya se emitieron tokens nuevos, una vuelta al código ciudadano antiguo no es transparente: hay que preservar esos registros y coordinar una versión compatible o mantener apagados los nuevos envíos, sin convertir hashes en texto ni desverificar cuentas legítimas.

## Conclusión

Los tres hallazgos tienen corrección implementada; la unicidad definitiva requiere aplicar los dos índices preparados. La versión final compila pero no tiene una pasada funcional completa, por instrucción de omitir pruebas. No se afirma que el correo esté activo en localhost:5173.

La revisión automática bloqueó la activación por el alcance de escrituras y recreaciones. Para avanzar se necesita autorización explícita de las cuatro migraciones, la actualización/recreación de los cuatro componentes y la habilitación de SMTP/recuperación para las acciones de usuarios. No se requiere autorización para enviar mensajes de prueba porque no se propone ninguno.

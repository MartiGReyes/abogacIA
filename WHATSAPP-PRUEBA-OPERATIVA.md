# Circuito privado de WhatsApp: implementación y uso

> Circuito retirado. Consultar [WHATSAPP-CUENTAS-AUTENTICADAS.md](WHATSAPP-CUENTAS-AUTENTICADAS.md) para utilizar las cuentas ABOGADO y CIUDADANO y el perfil autenticado.

> Antecedente histórico. La guía vigente es [WHATSAPP-MODO-LOCAL.md](WHATSAPP-MODO-LOCAL.md): registro local desde el Home, sin campañas ni invitaciones. No seguir las instrucciones de acceso privado que figuran debajo.

**Documentación sustituida para la experiencia del ciudadano:** consultar `WHATSAPP-CONTACTO-INTEGRADO.md`. El contacto ahora se realiza desde el Home, el catálogo y el chat de Lexi existentes. `/prueba-operativa` queda exclusivamente para configurar la campaña. Las instrucciones siguientes describen la versión anterior.

Implementado y probado el 10/11/2026 dentro del React/Vite y microservicio de abogados existentes. El despliegue de prueba utiliza servicios y PostgreSQL nuevos. No se desplegó sobre los entornos habituales.

## Acceso del organizador

URL disponible: **http://localhost:5182/prueba-operativa**. También existe `/registro-abogado/prueba-operativa` dentro de la misma aplicación. El inicio `/` del frontend aislado lleva al circuito privado.

1. Seleccionar **Organizador**.
2. Abrir localmente `C:\Users\Usuario\abogacIa\.private-contacto-operativo\acceso-organizador.txt` y copiar su código en **Código privado del organizador**. No compartir ese código ni pegarlo en el chat. No confundirlo con `clave-cifrado.txt`.
3. Presionar **Ingresar al circuito privado**.
4. En **Registrar mi perfil de prueba**, ingresar nombre visible o alias, DNI propio y celular propio. No ingresar datos personales en código, `.env`, fixtures o documentación.
5. Escribir el celular en formato internacional argentino: **+54 9 + área + número**, sin el cero troncal ni el prefijo móvil local 15. No se eliminan indiscriminadamente los dígitos 15, porque pueden formar parte del número real. Si se ingresa +54 seguido de los diez dígitos nacionales, el servidor incorpora el 9 móvil. Formatos locales ambiguos se rechazan.
6. Elegir la especialidad de la prueba; se sugiere **Derecho Laboral** para el recorrido indicado más abajo.
7. Revisar el número escrito y aceptar el aviso que confirma que los datos son propios y autoriza recibir contactos técnicos. Presionar **Guardar perfil cifrado**.
8. La pantalla mostrará el destino enmascarado y un identificador automático `PRUEBA-…`. El perfil queda inicialmente inactivo. Presionar **Activar perfil para esta campaña** cuando se haya revisado el destino.

No se solicita Didit, no se crea una cuenta ABOGADO y no se valida ni inserta matrícula en el padrón. Siempre se muestran:

- **Perfil de prueba operativa — matrícula no verificada**.
- **Identidad declarada; no verificada por Didit**.

La campaña dura 24 horas desde su creación; el acceso de organizador dura hasta 8 horas y nunca supera ese vencimiento. Al recargar se recupera la sesión mediante cookie HttpOnly, sin volver a exponer DNI o teléfono completos. Si se necesita corregir un registro, comenzar una campaña nueva: no se sobrescriben datos de una campaña existente.

## Invitar un participante

1. Con el perfil activo, presionar **Crear invitación de un uso**.
2. Entregar al participante únicamente el código mostrado y la URL del circuito, por un canal elegido por el organizador. No incluir el código en la URL.
3. El código vence a los **15 minutos** y permite **un ingreso**. Para otro participante, generar otra invitación.
4. El participante abre la URL en **otra ventana privada o perfil de navegador** para no reemplazar la sesión del organizador. Selecciona **Participante con invitación**, pega el código e ingresa.

El acceso de participante dura hasta dos horas, limitado además por la campaña. No permite administrar perfiles, activar la campaña o crear invitaciones. Desactivar el perfil revoca las sesiones de participantes y las invitaciones pendientes. Una nueva activación requiere invitar nuevamente.

La publicación es **solo en loopback de esta computadora**, `127.0.0.1:5182`. Otra ventana de la misma computadora funciona; un celular u otra computadora no puede acceder directamente. No se habilitó acceso por Internet ni se abrió la red local. Un acceso remoto posterior requiere un despliegue privado con HTTPS y una revisión específica de origen/cookies, sin usar las bases habituales.

## Recorrido con Lexi y entrega manual

1. El participante debe disponer de una cuenta de WhatsApp **distinta de la del destino**, para comprobar entrega entre dos personas. Verificar qué cuenta está activa en WhatsApp Web o en la aplicación que abrirá el navegador.
2. En **Conversar con Lexi**, escribir un caso técnico sin datos reales, por ejemplo una pregunta breve sobre documentación frente a un despido.
3. Presionar **Consultar a Lexi**. Este circuito llama, con sesión privada, al **mismo webhook de orientación existente**. No envía el DNI ni el celular registrados y no cambia workflow, prompts o RAG. La consulta puede conservarse según la configuración vigente de n8n/proveedores; por eso debe ser inocua.
4. Tras la respuesta, presionar **Ver perfil de prueba recomendado**. La especialidad se infiere con la función existente del frontend. Solo se consulta el perfil activo de esta campaña. Si no coincide, se informa el vacío; una pregunta laboral corresponde al perfil de Derecho Laboral.
5. Presionar **Contactar por WhatsApp real**.
6. Editar el resumen; nombre y teléfono para escribir en el mensaje son opcionales. No se copia automáticamente la respuesta completa de Lexi. No incluir datos sensibles de casos reales.
7. Revisar la vista previa y el destino enmascarado. Aceptar explícitamente compartir ese texto con WhatsApp/Meta y el destinatario. El aviso explica que WhatsApp muestra la cuenta/número remitente y que el enlace puede quedar en el historial.
8. Presionar **Preparar enlace confirmado**. El backend verifica campaña, permisos, perfil activo, aviso y coincidencia exacta del mensaje consentido. Rechaza el DNI registrado, su matrícula de prueba y referencias a DNI/matrícula/Didit dentro del texto.
9. Presionar **Abrir WhatsApp con este mensaje**. Se abre exclusivamente `https://wa.me/` con el destino normalizado y texto precargado. Revisar en WhatsApp destinatario, cuenta remitente y texto, y pulsar **Enviar** manualmente.
10. El organizador comprueba la **recepción efectiva** en su teléfono. Registrar como resultado de la prueba solo que llegó y cuándo, sin copiar información personal en logs o documentación.

Editar cualquier campo del mensaje invalida el consentimiento y elimina el enlace preparado de la pantalla. **Cerrar y descartar** limpia el borrador. Abrir el enlace nunca muestra un estado «enviado» o «entregado»: abogacIA no recibe un acuse por wa.me. No se integró Business Platform ni un mecanismo de envío automático.

No se abrió ni envió WhatsApp real durante el desarrollo: las pruebas automatizadas interceptaron la navegación externa. La validación del webhook real mediante una consulta y la recepción en el número personal quedan para este recorrido manual. Se verificó conectividad a n8n con GET `/healthz`, sin ejecutar su workflow.

## Datos, permisos y conservación

- DNI y teléfono se almacenan en columnas bytea con **AES-256-GCM**, nonce aleatorio y autenticación vinculada al ID del perfil y al campo. No se usan como claves, índices, tokens o valores de logs.
- La clave vive en `C:\Users\Usuario\abogacIa\.private-contacto-operativo\clave-cifrado.txt`, **fuera de la raíz del repositorio** y del volumen PostgreSQL. Se verificaron ACL del usuario local y SYSTEM. Se monta como secreto de Docker; no se copia a una imagen o variable VITE.
- No borrar ni regenerar esa clave: los registros existentes quedarían ilegibles. El preparador rechaza sobrescribirla. Una copia de respaldo de datos requeriría custodiar la clave separadamente.
- El registro conserva además alias, especialidad, identificador ficticio, versión de clave, indicadores fijos de no verificación, consentimiento y fechas de campaña. No guarda imágenes de documento, biometría, domicilio o datos de Didit.
- La matrícula de prueba solo se muestra al organizador. Las recomendaciones privadas muestran alias/especialidad, advertencias, vencimiento y teléfono enmascarado. Nunca devuelven DNI ni habilitación profesional.
- El destino completo se revela únicamente en el enlace autorizado porque el navegador necesita ese número para abrir WhatsApp. El texto y destino pasan a WhatsApp al abrirlo y pueden quedar en historial: la codificación URL no es cifrado. El mensaje no contiene automáticamente el DNI ni la matrícula.
- El contenido del formulario de contacto y la conversación no se guardan en estas tablas. El navegador los conserva en memoria mientras la pantalla esté abierta; no se agregan a sessionStorage/localStorage. El flujo original de Lexi tiene su propia conservación, que este módulo no cambia.
- Sesiones e invitaciones tienen tokens aleatorios; en la base se guarda únicamente SHA-256 de esos tokens, no datos personales. Las cookies son HttpOnly, SameSite=Strict y limitadas a `/api/pruebas-operativas`. El HTTP local no se publica fuera del host. Los POST exigen Origin local exacto; se limitan intentos fallidos y solicitudes.
- Vencer, desactivar o iniciar otra campaña **no borra datos**. Se deshabilitan accesos y recomendaciones, conservando registros cifrados. Un borrado o política de retención definitiva queda para una acción específica autorizada. Un enlace ya revelado o un mensaje ya enviado no pueden retirarse mediante la desactivación.

No usar datos personales en pruebas automáticas ni guardar HAR, videos, capturas de formularios reales o volcados SQL. Las pruebas de este módulo tienen trazas/videos desactivados y usan información sintética. Antes de ejecutar sus suites, se comprueba que la campaña esté vacía; no ejecutarlas después de registrar datos reales. Las pruebas archivan únicamente sus campañas sintéticas y dejan otra vacía, sin eliminar registros.

## Infraestructura y arranque

Proyecto nuevo: `abogacia-contacto-operativo-test`. Base: `contacto_operativo_test`. Volumen nuevo: `abogacia-contacto-operativo-test_operativa_test_data`. Sin puertos publicados para PostgreSQL ni backend. Solo frontend en `127.0.0.1:5182`.

El usuario `operativa_runtime` solo lee las tablas profesionales vacías y tiene SELECT/INSERT/UPDATE en el esquema propio `operativa`. No tiene DELETE ni DDL, ni permisos de escritura en cuentas profesionales. El perfil `contacto-operativo-test` valida antes de JPA la URL/usuario/opciones exactos y rechaza perfiles combinados, Didit/importación/fixtures activos o secretos y URL de Lexi incorrectos. `ddl-auto=validate`, sin inicialización SQL automática. Las tablas nuevas usan SQL explícito, sin nuevas entidades JPA que puedan crear tablas en un arranque habitual.

Red privada nueva para PostgreSQL. Backend con red de salida propia para consultar exclusivamente la URL fija del webhook existente en `host.docker.internal:5678`; no se conectó a redes Docker habituales o de EP06. El proxy del frontend solo expone las rutas privadas nuevas y devuelve 404 para otras APIs. El endpoint público original de recomendaciones del backend aislado también se probó y devuelve vacío: no consulta los perfiles operativos.

Desde la raíz `abogacIA`:

```powershell
# Solo una vez en una instalación nueva, si no existen los secretos o .env:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/dev/Preparar-ContactoOperativo.ps1

# Iniciar exclusivamente este proyecto:
docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml up -d --build

# Estado:
docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml ps

# Detener conservando datos y claves:
docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml stop
```

No combinar archivos Compose. No volver a aplicar el SQL de inicialización sobre tablas existentes. No iniciar ni reconstruir los servicios habituales para esta prueba. El proceso de preparación no contiene ni pide DNI o teléfono: solo genera secretos técnicos fuera del repositorio y un `.env` local ignorado con credenciales/paths.

## Verificaciones realizadas

| Prueba | Resultado |
| --- | --- |
| Suite Maven de abogados, incluida regresión de registro/Didit/matrícula | 149 pruebas; sin fallos, errores u omisiones |
| Nuevas unitarias backend | 6 dentro de la suite: cifrado aleatorio, integridad/AAD, normalización, omisión de datos en toString, guardas y relay HTTP de Lexi con servidor sintético local |
| Servicios frontend | 60 pruebas aprobadas, incluida simulación preexistente que continúa sin enviar nada |
| API PostgreSQL 17 y aislamiento | 11 casos contabilizados por node:test, todos aprobados: alta, cifrado en base, roles/origen, invitaciones usadas/vencidas, consentimiento exacto, enlace, ausencia en API pública, revocación, sesiones vencidas, campañas y modelo/secretos |
| Chromium | 3 pruebas aprobadas: registro privado y recarga, recorrido del participante y WhatsApp interceptado, responsive 360/768/1440 px |
| Compilación/calidad | TypeScript sin emisión, oxlint y Vite correctos; imágenes aisladas construidas |
| Conectividad Lexi | GET de healthcheck a n8n correcto, sin ejecución del workflow |
| Entornos previos | Comparación de ID, imagen y fecha de inicio: sin cambios en todos los contenedores que existían antes de comenzar |

Las pruebas de navegador usan una respuesta sintética de orientación para evitar ejecutar el workflow real; sesiones, registro, recomendaciones y preparación de enlaces sí recorren los servicios y PostgreSQL nuevos. El relay de Lexi se prueba además con HTTP real contra un servidor local sintético, verificando que el único campo enviado sea `chatInput`. Ninguna prueba automatizada envía WhatsApp.

Solo antes de ingresar datos reales, y sin ejecutar suites en paralelo sobre la misma campaña:

```powershell
node --test docker/contacto-operativo-test/api.test.mjs docker/contacto-operativo-test/isolation.test.mjs
mvn.cmd -f microservicio-abogados/pom.xml test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
Push-Location frontend
.\node_modules\.bin\tsc.cmd --noEmit
npm.cmd run test:operativa
Pop-Location
```

No se modificaron bases habituales, EP06, abogados-dev, el entorno de dashboard, n8n o RAG. No se ejecutaron migraciones reales ni comandos de eliminación de contenedores/volúmenes. El código profesional de registro, Didit, padrón, login y recomendaciones se mantiene sin excepciones. La navegación privada solo se activa en el frontend aislado mediante `VITE_CONTACTO_OPERATIVO`; la seguridad real se aplica en servidor.

## Archivos de esta implementación

Modificados:

- `frontend/src/App.tsx`: rutas privadas y entrada aislada.
- `frontend/src/Navbar.tsx`: navegación privada opcional sin cambiar el modo habitual.
- `frontend/package.json`: comando de pruebas de navegador del circuito.
- `frontend/playwright.config.ts`: limita la suite del dashboard a su archivo para separar las pruebas operativas.
- `WHATSAPP-PRUEBA-OPERATIVA-AUDITORIA.md`: enlace de seguimiento.

Agregados:

- `frontend/src/pages/Operativa.tsx`
- `frontend/src/services/operativaService.js`
- `frontend/src/services/operativaService.test.js`
- `frontend/e2e/operativa.spec.ts`
- `frontend/playwright.operativa.config.ts`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/operativa/DatosOperativos.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/operativa/OperativaService.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/operativa/OperativaController.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/operativa/OperativaConfig.java`
- `microservicio-abogados/src/main/resources/application-contacto-operativo-test.properties`
- `microservicio-abogados/src/main/resources/db/operativa-v1.sql`
- `microservicio-abogados/src/test/java/com/abogacia/microservicio_abogados/operativa/DatosOperativosTest.java`
- `microservicio-abogados/src/test/java/com/abogacia/microservicio_abogados/operativa/OperativaConfigTest.java`
- `microservicio-abogados/src/test/java/com/abogacia/microservicio_abogados/operativa/LexiOperativaTest.java`
- `docker-compose.contacto-operativo-test.yml`
- `docker/contacto-operativo-test/init/10-schema.sql`
- `docker/contacto-operativo-test/frontend.Dockerfile`
- `docker/contacto-operativo-test/nginx.conf`
- `docker/contacto-operativo-test/api.test.mjs`
- `docker/contacto-operativo-test/isolation.test.mjs`
- `scripts/dev/Preparar-ContactoOperativo.ps1`
- `WHATSAPP-PRUEBA-OPERATIVA.md` (este documento)

Además se generaron secretos técnicos locales fuera del repositorio, `.env` ignorado y artefactos de prueba/compilación ignorados. No se incorporaron datos personales reales en ninguno de esos archivos.

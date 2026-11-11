# WhatsApp con cuentas ABOGADO y CIUDADANO

Esta es la guía vigente. Sustituye los circuitos anteriores de campañas, invitaciones y perfiles locales independientes.

## Entrar como abogado y cargar los datos

1. Abrir **http://localhost:5182/iniciar-sesion** y seleccionar **Abogado**.
2. Usar `abogado.prueba@abogacia.local`. La contraseña aleatoria está en `C:\Users\Usuario\abogacIa\.private-contacto-operativo\password-cuentas.txt`, fuera del repositorio. Abrir ese archivo localmente; no compartirlo ni pegarlo en documentación o logs.
3. El login habitual emite el JWT del servicio de autenticación y abre `/`, el **Dashboard del Abogado**. Pulsar **«Mi perfil»**.
4. En la sección **«Cuenta de prueba — matrícula no verificada»**, ingresar el DNI propio sin puntos y pulsar **«Guardar DNI cifrado»**. No se verifica con Didit ni se vuelve a mostrar completo.
5. En **«Contacto por WhatsApp»**, completar **«Celular para WhatsApp»** con el número propio, en formato `+54 9` seguido de área y número sin `0` ni `15`, y pulsar **«Guardar celular de WhatsApp»**. Este guardado actualiza el mismo perfil y no exige completar ni editar sus demás campos. Esperar la confirmación «Celular guardado correctamente».
6. Activar **«Recibir consultas por WhatsApp»**. Está desactivado por defecto. La cuenta exige DNI declarado y celular válido antes de activarlo. Cambiar el celular o volver a guardar el DNI revoca el permiso anterior.
7. Cerrar sesión desde el menú de usuario y volver a entrar permite comprobar la persistencia. La matrícula `PRUEBA-961001` es automática y no editable.

Si la opción no se puede marcar, la misma sección explica qué falta: celular sin guardar o inválido, DNI de prueba pendiente o edición general del perfil en curso. Guardar o cancelar la edición general habilita la gestión de WhatsApp. Didit pendiente y matrícula ficticia no bloquean por sí solos a una cuenta de prueba explícita del runtime aislado. Para un profesional real se sigue exigiendo habilitación vigente.

El permiso muestra una confirmación de guardado y puede revocarse aunque el perfil deje de cumplir condiciones para activarlo. El backend vuelve a validar los requisitos en cada activación y cada preparación de contacto; la disponibilidad que muestra el checkbox no sustituye esa validación.

La segunda cuenta `abogado.otro@abogacia.local` permite comprobar el aislamiento entre titulares; usa la contraseña local del mismo archivo y tiene matrícula `PRUEBA-961002`. Empieza sin DNI, celular ni autorización. Ninguna cuenta se usa como destinatario real hasta que su titular carga sus datos y autoriza el contacto.

Los perfiles profesionales reales conservan su registro, verificación Didit, validación de matrícula y login habituales. Desde **«Mi perfil»** pueden modificar el celular y autorizar/revocar WhatsApp. La excepción de las cuentas de prueba no se aplica a otros registros.

## Entrar como ciudadano y contactar

El catálogo y **todo el chat de Lexi, incluida la orientación y las recomendaciones**, se pueden usar sin iniciar sesión. Cada tarjeta conserva el botón «Contactar»; cuando el contacto está disponible, pulsarlo como visitante abre el login, sin mostrar campos del formulario. Tras ingresar como CIUDADANO se abre el mismo `FormularioContacto` para el abogado elegido. Solo se conserva temporalmente su referencia, sin datos personales ni números de destino. Al cerrar sesión el formulario vuelve a ocultarse y el catálogo sigue visible. Si el abogado no habilitó el contacto, la tarjeta muestra el botón deshabilitado y «Contacto no disponible».

1. Cerrar la sesión del abogado o abrir otra ventana privada.
2. Abrir **http://localhost:5182/iniciar-sesion**, seleccionar **Ciudadano** y entrar con `ciudadano.prueba@abogacia.local` y la contraseña del archivo local indicado arriba. Es una cuenta sintética del microservicio de ciudadanos aislado; no se utiliza el DNI real del abogado para crearla.
3. **Catálogo:** desde el Home, buscar **«Abogado de prueba 1»** —o el nombre guardado en su perfil— y pulsar **«Contactar»**. No se redirige a Lexi.
4. **Lexi:** abrir **«Consultar a Lexi»** en el mismo Home. Para la especialidad inicial Derecho Laboral, consultar por ejemplo «Me despidieron sin causa». Tras la orientación, pulsar **«Sí, ver abogados»**, seleccionar la misma cuenta y pulsar **«Contactar»**. Si se cambió la especialidad en el perfil, utilizar una consulta correspondiente. No incluir datos personales del registro en el chat.
5. Ambos caminos abren **el mismo `FormularioContacto`**. Completar nombre, teléfono del ciudadano y resumen editable. Revisar la vista previa, aceptar compartir esos datos y pulsar **«Abrir WhatsApp»**. Si el navegador bloquea la ventana, usar **«Continuar en WhatsApp»**.
6. Confirmar el destinatario en WhatsApp y pulsar **«Enviar» allí**. Comprobar la recepción en el celular registrado. Para una prueba real conviene usar otra cuenta de WhatsApp como remitente.

El número de destino se obtiene del ID del abogado seleccionado en el backend; el ciudadano no puede imponerlo. El mensaje no incluye DNI, matrícula ni datos de Didit. Editar el mensaje o elegir otro destinatario invalida el consentimiento. Abrir el enlace no acredita envío ni entrega. Revocar WhatsApp bloquea nuevas preparaciones, pero no puede retirar enlaces ya obtenidos ni mensajes enviados por fuera de la plataforma.

## Arquitectura y protección

- Se reutilizan el frontend React/Vite, el login y JWT existentes, `abogados_registrados`, el dashboard, el perfil, el catálogo, las recomendaciones, la normalización argentina y la preparación de `wa.me`.
- La cuenta de prueba es un registro profesional con contraseña BCrypt, rol ABOGADO y matrícula permanente `PRUEBA-…`. `REGISTRADO` habilita la cuenta técnica local; no equivale a habilitación profesional. Sus indicadores de identidad y matrícula permanecen no verificados, sin aprobación Didit ni evidencia de padrón falsa.
- DNI y celular reales se almacenan con AES-256-GCM en `operativa.cuenta_prueba`, una extensión con clave primaria y foránea al **mismo `id_abogado`**. No contiene otro nombre, especialidad ni perfil independiente. El registro principal conserva únicamente un marcador técnico de DNI y de celular cifrado. La autorización usa `whatsapp_autorizacion`, vinculada al mismo ID profesional.
- El backend toma al titular del JWT validado. Las escrituras no aceptan un ID elegible por el cliente. El DNI completo no se devuelve; el teléfono completo se devuelve únicamente al titular para editar su propio perfil y al preparar el enlace consentido. Las listas muestran solo una máscara.
- Solo el formulario y la preparación del contacto requieren sesión/JWT CIUDADANO. El catálogo, la orientación y las recomendaciones de Lexi son públicos. Las cuentas de prueba solo se incorporan al catálogo y las recomendaciones de la ejecución aislada, identificadas como tales. Los caminos profesionales de producción excluyen explícitamente matrículas `PRUEBA-`, incluso si se alteraran indicadores de verificación.
- `ABOGADOS_CUENTAS_PRUEBA_ENABLED` está desactivado por defecto. Activarlo fuera de la combinación exacta de perfil, base, usuario y configuración aislados impide arrancar. Se rechazan perfiles de producción, perfiles combinados, DDL automático, Didit habilitado y los circuitos locales anteriores. Los JWT aislados se firman con la clave exclusiva del proyecto.
- La ejecución conserva el puerto de acceso únicamente en `127.0.0.1:5182`; los servicios y PostgreSQL no publican puertos. Autenticación usa Basic interno hacia los microservicios, como en la aplicación existente. No exponer este Compose mediante túneles ni reutilizar sus credenciales en otro entorno.
- No hay WhatsApp Business Platform ni envío automático. No se cambió el workflow de n8n ni el RAG. El relay local de orientación admite visitantes, conserva el control de origen y los límites de entrada, y no agrega datos del perfil ni JWT a la consulta. También bloquea consultas que contengan los datos personales registrados.

## Retiro y respaldo del código anterior

Se revisaron las dependencias y se creó un respaldo completo antes del cambio: `C:\Users\Usuario\abogacIa\.private-contacto-operativo\respaldo-previo-cuentas.dump`. Debe conservarse también la clave de cifrado externa para recuperar los datos históricos.

Los perfiles anteriores, tanto los de campañas como los locales independientes, permanecen almacenados y cifrados. No se asignaron automáticamente a una cuenta: su titular debe cargar sus datos desde la interfaz autenticada. No se eliminaron tablas ni volúmenes ni se sobrescribieron datos personales. Se verifica su integridad mediante conteos y huellas de los ciphertexts antes y después de las pruebas.

El Home ya no importa ni renderiza `PerfilLocal.tsx`, que se retiró tras el respaldo y la revisión. `/prueba-operativa` no tiene página propia ni acceso visible. Los endpoints de desarrollo y del circuito anterior responden 404 en el proxy. Sus clases históricas quedan inactivas por configuración; no se necesita borrar sus tablas para retirar la experiencia.

## Base y ejecución aisladas

Se aplicó explícitamente `cuentas-autenticadas-v1.sql`, idéntico a `docker/contacto-operativo-test/init/40-cuentas-autenticadas.sql`, con comprobación transaccional de `contacto_operativo_test` y propietario `operativa_owner`.

La migración agrega la extensión cifrada de la cuenta, las tablas vacías del dashboard y el esquema privado `ciudadanos_cuenta`, con su usuario limitado. No modifica bases habituales. La semilla de desarrollo crea cuentas vacías solo si no existen y nunca sobreescribe datos al reiniciar.

El proyecto sigue siendo `abogacia-contacto-operativo-test`. Incluye sus propios `postgres-operativa`, `abogados-operativa`, `ciudadanos-operativa`, `auth-operativa` y `frontend-operativa`. Se actualizaron únicamente sus servicios de aplicación; PostgreSQL y su volumen se conservaron. Los proyectos habituales, EP06, `abogados-dev`, el entorno de dashboard separado, n8n y RAG no se modificaron ni reiniciaron.

## Pruebas

### Conectividad real de Lexi

El relay aislado usa explícitamente HTTP/1.1 para llamar al webhook existente de n8n. La negociación h2c del cliente Java dejaba la solicitud sin respuesta hasta agotar la espera, aunque una llamada HTTP/1.1 directa funcionara. Se agregó `OrientacionCuentaControllerTest` con un servidor que rechaza upgrades h2c y comprueba que no se reenvíen JWT ni datos del perfil.

`playwright.lexi-live.config.ts` comprueba chat del Home y orientación/recomendaciones **sin login**, usando el workflow real sin mocks. Es optativa: requiere `LEXI_LIVE_TEST=true` porque invoca el workflow con una consulta sintética. No se modifican el workflow ni el RAG.

Se verifican login normal de ambos roles, dashboard como Home ABOGADO, DNI y celular desde el perfil, persistencia al reingresar, catálogo y recomendaciones con IDs profesionales, mismo formulario en ambos recorridos, destinatarios distintos según selección, consentimiento y edición, revocación y cambio de número, números inválidos, cifrado, aislamiento entre titulares, rechazo de JWT inválidos, ausencia de datos sensibles en listas/mensajes y bloqueo de la excepción en producción.

La batería de navegador incluye cinco escenarios y comprobaciones responsive a 360, 768 y 1440 píxeles. Intercepta WhatsApp para no enviar mensajes y simula únicamente la respuesta de orientación de Lexi; el resto del recorrido usa los servicios y PostgreSQL reales aislados. La entrega real debe confirmarse manualmente siguiendo los pasos anteriores.

La validación original aprobó 157 pruebas de abogados, 56 de ciudadanos, 64 unitarias frontend, 13 verificaciones API/aislamiento y 5 escenarios de navegador. La corrección posterior del checkbox amplía la batería backend a 161 pruebas y agrega `WhatsAppPerfilTest` y `playwright.whatsapp-checkbox.config.ts` para reproducir el caso de DNI cargado sin celular, guardado dedicado, activación, persistencia, revocación y contacto desde catálogo y Lexi.

La regresión específica del checkbox crea una cuenta sintética temporal independiente y no utiliza ni modifica el DNI o celular del usuario. Su limpieza verifica identidad técnica y contenido sintético antes de retirar únicamente esa cuenta. No debe ejecutarse la batería original que vacía campos de las cuentas iniciales cuando ya se ingresaron datos reales.

La regresión `playwright.catalogo-publico.config.ts` usa otra cuenta temporal sintética para comprobar catálogo anónimo, ausencia de formulario antes del login, rechazo HTTP 401 del endpoint sin JWT, continuación del abogado seleccionado tras el login, enlace correcto de WhatsApp interceptado y cierre del formulario al salir. `CatalogoVisitanteTest` verifica la visibilidad local y la ausencia de una excepción de prueba en el catálogo de producción.

Las pruebas API y de navegador se niegan a correr si ya hay DNI o celular cargados en las cuentas de prueba. Su limpieza comprueba que los datos sean exactamente sintéticos antes de vaciar solo esos campos de las dos cuentas conocidas; no elimina cuentas ni datos históricos. No volver a ejecutar estas pruebas sobre los datos reales del usuario.

## Archivos principales

Nuevos: `operativa/CuentasPruebaConfig.java`, `CuentaPruebaService.java`, `SembrarCuentasPrueba.java`, `OrientacionCuentaController.java`; `resources/db/cuentas-autenticadas-v1.sql`; `docker/contacto-operativo-test/init/40-cuentas-autenticadas.sql`; `operativa/CuentasPruebaTest.java`; `microservicio-ciudadanos/config/CuentasAisladas.java` y `application-cuentas-contacto-test.properties`; `docker/contacto-operativo-test/cuentas.test.mjs`; esta guía.

Modificados: `ValidarCredencialesAbogadoController`, `PerfilAbogadoController`, `CatalogoAbogadosController`, `RecomendacionesController`, `DashboardController`, `ProfesionalContactable`, `ContactoWhatsAppController`, `RecomendarAbogadosGestor`, `SecurityConfig` y `application.properties` de abogados; `App.tsx`, `Home.tsx`, `LawyerDashboard.tsx`, `LawyerProfile.tsx`, `RecomendacionesLexi.tsx`, `FormularioContacto.tsx`, los servicios frontend de autenticación, contacto, abogados, ciudadanos y transporte de orientación, sus pruebas y `e2e/operativa.spec.ts`; Compose, Dockerfile frontend, proxy nginx, pruebas de aislamiento y `scripts/dev/Preparar-ContactoOperativo.ps1`. Eliminado: `frontend/src/PerfilLocal.tsx`.

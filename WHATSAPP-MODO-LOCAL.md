# WhatsApp integrado en el Home — desarrollo local

> Versión histórica retirada. La guía vigente es [WHATSAPP-CUENTAS-AUTENTICADAS.md](WHATSAPP-CUENTAS-AUTENTICADAS.md). Ya no existe el formulario local del Home: los datos se cargan desde «Mi perfil» tras iniciar sesión como ABOGADO.

El catálogo y las recomendaciones de Lexi usan `FormularioContacto` y el mismo endpoint de preparación. No hay campañas, invitaciones, organizadores ni participantes en la aplicación en ejecución. No se creó otro catálogo ni otro chat.

## Uso

1. Abrir **http://localhost:5182/**. Es el Home de la aplicación principal compilado contra servicios y PostgreSQL aislados.
2. Desplegar **«Desarrollo local — mi perfil de prueba»**, en el mismo Home. Es configuración del desarrollador; el ciudadano no necesita abrirla.
3. Ingresar nombre visible o alias, DNI propio sin puntos, celular propio en formato `+54 9` seguido de área y número sin `0` ni `15`, y especialidad. Confirmar titularidad y permiso de contacto; pulsar **«Guardar perfil local cifrado»**. No escribir estos datos en archivos ni compartirlos por el chat.
4. Se genera una matrícula `PRUEBA-…` automáticamente. El perfil se muestra como **«Perfil de prueba — matrícula no verificada»** e **«Identidad declarada; no verificada por Didit»**. No crea cuenta profesional, JWT de abogado, aprobación de Didit ni habilitación de matrícula.
5. Desde el catálogo habitual, seleccionar ese nombre y pulsar **«Contactar»**. No se redirige a Lexi.
6. Para el otro recorrido, abrir **«Consultar a Lexi»**, plantear una consulta de la especialidad elegida y pulsar **«Sí, ver abogados»**. Por ejemplo, para Derecho Laboral: «Me despidieron sin causa. Quiero una orientación inicial». Seleccionar el mismo perfil y pulsar **«Contactar»**. Se usa el chat y el sistema de recomendaciones existentes. Una consulta que se clasifique en otra especialidad puede no recomendar ese perfil.
7. En cualquiera de los dos recorridos, completar nombre y teléfono del ciudadano y el resumen editable. Revisar la vista previa y aceptar el consentimiento para compartir esos datos. Pulsar **«Abrir WhatsApp»**. Si el navegador bloquea la ventana, utilizar **«Continuar en WhatsApp»**.
8. WhatsApp abre el número registrado en el perfil seleccionado. El ciudadano debe pulsar **«Enviar» allí**. Confirmar la recepción mirando el WhatsApp destinatario; conviene usar otra cuenta como remitente. La plataforma no puede confirmar envío ni entrega al abrir un enlace.

El permiso de contacto se puede revocar y reactivar desde el mismo desplegable del Home. Revocar bloquea nuevas preparaciones, incluso desde una tarjeta abierta anteriormente. No retira enlaces que alguien ya haya obtenido ni mensajes enviados fuera de la aplicación. El registro evita sobrescribir un perfil existente: hay un único perfil local por base de ejecución. No se borran datos para permitir repetir el registro.

Un ciudadano puede abrir otra ventana o navegador en este mismo equipo y usar directamente el catálogo y Lexi, sin códigos ni pasos adicionales.

Para un abogado profesional real sigue vigente **«Mis datos» → «Permitir que los ciudadanos me contacten por WhatsApp»**. El permiso está desactivado por defecto y solo puede cambiarlo el titular autenticado; habilitarlo exige celular válido y habilitación profesional vigente. Cambiar el celular revoca el permiso previo. Estas reglas no se relajan para el perfil local.

## Datos y límites del entorno

El perfil local se guarda en `operativa.perfil_local`, separado de `abogados_registrados`: UUID, nombre visible, especialidad, matrícula de prueba generada, fecha, permiso y DNI/celular cifrados mediante AES-256-GCM con datos autenticados por campo y UUID. La clave permanece fuera del repositorio, montada como secreto. El nombre y la especialidad se muestran en este Home local; DNI y celular no se vuelven a mostrar completos. El enlace de WhatsApp necesariamente revela el destino a quien aceptó preparar el contacto.

Las listas devuelven solo una máscara del celular, nunca DNI ni matrícula de prueba. El formulario envía una referencia `{tipo,id}`. El backend obtiene el número y comprueba permiso, tipo de perfil, habilitación cuando corresponde y coincidencia exacta del mensaje consentido. Rechaza números de destino arbitrarios, referencias antiguas, mensajes con los datos identificatorios del destinatario y campos desconocidos. Seleccionar otro perfil o editar el texto invalida el consentimiento.

No se persisten los datos del formulario del ciudadano ni el texto de sus consultas en este módulo. El relay de orientación conserva el contrato original `{chatInput}` y no agrega DNI, celular ni matrícula del registro. Se bloqueará una consulta que contenga los datos personales registrados. El workflow original de n8n y el RAG no se modificaron.

El modo local está **desactivado por defecto** en el código principal. Solamente el Compose aislado establece `ABOGADOS_DESARROLLO_LOCAL_ENABLED=true` y el frontend `VITE_CONTACTO_LOCAL=true`. Una guarda de arranque rechaza producción, perfiles combinados, cualquier base/usuario diferentes de `contacto_operativo_test`/`operativa_runtime`, DDL automático, credenciales Didit y configuraciones incompatibles. Exige el perfil exclusivo `contacto-operativo-test` y el marcador `aislado-loopback`. Activar solamente la variable en otro despliegue hace fallar el arranque.

El frontend se publica únicamente en `127.0.0.1:5182`. Los endpoints locales validan Host; las escrituras y orientación exigen Origin local y rechazan navegación cruzada. No se publican puertos del backend ni PostgreSQL. Es un entorno confiable para quien usa este equipo: cualquier persona con acceso al Home local puede gestionar su configuración de desarrollo. No abrir el puerto mediante túneles ni exponer este Compose a Internet.

## Conservación del circuito anterior

Antes del cambio se revisaron sus dependencias y se creó un respaldo completo de la base aislada en `C:\Users\Usuario\abogacIa\.private-contacto-operativo\respaldo-previo-modo-local.dump`, fuera del repositorio. Para recuperarlo también debe conservarse la clave de cifrado existente, sin versionarla ni compartirla.

Los 32 perfiles históricos estaban inactivos. Se preservan sus filas y sus campos cifrados en las tablas anteriores. No se copiaron automáticamente al catálogo: no se puede asumir cuáles corresponden a datos personales ni consentir por su titular. Se comparan conteo y huella de sus ciphertexts antes y después de las pruebas. No hubo eliminación de tablas ni de datos históricos.

Las pantallas `AccesoPruebaHome.tsx` y `pages/Operativa.tsx` se retiraron después de comprobar que no tenían datos personales embebidos y eliminar sus importaciones y rutas. `/prueba-operativa` ya no tiene página propia ni acceso visible; se trata como cualquier ruta desconocida. Los endpoints antiguos responden 404 en el proxy y la cadena de seguridad los deniega en el backend. Las clases y SQL históricos permanecen archivados, fuera del flujo activo; no es necesario eliminarlos para usar la nueva experiencia.

## Migración y ejecución

Se aplicó exclusivamente `microservicio-abogados/src/main/resources/db/perfil-local-v1.sql`, idéntico a `docker/contacto-operativo-test/init/30-perfil-local.sql`. La transacción comprueba explícitamente nombre de base y propietario antes de crear la tabla local. No altera tablas profesionales ni ejecuta conversiones de datos. No usa Hibernate para crear esquemas.

Se actualizaron únicamente `abogados-operativa` y `frontend-operativa` del proyecto `abogacia-contacto-operativo-test`, usando `up -d --no-deps`. PostgreSQL y su volumen se conservaron. No se reconstruyeron ni reiniciaron otros proyectos. No se autoriza despliegue en bases habituales.

## Validación

- Backend: 152 pruebas aprobadas, incluyendo nuevas guardas de producción, controles de origen y relay de orientación contra servidor HTTP sintético.
- Frontend: 64 pruebas unitarias aprobadas.
- API/PostgreSQL y aislamiento: 11 verificaciones aprobadas; cubren profesionales, permisos del titular, número correcto por selección, revocación, pérdida de habilitación, consentimiento, números inválidos, cifrado, perfil local sin sesiones y rechazo del circuito anterior.
- Navegador: cuatro escenarios de catálogo, Lexi, revocación/otra ventana sin invitación y navegación sin circuito separado. Comprobación responsive a 360, 768 y 1440 píxeles.
- TypeScript, lint y compilación del frontend y microservicio.

Las pruebas usan datos sintéticos e interceptan la navegación a WhatsApp y la respuesta de orientación en el navegador. No enviaron mensajes ni comprobaron recepción real ni ejecutaron el workflow de producción. El contrato del relay sí se verifica con un servidor de prueba. La prueba final de entrega requiere el envío manual del usuario.

Las pruebas de integración se niegan a ejecutarse cuando ya hay un perfil local registrado. Su limpieza elimina únicamente el UUID y nombre sintéticos creados por esa ejecución; no vacía tablas ni modifica perfiles personales.

## Archivos de esta corrección

Nuevos: `operativa/DesarrolloLocalConfig.java`, `PerfilLocalService.java`, `PerfilLocalController.java`; `resources/db/perfil-local-v1.sql`; `docker/contacto-operativo-test/init/30-perfil-local.sql`; `frontend/src/PerfilLocal.tsx`; `operativa/DesarrolloLocalTest.java`; esta guía.

Modificados en el backend: `contacto/ContactoWhatsAppController.java`, `controller/CatalogoAbogadosController.java`, `controller/RecomendacionesController.java`, `operativa/OperativaConfig.java`, `OperativaController.java`, `OperativaService.java` y `application.properties`.

Modificados en frontend: `App.tsx`, `pages/Home.tsx`, `services/contactoService.js`, `services/contactoService.test.js`, `services/abogadoService.js` y `e2e/operativa.spec.ts`. Eliminados: `AccesoPruebaHome.tsx` y `pages/Operativa.tsx`.

Ejecución/pruebas/documentación: `docker-compose.contacto-operativo-test.yml`, `docker/contacto-operativo-test/frontend.Dockerfile`, `nginx.conf`, `api.test.mjs`, `isolation.test.mjs` y avisos de sustitución en las guías anteriores. El `FormularioContacto` compartido y las validaciones habituales de Didit/matrícula se conservaron.

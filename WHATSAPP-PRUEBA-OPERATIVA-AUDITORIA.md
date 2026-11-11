# Auditoría y propuesta: contacto real por WhatsApp en prueba controlada

> Implementación vigente: [WHATSAPP-CUENTAS-AUTENTICADAS.md](WHATSAPP-CUENTAS-AUTENTICADAS.md). Los circuitos de esta auditoría histórica fueron retirados de la experiencia de usuario.

> Auditoría histórica. El alcance vigente está implementado y documentado en [WHATSAPP-MODO-LOCAL.md](WHATSAPP-MODO-LOCAL.md), sin campañas ni invitaciones.

Seguimiento: implementación autorizada posteriormente y preparada en el mismo código de aplicación. Ver `WHATSAPP-PRUEBA-OPERATIVA.md` para acceso privado, pruebas, archivos y límites. Este informe conserva la auditoría original.

Fecha: 10/11/2026. Estado: pendiente de autorización para implementar. Esta auditoría no cambia código de aplicación, esquemas, datos, contenedores o workflows; solo agrega este informe. No se recibieron ni ingresaron DNI o teléfonos reales, ni se abrió WhatsApp. La revisión se limita al código y configuración versionados, sin consultar datos ni secretos en ejecución. Los cambios anteriores del dashboard se conservaron.

## Conclusión

Es viable probar la entrega real mediante click-to-chat de WhatsApp, conservando el frontend principal y el microservicio de abogados. Se necesita un circuito de **perfil operativo de prueba** separado del registro profesional y del catálogo de ficticios. No corresponde habilitar una cuenta profesional ni aprobar Didit o padrón para permitir esta prueba.

La etiqueta obligatoria será **«Perfil de prueba operativa — matrícula no verificada»**. Otra indicación visible: **«Identidad declarada por el participante; no verificada por Didit»**. Un DNI ingresado no demuestra identidad, una matrícula ficticia no demuestra habilitación y un teléfono bien formado no demuestra titularidad ni que tenga WhatsApp.

## Qué existe hoy

| Parte | Archivos / comportamiento observado | Limitación para esta prueba |
| --- | --- | --- |
| Registro inicial | `RegistrarAbogadoGestor.iniciar`, `IniciarSolicitudRequest`, `RegisterLawyer.tsx`: recibe DNI, correo y celular, crea una solicitud PENDIENTE y token temporal | Es alta profesional, no perfil operativo |
| DNI | 7 u 8 dígitos; único en `abogados_registrados`; almacenado como texto | Validar formato no acredita identidad |
| Teléfono | `nroCelular`, texto de hasta 30 caracteres en el DTO inicial | No hay normalización argentina ni prueba de titularidad/WhatsApp |
| Progreso del registro | `RegisterLawyer.tsx` guarda paso, DNI, correo y teléfono en `sessionStorage` | No reutilizar esa persistencia para el circuito operativo con datos reales |
| Didit | `VerificarDniAbogadoGestor`: compara DNI; nombre y datos personales provienen del documento aprobado | El paso de completar cuenta exige APROBADA; esta prueba no debe ejecutar ni falsificar esa verificación |
| Matrícula | `CompletarRegistroRequest`, `ValidarMatricula`: formato provisional y cotejo con evidencia del padrón | Una inexistente/inactiva/DNI distinto se rechaza; pendiente de revisión no habilita la cuenta |
| Habilitación | `actualizarEstado` exige contraseña, correo confirmado, DNI APROBADA y matrícula VALIDADA | No convertir la prueba en REGISTRADO ni modificar estas condiciones |
| Login profesional | `ValidarCredencialesAbogadoController`: repite condiciones y consulta padrón vigente | No dar JWT ABOGADO mediante una excepción de prueba |
| Recomendaciones normales | GET público `/api/abogados/recomendaciones`, `RecomendarAbogadosGestor` y `AbogadoRepository`: cuentas habilitadas, verificaciones y padrón vigente; excluye dominios reservados | No incluir el perfil operativo aquí ni confiar solo en ocultarlo con React |
| Recomendaciones de demostración | `RecomendacionesPrueba`, perfil `abogados-dev`, tabla `abogacia_dev.perfiles_prueba`: IDs negativos, sin contacto ni DNI | No asignarles números reales ni reutilizarlos como destinatarios |
| Guardas de demostración | `AbogadosDevConfig`: exige perfil, URL, usuario y opciones exactas; conexión/runtime de lectura | No modificar ese entorno para cargar datos personales |
| Lexi | `lexiService.js` llama a `/api/lexi/orientacion`; `lexiConversation.js` ofrece recomendaciones tras responder y clasifica las palabras del ciudadano | El enlace entre especialidad y recomendaciones está en React; no hace falta cambiar prompt, workflow ni RAG |
| Clasificación | Reconoce Laboral, Consumidor y Civil; si hay ambigüedad devuelve null | Hay diferencias con la lista de registro (por ejemplo Consumidor); para la primera prueba conviene Laboral o Civil, sin inventar categorías |
| Contacto | `ContactoPrueba.tsx`, `contactoPrueba.js`: solo `perfilPrueba`, formulario y vista previa; exige confirmar el mensaje exacto | `simularContacto` no accede a red, navegación ni almacenamiento y no usa número de destino |
| Consentimiento | Casilla no preseleccionada, se invalida al editar datos; cierre descarta formulario | El texto autoriza únicamente simulación; debe existir consentimiento diferente para compartir realmente |
| Mensaje actual | Nombre y teléfono del ciudadano, descripción y resumen de consulta/orientación, con advertencia de simulación | No es un enlace WhatsApp; texto y acción deben diferenciar contacto real de demo |
| Pruebas | Tests de registro/Didit/padrón/recomendaciones y `contactoPrueba.test.js` | Los tests actuales exigen expresamente que la demo no abra WhatsApp; se deben conservar |

El registro inicial puede reemplazar/eliminar solicitudes profesionales incompletas con DNI/correo coincidentes. Por eso **no se debe probar con el DNI real sobre ese endpoint habitual**, aun si después se piensa dejar la cuenta pendiente.

El correo de desarrollo escribe correo y código de confirmación en consola. El nuevo circuito no lo utilizará para cargar datos reales. No se inspeccionaron logs existentes ni se ejecutó ninguna prueba con información personal.

## Modificaciones propuestas

### Mismo producto, circuito y ejecución controlados

- Agregar en el React/Vite actual una opción/ruta privada `/registro-abogado/prueba-operativa`, reutilizando layout, campos, estilos y aviso de privacidad apropiado. No abrir una aplicación distinta ni un repositorio paralelo.
- Implementar el backend en el microservicio de abogados actual con perfil exclusivo `contacto-operativo-test`, deshabilitado por defecto y rechazado si apunta a las bases habituales, dashboard, EP06 o abogados-dev. SQL explícito y validación, sin `ddl-auto=update`.
- Ejecutar ese mismo código en un proyecto/base/volumen nuevos, de acceso local o red privada autorizada. No modificar datos ni configuración de los entornos existentes. Para conectar Lexi, reutilizar su endpoint existente mediante un proxy limitado a orientación, sin cambiar n8n ni RAG. La URL y topología concreta deben verificarse antes del arranque; el entorno de dashboard actual no expone Lexi y no basta para esta prueba.
- La exposición a otro dispositivo requerirá URL privada/HTTPS y acceso de participantes. No publicar el perfil o la pantalla de alta abiertamente para facilitar la prueba.

### Registro del perfil

1. El organizador inicia una sesión de operador de prueba, separada de ABOGADO y con permisos solo sobre esta campaña. Credenciales locales nuevas; ningún token en URLs, repositorio o código.
2. La pantalla recibe nombre o alias, DNI real, celular real, especialidad de prueba y consentimiento del destinatario para recibir contactos durante esta campaña. DNI y teléfono se ingresan únicamente en esa interfaz privada y no pasan por Lexi.
3. El backend valida el formato del DNI y del número y muestra teléfono normalizado/enmascarado para revisión. No consulta Didit ni agrega evidencia al padrón. Matrícula generada con prefijo inequívoco `PRUEBA-...`, fuera del formato profesional, guardada solo como dato ficticio.
4. Se crea un perfil operativo, sin fila en `abogados_registrados`, sin estado profesional REGISTRADO, sin cuenta ABOGADO y sin privilegios del dashboard profesional. Si se necesita administrar el perfil, se usa la sesión del operador, no el login de un abogado habilitado.
5. Se permite seleccionar ese perfil exclusivamente desde una sesión de participante autorizada para la campaña vigente y tras activar la prueba desde servidor. Un parámetro `?prueba=true` o bandera VITE no habilita acceso.
6. El organizador confirma manualmente que el número corresponde a su WhatsApp. La recepción desde una segunda cuenta demuestra entrega al destino, pero no verifica jurídicamente identidad o matrícula.

Si se pretendiera además iniciar sesión como ABOGADO con esa matrícula ficticia, eso sería un alcance diferente e incompatible con mantener el login profesional sin excepciones. La prueba de contacto propuesta no lo requiere.

### Modelo mínimo, sujeto a aprobación

Propuesta de una tabla propia `perfil_prueba_operativa` en una base nueva. Sin FK ni importación desde cuentas profesionales ni desde los ficticios existentes.

| Campo | Tipo propuesto / finalidad |
| --- | --- |
| id | UUID, PK |
| campania_id | UUID; campaña controlada |
| operador_subject | varchar(128); titular técnico autorizado |
| nombre_visible | varchar(100); nombre declarado o alias |
| dni_cifrado | bytea; DNI ingresado, cifrado autenticado, solo recuperable por el operador |
| telefono_cifrado | bytea; destino internacional cifrado, revelado solo al preparar contacto autorizado |
| version_clave | varchar(32); identifica clave de cifrado local, sin guardar la clave |
| especialidad | varchar(100); valor real del dominio existente utilizado para la prueba |
| matricula_prueba | varchar(64), UNIQUE; prefijo PRUEBA, nunca enviado al padrón |
| tipo_perfil | varchar(32), CHECK fijo PRUEBA_OPERATIVA |
| identidad_estado | varchar(32), CHECK DECLARADA_NO_VERIFICADA |
| matricula_estado | varchar(32), CHECK FICTICIA_NO_VERIFICADA |
| activo | boolean, desactivado por defecto hasta confirmar campaña |
| creado_en / vence_en | timestamptz; vencimiento obligatorio de la prueba |
| consentimiento_contacto_en | timestamptz; consentimiento del destinatario |
| aviso_version | varchar(32); versión de información aceptada |

Los permisos de campaña/participante se validan en una sesión de prueba firmada, con vencimiento y alcance; las credenciales se configuran localmente fuera del bundle. No se diseñará un formulario público que permita agregar números de terceros sin control. Cifrado con clave local protegida, separada del volumen de datos y ausente del repositorio; no basta con ignorar un archivo si es públicamente accesible. No usar un hash simple de DNI como sustituto del cifrado: el espacio de valores es enumerable.

La persistencia del DNI no es necesaria para que funcione wa.me, pero se propone cifrada porque el objetivo incluye registrarlo. No pedir foto del documento, biometría, domicilio, nacimiento ni datos de Didit. Debe quedar explícito que ese DNI es declarado. La conservación propuesta se limita a la campaña (por ejemplo 24 horas, a confirmar); vencer bloquea acceso pero **no elimina automáticamente los datos ni copias de respaldo**. El borrado posterior se prepara como operación separada, acotada y autorizada.

### Endpoints propuestos

Dentro del servicio existente, con nueva cadena de seguridad exclusiva para el modo operativo:

- POST `/api/pruebas-operativas/perfiles`: crear por el operador; nunca por registro público.
- GET `/api/pruebas-operativas/perfiles/me`: datos de administración del operador; DNI y teléfono enmascarados.
- GET `/api/pruebas-operativas/recomendaciones`: solo participante autorizado de la campaña; especialidad y perfil activo/no vencido; sin DNI, matrícula ficticia ni teléfono completo en el listado.
- POST `/api/pruebas-operativas/perfiles/{id}/preparar-contacto`: verificar participante/campaña/perfil/consentimiento y devolver destino para el enlace; sin aceptar un número arbitrario del cliente, sin enviar mensajes y sin guardar el contenido de la consulta.
- POST `/api/pruebas-operativas/perfiles/{id}/desactivar`: solo operador titular; corta futuras recomendaciones y preparación de contacto.

Todas las respuestas privadas: `Cache-Control: no-store`. La autorización de lectura/desactivación verifica titular y campaña. El endpoint normal de recomendaciones conserva sus filtros y no consulta esta tabla. Las rutas operativas quedan ausentes o denegadas fuera del perfil autorizado, incluso si el frontend fuese manipulado.

## Flujo de entrega real mediante WhatsApp

1. Un participante, idealmente desde **otra cuenta de WhatsApp**, conversa con Lexi usando un caso técnico sin datos sensibles. El DNI del perfil y su teléfono no se adjuntan a la consulta.
2. Al aceptar recomendaciones en la sesión controlada se consulta el catálogo operativo autorizado. La tarjeta conserva ambas advertencias de prueba/no verificación. Se omiten sello de validación, matrícula verificada, tratamiento profesional y textos que lo presenten como habilitado.
3. El formulario ofrece nombre y, si se necesita, teléfono de contacto del ciudadano; resumen breve editable. No copiar por defecto descripción extensa e historia completa de Lexi. El teléfono escrito es opcional: WhatsApp ya revela al destinatario la cuenta/número remitente, dato que debe advertirse. Nada se comparte hasta confirmar.
4. Mostrar vista previa final y destinatario enmascarado, explicar que WhatsApp recibirá el texto y que el mensaje saldrá desde la cuenta del participante. Casilla explícita sin preseleccionar; consentimiento ligado a destinatario, texto y campos seleccionados. Cualquier edición, cambio de perfil o cambio de número exige nueva confirmación.
5. Botón **«Abrir WhatsApp con este mensaje»**. Preparar el enlace solo tras autorización del servidor y confirmación vigente. Si la preparación es asíncrona, mostrar después un enlace explícito para abrir, evitando ventanas bloqueadas por el navegador. Usar destino oficial HTTPS, codificación URL del texto y `noopener,noreferrer`.
6. La persona revisa el texto en WhatsApp y presiona **Enviar**. La web informa «Mensaje preparado; confirmá el envío en WhatsApp». Nunca informa «Enviado» o «Entregado» por haber abierto el enlace.
7. El dueño del número confirma la recepción real en su teléfono. Abrir wa.me no acredita entrega y no produce un acuse verificable para abogacIA. Para una prueba representativa no basta con abrir un chat al propio número desde esa misma cuenta.

Formato conceptual: `https://wa.me/<destino_solo_digitos>?text=<mensaje_codificado>`. Celular argentino: `549` + código de área y número local, sin cero troncal, sin prefijo móvil local 15 y sin signos en la URL. No eliminar todas las apariciones de 15: puede ser parte legítima del número. Pedir formato internacional explícito, validar estructura y revisar visualmente; no adivinar un destino a partir de un teléfono ambiguo.

Mensaje mínimo:

```text
Prueba operativa de abogacIA — matrícula no verificada.
Hola, [nombre visible]. Este es un contacto técnico de prueba.
Nombre de quien consulta: [solo si lo autorizó].
Teléfono de contacto: [solo si eligió incluirlo].
Resumen revisado: [texto breve aprobado].
```

No insertar DNI, matrícula ficticia, tokens, códigos, datos de Didit o historia completa de Lexi. Evitar identificadores adicionales en el mensaje. Revisar y bloquear coincidencias con el DNI registrado si apareciera en campos libres; ninguna detección automática garantiza excluir toda información sensible escrita por el ciudadano, por lo que la vista previa y un caso de prueba inocuo siguen siendo necesarios. Establecer límite razonable del texto y explicar si se excede; no truncar silenciosamente lo consentido.

## Datos almacenados y expuestos

- Base operativa: perfil y consentimiento del destinatario según modelo; DNI/teléfono cifrados. No se agregan datos a tablas de abogados reales ni evidencia del padrón.
- Navegador: formulario en memoria; no conservar DNI/teléfono en sessionStorage/localStorage, URLs propias o analítica. La sesión de acceso no debe contener esos datos como claims. Cerrar descarta el borrador.
- Backend: no guardar nombre/teléfono del ciudadano, descripción o resumen para preparar el enlace. Si se requiere trazabilidad, registrar solo perfil/campaña, instante y versión del aviso; esa constancia no prueba entrega.
- WhatsApp: el teléfono de destino aparece necesariamente en wa.me; el texto viaja en el parámetro `text`. El enlace puede quedar en historial del navegador y ser tratado por WhatsApp/Meta antes de pulsar Enviar. No es posible prometer que el número o texto queden secretos para el navegador o WhatsApp. Advertirlo antes de abrir y no registrar enlaces completos.
- Destinatario: al enviar, ve el mensaje y la identidad/número remitente que WhatsApp muestre, aunque no se escriban en el cuerpo. El consentimiento debe abarcar ese efecto.
- Lexi: recibe la consulta técnica del ciudadano mediante el flujo existente. Que React la conserve en memoria no garantiza ausencia de persistencia en ejecuciones de n8n o proveedores. No se auditó aquí su retención y no se enviarán datos del registro a ese flujo.
- Logs y pruebas: no volcar cuerpos, DNI, teléfonos, enlaces o tokens; usar IDs opacos. Pruebas automatizadas con datos sintéticos. En la prueba con datos reales, desactivar trazas HAR, screenshots con campos y grabaciones que pudieran copiarlos al repositorio.

## Paso al entorno habitual: riesgos y controles

El principal riesgo es que un atajo de prueba termine habilitando una cuenta profesional o exponiendo el teléfono personal en recomendaciones públicas. La separación de tabla/perfil/endpoints, guardas de arranque y autorización por campaña evita depender de una etiqueta visual o del dominio del correo. La matrícula PRUEBA no puede mezclarse con números válidos del padrón.

Otros riesgos: exponer la nueva base al host/red, claves cifradas junto a datos, reutilizar `VITE_*` para información privada (queda compilada en JavaScript), copias/fixtures con DNI, sustituir destinatarios desde el navegador, consentimiento desactualizado, texto sensible en el enlace y conservar acceso después de la campaña. Probar explícitamente estos casos y desactivar el perfil al terminar. Ninguna desactivación puede retirar un teléfono/enlace ya revelado o un mensaje ya enviado.

No migrar ni reiniciar backends habituales con `ddl-auto=update` para esta prueba. Una futura integración allí exige autorización específica, respaldo verificable, SQL revisado y plan de reversión; la autorización de esta auditoría no los incluye. No tocar EP06, abogados-dev, dashboard-test, n8n o RAG para cargar el perfil.

## Pruebas propuestas después de autorizar

1. El registro profesional, Didit, padrón, login y recomendaciones públicas conservan sus pruebas y reglas.
2. Modo operativo deshabilitado o base incorrecta: rutas inaccesibles/arranque rechazado; una bandera del cliente no habilita nada.
3. Un participante de otra campaña, anónimo o vencido no lista ni prepara contactos; no puede sustituir ID/destino.
4. No se devuelve DNI; teléfono solo al preparar contacto autorizado; nunca claves/cifrado en DTO públicos.
5. Persistencia cifrada, logs sin datos, ningún dato privado en bundle/fixtures/almacenamiento web; matrícula y Didit jamás verificados.
6. Se conserva la simulación existente sin red; perfiles ficticios existentes no pueden abrir WhatsApp aunque se les inyecte un teléfono.
7. Consentimiento vacío o edición posterior bloquean el enlace; botón/mensaje distinguen abrir, enviar y recibir.
8. Normalización argentina, signos, prefijos ambiguos, caracteres URL, números con 15 legítimo y longitud del mensaje.
9. Navegador responsive y accesible; tests interceptan la navegación externa y no envían WhatsApp automáticamente.
10. Prueba manual final: otro WhatsApp → Lexi real → perfil operativo → formulario → vista previa → wa.me → Enviar manual → recepción en el teléfono real. Conservar como evidencia solo resultado y fecha, sin contenido personal.

## Si se pidiera envío automático

Esta propuesta usa click-to-chat y no necesita una integración de envío por API ni credenciales Business Platform. Automatizar sería otra implementación: alta/configuración de WhatsApp Business Platform (WABA/número emisor), aplicación y permisos, credenciales de servidor, consentimiento de destinatarios, plantillas aprobadas para iniciar conversaciones o fuera de la ventana aplicable de 24 horas, control de costos y webhooks para estados de entrega. Debe revisarse la configuración vigente del número antes de plantear migración o coexistencia con una app existente. Nada de eso se implementará sin autorización específica.

Fuentes oficiales consultadas el 10/11/2026:

- [WhatsApp: click-to-chat](https://faq.whatsapp.com/5913398998672934).
- [WhatsApp: enlaces desde otra aplicación y texto precargado](https://faq.whatsapp.com/425247423114725/).
- [WhatsApp: formato internacional y celulares argentinos](https://faq.whatsapp.com/640432094208718/).
- [Política de mensajes de WhatsApp Business: consentimiento, plantillas y ventana de atención](https://business.whatsapp.com/policy).
- [Meta: colección oficial de WhatsApp Cloud API, WABA, números y tokens](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).

## Decisión pendiente

Autorizar o ajustar este circuito antes de implementar código y crear un entorno nuevo. La autorización posterior para preparar el entorno no implica cargar datos personales sin revisar la pantalla ni enviar un mensaje: DNI/teléfono se introducirán directamente en la interfaz privada y el participante confirmará el envío desde WhatsApp. No se solicita compartirlos en este chat.

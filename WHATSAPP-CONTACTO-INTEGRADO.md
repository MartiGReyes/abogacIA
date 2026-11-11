# Contacto integrado: Home, catálogo y Lexi

> Guía vigente: [WHATSAPP-CUENTAS-AUTENTICADAS.md](WHATSAPP-CUENTAS-AUTENTICADAS.md). Esta versión histórica no debe usarse para acceder ni registrar datos.

> Versión histórica sustituida por [WHATSAPP-MODO-LOCAL.md](WHATSAPP-MODO-LOCAL.md). La ejecución actual no utiliza campañas, invitaciones ni organizadores, y ya no ofrece `/prueba-operativa`. Las instrucciones siguientes se conservan como antecedente.

Implementación actualizada el 10/11/2026. La experiencia del ciudadano utiliza el Home React/Vite existente, su catálogo y su chat de Lexi. Hay un solo componente `FormularioContacto` y un solo endpoint de preparación de WhatsApp en el microservicio de abogados. `/prueba-operativa` queda para configuración privada del organizador.

## URL y prueba con tu propio número

**Home integrado: http://localhost:5182/**. No redirige a `/prueba-operativa`.

1. Abrir **http://localhost:5182/prueba-operativa** para configurar el perfil. Ingresar como organizador con el código del archivo local `C:\Users\Usuario\abogacIa\.private-contacto-operativo\acceso-organizador.txt`. No compartir ese código ni la clave de cifrado.
2. Registrar desde la interfaz nombre visible o alias, DNI propio y celular propio. Usar formato `+54 9` + área + número, sin cero troncal ni prefijo móvil local 15. La matrícula `PRUEBA-…` se genera automáticamente; no se consulta ni se suplanta Didit.
3. Aceptar el consentimiento del destinatario, guardar el perfil cifrado y activarlo. No obtiene cuenta ABOGADO ni estado profesional habilitado. Si el perfil ya estaba registrado, no volver a cargarlo: la configuración permite consultarlo enmascarado y activarlo.
4. Crear una invitación de un uso, válida 15 minutos. Entregar al participante solo ese código y la URL del **Home**, no la pantalla de configuración.
5. En otra ventana privada/perfil de navegador, abrir **http://localhost:5182/**. En la franja de prueba ingresar el código y pulsar **Habilitar prueba en este Home**. La sesión del participante dura hasta dos horas, limitada por la campaña de 24 horas.

La franja de acceso solo existe en el frontend aislado. La autorización se verifica en servidor; una bandera del navegador no permite acceder a perfiles privados. La publicación sigue limitada a esta computadora (`127.0.0.1:5182`). No se habilitó exposición por Internet o red local.

### Camino desde el catálogo

1. En el Home, desplazarse a **Abogados disponibles**. El perfil autorizado aparece en las tarjetas habituales, con las leyendas **«Perfil de prueba — matrícula no verificada»** e **«Identidad declarada; no verificada por Didit»**.
2. Buscar por nombre/especialidad o usar los filtros y pulsar **Contactar** en la tarjeta seleccionada. No se abre Lexi.
3. Completar **Nombre del ciudadano**, **Número de contacto del ciudadano** y **Resumen editable de la consulta**. Los tres campos son obligatorios. El número de contacto se valida en formato internacional argentino.
4. Revisar la vista previa, el destinatario y su número enmascarado; aceptar el consentimiento explícito.
5. Pulsar **Abrir WhatsApp**. El backend verifica el destinatario y prepara el enlace. Se abre una ventana para WhatsApp; si el navegador bloquea ventanas, aparece **Continuar en WhatsApp** como alternativa explícita.
6. Revisar el texto y destinatario en WhatsApp y pulsar **Enviar** manualmente. Para demostrar entrega entre cuentas, usar una cuenta remitente distinta de la del número receptor. Comprobar la recepción en el teléfono del organizador.

### Camino desde Lexi

1. Desde el mismo Home y con la participación habilitada, abrir **Consultar a Lexi**. Se conserva el chat habitual de escritorio/móvil.
2. Realizar una consulta técnica inocua sobre la especialidad configurada; por ejemplo una pregunta laboral si se seleccionó Derecho Laboral. No ingresar datos sensibles reales.
3. Tras la orientación, pulsar **Sí, ver abogados** y luego **Contactar** en el perfil recomendado.
4. Se abre el mismo `FormularioContacto`, con la consulta como borrador editable del resumen. No se agrega automáticamente la respuesta de Lexi.
5. Completar los datos, revisar, consentir y pulsar **Abrir WhatsApp**, igual que desde el catálogo.

El código de clasificación y el workflow/RAG no se modificaron. En el entorno aislado, el mismo endpoint de orientación del frontend pasa por el relay que exige la sesión de campaña y luego llama al webhook existente, sin enviar los datos del registro.

## Profesionales realmente habilitados

El catálogo dejó de usar `LAWYERS` de demostración. Tanto el catálogo como las recomendaciones normales provienen del microservicio de abogados, reutilizando los filtros de cuenta, identidad y matrícula vigentes y la consulta actual al padrón. No se asignan teléfonos a ficticios. La ilustración del Hero sigue identificada como ejemplo y no funciona como un perfil seleccionable.

Las listas públicas no devuelven DNI ni teléfonos completos. Por compatibilidad, algunos campos anteriores como `nroCelular`, `mail` y `nroMatricula` se devuelven nulos. Los datos de contacto públicos se limitan a habilitación del contacto y número enmascarado, cuando corresponde. No se agregan valoraciones, fotos o importes ficticios a las tarjetas.

El titular verá en **Mis datos → Contacto por WhatsApp** la casilla:

**«Permitir que los ciudadanos me contacten por WhatsApp»**.

- Desactivada por defecto.
- Solo el abogado autenticado puede modificar su permiso; el ID se obtiene del JWT validado, no de un ID libre enviado en el cuerpo.
- Activar exige un celular argentino válido y habilitación profesional vigente. Revocar impide nuevas preparaciones de contacto.
- Cambiar el celular mediante la edición normal del perfil revoca el permiso; el titular debe autorizarlo nuevamente.
- Cada preparación vuelve a comprobar cuenta, verificaciones, padrón actual, permiso y celular. No basta con que la tarjeta se haya cargado anteriormente.
- Un destino sin permiso, con celular inválido o con habilitación perdida produce **«Contacto no disponible»**. No se sustituye por una simulación o número fijo.

El perfil de prueba usa exclusivamente su número cifrado, campaña activa y consentimiento de recepción; no utiliza ni adquiere ese permiso profesional. Usuarios sin invitación no obtienen ese perfil en el Home, las recomendaciones públicas o el endpoint público de catálogo.

## Formulario y seguridad

`Home.tsx` y `RecomendacionesLexi.tsx` importan el mismo componente `FormularioContacto.tsx`. Se retiró el componente visual anterior `ContactoPrueba.tsx` y el formulario/chat duplicados de la pantalla operativa. Los helpers históricos de simulación que conservan sus pruebas no están conectados a estos dos caminos.

El endpoint único es **POST `/api/abogados/contacto/whatsapp`**. Recibe:

- Referencia `{tipo, id}`: `PROFESIONAL` o `PRUEBA_OPERATIVA`. Los espacios de IDs están separados; un ficticio de demostración no es un destinatario válido.
- Nombre, teléfono del ciudadano, resumen, mensaje exacto confirmado, consentimiento y versión del aviso.

No acepta un teléfono libre como destino. El número se resuelve en servidor desde el registro seleccionado. Para perfiles operativos se exige además cookie privada, rol PARTICIPANTE y coincidencia con la campaña. El endpoint privado anterior de preparación dejó de existir.

El servidor compone y compara el texto confirmado, normaliza el número y produce exclusivamente `https://wa.me/…?text=…`. No incluye automáticamente DNI, matrícula, tokens o datos de Didit; también rechaza el DNI/matrícula conocidos del destinatario y referencias explícitas a esos datos en el texto. Los campos libres necesitan revisión del usuario: no se puede garantizar la detección de toda información sensible que alguien escriba deliberadamente.

Editar el mensaje, cambiar de tarjeta o pasar de una selección del catálogo a otra de Lexi descarta el consentimiento anterior, cierra el formulario previo y elimina su enlace preparado. Una respuesta tardía no abre un enlace de una selección ya descartada. Si la preparación falla, se cierra la ventana vacía y se muestra el error.

El formulario no persiste los datos del ciudadano. Las respuestas son `no-store`; el número y texto necesariamente llegan a WhatsApp al abrir el enlace y pueden quedar en el historial del navegador. El consentimiento lo explica. Abrir WhatsApp no acredita envío ni recepción; no se registra ese éxito ficticiamente.

La revocación bloquea nuevas preparaciones. No puede retirar un número/enlace que ya se reveló ni un mensaje ya enviado. No hay Business Platform, bots de WhatsApp ni envío automático.

## Migración y entorno

El permiso se guarda en la tabla independiente `public.whatsapp_autorizacion`, con PK/FK al abogado, booleano `permitido DEFAULT false` y fecha de actualización. **No se agregó una columna ni entidad JPA al modelo profesional**, evitando que `ddl-auto=update` aplique el cambio al reiniciar otro entorno.

Migración explícita canónica: `microservicio-abogados/src/main/resources/db/whatsapp-v1.sql`; copia de inicialización controlada: `docker/contacto-operativo-test/init/20-whatsapp.sql`. Ambas se verifican idénticas mediante prueba. El SQL exige base `contacto_operativo_test` y propietario `operativa_owner`; no admite ejecutarse sobre una base habitual.

Se aplicó únicamente en la base aislada existente de contacto. No cambió registros profesionales reales ni tocó otras bases. El permiso se consulta como desactivado cuando el esquema no está instalado; intentar activarlo en ese caso devuelve indisponibilidad, sin crear tablas automáticamente.

Para una instalación nueva, el entrypoint aplica el baseline y la migración en el volumen nuevo. Para el volumen aislado ya creado, la aplicación controlada es:

```powershell
docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml exec -T postgres-operativa psql -X -v ON_ERROR_STOP=1 -U operativa_owner -d contacto_operativo_test -f /docker-entrypoint-initdb.d/20-whatsapp.sql
```

Para iniciar o detener solo este entorno:

```powershell
docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml up -d --build
docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml stop
```

No combinar Compose, borrar volúmenes ni ejecutar el baseline sobre tablas existentes. Se reutilizaron las claves locales fuera del repositorio; no se regeneraron ni incorporaron datos personales en archivos. Las sesiones privadas usan cookie HttpOnly/SameSite Strict bajo `/api` para servir ambos caminos; se limpia el alcance anterior al recuperar la sesión.

No se publicó la implementación en las bases habituales. Allí el código y la migración necesitan una autorización de despliegue posterior. No iniciar ni reconstruir sus backends para probar estas modificaciones.

## Resultados de pruebas

| Verificación | Resultado |
| --- | --- |
| Regresión backend de abogados, incluidas reglas existentes de registro/Didit/padrón | 149 pruebas aprobadas; sin fallos, errores ni omisiones |
| Servicios frontend | 64 pruebas aprobadas |
| PostgreSQL 17 + API + aislamiento/migración | 10 pruebas contabilizadas por node:test aprobadas |
| Chromium, Home integrado | 4 pruebas aprobadas |
| TypeScript, oxlint y compilación Vite/Docker | Correctos |

Los escenarios verifican contacto directo sin Lexi, recomendación desde el chat habitual, componente compartido, consentimiento obligatorio, cambio de selección/mensaje, referencias con destinos diferentes, opt-in del titular y revocación, números válidos/inválidos, pérdida de habilitación, ausencia de DNI/matrícula/teléfono completo en listas, aislamiento de campaña, configuración cifrada y responsive a 360/768/1440 px.

Las pruebas usan exclusivamente datos sintéticos. Los profesionales sintéticos creados para comprobar permisos quedan dados de baja y con permiso revocado al terminar; no quedan visibles en el catálogo. Las campañas sintéticas se cierran dejando una campaña vacía. No se borran datos. Las suites rechazan comenzar sobre una campaña ya registrada: **no volver a ejecutarlas después de ingresar datos reales**.

La orientación se intercepta en el navegador para no ejecutar el workflow real durante la suite. WhatsApp también se intercepta antes de cualquier solicitud externa, por lo que no se envían mensajes a números sintéticos. La entrega a tu número real y la consulta real a Lexi quedan para el recorrido manual indicado arriba.

Comandos de verificación, únicamente antes de registrar datos reales, sin ejecutar API y navegador en paralelo:

```powershell
node --test docker/contacto-operativo-test/api.test.mjs docker/contacto-operativo-test/isolation.test.mjs
mvn.cmd -f microservicio-abogados/pom.xml test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
Push-Location frontend
.\node_modules\.bin\tsc.cmd --noEmit
npm.cmd run test:operativa
Pop-Location
```

## Archivos de esta corrección

Agregados:

- `frontend/src/FormularioContacto.tsx`
- `frontend/src/AccesoPruebaHome.tsx`
- `frontend/src/services/contactoService.js`
- `frontend/src/services/contactoService.test.js`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/contacto/AutorizacionWhatsApp.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/contacto/ProfesionalContactable.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/contacto/ContactoWhatsAppController.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/controller/CatalogoAbogadosController.java`
- `microservicio-abogados/src/main/resources/db/whatsapp-v1.sql`
- `docker/contacto-operativo-test/init/20-whatsapp.sql`
- `docker/contacto-operativo-test/fixtures-whatsapp.test.sql`
- `WHATSAPP-CONTACTO-INTEGRADO.md`

Modificados:

- `frontend/src/App.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/LawyerProfile.tsx`
- `frontend/src/pages/Operativa.tsx`
- `frontend/src/RecomendacionesLexi.tsx`
- `frontend/src/services/abogadoService.js`
- `frontend/e2e/operativa.spec.ts`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/config/SecurityConfig.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/controller/PerfilAbogadoController.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/dto/AbogadoPublico.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/gestor/RecomendarAbogadosGestor.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/operativa/OperativaService.java`
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/operativa/OperativaController.java`
- `microservicio-abogados/src/main/resources/application-contacto-operativo-test.properties`
- `docker/contacto-operativo-test/nginx.conf`
- `docker/contacto-operativo-test/api.test.mjs`
- `docker/contacto-operativo-test/isolation.test.mjs`
- `WHATSAPP-PRUEBA-OPERATIVA.md` (aviso de documentación sustituida)

Eliminado: `frontend/src/ContactoPrueba.tsx`, reemplazado por el formulario compartido.

Se conservaron intactos los Compose habituales, EP06, abogados-dev, el entorno del dashboard, sus bases/volúmenes, n8n y RAG. No se modificaron el registro profesional, validación Didit o cotejo de matrícula; solo se agregó el permiso adicional de contacto. La comparación de contenedores previos excluyendo este proyecto aislado confirma mismos IDs, imágenes y fechas de inicio.

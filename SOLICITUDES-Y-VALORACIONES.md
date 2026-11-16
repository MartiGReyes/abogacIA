# US13–US18: solicitudes, asesoramientos y valoraciones

Disponible en el frontend unificado de http://localhost:5173.

- Ciudadano: seleccionar un profesional, completar el formulario, editar el mensaje y confirmar. La solicitud se guarda como **Pendiente** antes de devolver el enlace de WhatsApp. Abrirlo no confirma el envío del mensaje.
- **Mis consultas**: listado propio, búsqueda, filtros por estado, detalles, fecha del último cambio e historial. Se actualiza cada 15 segundos y al volver a la ventana; también tiene actualización manual.
- Abogado: **Dashboard → Solicitudes y asesoramientos recibidos**. Desde el detalle puede confirmar **Iniciar asesoramiento** o **Finalizar asesoramiento**. Solo se permite `PENDIENTE → EN_CURSO → FINALIZADA`. Una operación sobre un estado desactualizado devuelve 409 y no agrega un evento.
- Ciudadano: desde el detalle de cualquier solicitud puede registrar 1–5 estrellas y un comentario opcional de hasta 1000 caracteres. Hay una valoración por solicitud; puede editarla en cualquier estado. Se conserva su fecha original y la fecha de edición.
- Perfil público: pestaña **Valoraciones**, promedio, cantidad, comentarios y orden por fecha. El abogado también puede ver las recibidas en su dashboard y perfil profesional. El promedio se calcula de los registros actuales, sin caché ni contadores desincronizados.

El servidor verifica rol y titularidad en cada operación. Las consultas de terceros devuelven 404. La respuesta pública de valoraciones solo incluye puntuación, comentario y fechas; omite nombre, correo, teléfono, documento e identificadores del ciudadano y de la solicitud.

La moderación usa una política local determinista en `ModeracionComentario`: normaliza acentos, mayúsculas y algunas sustituciones de letras, bloquea un vocabulario y expresiones ofensivas/discriminatorias, limita la longitud y rechaza correos y números personales. Se aplica al crear y editar, sin enviar comentarios a proveedores externos. Este filtro no comprende todo el lenguaje ni todas las formas de evasión; el vocabulario puede ampliarse y requiere revisión humana para moderación contextual.

## API

| Operación | Endpoint |
| --- | --- |
| Registrar contacto | `POST /api/abogados/contacto/whatsapp` |
| Solicitudes del ciudadano | `GET /api/abogados/contactos/mios?estado=EN_CURSO` |
| Detalle propio | `GET /api/abogados/contactos/mios/{id}` |
| Solicitudes del abogado | `GET /api/abogados/me/contactos?estado=PENDIENTE` |
| Detalle recibido | `GET /api/abogados/me/contactos/{id}` |
| Cambiar estado | `PATCH /api/abogados/me/contactos/{id}/estado` con `estado` y `estadoActual` |
| Crear/editar valoración | `POST` / `PUT /api/abogados/contactos/mios/{id}/valoracion` |
| Valoraciones públicas | `GET /api/abogados/catalogo/{id}/valoraciones?orden=recientes` o `antiguas` |
| Valoraciones recibidas | `GET /api/abogados/me/valoraciones` |

El mensaje editable se envía en `mensajeConfirmado`; el destino siempre se obtiene del abogado seleccionado, nunca del texto del mensaje. Si falla la persistencia, no se devuelve un enlace ni se anuncia un registro exitoso.

## Persistencia y pruebas

La migración aditiva `microservicio-abogados/src/main/resources/db/solicitudes.sql` agrega estado, mensaje y fecha de actualización a los contactos existentes. Las solicitudes anteriores se consideran pendientes y conservan su fecha original. Crea `contacto_estado_historial` y `valoracion_contacto`, con restricción única por solicitud y puntuación entre 1 y 5. No se eliminan datos.

`iniciar.bat` aplica la migración explícita en el entorno de pruebas. El entorno principal la aplica al iniciar con `ddl-auto=update`. Los respaldos previos de esta implementación están fuera del repositorio, en `../.private-contacto-operativo/principal-pre-us13-18.dump` y `pruebas-pre-us13-18.dump`.

```powershell
npm.cmd --prefix frontend test
node frontend/node_modules/typescript/bin/tsc --noEmit -p frontend
node --test docker/unificado/solicitudes.test.mjs
```

La prueba de integración requiere que la cuenta de abogado de prueba tenga el contacto habilitado. Crea únicamente una solicitud sintética, prueba transiciones y valoraciones, y elimina esa solicitud y sus registros asociados al terminar. No envía mensajes de WhatsApp ni modifica el perfil del abogado.

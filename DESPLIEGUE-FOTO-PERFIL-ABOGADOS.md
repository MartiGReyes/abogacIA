# Despliegue de foto de perfil para abogados

**Estado: EXITOSO a nivel de despliegue técnico.** Función habilitada en la aplicación habitual: http://localhost:5173/.

Fecha local: 16/11/2026, actualización de 00:47:17 a 00:48:22, Argentina. Respaldo inicial del volumen realizado a las 00:49:16. La subida autenticada habitual queda pendiente de prueba manual con una cuenta autorizada; no se crearon cuentas ni se usaron contraseñas ajenas.

## Componentes actualizados

Se recrearon únicamente:

| Componente | Contenedor nuevo | Imagen candidata |
|---|---|---|
| Abogados | abogacia-abogados-1, ID f5799b8bc8c1 | abogacia-abogados:foto-perfil-20261116 |
| Frontend | abogacia-frontend-1, ID 153b30d6ae38 | abogacia-frontend:foto-perfil-20261116 |

ID inmutables de imagen:

- Abogados: `sha256:3bcb2bcfa565c61cde692c68d69ab992fc3cbc693b3e25096e1a825c899bc22d`.
- Frontend: `sha256:2b7d14f8dbecd4b5e4fd4af9a13dbd55178f1187343e1e2f8e76942bf4728239`.

Las imágenes se construyeron localmente sobre las mismas bases anteriores, reemplazando el JAR y los archivos compilados del frontend. No se descargó otra base ni se incluyeron credenciales. El JAR corresponde al código probado y su SHA-256 desplegado coincide: `7a3dc55b03e430e61d09e910da1b6d9ebaf483f90c256b9349a1c489b25d822f`. Se repitieron TypeScript y el build con APIs same-origin; se cotejó el hash del index.html candidato/publicado.

Se preservaron todas las variables efectivas anteriores de abogados y se añadieron únicamente:

- `ABOGACIA_FOTOS_ENABLED=true`.
- `ABOGACIA_FOTOS_DIRECTORIO=/datos/fotos-perfil`.

Gmail/SMTP, recuperación de contraseña, JWT, credenciales internas, nueva cuenta Didit, callbacks, perfiles, conexiones PostgreSQL y URLs conservan exactamente sus valores anteriores. No se publican secretos en este informe. El entorno y HostConfig del frontend permanecieron iguales; se conservó su nginx habitual montado de solo lectura.

Abogados arrancó con Hibernate validate, SQL init never, Flyway/Liquibase deshabilitados y los controles de bootstrap/seeds/reconciliación automática deshabilitados. No hubo migraciones ni cambios de esquema.

## Almacenamiento y respaldos

Se creó el volumen nombrado **abogacia_fotos_abogados**, montado con escritura únicamente en `/datos/fotos-perfil` del backend abogados. Se verificó que UID 10001 puede escribir en él. El montaje anterior del padrón en `/padron` permanece de solo lectura. Las fotografías no se guardan en la capa efímera del contenedor ni en PostgreSQL.

Respaldos y metadatos privados, con ACL restringida a Usuario y SYSTEM:

`C:\Users\Usuario\abogacIa\.private-despliegue-fotos-20261116-r2`

- `imagenes-anteriores.tar`: 501487616 bytes; índice TAR verificado. Incluye las imágenes anteriores de abogados y frontend.
- `abogacia_abogados.dump`: 90378 bytes; formato custom, índice pg_restore y hash verificados. SHA-256: `23bdd89171410cbca65c13347686eecb56b645be063e35826f7abdac880b5c5a`. No se restauró ni se necesitó restaurar la base.
- `codigo-candidato.tar`: fuentes y configuración de build del candidato, sin archivos .env.
- `fotos-inicial.tar`: respaldo del volumen recién habilitado; 1536 bytes, índice comprobado y vacío salvo su entrada de directorio. SHA-256: `a65aa9afaf1c15f4bd959e6a4111c4da44fd0e99812b89fe2be42aa617332cdc`.
- `plan.json`, `journal.json`, `resultado.json` y `respaldo-fotos.json`: metadatos del procedimiento sin valores secretos.

Los contenedores anteriores se conservaron detenidos con sus imágenes y configuración completa:

- `abogacia-abogados-1-anterior-foto-20261116-r2`.
- `abogacia-frontend-1-anterior-foto-20261116-r2`.

También se conservaron los respaldos del primer preflight en `.private-despliegue-fotos-20261116`, sin sobrescribirlos.

El volumen sobrevive a reinicios y recreaciones si se conserva y vuelve a montar. Una recreación futura debe preservar tanto este montaje como la configuración efectiva de Gmail/Didit/JWT/arranque seguro: no ejecutar un compose genérico que omita los overrides. El archivo `docker-compose.fotos.yml` documenta el montaje y las variables nuevas, pero no sustituye las demás configuraciones efectivas.

Se generó el respaldo inicial. **No se creó una tarea programada de copias periódicas ni se fijó una política de retención**: queda pendiente acordar frecuencia, destino y retención para las futuras fotos. No se añadieron servicios, cron o pagos externos para ello.

## Verificaciones sobre el entorno habitual

| Verificación | Resultado |
|---|---|
| Abogados/frontend | Activos con las imágenes candidatas; JAR/index cotejados |
| Frontend localhost:5173 | HTTP 200 |
| Navegador en 1440 y 390 px | Página y logo visibles; sin desbordamiento horizontal ni errores JavaScript en el recorrido comprobado |
| Login, registro ciudadano y registro abogado | Formularios accesibles |
| Recuperación CIUDADANO y ABOGADO | Formularios visibles y selección de cuenta correcta |
| Login público con cuerpo vacío | HTTP 400 esperado de validación |
| Catálogo por frontend/gateway | HTTP 200; un perfil público disponible |
| Foto propia sin JWT | GET y DELETE rechazados con HTTP 401 |
| Foto propia con JWT inválido | HTTP 401 |
| Foto pública de ID inexistente | HTTP 404 a través de nginx/gateway/backend |
| Perfil público y tarjeta existentes sin foto | Iniciales visibles; modal de perfil accesible en navegador, sin autenticación |
| Avisos de verificación ciudadano y abogado | HTTP 200 |
| Gmail/Didit/JWT | Configuración exacta preservada; secretos no presentes en el log de arranque examinado |
| Almacenamiento | Volumen correcto, persistente y escribible por el usuario de la aplicación |
| Datos ciudadanos/abogados | Huellas y cantidades de todas las tablas iguales al preflight |
| Esquema de abogados | Mismo hash antes/después |

No se subió ni eliminó ninguna foto de una cuenta habitual. Por eso todavía no se verificó un JPEG real a través del gateway habitual ni el recorrido autenticado completo en esta pila. La prueba de permisos sin JWT y el fallback público sí se ejecutaron allí. No se emitieron JWT para suplantar usuarios ni se introdujeron cuentas sintéticas en las bases habituales.

La evidencia funcional previa sigue siendo la del entorno descartable documentado en `FOTO-PERFIL-ABOGADOS.md`: 217 pruebas backend satisfactorias, una opcional omitida, 89 frontend y 14 grupos de integración/navegador, incluidos cambio/eliminación, PNG/JPEG/WebP, tamaños inválidos, aislamiento entre titulares y persistencia tras reinicio y recreación. No se atribuyen esos recorridos autenticados al entorno habitual.

Ciudadanos, autenticación, gateway, PostgreSQL, n8n y administración conservaron sus contenedores, imágenes y fechas de arranque y siguen activos. No se modificaron cuentas, contraseñas, DNI, correo/Didit, matrículas o padrón. No se modificó ni se consultó Gemini/RAG, no se iniciaron sesiones Didit y no se enviaron correos ni mensajes WhatsApp. Lexi y sus componentes no se alteraron; no se repitieron inferencias para evitar llamadas adicionales.

## Incidencias y reversión

El primer preflight falló al construir porque BuildKit interpretó `FROM sha256:...` como un repositorio remoto. Se corrigió el procedimiento para etiquetar localmente los mismos ID de imagen ya existentes. Ese intento no detuvo ni cambió servicios habituales. La preparación y activación posteriores terminaron correctamente.

**No fue necesario rollback.** No se borraron volúmenes ni se recreó PostgreSQL. Los tres contenedores auxiliares usados para cotejar JAR/index y permisos del volumen ejecutaron comandos locales sin red y quedaron detenidos; no son servicios adicionales activos. Las pilas descartables anteriores permanecieron detenidas.

Si se necesita revertir, cerrar la publicación durante la ventana, detener las dos candidatas, recuperar los contenedores anteriores con sus nombres/red/IP y configuración conservada, y verificar frontend/catálogo. Conservar el volumen y sus copias. No restaurar bases ni borrar fotos para resolver un fallo de código. Si ya hubo nuevas cargas de usuarios, revisar primero la actividad y respaldar el volumen actualizado; no sobrescribir archivos nuevos con el respaldo inicial vacío. El procedimiento no tiene un rollback automático reutilizable después del uso por usuarios.

Archivo operativo añadido: `integracion/desplegar-foto-perfil.mjs`. No debe repetirse sin preparar un intento nuevo y revisar su estado. No se modificó lógica adicional durante este despliegue.

## Prueba manual pendiente

En http://localhost:5173/, iniciar sesión con una cuenta ABOGADO propia/autorizada y abrir **Panel → Foto de perfil** o **Mi perfil profesional**:

1. Elegir una foto propia JPEG, PNG o WebP de hasta 5 MB; revisar la vista previa y guardar.
2. Comprobar el avatar del panel/encabezado y, si el profesional ya está públicamente habilitado, su tarjeta y perfil en otra ventana sin sesión.
3. Cambiarla y verificar la actualización. Eliminarla y comprobar que vuelven las iniciales.

No es necesario ejecutar Didit ni modificar matrículas para esta prueba. Si una cuenta no está habilitada para el catálogo, no cambiar su habilitación solo para mostrar la fotografía.

**Foto de perfil publicada y almacenamiento habilitado. Pendientes: prueba manual autenticada habitual y política de respaldo periódico.**

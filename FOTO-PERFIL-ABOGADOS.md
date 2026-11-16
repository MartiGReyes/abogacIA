# Foto de perfil para abogados

Fecha: 16/11/2026, Argentina. **Estado al cierre de la implementación: pruebas terminadas, aún sin desplegar.** La autorización posterior y el despliegue técnico exitoso se documentan en `DESPLIEGUE-FOTO-PERFIL-ABOGADOS.md`; la prueba manual autenticada habitual sigue pendiente.

## Revisión y solución

Se revisaron el dashboard privado, Mi perfil profesional, el perfil público/modal, catálogo/carruseles, recomendaciones de Lexi, contacto y navegación. Se reutilizan las identidades y componentes existentes. No se creó otra aplicación.

No había un almacenamiento de fotos de perfil. Los casos profesionales utilizan imágenes codificadas dentro de sus propios registros, mecanismo que no se extendió para evitar modificar tablas existentes y mezclar imágenes de casos con avatares. La nueva solución guarda un único JPEG optimizado por ID de abogado en un directorio persistente, separado de Didit, documentos y padrón.

**No se requiere migración PostgreSQL ni una columna nueva.** La asociación es el nombre interno `<idAbogado>.jpg`; ese ID procede del JWT en las operaciones privadas, nunca del nombre de archivo aportado por el usuario. Los avatares públicos consultan el endpoint del ID de la tarjeta existente. Si no hay foto, falla su carga o el almacenamiento está deshabilitado, muestran las iniciales.

La sección Foto de perfil está disponible en el resumen del panel y en Mi perfil profesional: seleccionar archivo, previsualizar sin escritura, guardar, cancelar selección, reemplazar y eliminar. Los avatares del encabezado y panel se actualizan después de guardar/eliminar. También se integraron fotos en tarjetas, carruseles, perfil público, recomendaciones y resumen de contacto.

## Seguridad y contrato

- JPEG, PNG y WebP, con límite de 5 MiB (5 × 1024 × 1024 bytes). Límite adicional de 16 millones de píxeles y 8192 por lado, comprobado antes de decodificar los píxeles.
- La decisión del backend usa un decodificador real y su formato, no el MIME declarado, la extensión ni el nombre. SVG, GIF, ejecutables y archivos falsos se rechazan. Un JPEG real con nombre engañoso se normaliza como imagen, sin utilizar ese nombre para almacenarlo.
- Se decodifica, reduce y vuelve a codificar a JPEG RGB de hasta 512 píxeles en el lado mayor, calidad 0,85. Se copian solo píxeles a una imagen nueva: no se conserva el archivo original, EXIF ni otras cargas adjuntas. Transparencia sobre blanco; no se conserva animación. No se incorpora recorte manual ni ajuste de orientación EXIF.
- WebP se decodifica con TwelveMonkeys ImageIO 3.15.0. Referencia: [proyecto oficial](https://github.com/haraldk/TwelveMonkeys). Se añade solo ese plugin, sin librerías SVG ni comandos externos para procesar archivos.
- Escrituras temporales dentro del mismo directorio y reemplazo atómico. Un archivo inválido o un fallo de procesamiento no reemplaza la foto anterior. No se usan rutas proporcionadas por el cliente; se rechazan enlaces simbólicos en la raíz configurada o archivo final.
- El endpoint privado exige JWT, rol ABOGADO y cuenta REGISTRADO completada. No admite elegir un ID destino. Solicitudes, bajas, cuentas inexistentes o marcadas como cuentas operativas de prueba no obtienen permiso de modificación.
- El endpoint público exige habilitación profesional mediante el servicio existente ProfesionalContactable. No habilita cuentas ni sustituye correo, Didit o matrícula. Las fotos de una cuenta no habilitada no se sirven públicamente.
- No existe un endpoint público de modificación. Las imágenes se devuelven como image/jpeg, sin caché; el backend añade nosniff y una política CSP restrictiva.
- No se consulta ni reutiliza ninguna imagen/documento de Didit.

Endpoints nuevos:

| Método y ruta | Uso |
|---|---|
| GET `/api/abogados/me/foto` | Foto propia con JWT; 404 si no existe |
| PUT `/api/abogados/me/foto` | Multipart, campo `foto`; 204 si se guarda |
| DELETE `/api/abogados/me/foto` | Eliminar foto propia; 204, idempotente |
| GET `/api/abogados/catalogo/{id}/foto` | JPEG público del profesional habilitado; 404 si no existe/no está habilitado |

La ruta privada se incorpora a la cadena de seguridad /me ya existente. Solo se añadió el GET público a las rutas permitidas. El cliente usa fetchAutenticado y FormData sin forzar Content-Type JSON; las fotos privadas se muestran mediante URL blob, sin poner JWT en URLs. Las respuestas demoradas se descartan si cambia la sesión y las URLs blob se revocan al dejar de usarlas.

## Almacenamiento propuesto para el despliegue

Propiedades de Spring, con equivalentes de entorno:

| Propiedad | Variable | Valor propuesto |
|---|---|---|
| abogacia.fotos.enabled | ABOGACIA_FOTOS_ENABLED | true solo con almacenamiento montado |
| abogacia.fotos.directorio | ABOGACIA_FOTOS_DIRECTORIO | /datos/fotos-perfil |

Por defecto la función está deshabilitada y no crea directorios al arrancar. Al habilitarla se exige una ruta absoluta. El archivo candidato `docker-compose.fotos.yml` define un volumen nombrado `fotos_abogados` exclusivamente para ese directorio del backend abogados. No debe ejecutarse aún. Cada entorno debe tener un volumen distinto.

El Dockerfile candidato prepara el directorio con propietario app, UID 10001. Al desplegar debe verificarse la propiedad efectiva del volumen, incluido el caso de que ya existiera; si se precisa inicializar permisos, hacerlo únicamente sobre el volumen nuevo dedicado. El ensayo verificó ese propietario con un auxiliar exclusivo del volumen descartable.

Un volumen nombrado sobrevive a reinicios y recreaciones. No es por sí mismo un respaldo ni almacenamiento multi-host: hay que respaldarlo y restaurarlo junto con la correspondencia de IDs de la base. Un hosting futuro necesita disco persistente compatible; no serviría un filesystem efímero. Para varias réplicas/hosts se requerirá almacenamiento compartido o adaptar el servicio a objetos; no se contrató ningún servicio externo.

No se añadió borrado automático al dar de baja una cuenta: el servicio público deja de mostrarla por sus permisos, y una política de retención/limpieza del archivo deberá autorizarse separadamente. La eliminación solicitada desde Foto de perfil sí borra el archivo activo. Los respaldos del volumen necesitan su propia política de retención.

## Archivos modificados o añadidos

Frontend, respecto del código existente al iniciar esta tarea:

- `frontend/src/product/FotoPerfil.tsx`: avatar compartido, carga privada, fallback y editor.
- `frontend/src/services/fotoPerfilService.js`: contrato HTTP de fotos y evento de actualización.
- `frontend/src/services/fotoPerfilService.test.js`: cuatro pruebas del cliente HTTP y cambio de sesión.
- `frontend/src/product/Dashboard.tsx`: avatar y sección Foto de perfil.
- `frontend/src/pages/LawyerProfile.tsx`: foto y editor en Mi perfil profesional.
- `frontend/src/product/Navigation.tsx`: avatar privado del abogado; iniciales para otros roles.
- `frontend/src/product/LawyerCarousel.tsx`: tarjetas del catálogo/carruseles.
- `frontend/src/product/PublicExperience.tsx`: perfil público, contacto y recomendaciones.
- `frontend/src/index.css`: estilos de avatares, editor, controles accesibles y adaptación móvil.

Backend de abogados:

- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/foto/FotoPerfilStore.java`: validación, optimización y persistencia de archivos.
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/foto/FotoPerfilController.java`: endpoints y permisos.
- `microservicio-abogados/src/main/java/com/abogacia/microservicio_abogados/config/SecurityConfig.java`: permitir exclusivamente el GET público nuevo.
- `microservicio-abogados/pom.xml`: decodificador WebP.
- `microservicio-abogados/Dockerfile`: directorio persistente con propietario de la aplicación, para una imagen futura.
- `microservicio-abogados/src/test/java/com/abogacia/microservicio_abogados/FotoPerfilTest.java`: diez pruebas de backend.
- `microservicio-abogados/src/test/resources/foto-sintetica.webp`: fixture geométrico generado, sin personas ni datos reales.

Operación y evidencias:

- `docker-compose.fotos.yml`: propuesta de montaje y variables, sin aplicar.
- `integracion/foto-perfil-ensayo.mjs`: ensayo de navegador/HTTP con PostgreSQL y volumen nuevos.
- `integracion/foto-perfil-resultados.json`: resultado final del ensayo.
- `integracion/foto-perfil-intento1.json`, `foto-perfil-intento2.json`, `foto-perfil-intento3.json`: diagnósticos previos conservados.
- `integracion/foto-panel-390.png`, `foto-panel-1440.png`: capturas revisadas visualmente.
- Logs locales `integracion/foto-backend-tests.log`, `foto-frontend-tests.log`, `foto-frontend-build.log`; reportes JUnit en target/surefire-reports. Los logs están ignorados por Git.
- Este informe. No se hicieron commits ni se sobrescribieron los cambios anteriores de Gmail/Didit/integración.

## Pruebas realizadas

Backend: Maven verify terminó con código 0. **218 pruebas, 217 satisfactorias, 0 fallos/errores y 1 omitida**: PadronNumericoTest, que requiere indicar un Excel explícitamente. No se activó esa prueba opcional ni se tocó el padrón. Las diez pruebas nuevas de fotos pasaron. Las suites existentes de correo SMTP, recuperación y Didit permanecieron satisfactorias con datos y servicios simulados/locales.

Frontend: **89 pruebas satisfactorias**, TypeScript y build correctos. Lint terminó sin errores, con advertencias de efectos React, incluida la sincronización de la URL de previsualización, y otras preexistentes. El build conserva la advertencia previa sobre tamaño de bundle; no impide compilar.

El ensayo final ejecutó **14 grupos de comprobaciones HTTP/navegador satisfactorios** sobre PostgreSQL descartable real y el JAR candidato. Se creó el esquema únicamente en esa base nueva; luego los contenedores de prueba arrancaron con validate, seeds/SQL init/migraciones y proveedores externos deshabilitados. Se usaron dos cuentas sintéticas exclusivas de esa base y JWT firmados con clave sintética; no se probaron contraseñas habituales ni login real.

| Requisito | Resultado |
|---|---|
| Sin foto, iniciales | API 404 e iniciales visibles en panel |
| Con foto | PNG subido por navegador; imagen en panel y navegación |
| Previsualizar antes de guardar | Vista previa visible y API todavía sin foto |
| Cambiar foto | WebP subido con teclado; salida JPEG distinta y válida |
| Eliminar | Botón táctil; vuelve a iniciales y GET público 404 |
| Reiniciar contenedor | Mismos bytes de foto después del reinicio |
| Recrear contenedor | Mismos bytes en otro contenedor con el mismo volumen |
| Modificar foto ajena | No existe ruta de escritura por ID; otro titular no modifica el archivo del primero |
| Ciudadano/sin JWT/JWT inválido | Escritura rechazada en pruebas de seguridad |
| Archivo falso o grande | Rechazo HTTP 400/413; también GIF, ejecutable, vacío, exceso de píxeles y carga adjunta en pruebas backend |
| Catálogo y perfil público | Foto visible sin JWT; solicitud pública real al backend descartable |
| Escritorio y celular | Capturas de 1440 y 390 px revisadas; sin desbordamiento horizontal |
| Gmail y Didit | Pruebas de regresión existentes satisfactorias; no se llamó a Gmail/Didit reales |

Los tokens de otro rol y el parámetro ID no sustituyen al titular. Se verificó además que los bytes de carga adjunta no quedan en el JPEG guardado y que reabrir el almacenamiento conserva la foto.

Los primeros ensayos detectaron un impedimento de publicación de puerto con red Docker internal y dos selectores de prueba incorrectos (incluido un carácter alterado por la codificación de PowerShell). Se corrigió solo el arnés del ensayo; el recorrido final terminó sin fallos. El acceso local se enlazó a 127.0.0.1, sin publicación en Internet.

Las capturas del panel descartable muestran avisos de módulos ajenos a fotos —casos, solicitudes/valoraciones— porque no se instalaron sus tablas adicionales en el esquema mínimo del ensayo. No se usaron como evidencia de regresión de esos módulos. La suite completa de abogados sí los cubre con sus fixtures. No se declara validado el recorrido completo de la aplicación habitual ni el proxy gateway habitual con estas nuevas fotos: el ensayo de navegador usó Vite y su proxy al backend descartable.

## Estado del entorno habitual y limpieza de pruebas

Los ocho servicios habituales conservaron sus identificadores, imágenes y fechas de arranque, y siguen activos. No se recreó ni reinició ninguno. No se conectaron las pruebas a sus bases ni se ejecutaron allí migraciones, seeds o escrituras. No se tocaron autenticación, ciudadanos, Gmail, Didit, padrón/12345, Lexi, n8n, RAG ni la aplicación independiente de administración.

Todos los **16 contenedores nuevos de los cuatro intentos**, bajo el prefijo `abogacia-fotos-ensayo-20261116`, quedaron detenidos. También se detuvo el proceso Vite del ensayo. No se borraron contenedores, volúmenes ni redes. Los volúmenes de fotos descartables se conservan para inspección; los PostgreSQL temporales usaron tmpfs. No se tocaron EP06, abogados-dev u otros entornos preexistentes. No hubo envíos de correo/WhatsApp, verificaciones Didit ni llamadas a Gemini.

## Plan de despliegue — pendiente de autorización

1. Autorizar actualización únicamente del backend abogados y frontend, creación del volumen nuevo y sus permisos. No se necesita migración ni actualizar ciudadanos/autenticación/n8n/PostgreSQL/administración.
2. Verificar nuevamente cambios posteriores y respaldar código, imágenes, configuración efectiva, conexiones y montajes. Mantener secretos fuera del informe. Preservar expresamente Gmail, nueva cuenta Didit, JWT y arranque seguro: no sustituirlos por los valores incompletos de un compose genérico.
3. Construir y verificar las imágenes candidatas. El JAR y el frontend ya se compilaron localmente; en esta etapa no se construyó ni publicó una imagen de aplicación nueva. Verificar el propietario UID 10001 y escritura del volumen dedicado.
4. En ventana coordinada, actualizar abogados con la misma configuración efectiva más las dos variables de fotos y el volumen. Mantener validate y controles de bootstrap/SQL/migraciones. No recrear PostgreSQL ni el padrón montado de solo lectura.
5. Verificar arranque, Gmail/Didit a nivel de configuración, JWT, catálogo y permisos sin crear cuentas habituales. Publicar el frontend candidato conservando nginx y las URLs. El nginx habitual/código existente admiten 8 MB y el gateway 8.000.000 bytes, suficientes para multipart de 5 MiB; comprobar el recorrido binario y encabezados a través de ese proxy en el despliegue autorizado.
6. Con una cuenta autorizada, efectuar la prueba manual de subida/cambio/eliminación y visualización pública. No usar imágenes de Didit ni modificar habilitaciones para poblar el catálogo. Si no hay un profesional público autorizado, dejar explícitamente pendiente esa parte habitual.
7. Incorporar el volumen a los respaldos periódicos y acordar retención. Registrar la imagen/configuración/volumen finales y guardar una referencia de rollback.

## Plan de reversión

Antes de abrir el cambio, si falla el arranque o los permisos, restaurar las imágenes/configuraciones anteriores de abogados y frontend. Conservar el volumen nuevo detenido/sin modificar; no restaurar bases ni borrar datos para resolver un fallo de archivos. Al no existir migración, no hay DDL que revertir.

Si ya se cargaron fotos, deshabilitar la función y restaurar componentes compatibles, preservando el volumen y sus respaldos. El frontend anterior vuelve a iniciales; las fotos no deben borrarse automáticamente. No restaurar un respaldo de fotos sobre escrituras más recientes sin revisar las consecuencias. Conservar las variables efectivas Gmail/Didit/JWT durante cualquier reversión.

La situación anterior corresponde al cierre de la implementación. Tras la autorización posterior del usuario, el 16/11/2026 se publicó la función: ver `DESPLIEGUE-FOTO-PERFIL-ABOGADOS.md`. El despliegue técnico pasó; la prueba autenticada habitual continúa pendiente.

# Acceso local unificado

`iniciar.bat` levanta los servicios principales y las cuentas de prueba existentes.
La aplicación actualizada se abre en http://localhost:5173. `detener.bat` detiene
ambos proyectos conservando los volúmenes.

Las cuentas normales conservan su base y su autenticación. Las cuentas
`abogado.prueba@abogacia.local`, `abogado.otro@abogacia.local` y
`ciudadano.prueba@abogacia.local` conservan su contraseña y sus datos cifrados
en el entorno de pruebas. La contraseña está en
`../.private-contacto-operativo/password-cuentas.txt`; no publicarla.

El gateway local dirige el login de esas tres cuentas al autenticador de pruebas
y verifica la firma HS256, emisor y vencimiento de sus JWT para dirigir las
solicitudes posteriores. Los microservicios vuelven a validar cada JWT.
El catálogo reúne los perfiles de ambos entornos y conserva sus marcas de prueba.
Los contactos requieren un ciudadano del mismo entorno que el abogado destinatario;
para probar contactos con el abogado de prueba usar el ciudadano de prueba.
Los datos de las cuentas no se copian ni se cambian sus verificaciones.

La migración es aditiva e idempotente: agrega las tablas para casos, contactos e
historial al esquema de pruebas sin activar DDL automático. Se conservó un
respaldo previo en `../.private-contacto-operativo/pre-unificado.dump`.

Lexi continúa usando n8n en el puerto 5678. Los errores del proveedor externo
se informan como indisponibilidad temporal, sin fabricar una respuesta.

Validación local (crea y elimina únicamente sus casos e historial sintéticos):

```powershell
node --test docker/unificado/smoke.test.mjs
```

Para iniciar sin los scripts:

```powershell
docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml up -d --build
Get-Content docker/unificado/migracion.sql -Raw | docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml exec -T postgres-operativa psql -v ON_ERROR_STOP=1 -U operativa_owner -d contacto_operativo_test
Get-Content microservicio-abogados/src/main/resources/db/solicitudes.sql -Raw | docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml exec -T postgres-operativa psql -v ON_ERROR_STOP=1 -U operativa_owner -d contacto_operativo_test
'GRANT SELECT, INSERT, UPDATE, DELETE ON valoracion_contacto, contacto_estado_historial TO operativa_runtime; GRANT USAGE, SELECT ON SEQUENCE contacto_estado_historial_id_seq TO operativa_runtime;' | docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml exec -T postgres-operativa psql -v ON_ERROR_STOP=1 -U operativa_owner -d contacto_operativo_test
Get-Content microservicio-abogados/src/main/resources/db/indicadores.sql -Raw | docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml exec -T postgres-operativa psql -v ON_ERROR_STOP=1 -U operativa_owner -d contacto_operativo_test
'GRANT SELECT, INSERT, UPDATE ON ingreso_contacto TO operativa_runtime;' | docker compose --env-file docker/contacto-operativo-test/.env -f docker-compose.contacto-operativo-test.yml exec -T postgres-operativa psql -v ON_ERROR_STOP=1 -U operativa_owner -d contacto_operativo_test
docker compose --env-file .env --env-file docker/contacto-operativo-test/.env -f docker-compose.yml -f docker-compose.unificado.yml up -d --build
```

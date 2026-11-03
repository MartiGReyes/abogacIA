# Entorno aislado de recomendaciones — preparado, no desplegado

No se debe ejecutar hasta revisar y autorizar el despliegue. Los comandos de este
documento son instrucciones futuras; el agente no los ejecutó.

## Qué contiene

`docker-compose.abogados-dev.yml` es un proyecto independiente llamado
`abogacia-abogados-dev`. Se usa solo, **sin combinarlo con docker-compose.yml**.

| Servicio | Datos / acceso |
| --- | --- |
| postgres-abogados-dev | PostgreSQL 17, base abogacia_abogados_dev, sin puerto al host |
| abogados-dev | Puerto interno 8082, sin puerto al host; usuario runtime abogados_dev, solo lectura |
| frontend-abogados-dev | http://localhost:5175, mismo chat Lexi |

El volumen nuevo se llama `abogados_dev_data`. No monta `pgdata`, `n8n_data`,
backups, padrón real, credenciales actuales ni datos de `abogacia_abogados`.
La API y PostgreSQL solo pertenecen a la red privada de este proyecto. El frontend
también se conecta a la red **existente** `abogacia_default` para resolver el servicio
`n8n`. Esa red debe existir y n8n debe estar activo. No se crea, inicia, recrea ni
modifica n8n. Su proxy se copia sin cambios desde el Nginx actual.

El frontend habitual de localhost:5173 y la API habitual de 8082 permanecen
ejecutándose como antes. La imagen frontend de desarrollo configura únicamente
VITE_ABOGADOS_URL=/. Nginx envía únicamente la ruta exacta de recomendaciones a abogados-dev:8082. Las demás pantallas mantienen sus servicios
habituales: este entorno está destinado a probar **Lexi y recomendaciones**, no a
crear cuentas ni probar autenticación. Usar solo datos sintéticos en estas pruebas.

## Protecciones

- Proyecto Compose, volumen, contenedor PostgreSQL y credenciales separados.
- `abogados_dev_owner` administra exclusivamente este cluster de desarrollo.
- `abogados_dev` es NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION y tiene
  únicamente CONNECT, USAGE y SELECT. No puede insertar, actualizar, borrar ni
  cambiar esquemas. Los estados básicos se inicializan antes de arrancar la API.
- Perfil exclusivo `abogados-dev`, bandera ABOGADOS_DEV_FIXTURES_ENABLED=true,
  URL JDBC y usuario exactos, ddl-auto=validate y spring.sql.init.mode=never.
  Una combinación incompatible aborta **antes de inicializar JPA**.
- El lector comprueba además current_database() y current_user al arrancar.
- Sin API keys/workflows de Didit, privacidad/reconciliación desactivadas y sin
  importación de padrón. No se cambian las verificaciones reales.
- Los ficticios viven en `abogacia_dev.perfiles_prueba`, sin FK a profesionales,
  sin DNI, matrícula, teléfono, correo, contraseña ni resultados de verificación.
- La tabla exige perfil_prueba=true y estado FICTICIO_NO_HABILITADO. fixture_id es
  UNIQUE. La API devuelve perfilPrueba=true, matriculaVerificada=false y ningún
  contacto/matrícula. Usa IDs negativos para no confundirlos con cuentas reales.
- Las tarjetas existentes muestran **PERFIL DE PRUEBA — NO ES UN ABOGADO REAL** y
  ocultan contacto, matrícula y sello profesional en estos perfiles.
- En producción el lector no existe. Activar accidentalmente solo la bandera
  provoca un error de arranque; ningún parámetro HTTP activa el modo de prueba.
  El endpoint normal conserva sus filtros de habilitación y de dominios reservados.

## Inicialización preparada

En un volumen vacío, la imagen oficial PostgreSQL crea la base y ejecuta:

1. `init/10-schema.sql`: verifica base/propietario, crea el usuario de lectura,
   el esquema compatible con las entidades actuales y los tres estados básicos.
   Crea además la tabla de fixtures. No usa Hibernate para crear o actualizar nada.
2. `init/20-fixtures.sql`: verifica base/propietario, toma un bloqueo transaccional,
   carga Valentina Torres, Martín Ferreyra y Lucía Benítez con
   ON CONFLICT(fixture_id) DO NOTHING. Comprueba el contenido después de insertar;
   ante una colisión diferente aborta toda la transacción, sin sobrescribir filas.

La carga es idempotente. El baseline de esquema es **solo de primera instalación**;
no se debe volver a aplicar sobre tablas ya creadas. Los scripts de entrypoint se
ejecutan únicamente cuando el volumen está vacío; reiniciar no reaplica cambios.
Si la inicialización falla, revisar el error y el estado del volumen. No borrar
volúmenes ni ejecutar el baseline a ciegas para intentar repararlo.

El JSON de `scripts/dev/abogados-prueba.json` sigue siendo la especificación de
perfiles. La tabla de desarrollo almacena solo los campos necesarios para las
tarjetas, sin trasladar identificadores sintéticos ni campos de registro.

## Comandos para el despliegue futuro (NO ejecutados)

Desde la raíz del repositorio, generar primero secretos nuevos de desarrollo:

```powershell
.\scripts\dev\Preparar-AbogadosDev.ps1
```

Solo escribe `docker/abogados-dev/.env`, ignorado por Git; rechaza sobrescribirlo.
Si la red existente tiene otro nombre, ajustar LEXI_EXISTING_NETWORK en ese archivo.
No copiar el .env habitual ni reutilizar secretos de producción.

Luego, **solo después de aprobar el despliegue**, ejecutar:

```powershell
docker compose --env-file docker/abogados-dev/.env -f docker-compose.abogados-dev.yml up -d --build
```

Este comando levanta únicamente los tres servicios aislados. La primera ejecución
creará el nuevo volumen/base e insertará los fixtures; por eso NO se ejecuta durante
la preparación. No incluir `-f docker-compose.yml` y no usar `down -v`.

Abrir **http://localhost:5175/**. Consultar «Me despidieron sin causa», aceptar la
recomendación y comprobar Valentina y Martín con la advertencia. Una consulta de
garantía de compra debe devolver Lucía; una consulta ambigua usa el listado general.
El endpoint de desarrollo es http://localhost:5175/api/abogados/recomendaciones.
El endpoint habitual de 8082 debe continuar excluyendo ficticios.

Para verificar contenedores y configuración después del despliegue autorizado:

```powershell
docker compose --env-file docker/abogados-dev/.env -f docker-compose.abogados-dev.yml ps
docker compose --env-file docker/abogados-dev/.env -f docker-compose.abogados-dev.yml logs abogados-dev
```

Para volver a ejecutar **solo la carga idempotente**, una vez autorizado:

```powershell
docker compose --env-file docker/abogados-dev/.env -f docker-compose.abogados-dev.yml exec postgres-abogados-dev psql -X -v ON_ERROR_STOP=1 -U abogados_dev_owner -d abogacia_abogados_dev -f /docker-entrypoint-initdb.d/20-fixtures.sql
```

## Validación sin desplegar

Las pruebas `AbogadosDevIsolationTest` y `AbogadosDevSchemaTest` no crean bases,
no ejecutan SQL ni insertan filas. La primera usa entorno/contextos y JDBC simulado;
la segunda compara la definición SQL con los metadatos de Hibernate para PostgreSQL
sin abrir una conexión. Las pruebas completas preexistentes usan H2 y se pueden
volver a ejecutar por separado si se desea.

Resultado de preparación: **20 pruebas nuevas aprobadas** (aislamiento, metadatos
del esquema y archivos YAML/fixtures), compilación backend correcta y sintaxis del
script PowerShell comprobada sin ejecutarlo. No se volvió a ejecutar la suite H2
en esta preparación. El Compose habitual, Nginx y código frontend permanecieron
sin cambios en esta etapa.

Quedan pendientes hasta el despliegue autorizado: ejecutar el SQL en PostgreSQL 17,
confirmar ddl-auto=validate sobre ese esquema, probar dos cargas sin duplicados,
comprobar permisos del usuario runtime y verificar tarjetas y n8n desde 5175.

## Reconstruir únicamente el frontend de desarrollo

Con el backend de desarrollo y n8n ya activos, desde la raíz:

```powershell
docker compose --env-file docker/abogados-dev/.env -f docker-compose.abogados-dev.yml up -d --build --no-deps frontend-abogados-dev
```

No recrea el backend ni PostgreSQL. La eliminación de `ports` del backend en este
Compose se aplicará cuando ese contenedor se recree por separado; reconstruir solo
el frontend no elimina una publicación de puerto que ya tuviera el contenedor.
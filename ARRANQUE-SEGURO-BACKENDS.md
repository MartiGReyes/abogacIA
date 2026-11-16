# Arranque seguro de los backends

Actualización posterior: los tres backends habituales ya se actualizaron bajo autorización específica. Ver [ACTUALIZACION-BACKENDS-SEGUROS.md](ACTUALIZACION-BACKENDS-SEGUROS.md) para el estado actual. Lo que sigue documenta la etapa original de implementación y pruebas aisladas.

Fecha: 14/11/2026, America/Buenos_Aires. Las evidencias Docker usan UTC del 15/11.

La corrección está implementada en el código y verificada con los tres servicios en un entorno nuevo descartable. **No se actualizaron, reconstruyeron, recrearon ni arrancaron contenedores habituales.** Sus imágenes anteriores todavía contienen los inicializadores descritos en `ARRANQUE-SEGURO-LEXI.md` y no deben considerarse corregidas.

## Procesos encontrados

| Servicio / mecanismo | Escrituras posibles | Control |
| --- | --- | --- |
| Abogados: `RegistroConfig.estados`, ApplicationRunner | Inserta estados PENDIENTE, REGISTRADO y BAJA ausentes | `abogacia.bootstrap.states-enabled` |
| Ciudadanos: `DataInitializer.inicializarEstados`, CommandLineRunner | Inserta los mismos estados ausentes | `abogacia.bootstrap.states-enabled` |
| Abogados: `SembrarCuentasPrueba`, ApplicationRunner | Crea abogados ficticios, especialidades y marcas en `operativa.cuenta_prueba` | `abogacia.bootstrap.test-accounts-enabled`, además del control existente `abogados.cuentas-prueba.enabled` |
| Ciudadanos: `CuentasAisladas.sembrarCiudadano`, ApplicationRunner del perfil `cuentas-contacto-test` | Crea un ciudadano ficticio | `abogacia.bootstrap.test-accounts-enabled`, conservando el perfil y sus protecciones |
| Abogados: `EsquemaExtendido`, ApplicationRunner | Prepara tablas e índices de WhatsApp, contactos y casos; ejecuta `db/solicitudes.sql` y `db/indicadores.sql`, que también pueden actualizar datos | `abogacia.bootstrap.schema-enabled`, además de `ddl-auto=update` |
| Ciudadanos: `ConsultasLexiController.run`, ApplicationRunner | Prepara tabla e índice del historial de Lexi | `abogacia.bootstrap.schema-enabled`, además de `ddl-auto=update`; el controlador sigue disponible |
| Abogados: `PadronConfig.cargarPadron`, ApplicationRunner | Importa el XLSX al padrón y su evidencia | `abogacia.bootstrap.padron-enabled`, además de `abogados.padron.importar` / `PADRON_IMPORTAR` |
| Abogados y Ciudadanos: `ReconciliarDidit` | El `@PostConstruct` solo valida el intervalo. La tarea `@Scheduled`, con primer disparo a los 60 segundos, puede actualizar verificaciones y consultar Didit | Control existente `DIDIT_RECONCILIATION_ENABLED=false`, obligatorio en modo seguro |
| Hibernate | `update`, `create` o `create-drop` pueden alterar esquema | Modo seguro exige `spring.jpa.hibernate.ddl-auto=validate` |
| Inicialización SQL de Spring | Scripts configurados pueden alterar esquema/datos | `spring.sql.init.mode=never` |
| Migraciones | No se encontraron dependencias Flyway/Liquibase en los tres POM | Ambos controles deshabilitados explícitamente |

Autenticación no tiene runners, inicializadores de datos, tareas de bootstrap ni persistencia JPA propia. Crear el PasswordEncoder, el hash ficticio de comparación y los componentes JWT opera en memoria. Los controles de bootstrap también se incorporaron a este servicio para validar de forma uniforme la configuración segura.

Se revisaron runners, PostConstruct, eventos, beans, constructores de componentes y scripts SQL. No se encontraron otros escritores automáticos al arrancar en estos tres servicios. Las consultas de metadatos de componentes de contacto y casos no crean tablas. Las escrituras de registro, perfil, historial, solicitudes y WhatsApp corresponden a peticiones normales y no se desactivaron.

Los SQL bajo `resources/db/` son recursos explícitos, no `schema.sql`/`data.sql` automáticos. Los scripts de inicialización del contenedor PostgreSQL son un mecanismo distinto: **no deben reutilizarse sobre bases habituales**. En esta prueba se usaron copias únicamente al crear bases nuevas vacías.

## Configuración y comportamiento

Las siguientes propiedades nuevas están deshabilitadas por defecto en los tres servicios:

```properties
abogacia.bootstrap.development-enabled=false
abogacia.bootstrap.safe-start=false
abogacia.bootstrap.states-enabled=false
abogacia.bootstrap.test-accounts-enabled=false
abogacia.bootstrap.schema-enabled=false
abogacia.bootstrap.padron-enabled=false
spring.sql.init.mode=never
spring.flyway.enabled=false
spring.liquibase.enabled=false
```

Abogados y Ciudadanos tienen además Hibernate `validate` como valor base. Autenticación no usa EntityManager; su propiedad `validate` en modo seguro se comprueba como configuración, no como validación de un esquema propio.

Para arrancar sin inicializadores, usar el perfil nuevo `arranque-seguro`, o variables temporales equivalentes:

```text
ABOGACIA_BOOTSTRAP_SAFE_START=true
ABOGACIA_BOOTSTRAP_DEVELOPMENT_ENABLED=false
ABOGACIA_BOOTSTRAP_STATES_ENABLED=false
ABOGACIA_BOOTSTRAP_TEST_ACCOUNTS_ENABLED=false
ABOGACIA_BOOTSTRAP_SCHEMA_ENABLED=false
ABOGACIA_BOOTSTRAP_PADRON_ENABLED=false
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
SPRING_SQL_INIT_MODE=never
SPRING_FLYWAY_ENABLED=false
SPRING_LIQUIBASE_ENABLED=false
DIDIT_RECONCILIATION_ENABLED=false
PADRON_IMPORTAR=false
```

Si un perfil existente exige ser el único activo, conservar ese perfil y usar `ABOGACIA_BOOTSTRAP_SAFE_START=true`; no agregarle otro perfil. Esto se verificó con `contacto-operativo-test` y `cuentas-contacto-test` **dentro del proyecto nuevo**, sin modificar los entornos existentes con esos perfiles.

`BootstrapSeguroConfig` usa un BeanFactoryPostProcessor estático: rechaza configuraciones contradictorias antes de inicializar el datasource. En modo seguro exige los valores anteriores y rechaza cualquier bootstrap activo, importación del padrón o reconciliación Didit. No depende únicamente de Hibernate.

Habilitar un inicializador requiere **dos decisiones explícitas**: `development-enabled=true` y su propiedad individual `true`. Para cuentas ficticias, padrón y preparación de tablas se conservan también los requisitos anteriores de esos mecanismos. Con perfiles `beta`, `prod`, `production` o `produccion`, cualquier bandera de bootstrap activa impide el arranque, incluso con desarrollo habilitado. En esos perfiles los seeds están apagados por defecto.

Los estados se ejecutan con orden -100 y las cuentas con orden 100, cuando se habilitan. Desactivar estados no los elimina: una base existente debe conservar los estados necesarios para sus funciones normales. Una base vacía requiere preparación explícita y autorizada fuera del modo seguro.

## Archivos cambiados

Rutas relativas a este proyecto:

**Abogados**, bajo `microservicio-abogados/`:

- `src/main/java/com/abogacia/microservicio_abogados/config/RegistroConfig.java`
- `src/main/java/com/abogacia/microservicio_abogados/config/BootstrapSeguroConfig.java` (nuevo)
- `src/main/java/com/abogacia/microservicio_abogados/operativa/SembrarCuentasPrueba.java`
- `src/main/java/com/abogacia/microservicio_abogados/extension/EsquemaExtendido.java`
- `src/main/java/com/abogacia/microservicio_abogados/padron/PadronConfig.java`
- `src/main/resources/application.properties`
- `src/main/resources/application-arranque-seguro.properties` (nuevo)
- `src/test/resources/application.properties`
- `src/test/java/com/abogacia/microservicio_abogados/config/BootstrapSeguroConfigTest.java` (nuevo)
- `src/test/java/com/abogacia/microservicio_abogados/config/BootstrapRunnersTest.java` (nuevo)

**Ciudadanos**, bajo `microservicio-ciudadanos/`:

- `src/main/java/com/abogacia/microservicio_ciudadanos/config/DataInitializer.java`
- `src/main/java/com/abogacia/microservicio_ciudadanos/config/CuentasAisladas.java`
- `src/main/java/com/abogacia/microservicio_ciudadanos/config/BootstrapSeguroConfig.java` (nuevo)
- `src/main/java/com/abogacia/microservicio_ciudadanos/controller/ConsultasLexiController.java`
- `src/main/resources/application.properties`
- `src/main/resources/application-arranque-seguro.properties` (nuevo)
- `src/test/resources/application.properties`
- `src/test/java/com/abogacia/microservicio_ciudadanos/config/BootstrapSeguroConfigTest.java` (nuevo)
- `src/test/java/com/abogacia/microservicio_ciudadanos/config/BootstrapRunnersTest.java` (nuevo)

**Autenticación**, bajo `microservicio-autenticacion/`:

- `src/main/java/com/abogacia/microservicio_autenticacion/config/BootstrapSeguroConfig.java` (nuevo)
- `src/main/resources/application.properties`
- `src/main/resources/application-arranque-seguro.properties` (nuevo)
- `src/test/java/com/abogacia/microservicio_autenticacion/config/BootstrapSeguroConfigTest.java` (nuevo)

Los dos archivos de configuración de tests existentes habilitan explícitamente desarrollo y estados para conservar las pruebas H2 anteriores. Esa configuración no se empaqueta en los JAR de ejecución.

Los 12 archivos preexistentes modificados tienen respaldo previo en `../.private-bootstrap-seguro/`, manteniendo su ruta relativa. Se verificaron su existencia y hashes. El manifiesto [archivos.json](docker/arranque-seguro/archivos.json) registra hashes anteriores y posteriores de los 23 archivos de código/configuración/tests de esta etapa. Los cambios previos de Lexi, catálogo, autenticación y dashboard se conservaron.

## Pruebas

| Comprobación | Resultado |
| --- | --- |
| Suite Abogados | 183 pruebas, 0 errores, 0 fallos |
| Suite Ciudadanos | 63 pruebas, 0 errores, 0 fallos |
| Suite Autenticación | 10 pruebas, 0 errores, 0 fallos |
| Compilación y empaquetado de los tres servicios | Correctos |
| Bloqueo de cada bandera sin desarrollo explícito y en beta/producción | Correcto |
| Modo seguro rechaza DDL, SQL, migraciones, padrón, Didit o seeds contradictorios | Correcto |
| Runners no registrados sin opt-in; PasswordEncoder conservado | Correcto |
| Historial Lexi no ejecuta DDL con bandera apagada, incluso con `ddl-auto=update` | Correcto |
| Seeds explícitos en base nueva controlada | 2 abogados ficticios, 1 ciudadano ficticio, 3 estados por servicio; sin abogados con estado nulo |
| Tres servicios arrancan con seeds apagados | Correcto |
| Hibernate `validate` en Abogados y Ciudadanos | Correcto, sin errores de esquema |
| SQL init `never`, Flyway/Liquibase deshabilitados | Verificados en configuración efectiva; sin migraciones automáticas |
| Login y JWT de ABOGADO y CIUDADANO | Correctos |
| Perfil de ambos roles, dashboard, catálogo y recomendaciones | HTTP 200 |
| JWT alterado y contraseña incorrecta | HTTP 401 |
| Ciudadano accede al perfil de abogado | HTTP 403 |
| Cambios de esquema, filas o secuencias en modo seguro | Ninguno |
| Intentos DML/DDL y errores PostgreSQL desde arranque seguro | 0 y 0 |

Las 256 pruebas incluyen 17 específicas de bootstrap. Las suites anteriores también verifican funcionalidades normales; la integración ejecutó 10 comprobaciones HTTP reales. Se observaron advertencias de Mockito/Java sobre agentes dinámicos, sin fallos de pruebas.

El entorno nuevo se llama `abogacia-bootstrap-seguro-test`: PostgreSQL 17, dos backends con JPA y Autenticación; imágenes nuevas con prefijo `abogacia-bootstrap-seguro-`. Red interna sin puertos publicados ni salida a Internet. Los clientes de prueba usaron cuentas ficticias. No se llamó a Lexi/n8n, Gemini, Didit ni WhatsApp.

Tras preparar las cuentas en desarrollo, se detuvieron solo esos backends y se retiraron permisos DML/DDL de sus roles de prueba; además se estableció `default_transaction_read_only=on`. Se arrancaron con todas las banderas apagadas y una ruta inexistente para el archivo de contraseña de seeds, demostrando que no era necesario leerlo. La restricción de base solo se aplicó en este entorno descartable; no forma parte del código que deshabilita los runners.

Se comparó un volcado completo de esquema, datos y secuencias de los esquemas `public`, `operativa` y `ciudadanos_cuenta`, omitiendo únicamente los tokens aleatorios de seguridad que introduce pg_dump. Hash SHA-256 idéntico antes y después:

```text
f431c904e8789be70fcd3d49320d25b5c61dedef7c7d1748e2babadc3fea23bd
```

También permanecieron idénticos los contadores `n_tup_ins`, `n_tup_upd` y `n_tup_del` de todas las tablas. Se revisaron logs SQL desde el arranque seguro: cero sentencias de escritura y cero errores. Las operaciones `COPY ... TO stdout` de pg_dump son lecturas y se excluyeron del conteo de escrituras. La observación superó el primer intervalo de reconciliación programada.

Evidencia sin contraseñas, tokens ni claves: [resultados.json](docker/arranque-seguro/resultados.json). Configuración sintética, scripts y evidencias detalladas están en `../.private-bootstrap-seguro/integracion/`; no copiar sus secretos o cuentas al entorno habitual.

### Errores encontrados y resueltos durante la prueba

La primera base vacía reveló el orden no determinista entre estados y cuentas: Ciudadanos intentaba crear su cuenta sin estado y fallaba; Abogados podía quedar con estado nulo. Se corrigió el orden y se repitió desde una segunda base vacía, conservando el primer volumen. La segunda preparación fue correcta.

Los primeros clientes se ejecutaron mientras los servicios aún arrancaban y registraron un 401 y un timeout. El cliente definitivo espera disponibilidad antes de autenticar; las 10 comprobaciones finales pasaron. Esos intentos no se tomaron como resultados exitosos ni involucraron datos reales.

## Estado final y actualización pendiente

Los cuatro servicios nuevos de esta prueba quedaron **detenidos**. Se conservaron ambos volúmenes descartables y los respaldos; no se ejecutó `down -v`, eliminación de volúmenes ni comandos destructivos. La comprobación final de `docker ps` no muestra servicios activos. No se modificaron EP06, abogados-dev, otros entornos existentes, bases habituales, n8n ni el RAG.

El código compilado puede arrancar sin seeds ni escrituras de negocio usando la configuración segura comprobada. Esto no convierte toda la aplicación en solo lectura: sus endpoints normales siguen conservando sus funciones y controles de autorización.

Para actualizar los contenedores habituales falta una etapa expresamente autorizada:

1. Revisar estos cambios y conservar respaldos de artefactos, configuración y versiones desplegadas.
2. Autorizar la reconstrucción/despliegue o recreación **solo** de los componentes afectados para incorporar los JAR nuevos; reiniciar las imágenes viejas no incorpora estos controles.
3. Aplicar variables temporales seguras, manteniendo perfiles compatibles, endpoints, bases, credenciales y redes habituales. Verificar las variables efectivas antes del arranque.
4. Arrancar sin SQL de inicialización, seeds, migraciones ni importaciones; si `validate` falla, detenerse y reportar, sin cambiar a `update` ni corregir tablas automáticamente.
5. Repetir las comprobaciones de arranque, autenticación y lecturas, con evidencia de integridad y rollback preparado.
6. Continuar la activación coordinada de Lexi bajo su autorización específica y sus comprobaciones frontend/backend/n8n. Esta etapa no activó ningún workflow ni acredita todavía esa integración completa.

No hay una URL nueva publicada: las pruebas fueron por red interna y sus servicios ya están detenidos.

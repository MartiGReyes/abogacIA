> Actualización: este mismo entorno ahora incluye US35, US36 y US38 en localhost:5180.
> Usa el perfil `admin-gestion-test` y permisos de escritura limitados a las bases ficticias EP06.
> Se conservan el proyecto, volumen y credenciales existentes. El nombre histórico del archivo y los usuarios `*_reader` no cambia.
> Para volúmenes nuevos, `init/02-enable-gestion.sql` aplica los permisos después del esquema.
> Para el volumen existente, ese mismo script se aplica una vez con el propietario EP06 y guardas de base/datos sintéticos.
> Las descripciones de solo lectura que siguen documentan la fase original. Ver también `ADMIN-GESTION.md` en la raíz.

# Propuesta EP06 — entorno aislado de administración

Preparado y comprobado offline, **no iniciado ni desplegado**. Docker, los scripts
SQL y el aprovisionador de credenciales no se ejecutaron durante esta preparación.
No usar ninguno de los comandos de inicio hasta autorizar el arranque.

## Servicios, puertos y almacenamiento

Proyecto independiente `abogacia-admin-readonly-test`, archivo exclusivo
`docker-compose.admin-readonly.yml`. Nunca combinar con otro Compose mediante `-f`.

| Servicio | Puerto interno | Publicación en Windows |
| --- | --- | --- |
| frontend-admin-test | 80 | **127.0.0.1:5180** |
| autenticacion-admin-test | 8081 | Ninguna |
| ciudadanos-admin-test | 8080 | Ninguna |
| abogados-admin-test | 8082 | Ninguna |
| postgres-admin-test | 5432 | Ninguna |

Abrir `http://localhost:5180/admin/iniciar-sesion`. No ocupa 5173, 5175, 8080–8083,
5433 o 5678. La disponibilidad efectiva de 5180 debe volver a comprobarse antes
de iniciar; si está ocupado, no detener procesos existentes para liberarlo.

PostgreSQL 17 usa un volumen propio `ep06_admin_readonly_test_data` y tres bases:

- `ep06_test_control`: base inicial de administración del contenedor de prueba.
- `ep06_ciudadanos_test`: aplicación ciudadanos, usuario `ep06_ciudadanos_reader`.
- `ep06_abogados_test`: aplicación abogados, usuario `ep06_abogados_reader`.

Los nombres de contenedores generados llevan el prefijo del proyecto. No se
reutilizan nombres, redes, volúmenes, datos o archivos de credenciales habituales
ni del entorno de recomendaciones de 5175.

## Protecciones

- Red interna `ep06-private` para todos los servicios. Solo el frontend también se
  conecta a `ep06-web`, una bridge propia no interna, necesaria para publicar 5180.
  Ninguna de las dos redes es externa o compartida con otro proyecto; ningún servicio
  se conecta a `abogacia_default`, n8n, el RAG o la red de abogados-dev.
- Solo Nginx publica un puerto, limitado a loopback. Todo acceso API del navegador
  y de Postman pasa por el mismo origen 5180.
- Nginx permite únicamente el POST de login y los seis GET administrativos.
  Las demás rutas `/api/` devuelven 404; no hay proxy de registro, Didit,
  recomendaciones ni Lexi.
- El frontend tiene una entrada exclusiva, con aviso permanente de datos ficticios,
  que importa las pantallas administrativas y el login existentes. No incluye el
  portal ni el chat. No es un segundo sistema de autenticación.
- Solo en esta imagen, `VITE_AUTH_URL=/` y los dos orígenes administrativos `/`
  hacen relativas las peticiones. El frontend habitual mantiene sus valores por
  defecto. La única adaptación compartida es admitir ese origen configurable de login.
- Este proxy privado quita `Origin` al reenviar: CORS de los backends no necesita
  cambios para el puerto nuevo. No agrega CORS público ni usa sesiones por cookies.
- Perfil `admin-readonly-test`, `ddl-auto=validate` y `spring.sql.init.mode=never`.
  No se usa el perfil `abogados-dev` ni se habilitan sus lectores de fixtures.
- Los usuarios de aplicación tienen solo CONNECT, USAGE y SELECT; no son
  superusuarios ni pueden crear bases/roles. También tienen transacciones de solo
  lectura por defecto. El propietario de inicialización solo se usa en PostgreSQL.
- Importación de padrón y reconciliación Didit desactivadas; claves/workflow Didit
  vacíos y privacidad general bloqueada. Los backends y PostgreSQL permanecen solo
  en la red interna, sin salida normal a Internet. La red adicional es solo del frontend.
- Sin montaje del Excel, carpetas de legislación, backups o bases existentes.
- Los estados básicos se crean en el script de primera inicialización. Los
  inicializadores existentes de estados solo deben leerlos; si faltan, el permiso
  de solo lectura hará fallar cualquier intento de crearlos.

## Datos completamente sintéticos

No se copia información desde una base, backup, padrón o documento real.

| Datos | Cantidad / propósito |
| --- | --- |
| Ciudadanos | 18; seis PENDIENTE, seis REGISTRADO y seis BAJA |
| Abogados | 45; quince de cada estado; tres páginas con tamaño 20 |
| Identidad | APROBADA, PENDIENTE, RECHAZADA y resultado ausente |
| Sesiones locales | Approved, In Progress, Declined, Expired, fechas disponibles o nulas |
| Sin sesión local | IDs divisibles por 5, por ejemplo ciudadano 5 y abogado 5 |
| Matrícula | VALIDADA, INACTIVA, DNI_DISTINTO, PENDIENTE_REVISION e INEXISTENTE |

Nombres y apellidos indican ficción, correos usan `ep06.example.com`, no hay
teléfonos ni domicilios. Los DNI son secuencias generadas exclusivamente para estas
bases; no representan identidades verificadas. Los estados aprobados son fixtures,
no decisiones remotas. Las sesiones tienen referencias `EP06-SYNTHETIC-*`, sin URLs.

Se prepara una evidencia de padrón enteramente sintética para el abogado 1,
únicamente para probar su login existente. No se importa ningún padrón ni se trata
esa evidencia como habilitación de una persona real. El dominio reservado también
evita que estas cuentas se recomienden por el lector público normal.

## Aprovisionamiento futuro, sin registro ADMIN

Una vez autorizado preparar las credenciales, desde la raíz:

```powershell
.\scripts\dev\Preparar-AdminLectura.ps1
```

Requiere Java 21 y los JAR locales Spring Security Crypto y commons-logging en la
caché `.m2/repository-tests` o `.m2/repository`. El script no descarga dependencias.
Debe ejecutarse en una terminal interactiva que permita la ejecución del script.

Solicita sin eco y con confirmación:

1. Una contraseña nueva para ADMIN EP06, entre 16 y 72 bytes UTF-8.
2. Otra contraseña nueva y diferente para las cuentas ciudadana/abogado de prueba.

Solo escribe hashes BCrypt de costo 12 y secretos aleatorios independientes en
`docker/admin-readonly/.env`, ignorado por Git y excluido del contexto Docker.
No guarda contraseñas de usuario en texto plano ni las imprime. Rechaza sobrescribir
un archivo existente. No leer/copiar `.env` habitual ni reutilizar sus contraseñas.

ADMIN es `admin.ep06@example.com` y se aprovisiona mediante las variables existentes
`ADMIN_MAIL` y `ADMIN_PASSWORD_HASH`. No tiene registro público ni tabla nueva.

Para Postman, las otras cuentas son `ciudadano001@ep06.example.com` y
`abogado001@ep06.example.com`, ambas con la segunda contraseña elegida. Los JWT
usan una clave exclusiva de este entorno y vencen a los 15 minutos.

## Comando exacto de inicio — NO ejecutado

Desde la raíz, con `.env` EP06 preparado y **solo después de autorizar el arranque**:

```powershell
docker compose --env-file docker/admin-readonly/.env -f docker-compose.admin-readonly.yml up -d --build
```

El primer arranque de un volumen vacío **ejecutará** el esquema y las fixtures en
las bases nuevas de EP06. No debe ejecutarse bajo la restricción actual de no SQL.
Los backends validarán el esquema en lugar de crearlo o actualizarlo. No se inician
ni recrean servicios de otros proyectos. La primera construcción requiere descargar
imágenes/dependencias si no están en caché.

La inicialización no es una migración ni un script para volver a aplicar: solo
funciona en el volumen nuevo. Si falla parcialmente, revisar el error antes de hacer
otro cambio; no borrar volúmenes ni reejecutar este baseline a ciegas. No usar `down -v`.
Recrear el archivo de secretos sobre un volumen ya inicializado tampoco cambia sus
contraseñas de base de datos.

Esperar a que los backends terminen de validar y arrancar antes de probar los
indicadores: `depends_on` no comprueba su disponibilidad HTTP. No agregar endpoints
de escritura para resolver errores de inicialización.

### Recrear solo los servicios afectados por la corrección de arranque

Con PostgreSQL y autenticación EP06 ya iniciados, y después de revisar/autorizar
la corrección, desde la raíz:

```powershell
docker compose --env-file docker/admin-readonly/.env -f docker-compose.admin-readonly.yml up -d --build --no-deps --force-recreate ciudadanos-admin-test abogados-admin-test
docker compose --env-file docker/admin-readonly/.env -f docker-compose.admin-readonly.yml up -d --no-build --no-deps --force-recreate frontend-admin-test
```

La primera orden reconstruye los backends con el bean `adminReadFilterChain`,
distinto del componente `adminReadSecurity`. La segunda recrea el frontend con
las dos redes; su imagen no cambió. Ejecutarlas en ese orden permite que los
nombres DNS de los backends estén registrados antes de iniciar Nginx.
No recrean PostgreSQL ni autenticación, ni reinicializan el volumen. No se
ejecutaron estas órdenes durante la corrección de código y configuración.

Las pruebas `AdminLecturaTest` de ambos servicios ahora usan escaneo de componentes
con los nombres predeterminados de Spring y sobrescritura de beans deshabilitada.
Verifican los dos beans distintos sin datasource ni EntityManagerFactory, además
de los permisos y DTO de los endpoints. El escaneo se limita a seguridad y al
controlador administrativo; los repositorios son simulados.

## Recorrido visual propuesto

1. Abrir 5180 y entrar como ADMIN con la contraseña EP06 elegida.
2. Verificar totales 18 y 45, y los tres estados de cuenta.
3. Abrir abogados: tamaño 20, páginas de 20, 20 y 5 filas.
4. Buscar `Ana`: 22 resultados. Filtrar cuenta REGISTRADO: 15 resultados.
5. Combinar identidad APROBADA y matrícula VALIDADA: tres resultados.
6. En identidad, seleccionar Abogado y buscar por nombre o apellido. Usar «Ver
   resultado local» para las cuentas ficticias 1–5; comparar estados y fechas ausentes.
7. Cambiar a Ciudadano: el detalle anterior debe desaparecer. Seleccionar las
   cuentas 1–5 desde el listado; la quinta no tiene sesión local. No se escribe un ID.
   Comprobar 18 ciudadanos, páginas de 10 y 8 filas, y una búsqueda sin resultados.
8. Cerrar sesión y comprobar que no se accede directamente al panel.

## Colección Postman preparada, no ejecutada

Importar:

- `postman/EP06.postman_collection.json`
- `postman/EP06.postman_environment.json`

Elegir el entorno EP06. Completar únicamente en los valores locales de Postman
`adminPassword` y `fixturePassword`; ambos vienen vacíos y marcados como secretos.
No introducir credenciales habituales. El script de pre-request omite solicitudes
si `baseUrl` no es exactamente `http://localhost:5180`.

Ejecutar la colección en orden: primero realiza los tres logins reales de prueba y
conserva sus tokens en el entorno local. Después verifica los seis endpoints con
ADMIN (200), sin token (401), ciudadano (403), abogado (403) y token inválido (401).
También cubre filtros, última página, respuesta vacía, falta de sesión local, 404
y paginación inválida. Comprueba ausencia de campos sensibles y caché.

La colección contiene 56 peticiones. Incluye búsqueda/paginación de ciudadanos y
los cinco estados ficticios de identidad de ambos tipos de cuenta. No contiene contraseñas, claves de firma ni
tokens reales. No incluye registro, SQL, mutaciones de cuentas o llamadas a Didit.
Al finalizar borrar los tokens y contraseñas locales antes de exportar o compartir
evidencias; no publicar capturas del login o headers Authorization.

### Actualizar solo la mejora de selección US37

Después de revisar y autorizar el despliegue, con los demás servicios EP06 activos:

```powershell
docker compose --env-file docker/admin-readonly/.env -f docker-compose.admin-readonly.yml up -d --build --no-deps --force-recreate ciudadanos-admin-test
docker compose --env-file docker/admin-readonly/.env -f docker-compose.admin-readonly.yml up -d --build --no-deps --force-recreate frontend-admin-test
```

El frontend necesita reconstrucción por la pantalla y la ruta Nginx nuevas.
No se recrean abogados, PostgreSQL ni autenticación. No se ejecutaron estas órdenes
al implementar la mejora. No hay cambios de esquema, fixtures, permisos o volumen.

## Validaciones realizadas sin iniciar el entorno

- Parseo YAML y comprobación de servicios, red, volumen, puertos y flags de seguridad.
- Comparación offline de todas las tablas, columnas y tipos de ciudadanos y abogados
  con los metadatos Hibernate, sin conexión ni ejecución de SQL.
- Compilación en memoria del frontend con las mismas entradas de la imagen aislada;
  prueba del login relativo y ausencia de destinos habituales, Lexi y WhatsApp.
- Parseo JSON y sintaxis JavaScript de la colección; no se enviaron peticiones Postman.
- Sintaxis del script PowerShell y compilación del aprovisionador Java; no se ejecutó.
- Pruebas frontend, compilación habitual, TypeScript y lint.

Para repetir solo las nuevas comprobaciones backend sin SQL, desde la raíz:

```powershell
$cacheEp06 = Join-Path $PWD '.m2/repository-tests'
mvn.cmd -o "-Dmaven.repo.local=$cacheEp06" -f microservicio-abogados/pom.xml "-Dtest=AdminEntornoSchemaTest,AdminEntornoArchivosTest" test
mvn.cmd -o "-Dmaven.repo.local=$cacheEp06" -f microservicio-ciudadanos/pom.xml "-Dtest=AdminEntornoSchemaTest" test
npm.cmd --prefix frontend test
```

Pendientes hasta autorizar el arranque: sintaxis/ejecución real de PostgreSQL 17,
`validate` contra esa instancia, arranque de imágenes, disponibilidad HTTP, permisos
efectivos, recorrido visual y ejecución de Postman. La comprobación offline no
sustituye esas validaciones. No se garantiza aún que el entorno arranque sin ajustes.

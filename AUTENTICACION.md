# Autenticación de abogacIA

## Alcance y decisiones

Referencia de la validación JWT estándar: [Spring Security Resource Server JWT](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html).

- Ciudadanos conserva su base, BCrypt, registro, confirmación, consulta, modificación y baja.
- Autenticación recibe `POST /api/auth/login` con `mail`, `contrasena` y `tipoCuenta` (`CIUDADANO`, `ABOGADO` o `ADMIN`).
- Ciudadanos valida las credenciales en su endpoint interno, protegido con HTTP Basic estándar de Spring Security. No hay filtro propio ni API Key.
- Autenticación devuelve exclusivamente `token`, `rol` e `idUsuario`. JWT HS256, emisor `abogacia-auth`, duración predeterminada de 30 minutos. No implementa OAuth ni refresh tokens; las bibliotecas JOSE/resource-server de Spring se usan para firmar y validar JWT.
- Los endpoints por CUIL verifican el ID del JWT y el estado REGISTRADO en la base. Cambiar el CUIL de una URL no da acceso a otra cuenta. Un ADMIN tampoco obtiene acceso automático a cuentas de ciudadanos.
- React conserva el token en sessionStorage (por pestaña), sin guardar contraseñas. Cerrar sesión elimina la sesión local; también se elimina al vencer el token o recibir 401.
- **El JWT sigue siendo válido hasta su vencimiento aunque se cierre sesión.** No hay revocación ni endpoint de logout. Dar de baja una cuenta impide nuevas operaciones por la comprobación de estado, aunque su JWT todavía tenga una firma válida.
- ADMIN se configura con correo y hash BCrypt mediante entorno, sin tabla ni registro público. Si esas variables no se configuran, el acceso ADMIN está deshabilitado.
- ABOGADO consulta el endpoint interno de abogados con el mismo patrón Basic de ciudadanos. Solo una cuenta REGISTRADO, con correo confirmado, DNI aprobado y matrícula validada contra el padrón local vigente puede iniciar sesión. Ver [ABOGADOS.md](ABOGADOS.md) para US06 y la integración Didit Etapa 1.

## Preparar el entorno

Se requieren Java 21, Maven, Node/npm y PostgreSQL. Crear la base `abogacia_ciudadanos` si aún no existe. No se necesita `abogacia_auth`.

Definir en **ambos procesos Java** los mismos valores:

| Variable | Contenido |
| --- | --- |
| INTERNAL_USERNAME | Nombre de la cuenta técnica, por ejemplo autenticacion |
| INTERNAL_PASSWORD | Contraseña aleatoria de la cuenta técnica |
| JWT_SECRET | Clave aleatoria de al menos 32 bytes, codificada en Base64 |

Solo ciudadanos requiere `DB_PASSWORD`. Opcionales: `DB_USERNAME` (postgres), `DB_URL` (jdbc:postgresql://localhost:5432/abogacia_ciudadanos).
Autenticación acepta `CIUDADANOS_URL` (http://localhost:8080), `ABOGADOS_URL` (http://localhost:8082) y `JWT_TTL_SECONDS` (1800; entre 1 y 86400). Abogados requiere las mismas credenciales internas; mantiene su base propia y el puerto 8082.

Ejemplo para generar los secretos en PowerShell, **una sola vez**:

```powershell
$jwtBytes = New-Object byte[] 32
$internalBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($jwtBytes)
$rng.GetBytes($internalBytes)
$env:JWT_SECRET = [Convert]::ToBase64String($jwtBytes)
$env:INTERNAL_PASSWORD = [Convert]::ToBase64String($internalBytes)
$env:INTERNAL_USERNAME = 'autenticacion'
$rng.Dispose()
```

Configurar esos mismos valores en las configuraciones de ejecución del IDE o en las dos terminales. No volver a generar una clave distinta para cada servicio. Usar el gestor de secretos del entorno o variables de proceso; no subir secretos al repositorio ni ponerlos en variables VITE_.

En la terminal de ciudadanos, definir además:

```powershell
$env:DB_PASSWORD = 'tu-contraseña-local-de-postgres'
```

Spring no carga automáticamente un archivo .env; usar variables de entorno del proceso. Reiniciar los servicios tras cambiar variables.

Para ADMIN, configurar solo en autenticación:

```powershell
$env:ADMIN_MAIL = 'admin@tu-dominio.com'
$env:ADMIN_PASSWORD_HASH = '<hash BCrypt de la contraseña elegida>'
```

Para generar ese hash con el BCrypt del proyecto, desde la raíz:

```powershell
mvn -f microservicio-autenticacion/pom.xml dependency:build-classpath "-Dmdep.outputFile=target/admin-classpath.txt"
$authClasspath = Get-Content microservicio-autenticacion/target/admin-classpath.txt
jshell --class-path $authClasspath
```

En JShell ejecutar (con una contraseña elegida para tu entorno):

```java
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
new BCryptPasswordEncoder().encode("tu-contraseña-de-administrador");
/exit
```

Copiar el hash resultante sin las comillas dobles a ADMIN_PASSWORD_HASH. En PowerShell usar comillas simples para conservar sus caracteres `$`. No guardar la contraseña ni el hash real en archivos versionados.

HTTP local está previsto para desarrollo. En un despliegue usar HTTPS para el navegador y la comunicación interna, y restringir el acceso de red al endpoint interno. Basic no cifra las credenciales por sí mismo.

## Iniciar

Desde la raíz, en terminales distintas con las variables indicadas:

```powershell
mvn -f microservicio-ciudadanos/pom.xml spring-boot:run
```

```powershell
mvn -f microservicio-autenticacion/pom.xml spring-boot:run
```

Frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Direcciones: ciudadanos 8080, autenticación 8081, React http://localhost:5173. En Windows se usa npm.cmd para evitar la restricción de ejecución de npm.ps1. Se comprobó con Maven instalado; el wrapper de este entorno presentó un error de arranque.

## Probar manualmente

1. Abrir http://localhost:5173/registro y registrar un ciudadano mayor de edad.
2. Obtener el código del correo por consola que ya utiliza el proyecto y confirmar en /confirmar-registro. Un PENDIENTE no puede iniciar sesión.
3. Abrir /iniciar-sesion, seleccionar Ciudadano e ingresar correo y contraseña. Se muestra /mis-datos/:cuil, desde donde se mantienen modificación y baja.
4. Recargar la página: la sesión permanece en esa pestaña mientras no venza.
5. Cambiar el CUIL en la ruta para intentar acceder a otra cuenta: la API devuelve 403. Sin JWT devuelve 401.
6. Pulsar Cerrar sesión: se elimina el token y las rutas protegidas llevan al login. No se hace una petición de logout.
7. Una cuenta dada de baja no puede iniciar sesión; un JWT anterior tampoco permite operar sobre esa cuenta.
8. Seleccionar Abogado: valida credenciales mediante el servicio de abogados. Una cuenta pendiente devuelve 401; Didit Etapa 1 permite iniciar/retomar la verificación en /verificar-identidad mediante un acceso temporal exclusivo del registro, sin habilitar el login profesional. El registro está en /registro-abogado.
9. Para ADMIN configurado, abrir /admin/iniciar-sesion. Se confirma la sesión ADMIN; no se implementa un panel administrativo.

Para probar la API con un ciudadano confirmado:

```http
POST http://localhost:8081/api/auth/login
Content-Type: application/json

{"mail":"ciudadano@example.com","contrasena":"contraseña-elegida","tipoCuenta":"CIUDADANO"}
```

Respuesta: `{"token":"...","rol":"CIUDADANO","idUsuario":"..."}`.
Enviar `Authorization: Bearer <token>` al consultar `GET http://localhost:8080/api/ciudadanos/me` o al operar por CUIL.
Credenciales incorrectas, mail inexistente, PENDIENTE y BAJA devuelven 401 con el mismo mensaje. Peticiones inválidas devuelven 400; un servicio de ciudadanos no disponible devuelve 503.

## Ciudadanos: DNI en lugar de CUIL (12/10/2026)

El ciudadano se registra con **DNI** (7 u 8 dígitos) en lugar de CUIL. Las rutas por cuenta pasaron a `/api/ciudadanos/{dni}` (GET, PUT y PATCH `/baja`) y Didit compara el DNI del documento directamente con el registrado. En React, el perfil está en `/mis-datos` y se carga desde `/api/ciudadanos/me`. Donde el texto siguiente diga CUIL, leer DNI.

## Verificación de identidad de ciudadanos (Didit)

Agregado el 12/10/2026, replicando la Etapa 1 de abogados (ver [ABOGADOS.md](ABOGADOS.md)) en el microservicio de ciudadanos. **Cambia el flujo anterior:** confirmar el correo ya no habilita la cuenta.

1. Registro en `/registro` → cuenta PENDIENTE.
2. Confirmación del código en `/confirmar-registro` → `correoConfirmado=true`, la cuenta sigue PENDIENTE y el login devuelve 401.
3. `/verificar-identidad-ciudadano`: correo y contraseña entregan un token temporal (15 minutos); el ciudadano acepta el aviso y completa documento, prueba de vida y Face Match en Didit.
4. Con la decisión aprobada por Didit y el DNI del documento igual al contenido en el CUIL registrado (dígitos 3 a 10), la cuenta pasa a REGISTRADO y puede iniciar sesión. Un DNI distinto produce RECHAZADA.

Endpoints en el puerto 8080, con las mismas reglas que abogados: GET `/api/ciudadanos/verificacion/aviso`, POST `/acceso`, POST `/sesion`, GET `/estado`, POST `/consultar` y POST `/cerrar`. Se autorizan con el header `X-Registro-Token`, no con JWT. Las variables `DIDIT_*` son las mismas que en abogados; `DIDIT_CALLBACK_URL` vale por defecto `http://localhost:5173/verificar-identidad-ciudadano`. Ambos servicios pueden usar la misma API Key y el mismo workflow: cada sesión se vincula a su servicio por `vendor_data`.

Cuentas existentes: los ciudadanos que ya estaban REGISTRADO antes del cambio conservan el acceso sin verificación. Los PENDIENTE confirman el correo y luego deben verificarse.

## Verificación automatizada

```powershell
mvn -f microservicio-ciudadanos/pom.xml test
mvn -f microservicio-autenticacion/pom.xml test
cd frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Las pruebas de ciudadanos usan H2 solo en test, sin tocar PostgreSQL. Prueban registro/confirmación, Basic interno, credenciales/estados, JWT vencido y firma incorrecta, roles, autorización de consulta/modificación/baja y CORS. Las de autenticación usan un servidor HTTP de prueba para validar la llamada interna, errores y JWT, además de ADMIN y ABOGADO. Las pruebas de React verifican la capa de sesión (persistencia, expiración, 401 y logout); no sustituyen una prueba visual en navegador.

## Archivos y limpieza

- Se conservaron ValidarCredencialesCiudadanoGestor, su DTO y su controller: separan la validación BCrypt en ciudadanos y solo devuelven el identificador.
- SecurityConfig de ciudadanos ahora tiene dos cadenas estándar: Basic para rutas internas y JWT para las operaciones de cuenta.
- CuentaPropia y las anotaciones del controller impiden operaciones sobre cuentas ajenas. /me permite resolver el perfil del token sin pedir el CUIL en el login.
- Autenticación incorpora LoginController y SecurityConfig, y elimina su configuración/dependencias de PostgreSQL y JPA. No se borró ninguna base existente.
- Se eliminó INTERNAL_API_KEY. InternalApiKeyFilter no existía.
- Se quitaron la dependencia explícita redundante spring-security-crypto y Lombok/configuración de procesadores sin uso de ciudadanos.
- Frontend incorpora IniciarSesion, AuthContext y authService; adapta App, ciudadanoService y la baja para usar/cerrar la sesión.
- No se eliminaron clases funcionales existentes. Se agregaron pruebas y configuración de test aislada.

El login de abogados está conectado al servicio de abogados. Pendientes: configuración privada/aviso aprobado de Didit y su Etapa 2, envío real de correo y las futuras funciones/pantallas de administración. Recuperación de contraseña, OAuth, refresh tokens y revocación quedan fuera del alcance solicitado.

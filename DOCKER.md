# Levantar los microservicios con Docker

> **Forma simple (sin comandos):** doble clic en `iniciar.bat`, `ver-codigos.bat` y `detener.bat`. Ver [README.md](README.md). `iniciar.bat` crea `.env` desde `.env.example` con secretos aleatorios y valores de desarrollo (`ABOGADOS_CORREO_CONSOLA=true`, `DIDIT_PRIVACY_READY=true`, aviso `0.1-dev`), pide la API Key de Didit y ejecuta `docker compose up -d --build --wait`. Los scripts están en `scripts/`.

`docker-compose.yml` levanta PostgreSQL, los tres microservicios y el frontend (compilado con Node y servido con nginx en el puerto 5173). Para desarrollar el frontend con recarga en caliente se puede seguir usando `npm.cmd run dev`, deteniendo antes el contenedor `frontend` (`docker compose stop frontend`) porque usa el mismo puerto.

| Contenedor | Puerto en la máquina | Detalle |
| --- | --- | --- |
| postgres | 5433 | PostgreSQL 17 con `abogacia_ciudadanos` y `abogacia_abogados`. Usa 5433 para no chocar con un PostgreSQL instalado localmente. |
| ciudadanos | 8080 | |
| autenticacion | 8081 | Llama a `ciudadanos` y `abogados` por la red interna de Docker. |
| abogados | 8082 | Lee el padrón desde `docker/padron/`. |
| frontend | 5173 | React compilado, servido con nginx. |

## Requisitos

- Docker Desktop (Windows/Mac) o Docker Engine con el plugin Compose.
- No hace falta Java, Maven ni PostgreSQL en la máquina: las imágenes compilan cada servicio con Maven y Java 21.

## Primera vez

1. Desde la raíz del repositorio, copiar la configuración y completarla:
   ```powershell
   Copy-Item .env.example .env
   ```
   Completar `DB_PASSWORD`, `INTERNAL_PASSWORD`, `JWT_SECRET` y, para Didit, `DIDIT_API_KEY`. El archivo `.env` está en `.gitignore`: no subirlo nunca.
2. (Opcional) Para importar el padrón, copiar `PADRON-RIO-TERCERO-ENERO.xlsx` a `docker/padron/` y poner `PADRON_IMPORTAR=true`.
3. Levantar todo:
   ```powershell
   docker compose up --build
   ```
   La primera compilación descarga dependencias y tarda varios minutos; las siguientes usan la caché.
4. En otra terminal, el frontend:
   ```powershell
   npm.cmd --prefix frontend run dev
   ```

## Frontend

React 19 + Vite + Tailwind CSS v4 + TypeScript, con el diseño de Figma Make (navy y dorado). Pantallas conectadas al backend: login (ciudadano/abogado), registro de ciudadano con código y Didit (`/registro` → `/verificar-identidad-ciudadano`), registro de abogado en 5 pasos (`/registro-abogado`), estado de la cuenta profesional y perfil del ciudadano (`/mis-datos`). El inicio con Lexi, el catálogo de abogados y el historial siguen con datos de demostración (`src/demoData.ts`).

| Comando (desde `frontend/`) | Uso |
| --- | --- |
| `npm.cmd install` | Primera vez |
| `npm.cmd run dev` | http://localhost:5173 (puerto fijo: Didit y CORS lo esperan) |
| `npm.cmd test` / `npm.cmd run lint` / `npm.cmd run build` | Tests de servicios, lint y build |

## Uso diario

| Acción | Comando |
| --- | --- |
| Levantar en segundo plano | `docker compose up -d --build` |
| Ver logs (por ejemplo, códigos de confirmación) | `docker compose logs -f ciudadanos abogados` |
| Detener | `docker compose down` |
| Borrar también la base de datos | `docker compose down -v` |
| Reconstruir un servicio tras cambiar código | `docker compose up -d --build abogados` |

Los datos de PostgreSQL se guardan en el volumen `pgdata` y sobreviven a `docker compose down`. `init.sql` crea las bases solo la primera vez que se crea ese volumen.

## Notas

- Los códigos de confirmación de correo se ven en los logs (`ABOGADOS_CORREO_CONSOLA=true` en abogados; ciudadanos siempre usa consola).
- Las URLs de regreso de Didit y el CORS apuntan a `http://localhost:5173`. Para un despliegue real hay que cambiarlos, usar HTTPS y no exponer el puerto de PostgreSQL.
- Las imágenes se construyen sin ejecutar tests (`-DskipTests`). Correr los tests con Maven antes de publicar cambios.

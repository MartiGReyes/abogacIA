# AbogacIA

Plataforma que conecta personas con abogados de Córdoba, con verificación de identidad por Didit y orientación legal con Lexi.

## Cómo hacerlo funcionar (Windows)

**Solo necesitás Docker Desktop.** No hace falta instalar Java, Node ni bases de datos.

### La primera vez

1. Instalá **Docker Desktop** desde https://www.docker.com/products/docker-desktop/ y reiniciá la computadora.
   Si al abrirlo dice *WSL not installed*, abrí PowerShell como administrador, ejecutá `wsl --install` y reiniciá de nuevo.
2. Pedile a quien mantiene el proyecto la **API Key de Didit** (por mensaje privado, nunca por el repositorio).
3. Hacé doble clic en **`iniciar.bat`**.
   - Si Docker Desktop está cerrado, lo abre solo.
   - Te pide la API Key: pegala y presioná Enter (no se ve mientras la pegás).
   - La primera vez tarda varios minutos porque descarga y compila todo.
   - Al terminar se abre la página en **http://localhost:5173**.

### Todos los días

| Para... | Hacé doble clic en |
| --- | --- |
| Encender AbogacIA | `iniciar.bat` |
| Ver los códigos de confirmación de email (todavía no se mandan emails de verdad) | `ver-codigos.bat` |
| Apagar AbogacIA | `detener.bat` |

Los usuarios que registres se guardan en tu computadora y siguen ahí la próxima vez. Cada integrante tiene su propia base de datos.

### Si algo no anda

- **"Docker Desktop no terminó de iniciar":** abrí Docker Desktop a mano, esperá a que abajo a la izquierda diga *Engine running* y volvé a abrir `iniciar.bat`.
- **La verificación con Didit dice que no está disponible:** falta la API Key. Abrí el archivo `.env` con el Bloc de notas, pegá la clave después de `DIDIT_API_KEY=` y volvé a abrir `iniciar.bat`.
- **Otro error:** sacale una captura a la ventana y mandásela a quien mantiene el proyecto.

## Para quien desarrolla

- Detalle de Docker, variables y comandos: [DOCKER.md](DOCKER.md).
- Registro de abogados, Didit y padrón: [ABOGADOS.md](ABOGADOS.md).
- Login, ciudadanos y seguridad: [AUTENTICACION.md](AUTENTICACION.md).
- `.env` contiene secretos y **nunca** se sube al repositorio (está en `.gitignore`); `.env.example` es la plantilla.

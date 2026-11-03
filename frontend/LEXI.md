# Integración de Lexi con n8n

El chat existente de `src/pages/Home.tsx` envía `POST /api/lexi/orientacion`
con `{ "chatInput": "..." }`. Espera `{ "orientacion": "..." }`.
No hay respuestas jurídicas simuladas ni fallback legal local.

## Desarrollo local

1. Publicar y activar manualmente el workflow existente `AbogacIA - Orientacion Legal`.
2. Opcionalmente copiar `frontend/.env.example` a `frontend/.env.local`.
   `LEXI_N8N_URL` configura el servidor y `LEXI_N8N_PATH` la ruta permanente.
   Estas variables son del proxy, no se exponen como variables `VITE_`.
3. Desde `frontend`, ejecutar `npm run dev` y abrir `http://127.0.0.1:5173`.
   Si Docker ocupa 5173, ejecutar `npm run dev -- --port 5174` y abrir
   **http://127.0.0.1:5174/**. No usar `--host`: la configuración fija IPv4
   para evitar que `localhost` alcance otro listener IPv6 de Windows/WSL.
   Los microservicios actualmente permiten CORS desde `http://localhost:5173`;
   login y otras llamadas directas pueden requerir configurar su origen de desarrollo.
   Esa configuración no se modifica como parte del diagnóstico del renderizado.
4. Abrir el chat existente, enviar una consulta y revisar la ejecución en n8n.
5. Cerrar y reabrir el chat: los mensajes se conservan mientras la página permanezca abierta.
   Recargar la página los elimina. No se guardan consultas en almacenamiento persistente.
6. Si n8n falla, comprobar el error visible y usar `Reintentar consulta`.

No se envían credenciales. Un 401/403 produce un error de autorización;
no se intenta eludir la autenticación. Un 404 indica comprobar publicación y activación.

## Docker Compose (frontend habitual)

Nginx reenvía `/api/lexi/orientacion` a
`http://n8n:5678/webhook/orientacion-legal` dentro de la red de Compose.
Conserva el método POST, el cuerpo JSON y Content-Type; no agrega credenciales
ni reintenta automáticamente las solicitudes. El proxy de Vite no interviene.

Desde la raíz del repositorio, con Docker y n8n ya ejecutándose:

```powershell
docker compose up -d --build --no-deps frontend
docker compose exec frontend nginx -t
```

El primer comando reconstruye y, si corresponde, recrea solo el frontend;
no inicia dependencias ni borra volúmenes. No hace falta ejecutar Vite.
Abrir `http://localhost:5173/` y recargar sin caché con Ctrl+F5.
El Dockerfile ya copia esta configuración y compila el código actualizado.

Para comprobar el POST desde PowerShell:

```powershell
$consultaLexi = @{ chatInput = '¿Qué legislación tenés disponible?' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5173/api/lexi/orientacion' -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($consultaLexi))
```

Se espera un JSON con `orientacion`. Un 404 de n8n requiere comprobar que el
workflow existente esté publicado y activo; un 502 requiere revisar que n8n esté
disponible en la red de Compose. Verificar después una consulta desde el chat
y su ejecución en n8n. No modificar el workflow para esta instalación.

## Validación y pendientes

- `npm test`: 17 pruebas aprobadas, incluidas 5 nuevas de contrato, errores,
  timeout, concurrencia, conservación del historial y reintento sin duplicados.
- `npm run build` y `npm run lint`: correctos.
- El POST directo y el POST a través del proxy Vite llegan a n8n, que responde
  404 indicando que `POST orientacion-legal` no está registrado.
- No se verificó una orientación real, autenticación del webhook activo,
  recuperación RAG ni exactitud jurídica. OPTIONS 204 no acredita un webhook público.
- No se alteraron workflows, legislación ni bases de datos.
- Recomendaciones, tarjetas y perfiles de prueba siguen pendientes.
  Antes de cargar datos se necesita acceso de lectura a PostgreSQL para inspeccionar
  el registro existente y confirmar una base de desarrollo aislada.

# Subir abogacIA a un servidor gratuito (Oracle Cloud Always Free)

Resultado: la app queda en `https://<nombre>.duckdns.org` con HTTPS, usando `docker-compose.yml`
más `docker-compose.produccion.yml`. El uso local (`iniciar.bat`) no cambia.

Necesitan tener a mano:
- El `.env` con los secretos (clave Didit `sk_live`, Workflow ID, etc.).
- Los respaldos `abogacia_abogados.dump`, `abogacia_ciudadanos.dump`, `abogacia_rag.dump`.
- La clave de Gemini (`GEMINI_API_KEY` en `.env`). El flujo de Lexi ya está en el repo.

## 1. Crear la máquina

1. Cuenta en https://www.oracle.com/cloud/free/ (pide tarjeta para verificar; no cobra en recursos *Always Free*).
2. *Compute → Instances → Create instance*:
   - Image: **Ubuntu 24.04**. Shape: **VM.Standard.A1.Flex**, 4 OCPU / 24 GB.
     Si dice *Out of capacity*, probar otro *Availability domain* o reintentar más tarde.
   - Descargar la clave SSH (`.key`). Anotar la **IP pública**.
3. En la *Subnet → Security List → Add Ingress Rules*: origen `0.0.0.0/0`, TCP, puertos `80` y `443`.

## 2. Dominio gratis

En https://www.duckdns.org crear un subdominio (ej. `abogacia-tesis`) apuntando a la IP pública.

## 3. Preparar el servidor

```powershell
ssh -i .\ssh-key.key ubuntu@<IP_PUBLICA>
```

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && newgrp docker
# Las imágenes de Oracle bloquean 80/443 también en el firewall interno
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

git clone -b despliegue-produccion https://github.com/MartiGReyes/abogacIA.git abogacia
cd abogacia
```

## 4. Copiar el .env y los respaldos (desde la PC, PowerShell)

```powershell
scp -i .\ssh-key.key C:\ruta\abogacIA\.env ubuntu@<IP_PUBLICA>:~/abogacia/.env
scp -i .\ssh-key.key C:\ruta\abogacIA-datos-privados\*.dump ubuntu@<IP_PUBLICA>:~/
```

En el servidor, completar la dirección pública en `.env` (y verificar que esté `GEMINI_API_KEY`):

```bash
grep -q '^ORIGEN_PUBLICO=' .env || echo 'ORIGEN_PUBLICO=' >> .env
sed -i 's|^ORIGEN_PUBLICO=.*|ORIGEN_PUBLICO=https://abogacia-tesis.duckdns.org|' .env
```

Para que funcione la verificación con Didit en la demo: `DIDIT_PRIVACY_READY=true` en `.env`.

## 5. Restaurar la base (solo la primera vez)

```bash
DC="docker compose -f docker-compose.yml -f docker-compose.produccion.yml"
$DC up -d --wait postgres
for b in abogacia_abogados abogacia_ciudadanos abogacia_rag; do
  docker cp ~/$b.dump abogacia-postgres-1:/tmp/$b.dump
  $DC exec -T postgres pg_restore -U postgres -d $b --no-owner --no-acl --exit-on-error /tmp/$b.dump
done
```

## 6. Levantar todo

```bash
$DC up -d --build
$DC ps
```

La primera vez compila (varios minutos). Abrir `https://abogacia-tesis.duckdns.org`;
el certificado HTTPS se genera solo en el primer acceso.

## 7. Lexi (n8n)

Con todo levantado, un solo comando importa el flujo `n8n/lexi-candidata/workflow.json` con la ruta
`orientacion-legal`, crea las credenciales (Gemini con `GEMINI_API_KEY` y PostgreSQL `abogacia_rag`)
y lo publica:

```bash
bash docker/produccion/importar-lexi.sh
```

Esperar ~1 minuto y probar una consulta laboral en la página. Gemini a veces responde
"high demand" o tarda: es del lado de Google, se reintenta.

Para ver n8n por dentro (no queda expuesto a internet), desde la PC abrir un túnel
`ssh -i .\ssh-key.key -L 5678:127.0.0.1:5678 ubuntu@<IP_PUBLICA>` y entrar a http://localhost:5678.

## 8. Didit

En el panel de Didit, permitir como URLs de regreso:
- `https://abogacia-tesis.duckdns.org/registro-abogado`
- `https://abogacia-tesis.duckdns.org/verificar-identidad-ciudadano`

## Cómo queda armado

- **Caddy** (80/443) da HTTPS y pasa todo al `frontend` (nginx).
- nginx manda `/api/*` al **gateway**, que reparte a autenticación, ciudadanos, abogados y Lexi (n8n).
  El gateway acepta el dominio de `ORIGEN_PUBLICO`; las rutas internas devuelven 404.
- PostgreSQL y los microservicios no tienen puertos abiertos a internet.
- Todo se reinicia solo si se reinicia el servidor (`restart: unless-stopped`).

## Comandos útiles

```bash
$DC logs -f gateway abogados        # ver logs
$DC up -d --build                   # aplicar cambios después de un git pull
$DC down                            # apagar (los datos quedan en los volúmenes)
```

Se probó localmente en Windows (17/11): restauración de las tres bases, arranque de los backends con
validación de esquema, catálogo, login con origen público, bloqueo de origen/host ajenos y de
`/api/interno`, carga de la página en el navegador e importación de Lexi con `importar-lexi.sh`
(responde consultas laborales con artículos de la LCT; a veces falla por saturación de Gemini).

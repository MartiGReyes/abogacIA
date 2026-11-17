#!/usr/bin/env bash
# Importa y publica el flujo de Lexi en n8n con sus credenciales (Gemini + abogacia_rag).
# Lee GEMINI_API_KEY y DB_PASSWORD de .env. Se puede repetir: reemplaza el flujo y las credenciales.
# Uso (en la raíz del proyecto, con los contenedores levantados): bash docker/produccion/importar-lexi.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

leer() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -E "s/^['\"]//; s/['\"]$//"; }
GEM="$(leer GEMINI_API_KEY)"; DBP="$(leer DB_PASSWORD)"
[ -n "$GEM" ] || { echo "Falta GEMINI_API_KEY en .env"; exit 1; }
[ -n "$DBP" ] || { echo "Falta DB_PASSWORD en .env"; exit 1; }

DC="${DC:-docker compose -f docker-compose.yml -f docker-compose.produccion.yml}"
TMP="/tmp/lexi-import-$$"
limpiar() { $DC exec -T n8n rm -rf "$TMP" >/dev/null 2>&1 || true; }
trap limpiar EXIT

$DC exec -T n8n mkdir -p "$TMP"
$DC exec -T n8n sh -c "cat > $TMP/origen.json" < n8n/lexi-candidata/workflow.json
# Los secretos viajan como variables de entorno del proceso; el archivo temporal se borra al terminar.
$DC exec -T -e GEM="$GEM" -e DBP="$DBP" -e TMP="$TMP" n8n node -e '
const fs=require("fs"),d=process.env.TMP;
fs.writeFileSync(d+"/cred.json",JSON.stringify([
 {id:"lexiGemini0000001",name:"Gemini abogacIA",type:"googlePalmApi",data:{host:"https://generativelanguage.googleapis.com",apiKey:process.env.GEM}},
 {id:"lexiRagPg00000001",name:"PostgreSQL abogacia_rag",type:"postgres",data:{host:"postgres",port:5432,database:"abogacia_rag",user:"postgres",password:process.env.DBP,ssl:"disable",allowUnauthorizedCerts:false}}]),{mode:0o600});
const w=JSON.parse(fs.readFileSync(d+"/origen.json","utf8"));
w.id="lexiOrientacion01"; w.name="Lexi - orientacion legal"; w.active=false;
for(const n of w.nodes){
 if(n.type==="n8n-nodes-base.webhook"){n.parameters.path="orientacion-legal";n.webhookId="orientacion-legal-webhook";}
 if(/GoogleGemini/.test(n.type))n.credentials={googlePalmApi:{id:"lexiGemini0000001",name:"Gemini abogacIA"}};
 if(/vectorStorePGVector/.test(n.type))n.credentials={postgres:{id:"lexiRagPg00000001",name:"PostgreSQL abogacia_rag"}};
}
fs.writeFileSync(d+"/lexi.json",JSON.stringify(w));'

$DC exec -T n8n n8n import:credentials --input="$TMP/cred.json"
$DC exec -T n8n n8n import:workflow --input="$TMP/lexi.json"
$DC exec -T n8n n8n publish:workflow --id=lexiOrientacion01
limpiar
$DC restart n8n
echo "Lexi importado. n8n tarda ~1 minuto en volver a aceptar consultas."

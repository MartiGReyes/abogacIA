# Inicia AbogacIA completo con Docker. Se usa haciendo doble clic en iniciar.bat.
# Solo requiere Docker Desktop instalado. La primera vez crea la configuración (.env) y pide la API Key de Didit.

$ErrorActionPreference = 'Continue'
$raiz = Split-Path $PSScriptRoot -Parent
Set-Location $raiz
$Host.UI.RawUI.WindowTitle = 'AbogacIA'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Paso($texto) { Write-Host "`n>> $texto" -ForegroundColor Cyan }
function Salir($texto) {
    Write-Host "`n$texto" -ForegroundColor Red
    Read-Host "`nPresioná Enter para cerrar"
    exit 1
}
function DockerListo { cmd /c "docker info >nul 2>&1"; return $LASTEXITCODE -eq 0 }

# 1. Docker instalado
Paso 'Revisando Docker...'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    $bin = "$env:ProgramFiles\Docker\Docker\resources\bin"
    if (Test-Path "$bin\docker.exe") { $env:Path += ";$bin" }
    else {
        Start-Process 'https://www.docker.com/products/docker-desktop/'
        Salir "Docker Desktop no está instalado.`nSe abrió la página de descarga: instalalo, reiniciá la computadora y volvé a abrir iniciar.bat."
    }
}

# 2. Docker abierto (si está cerrado, se abre y se espera)
if (-not (DockerListo)) {
    $app = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $app) { Start-Process $app }
    Write-Host 'Abriendo Docker Desktop. Puede tardar un par de minutos...'
    for ($i = 0; $i -lt 90 -and -not (DockerListo); $i++) { Start-Sleep -Seconds 2 }
    if (-not (DockerListo)) { Salir "Docker Desktop no terminó de iniciar.`nAbrilo a mano, esperá a que diga 'Engine running' y volvé a abrir iniciar.bat." }
}
Write-Host 'Docker está listo.' -ForegroundColor Green

# 3. Configuración: se crea una sola vez a partir de .env.example
function Aleatorio { $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b) }
function LeerEnv { [IO.File]::ReadAllLines("$raiz\.env", $utf8) }
function GuardarValor($clave, $valor) {
    $lineas = LeerEnv | ForEach-Object { if ($_ -match "^$clave=") { "$clave=$valor" } else { $_ } }
    [IO.File]::WriteAllLines("$raiz\.env", $lineas, $utf8)
}
if (-not (Test-Path "$raiz\.env")) {
    Paso 'Creando la configuración (solo la primera vez)...'
    [IO.File]::WriteAllLines("$raiz\.env", [IO.File]::ReadAllLines("$raiz\.env.example", $utf8), $utf8)
    GuardarValor 'DB_PASSWORD' (Aleatorio)
    GuardarValor 'INTERNAL_PASSWORD' (Aleatorio)
    GuardarValor 'JWT_SECRET' (Aleatorio)
    # Valores de desarrollo: códigos de email en los logs y verificación con Didit habilitada para probar.
    GuardarValor 'ABOGADOS_CORREO_CONSOLA' 'true'
    GuardarValor 'DIDIT_PRIVACY_READY' 'true'
    GuardarValor 'DIDIT_NOTICE_VERSION' '0.1-dev'
}

# 4. API Key de Didit (se guarda solo en .env, que no se sube al repositorio)
$claveActual = (LeerEnv | Where-Object { $_ -match '^DIDIT_API_KEY=' }) -replace '^DIDIT_API_KEY=', ''
if (-not $claveActual.Trim()) {
    Paso 'Falta la API Key de Didit'
    Write-Host 'Pegala y presioná Enter (no se va a ver mientras la pegás).'
    Write-Host 'Si no la tenés, presioná Enter: todo funciona menos la verificación de identidad.' -ForegroundColor DarkGray
    $segura = Read-Host 'API Key' -AsSecureString
    $clave = [System.Net.NetworkCredential]::new('', $segura).Password.Trim()
    if ($clave) { GuardarValor 'DIDIT_API_KEY' $clave; Write-Host 'API Key guardada.' -ForegroundColor Green }
}

# 5. Levantar todo
Paso 'Iniciando AbogacIA. La primera vez tarda varios minutos (descarga y compila todo)...'
docker compose up -d --build --wait
if ($LASTEXITCODE -ne 0) {
    Salir "No se pudo iniciar AbogacIA.`nProbá volver a abrir iniciar.bat. Si sigue fallando, mandale una captura de esta ventana a quien mantiene el proyecto."
}

Paso 'Listo'
Write-Host 'AbogacIA está funcionando en http://localhost:5173' -ForegroundColor Green
Write-Host ''
Write-Host ' - Los códigos de confirmación de email no llegan por correo: abrí ver-codigos.bat.'
Write-Host ' - Para apagar todo: abrí detener.bat.'
Start-Process 'http://localhost:5173'
Read-Host "`nPresioná Enter para cerrar esta ventana (AbogacIA sigue funcionando)"

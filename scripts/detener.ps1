# Apaga AbogacIA. Los datos registrados se conservan para la próxima vez.
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)
$Host.UI.RawUI.WindowTitle = 'AbogacIA'
Write-Host "`nApagando AbogacIA..." -ForegroundColor Cyan
docker compose down
if ($LASTEXITCODE -eq 0) { Write-Host "`nAbogacIA está apagado. Tus datos se guardaron." -ForegroundColor Green }
else { Write-Host "`nNo se pudo apagar. ¿Está abierto Docker Desktop?" -ForegroundColor Red }
Read-Host "`nPresioná Enter para cerrar"

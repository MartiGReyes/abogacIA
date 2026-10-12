# Muestra los últimos códigos de confirmación de email (en desarrollo no se envían correos reales).
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)
$Host.UI.RawUI.WindowTitle = 'AbogacIA - códigos de confirmación'

$codigos = @()
# Ciudadanos imprime "Destinatario: <mail>" y, más abajo, "Código: <código>".
$destinatario = $null
foreach ($linea in (docker compose logs --no-log-prefix ciudadanos 2>$null)) {
    if ($linea -match 'Destinatario:\s*(\S+)') { $destinatario = $Matches[1] }
    elseif ($linea -match 'C.digo:\s*(\d{6})' -and $destinatario) { $codigos += [pscustomobject]@{ Cuenta = 'Ciudadano'; Email = $destinatario; Codigo = $Matches[1] }; $destinatario = $null }
}
# Abogados imprime "Correo de desarrollo para <mail>: código de confirmación <código>".
foreach ($linea in (docker compose logs --no-log-prefix abogados 2>$null)) {
    if ($linea -match 'Correo de desarrollo para (\S+): c.digo de confirmaci.n (\d{6})') {
        $codigos += [pscustomobject]@{ Cuenta = 'Abogado'; Email = $Matches[1]; Codigo = $Matches[2] }
    }
}

if ($codigos.Count -eq 0) {
    Write-Host "`nTodavía no hay códigos. Registrate en la página y volvé a abrir ver-codigos.bat." -ForegroundColor Yellow
} else {
    Write-Host "`nÚltimos códigos de confirmación (el más reciente de cada email es el válido):`n" -ForegroundColor Cyan
    $codigos | Select-Object -Last 10 | Format-Table -AutoSize | Out-String | Write-Host
}
Read-Host 'Presioná Enter para cerrar'

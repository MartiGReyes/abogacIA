# Detener solo el entorno habitual existente; no elimina contenedores ni volúmenes.
$ErrorActionPreference = 'Stop'
$names = @('abogacia-frontend-admin-1','abogacia-frontend-1','abogacia-gateway-1','abogacia-n8n-1','abogacia-autenticacion-1','abogacia-abogados-1','abogacia-ciudadanos-1','abogacia-postgres-1')
foreach ($name in $names) {
    docker --context desktop-linux inspect --format '{{.Name}}' $name 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        docker --context desktop-linux stop $name | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "No se pudo detener $name." }
    }
}
Write-Host 'Servicios habituales detenidos. Contenedores y datos conservados.'
# Inicio habitual: solo contenedores existentes. No construye, migra ni carga datos.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$names = @('abogacia-postgres-1','abogacia-ciudadanos-1','abogacia-abogados-1','abogacia-autenticacion-1','abogacia-n8n-1','abogacia-gateway-1','abogacia-frontend-1')
# Validate every dependency BEFORE starting anything; inspect output never prints secrets.
foreach ($name in $names) {
    docker --context desktop-linux inspect --format '{{.Name}}' $name | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Falta $name. Solicitá una instalación controlada; no se crearán servicios automáticamente." }
}
foreach ($name in @('abogacia-ciudadanos-1','abogacia-abogados-1','abogacia-autenticacion-1')) {
    $c = (docker --context desktop-linux inspect $name | ConvertFrom-Json)[0]
    $required = @('ABOGACIA_BOOTSTRAP_SAFE_START=true','ABOGACIA_BOOTSTRAP_DEVELOPMENT_ENABLED=false','ABOGACIA_BOOTSTRAP_STATES_ENABLED=false','ABOGACIA_BOOTSTRAP_TEST_ACCOUNTS_ENABLED=false','ABOGACIA_BOOTSTRAP_SCHEMA_ENABLED=false','ABOGACIA_BOOTSTRAP_PADRON_ENABLED=false','SPRING_JPA_HIBERNATE_DDL_AUTO=validate','SPRING_SQL_INIT_MODE=never','SPRING_FLYWAY_ENABLED=false','SPRING_LIQUIBASE_ENABLED=false','PADRON_IMPORTAR=false','DIDIT_RECONCILIATION_ENABLED=false')
    foreach ($setting in $required) { if ($c.Config.Env -cnotcontains $setting) { throw "Configuración segura no verificada en $name. No se inicia ningún servicio." } }
}
$gateway = (docker --context desktop-linux inspect abogacia-gateway-1 | ConvertFrom-Json)[0]
if ($gateway.Config.Env -cnotcontains 'ABOGACIA_ISOLATED_ROUTING_ENABLED=false') { throw 'Gateway habitual no verificado; arranque cancelado.' }
foreach ($name in $names) {
    docker --context desktop-linux start $name | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "No se pudo iniciar $name. Revisá el estado antes de continuar." }
    if ($name -eq 'abogacia-postgres-1') {
        $ready = $false
        for ($i=0; $i -lt 30; $i++) {
            $health = docker --context desktop-linux inspect --format '{{.State.Health.Status}}' $name
            if ($health -eq 'healthy') { $ready = $true; break }
            Start-Sleep -Seconds 1
        }
        if (-not $ready) { throw 'PostgreSQL no está saludable; no se iniciarán backends.' }
    }
}
docker --context desktop-linux inspect --format '{{.Name}}' abogacia-frontend-admin-1 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    docker --context desktop-linux start abogacia-frontend-admin-1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar el frontend administrativo existente.' }
    Write-Host 'Administración independiente: http://localhost:5174/admin'
}
Write-Host 'Aplicación habitual: http://localhost:5173.'

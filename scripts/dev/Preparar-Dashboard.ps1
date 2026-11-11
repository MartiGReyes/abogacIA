$ErrorActionPreference = 'Stop'
$raiz = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$destino = Join-Path $raiz 'docker/dashboard-test/.env'
if (Test-Path -LiteralPath $destino) { throw 'Ya existe el archivo de credenciales del dashboard. No se sobrescribe.' }
function Nuevo-Secreto {
    $bytes = New-Object byte[] 48
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes); return [Convert]::ToBase64String($bytes) } finally { $rng.Dispose() }
}
# BCrypt de la contraseña pública sintética Dashboard-Prueba-2026!, exclusivamente de desarrollo.
$hash = '$2a$10$Oia5orv4RVTZ2NjbtmyWPu0J2tPuUmzMPapx9YWxW4y.qF/gc5enC'
$contenido = @(
    "DASHBOARD_OWNER_PASSWORD=$(Nuevo-Secreto)",
    "DASHBOARD_DB_PASSWORD=$(Nuevo-Secreto)",
    "DASHBOARD_INTERNAL_PASSWORD=$(Nuevo-Secreto)",
    "DASHBOARD_JWT_SECRET=$(Nuevo-Secreto)",
    ('DASHBOARD_FIXTURE_HASH=' + "'" + $hash + "'")
)
[IO.File]::WriteAllLines($destino, $contenido, (New-Object Text.UTF8Encoding $false))
Write-Output 'Credenciales aisladas creadas. No compartir ni reutilizar fuera de este entorno de prueba.'

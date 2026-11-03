# Writes credentials only. Does not invoke Docker or connect to a database.
$ErrorActionPreference = 'Stop'
$repoPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$envPath = Join-Path $repoPath 'docker/abogados-dev/.env'
if (Test-Path -LiteralPath $envPath) {
    throw 'El archivo de desarrollo ya existe. No se sobrescribieron credenciales.'
}
function New-DevSecret {
    $bytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return [Convert]::ToBase64String($bytes)
}
$lines = @(
    "ABOGADOS_DEV_OWNER_PASSWORD=$(New-DevSecret)"
    "ABOGADOS_DEV_DB_PASSWORD=$(New-DevSecret)"
    "ABOGADOS_DEV_INTERNAL_PASSWORD=$(New-DevSecret)"
    "ABOGADOS_DEV_JWT_SECRET=$(New-DevSecret)"
    'LEXI_EXISTING_NETWORK=abogacia_default'
)
# CreateNew prevents overwriting a file created concurrently.
$stream = [IO.File]::Open($envPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
$writer = [IO.StreamWriter]::new($stream, [Text.UTF8Encoding]::new($false))
try { $writer.WriteLine(($lines -join "`n")) } finally { $writer.Dispose() }
Write-Output 'Archivo docker/abogados-dev/.env preparado. No se ejecutó Docker ni SQL.'

# Prepared only: interactive provisioning of independent test credentials, no Docker or SQL.
$ErrorActionPreference = 'Stop'
$repoPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$targetPath = Join-Path $repoPath 'docker/admin-readonly/.env'
if (Test-Path -LiteralPath $targetPath) { throw 'Ya existe el archivo EP06. No se sobrescribieron credenciales.' }
$cryptoJar = $null
$loggingJar = $null
foreach ($cachePath in @((Join-Path $repoPath '.m2/repository-tests'), (Join-Path $repoPath '.m2/repository'))) {
    if (-not $cryptoJar) {
        $cryptoJar = Get-ChildItem -LiteralPath (Join-Path $cachePath 'org/springframework/security/spring-security-crypto') -Recurse -Filter '*.jar' -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notmatch 'sources|javadoc' } | Select-Object -First 1
    }
    if (-not $loggingJar) {
        $loggingJar = Get-ChildItem -LiteralPath (Join-Path $cachePath 'commons-logging/commons-logging') -Recurse -Filter '*.jar' -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notmatch 'sources|javadoc' } | Select-Object -First 1
    }
}
if (-not $cryptoJar -or -not $loggingJar) { throw 'Faltan dependencias locales BCrypt/commons-logging. No se descargó ni ejecutó nada.' }
$classpath = $cryptoJar.FullName + [IO.Path]::PathSeparator + $loggingJar.FullName
& java --class-path $classpath (Join-Path $repoPath 'docker/admin-readonly/PrepararAdmin.java') $targetPath
if ($LASTEXITCODE -ne 0) { throw 'No se completó el aprovisionamiento EP06.' }

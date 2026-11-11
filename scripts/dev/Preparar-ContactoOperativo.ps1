$ErrorActionPreference = 'Stop'
$raiz = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$privado = [IO.Path]::GetFullPath((Join-Path (Split-Path $raiz -Parent) '.private-contacto-operativo'))
if ($privado.StartsWith($raiz + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Los secretos deben estar fuera del repositorio.' }
$destino = Join-Path $raiz 'docker/contacto-operativo-test/.env'
if ((Test-Path -LiteralPath $destino) -or (Test-Path -LiteralPath $privado)) { throw 'Ya existe la preparación. No se sobrescriben claves ni acceso.' }
New-Item -ItemType Directory -Path $privado | Out-Null
$identidad = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)
$herencia = [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identidad, 'FullControl', $herencia, 'None', 'Allow')))
$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule('SYSTEM', 'FullControl', $herencia, 'None', 'Allow')))
Set-Acl -LiteralPath $privado -AclObject $acl
function Nuevo-Secreto([int]$Cantidad = 32) {
    $bytes = New-Object byte[] $Cantidad
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes); return [Convert]::ToBase64String($bytes) } finally { $rng.Dispose() }
}
$utf8 = New-Object Text.UTF8Encoding $false
$clave = Join-Path $privado 'clave-cifrado.txt'
$acceso = Join-Path $privado 'acceso-organizador.txt'
[IO.File]::WriteAllText($clave, (Nuevo-Secreto), $utf8)
[IO.File]::WriteAllText($acceso, (Nuevo-Secreto), $utf8)
$cuentas = Join-Path $privado 'password-cuentas.txt'
[IO.File]::WriteAllText($cuentas, ((Nuevo-Secreto 24) + 'aA1!'), $utf8)
[IO.File]::WriteAllLines($destino, @(
    "OP_OWNER_PASSWORD=$(Nuevo-Secreto 48)",
    "OP_DB_PASSWORD=$(Nuevo-Secreto 48)",
    "OP_INTERNAL_PASSWORD=$(Nuevo-Secreto 48)",
    "OP_JWT_SECRET=$(Nuevo-Secreto)",
    ('OP_KEY_PATH=' + $clave.Replace('\','/')),
    ('OP_OPERATOR_PATH=' + $acceso.Replace('\','/'))
), $utf8)
Write-Output "Preparacion lista. Iniciar sesion en http://localhost:5182/iniciar-sesion. La contrasena de las cuentas sinteticas esta en $cuentas. No compartir los secretos."

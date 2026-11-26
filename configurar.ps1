$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
[void][IO.Directory]::CreateDirectory((Join-Path $PSScriptRoot 'datos/imagenes'))
$destination = Join-Path $PSScriptRoot '.env'
if (Test-Path -LiteralPath $destination) {
    Write-Host 'Se conserva la configuración existente en .env.'
    return
}
function New-RandomHex([int]$length) {
    $buffer = New-Object byte[] $length
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $random.GetBytes($buffer) } finally { $random.Dispose() }
    return [BitConverter]::ToString($buffer).Replace('-', '').ToLowerInvariant()
}
$config = [IO.File]::ReadAllText((Join-Path $PSScriptRoot '.env.example'))
$config = $config -replace '(?m)^DB_PASSWORD=\r?$', ('DB_PASSWORD=' + (New-RandomHex 24))
$config = $config -replace '(?m)^JWT_SECRET=\r?$', ('JWT_SECRET=' + (New-RandomHex 32))
$temp = Join-Path $PSScriptRoot ('.env.tmp.' + [Guid]::NewGuid().ToString('N'))
try {
    [IO.File]::WriteAllText($temp, $config, (New-Object System.Text.UTF8Encoding($false)))
    [IO.File]::Move($temp, $destination)
    Write-Host 'Configuración local creada en .env.'
} finally {
    if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp }
}

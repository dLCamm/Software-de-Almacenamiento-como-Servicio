# Levanta Kubo en modo producción y lo publica con un enlace https gratuito
# (Cloudflare Tunnel). Uso, desde la carpeta del repo en PowerShell:
#   .\desplegar.ps1
# Para apagarlo:
#   docker compose -f docker-compose.prod.yml --profile tunnel down

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$compose = @("compose", "-f", "docker-compose.prod.yml", "--profile", "tunnel")

Write-Host "Deteniendo el entorno de desarrollo (si estaba corriendo)..."
docker compose -f docker-compose.yml down 2>$null | Out-Null

Write-Host "Construyendo y levantando los contenedores (la primera vez tarda unos minutos)..."
docker @compose up -d --build
if ($LASTEXITCODE -ne 0) { throw "No se pudieron levantar los contenedores." }

Write-Host "Esperando el enlace público de Cloudflare..."
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
    $logs = (docker @compose logs cloudflared 2>&1) | Out-String
    $found = [regex]::Matches($logs, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($found.Count -gt 0) { $url = $found[$found.Count - 1].Value } else { Start-Sleep -Seconds 3 }
}
if (-not $url) { throw "No apareció el enlace. Revisa: docker compose -f docker-compose.prod.yml logs cloudflared" }

# Los correos de verificación y recuperación deben llevar el enlace público.
Write-Host "Configurando el enlace en el backend..."
$env:PUBLIC_URL = $url
docker @compose up -d --no-deps backend trash-cleanup | Out-Null
Start-Sleep -Seconds 5
docker @compose restart frontend | Out-Null

Write-Host ""
Write-Host "Kubo está en línea:" -ForegroundColor Green
Write-Host "  Público: $url" -ForegroundColor Green
Write-Host "  Local:   http://localhost:8080"
Write-Host ""
Write-Host "El enlace funciona mientras esta computadora y Docker estén encendidos."

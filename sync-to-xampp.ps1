# Sawisha mradi wa statiki kwenda XAMPP (hamishi node_modules, .git, nk.)
param(
  [string]$Source = $PSScriptRoot,
  [string]$Dest = "C:\xampp\htdocs\KMT-CHURCH-TANZANIA-PORTAL"
)

$ErrorActionPreference = "Stop"

Write-Host "== KMK(T) sync -> XAMPP ==" -ForegroundColor Cyan
Write-Host "Chanzo: $Source"
Write-Host "Lengo:  $Dest"

if (-not (Test-Path $Source)) {
  Write-Host "Folda ya chanzo haipo." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $Dest)) {
  New-Item -ItemType Directory -Path $Dest -Force | Out-Null
  Write-Host "Folda lengo imeundwa." -ForegroundColor Yellow
}

# Robocopy: /E recurse, /XD majina ya folda (skizo lolote lenye jina hilo), codes 0-7 = success
& robocopy $Source $Dest /E /R:2 /W:2 /XD node_modules .git .cursor phase-9.5a-react /XF *.log /NFL /NDL /NJH /NJS /NP | Out-Host
$rc = $LASTEXITCODE

if ($rc -ge 8) {
  Write-Host "Robocopy imeshindwa (msimbo $rc)." -ForegroundColor Red
  exit 1
}

Write-Host "Imemalika vizuri (robocopy msimbo $rc; 0-7 = faili zimesawirishwa au hakuna mabadiliko)." -ForegroundColor Green
Write-Host ""
Write-Host "KUMBUKA: hakikisha supabase-config.js ipo kwenye lengo (nakili kutoka Desktop ikiwa ni tofauti)." -ForegroundColor Yellow
Write-Host "Jaribu: http://localhost/KMT-CHURCH-TANZANIA-PORTAL/system-health.html (Run Supabase Check)" -ForegroundColor Gray

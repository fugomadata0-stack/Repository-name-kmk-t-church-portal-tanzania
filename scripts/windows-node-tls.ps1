#requires -Version 5.1
<#
.SYNOPSIS
  Saidia Node.js/npm/npx (na Vercel CLI) kuthibitisha vyeti vya TLS kwenye Windows —
  haswa mtandao wa kampuni / SSL inspection.

.USAGE (PowerShell — folda ya mizizi ya mradi):
  . .\scripts\windows-node-tls.ps1
  # au:
  . .\scripts\windows-node-tls.ps1 -CorporateCaPem "C:\corp\ca-bundle.pem"

.MUHIMU:
  - Chaguo bora: weka CA ya kampuni kwa NODE_EXTRA_CA_CERTS au npm cafile.
  - Node 22+: jaribu --use-system-ca (system certificate store).
  - Epuka NODE_TLS_REJECT_UNAUTHORIZED=0 isipokuwa majaribio ya muda mfupi.
#>
param(
  [string] $CorporateCaPem = ""
)

$ErrorActionPreference = "Stop"

function Get-NodeMajor {
  try {
    $v = node -v 2>$null
    if (-not $v) { return 0 }
    if ($v -match '^v(\d+)') { return [int]$Matches[1] }
  } catch {}
  return 0
}

Write-Host ""
Write-Host "=== Windows Node TLS - sanidi kwa sesheni hii tu ===" -ForegroundColor Cyan
Write-Host ""

$maj = Get-NodeMajor
if ($maj -eq 0) {
  Write-Host "Node.js haijapatikana PATH. Sakinisha Node LTS kwanza." -ForegroundColor Yellow
  exit 1
}

Write-Host ("Node: " + (node -v)) -ForegroundColor Gray

# 1) Node 22+: tumia certificate store ya Windows
if ($maj -ge 22) {
  $existing = [Environment]::GetEnvironmentVariable("NODE_OPTIONS", "Process")
  $flag = "--use-system-ca"
  if ($existing -and $existing -notmatch [regex]::Escape($flag)) {
    $env:NODE_OPTIONS = "$existing $flag".Trim()
  } elseif (-not $existing) {
    $env:NODE_OPTIONS = $flag
  }
  Write-Host ('[OK] NODE_OPTIONS inajumuisha: --use-system-ca (Node ' + $maj + ')') -ForegroundColor Green
} else {
  Write-Host ('[TAARIFA] Node ' + $maj + ': tumia --use-system-ca (Node 22+) au NODE_EXTRA_CA_CERTS.') -ForegroundColor Yellow
}

# 2) CA ya kampuni (PEM) ikiwa imetolewa
if ($CorporateCaPem -and (Test-Path -LiteralPath $CorporateCaPem)) {
  $env:NODE_EXTRA_CA_CERTS = (Resolve-Path -LiteralPath $CorporateCaPem).Path
  Write-Host ('[OK] NODE_EXTRA_CA_CERTS = ' + $env:NODE_EXTRA_CA_CERTS) -ForegroundColor Green
} elseif ($CorporateCaPem) {
  Write-Host ('[ONYO] Faili halipo: ' + $CorporateCaPem) -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Jaribu tena katika sesheni hii:" -ForegroundColor Cyan
Write-Host "  cd app-next; npm run build; npm run validate" -ForegroundColor White
Write-Host "  npm audit" -ForegroundColor White
Write-Host '  cd (Split-Path $PSScriptRoot -Parent); npx vercel --prod' -ForegroundColor White
Write-Host ""
Write-Host 'Kuweka kwa USER (kudumu):' -ForegroundColor DarkGray
Write-Host '  - Node 22+: Ongeza NODE_OPTIONS = --use-system-ca (User) kupitia:' -ForegroundColor DarkGray
Write-Host '    System search, Edit environment variables, User variables, New' -ForegroundColor DarkGray
Write-Host '  - PEM ya kampuni: NODE_EXTRA_CA_CERTS = kamili path ya faili PEM' -ForegroundColor DarkGray
Write-Host ''

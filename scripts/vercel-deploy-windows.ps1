#requires -Version 5.1
<#
.SYNOPSIS
  Deploy Vercel production baada ya kuweka TLS kwa sesheni (Node 22+ --use-system-ca, au CA ya kampuni).

.USAGE (kutoka mizizi ya mradi):
  npm run deploy:vercel:prod:win
  npm run deploy:vercel:prod:win -- -CorporateCaPem "C:\corp\root.pem"

  Au mazingira:  $env:KMKT_CORPORATE_CA_PEM = "C:\corp\root.pem"; npm run deploy:vercel:prod:win
#>
param(
  [string] $CorporateCaPem = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoRoot

$ca = $CorporateCaPem
if (-not $ca -and $env:KMKT_CORPORATE_CA_PEM) {
  $ca = $env:KMKT_CORPORATE_CA_PEM
}

if ($ca) {
  . "$PSScriptRoot\windows-node-tls.ps1" -CorporateCaPem $ca
} else {
  . "$PSScriptRoot\windows-node-tls.ps1"
}

npm run deploy:vercel:prod

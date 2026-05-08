# Kuanzia mzizi wa mradi (inafanya kazi na PowerShell 5.1 — hakuna &&)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
npm run build

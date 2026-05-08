Write-Host "=== KMK(T) Node/NPM Repair Helper ===" -ForegroundColor Cyan

function Check-Cmd($name) {
  try {
    $cmd = Get-Command $name -ErrorAction Stop
    return $cmd.Source
  } catch {
    return $null
  }
}

$node = Check-Cmd "node"
$npm = Check-Cmd "npm"
$npx = Check-Cmd "npx"

Write-Host "`nCurrent command discovery:" -ForegroundColor Yellow
Write-Host ("node: " + ($node ?? "NOT FOUND"))
Write-Host ("npm : " + ($npm ?? "NOT FOUND"))
Write-Host ("npx : " + ($npx ?? "NOT FOUND"))

if ($npm -and $npx) {
  Write-Host "`nEverything is already okay." -ForegroundColor Green
  node -v
  npm -v
  npx -v
  exit 0
}

$commonNodeDirs = @(
  "C:\Program Files\nodejs",
  "C:\Program Files (x86)\nodejs",
  "$env:LOCALAPPDATA\Programs\nodejs"
)

$detectedDir = $null
foreach ($dir in $commonNodeDirs) {
  if ((Test-Path (Join-Path $dir "node.exe")) -or (Test-Path (Join-Path $dir "npm.cmd"))) {
    $detectedDir = $dir
    break
  }
}

if ($detectedDir) {
  Write-Host "`nDetected Node install dir: $detectedDir" -ForegroundColor Green
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not ($userPath -split ";" | Where-Object { $_ -eq $detectedDir })) {
    $newUserPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $detectedDir } else { "$userPath;$detectedDir" }
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
    Write-Host "Added to User PATH. Restart terminal/Cursor to apply." -ForegroundColor Green
  } else {
    Write-Host "Node dir already in User PATH." -ForegroundColor Green
  }
} else {
  Write-Host "`nNode installation directory was not found." -ForegroundColor Red
  Write-Host "Install Node.js LTS manually from: https://nodejs.org" -ForegroundColor Yellow
  Write-Host "Then restart Windows or sign out/sign in." -ForegroundColor Yellow
}

Write-Host "`nNext checks after restart:" -ForegroundColor Cyan
Write-Host "  node -v"
Write-Host "  npm -v"
Write-Host "  npx -v"

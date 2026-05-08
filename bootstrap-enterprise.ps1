param(
  [string]$AppDir = "app-next"
)

Write-Host "== KMK(T) Enterprise Bootstrap ==" -ForegroundColor Cyan

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "npm haipo kwenye PATH. Tafadhali install/repair Node LTS kwanza." -ForegroundColor Red
  Write-Host "Kimbia: winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --interactive"
  exit 1
}

if (-not (Test-Path $AppDir)) {
  New-Item -ItemType Directory -Path $AppDir | Out-Null
}

Write-Host "Installing core dependencies..." -ForegroundColor Yellow
Push-Location $AppDir

npm init -y
npm install react react-dom
npm install -D typescript @types/react @types/react-dom vite @vitejs/plugin-react
npm install -D tailwindcss postcss autoprefixer sass
npm install framer-motion @supabase/supabase-js
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D npm-run-all

if (-not (Test-Path "src")) { New-Item -ItemType Directory -Path "src" | Out-Null }
if (-not (Test-Path "src/styles")) { New-Item -ItemType Directory -Path "src/styles" | Out-Null }

if (-not (Test-Path "src/vite-env.d.ts")) {
@"
/// <reference types="vite/client" />
"@ | Out-File -FilePath "src/vite-env.d.ts" -Encoding utf8
}

if (-not (Test-Path "src/main.tsx")) {
@"
import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.scss";

function App() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: 20 }}>
      <h1>KMK(T) Enterprise Frontend</h1>
      <p>Bootstrap complete. Next: Tailwind + shadcn + modules migration.</p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
"@ | Out-File -FilePath "src/main.tsx" -Encoding utf8
}

if (-not (Test-Path "src/styles/global.scss")) {
@"
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --kmkt-gold: #d4b14a;
}
body {
  margin: 0;
  background: radial-gradient(circle at 20% 0%, #1b3f73, #07152b);
  color: #eff5ff;
}
"@ | Out-File -FilePath "src/styles/global.scss" -Encoding utf8
}

if (-not (Test-Path "index.html")) {
@"
<!doctype html>
<html lang="sw">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KMK(T) Enterprise</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"@ | Out-File -FilePath "index.html" -Encoding utf8
}

if (-not (Test-Path "vite.config.ts")) {
@"
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
"@ | Out-File -FilePath "vite.config.ts" -Encoding utf8
}

if (-not (Test-Path "tsconfig.json")) {
@"
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src"]
}
"@ | Out-File -FilePath "tsconfig.json" -Encoding utf8
}

if (-not (Test-Path "tailwind.config.cjs")) {
@"
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
"@ | Out-File -FilePath "tailwind.config.cjs" -Encoding utf8
}

if (-not (Test-Path "postcss.config.cjs")) {
@"
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
"@ | Out-File -FilePath "postcss.config.cjs" -Encoding utf8
}

$pkgRaw = Get-Content "package.json" -Raw
$pkg = $pkgRaw | ConvertFrom-Json
if (-not $pkg.scripts) { $pkg | Add-Member -MemberType NoteProperty -Name scripts -Value @{} }
$pkg.scripts.dev = "vite"
if ($pkg.scripts -is [hashtable]) {
  $pkg.scripts["build:tsc"] = "tsc -p tsconfig.json"
  $pkg.scripts["build:vite"] = "vite build"
} else {
  $pkg.scripts | Add-Member -MemberType NoteProperty -Name "build:tsc" -Value "tsc -p tsconfig.json" -Force
  $pkg.scripts | Add-Member -MemberType NoteProperty -Name "build:vite" -Value "vite build" -Force
}
$pkg.scripts.build = "run-s build:tsc build:vite"
$pkg.scripts.preview = "vite preview"
$pkg.scripts.lint = "eslint ."
$pkg | ConvertTo-Json -Depth 20 | Set-Content "package.json"

Write-Host "Bootstrap complete. Run: npm run dev" -ForegroundColor Green
Pop-Location

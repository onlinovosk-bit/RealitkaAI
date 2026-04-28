$ErrorActionPreference = "Continue"

function Section($title) {
  Write-Host ""
  Write-Host $title -ForegroundColor Yellow
}

function Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

Write-Host "=== REVOLIS.AI VERCEL 404 DIAGNOSTICS ===" -ForegroundColor Yellow
Write-Host ("Started: " + (Get-Date))
Write-Host ("Project dir: " + (Get-Location))

Section "[1] TypeScript errors (npx tsc --noEmit)"
$tsOut = New-TemporaryFile
npx tsc --noEmit *> $tsOut
if ($LASTEXITCODE -eq 0) {
  Ok "No TS errors"
} else {
  Fail "TS errors found"
  Get-Content $tsOut | Select-Object -First 40
}

Section "[2] Next.js build test (npm run build)"
$buildOut = New-TemporaryFile
npm run build *> $buildOut
if ($LASTEXITCODE -eq 0) {
  Ok "Build OK"
  Get-Content $buildOut | Select-Object -Last 20
} else {
  Fail "Build FAILED"
  Get-Content $buildOut | Select-Object -Last 40
}

Section "[3] next.config.js validity"
node -e "require('./next.config.js'); console.log('next.config.js loaded')"
if ($LASTEXITCODE -eq 0) { Ok "next.config OK" } else { Fail "next.config ERROR" }

Section "[4] vercel.json validity"
if (Test-Path "vercel.json") {
  node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json loaded')"
  if ($LASTEXITCODE -eq 0) { Ok "vercel.json OK" } else { Fail "vercel.json invalid JSON" }
} else {
  Warn "no vercel.json"
}

Section "[5] Critical App Router pages exist (Revolis layout)"
$criticalPages = @(
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/(dashboard)/team/permissions/page.tsx",
  "src/app/dashboard/reputation/integrity/page.tsx"
)
foreach ($page in $criticalPages) {
  if (Test-Path $page) { Ok $page } else { Fail "MISSING: $page" }
}

Section "[6] Routing hardening files exist"
$routingFiles = @("next.config.js", "src/proxy.ts")
foreach ($file in $routingFiles) {
  if (Test-Path $file) { Ok $file } else { Fail "MISSING: $file" }
}

Section "[7] Required env vars on Vercel (production)"
if (Get-Command vercel -ErrorAction SilentlyContinue) {
  $envOut = New-TemporaryFile
  vercel env ls production *> $envOut
  if ($LASTEXITCODE -eq 0) {
    $envText = Get-Content $envOut -Raw
    $required = @(
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY"
    )
    foreach ($var in $required) {
      if ($envText -match [Regex]::Escape($var)) {
        Ok $var
      } else {
        Fail "MISSING on Vercel: $var"
      }
    }
  } else {
    Warn "Could not read Vercel envs (check login/project link)."
    Get-Content $envOut | Select-Object -First 20
  }
} else {
  Warn "vercel CLI not installed in PATH"
}

Section "[8] Last 5 git commits"
git log --oneline -5

Section "[9] Quick production smoke checks"
$urls = @(
  "https://app.revolis.ai/",
  "https://app.revolis.ai/dashboard",
  "https://app.revolis.ai/team",
  "https://app.revolis.ai/team/permissions",
  "https://app.revolis.ai/api/leads"
)
foreach ($url in $urls) {
  $code = & curl.exe -s -o NUL -w "%{http_code}" $url
  "{0,-55} {1}" -f $url, $code
}

Section "[10] Vercel production checklist"
Write-Host "Vercel -> Settings -> Build and Deployment"
Write-Host "  - Root Directory: apps/crm"
Write-Host "  - Build Command: npm run build"
Write-Host "  - Install Command: npm install"
Write-Host "  - Output Directory: default (empty)"
Write-Host "  - Production Overrides: use Project Settings"

Write-Host ""
Write-Host "=== DIAGNOSTICS COMPLETE ===" -ForegroundColor Green

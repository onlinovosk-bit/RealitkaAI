# Workdesk light migration — dark legacy token gate (Team 5 QA)
# Scans dashboard/leads/pipeline surfaces for dark-theme leftovers.
# Exit 0 = clean, 1 = matches found.

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CrmRoot = Split-Path -Parent $ScriptDir
Set-Location $CrmRoot

$SearchRoots = @(
  "src/app/(dashboard)",
  "src/components/leads",
  "src/components/pipeline",
  "src/components/dashboard"
)

$DarkPatterns = @(
  "bg-black",
  "bg-slate-950",
  "bg-slate-900",
  "#050914",
  "#080D1A",
  "#0A1628",
  "#060D1C",
  "border-slate-800"
)

$Regex = ($DarkPatterns | ForEach-Object { [regex]::Escape($_) }) -join "|"
$GlobArgs = @("-g", "*.tsx", "-g", "*.ts", "-g", "*.css")
$ExistingRoots = @($SearchRoots | Where-Object { Test-Path (Join-Path $CrmRoot $_) })

if ($ExistingRoots.Count -eq 0) {
  Write-Host "[FAIL] No search roots found under $CrmRoot" -ForegroundColor Red
  exit 1
}

Write-Host "=== Workdesk dark-token scan ===" -ForegroundColor Cyan
Write-Host "Root: $CrmRoot"
Write-Host "Paths: $($ExistingRoots -join ', ')"
Write-Host "Patterns: $($DarkPatterns -join ', ')"
Write-Host ""

$matches = @()
$rg = Get-Command rg -ErrorAction SilentlyContinue

if ($rg) {
  $rgArgs = @(
    "-n", "--no-heading", "-i",
    "--glob", "!**/node_modules/**"
  ) + $GlobArgs + @("-e", $Regex) + $ExistingRoots

  $raw = & rg @rgArgs 2>$null
  if ($LASTEXITCODE -eq 0 -and $raw) {
    $matches = @($raw)
  }
  elseif ($LASTEXITCODE -eq 1) {
    $matches = @()
  }
  else {
    # rg returns 1 for no match; treat stderr-only as no matches
    if ($raw) { $matches = @($raw) }
  }
}
else {
  Write-Host "[info] ripgrep (rg) not found; using Select-String" -ForegroundColor Yellow
  foreach ($root in $ExistingRoots) {
    $files = Get-ChildItem -Path (Join-Path $CrmRoot $root) -Recurse -File -Include *.tsx, *.ts, *.css -ErrorAction SilentlyContinue
    foreach ($file in $files) {
      $hits = Select-String -Path $file.FullName -Pattern $Regex -AllMatches -CaseSensitive:$false
      foreach ($hit in $hits) {
        $rel = $hit.Path.Substring($CrmRoot.Length).TrimStart("\", "/")
        $matches += "${rel}:$($hit.LineNumber):$($hit.Line.Trim())"
      }
    }
  }
}

if ($matches.Count -eq 0) {
  Write-Host "[OK] No dark legacy tokens in scoped Workdesk paths." -ForegroundColor Green
  exit 0
}

Write-Host "[FAIL] $($matches.Count) match(es):" -ForegroundColor Red
foreach ($line in $matches) {
  Write-Host $line
}

Write-Host ""
Write-Host "Fix or migrate these surfaces before Workdesk light sign-off." -ForegroundColor Yellow
exit 1

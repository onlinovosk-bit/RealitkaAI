# Smoke POST pre UC Export API (Brief 14).
# Použitie:
#   cd C:\RealitkaAI\apps\crm
#   $env:UC_EXPORT_PASS = '<heslo z password managera>'
#   .\docs\ops\smoke-uc-import.ps1
#
# Alebo bez env — skript sa opýta na heslo.

param(
  [string]$Pass = $env:UC_EXPORT_PASS,
  [string]$Uri = "https://app.revolis.ai/api/uc/import",
  [string]$User = "smolko-uc-export"
)

if (-not $Pass) {
  $Pass = Read-Host "Heslo pre $User"
}

$payload = [ordered]@{
  user   = $User
  pass   = $Pass
  action = 1
  data   = [ordered]@{
    import_id      = "smoke-test-1"
    object_id      = 784691
    id             = "rk-smoke-784691"
    deleted        = 0
    action         = 1
    category       = 4
    subcategory    = 401
    ownership      = 1
    price          = 569
    state_id       = 1
    county_id      = 0
    district_id    = 0
    region_id      = 0
    street_id      = 0
    street         = "Hlavna"
    street_number  = "12"
    price_unit     = 1
    price_currency = 1
    usable_area    = 24
    agent_id       = "testImport"
    title          = "Smoke test zakazka"
    description    = "Test z UC dokumentacie"
    images         = @(
      [ordered]@{
        url     = "https://admin.realsoft.sk/objects-images/784/784691/784691_1.jpg"
        changed = $false
      }
    )
  }
}

$body = $payload | ConvertTo-Json -Depth 10 -Compress

Write-Host "POST $Uri ..."
try {
  $response = Invoke-RestMethod -Method POST -Uri $Uri -ContentType "application/json" -Body $body
  $response | ConvertTo-Json -Depth 5
  if ($response.code -eq 1 -or $response.code -eq 2) {
    Write-Host "OK - import presiel (code $($response.code))." -ForegroundColor Green
  } elseif ($response.code -eq 10) {
    Write-Host "Wrong login - skontroluj user/pass v PROD agencies." -ForegroundColor Yellow
  } else {
    Write-Host "Neocakavana odpoved - pozri JSON vyssie." -ForegroundColor Yellow
  }
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "HTTP $status" -ForegroundColor Red
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  throw
}

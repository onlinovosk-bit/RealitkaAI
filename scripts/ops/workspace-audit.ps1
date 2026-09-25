<#
    workspace-audit.ps1 — LEN ČÍTA. Nič nemení, nepresúva, nemaže.

    Účel: zmapovať to, na čo cloudová session nevidí, PRED akýmkoľvek
    rozhodnutím o presune repozitárov.

    Spustenie (stačí bežný používateľ, admin netreba):
        powershell -ExecutionPolicy Bypass -File scripts\ops\workspace-audit.ps1

    Výstup: workspace-audit-<dátum>.txt vedľa skriptu. Ten súbor pošli ďalej.

    BEZPEČNOSŤ: skript zámerne NEVYPISUJE obsah .env súborov — iba ich mená.
    Ak by si v jeho výstupe našiel čokoľvek, čo vyzerá ako kľúč alebo heslo,
    je to chyba skriptu; nahlás ju a výstup nikam neposielaj.

    Poznámka: tento skript nebol pred odovzdaním spustený ani odparsovaný
    (v prostredí, kde vznikol, nie je PowerShell). Je písaný tak, aby
    zlyhanie jednej kontroly nezhodilo zvyšok — každá je v try/catch.
#>

$ErrorActionPreference = 'Continue'
$out = Join-Path $PSScriptRoot ("workspace-audit-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".txt")

function Section($name) {
    $line = "`n" + ('=' * 70) + "`n== $name`n" + ('=' * 70)
    Write-Output $line
}
function Try-Run($label, [scriptblock]$block) {
    try { & $block }
    catch { Write-Output "  [kontrola '$label' zlyhala: $($_.Exception.Message)]" }
}

$transcript = $true
try { Start-Transcript -Path $out -Force | Out-Null }
catch { $transcript = $false; Write-Host "Start-Transcript nie je dostupny - presmeruj vystup rucne: ... > audit.txt" -ForegroundColor Yellow }

Write-Output "workspace-audit  —  LEN ČÍTANIE, nič sa nemení"
Write-Output "čas:        $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "počítač:    $env:COMPUTERNAME"
Write-Output "používateľ: $env:USERNAME"
Write-Output "PowerShell: $($PSVersionTable.PSVersion)"

# --------------------------------------------------------------------------
Section "1. Git repozitáre na disku (hľadám .git do hĺbky 4)"
# --------------------------------------------------------------------------
$roots = @('C:\', 'C:\Projects', "$env:USERPROFILE") | Select-Object -Unique
$repos = @()
foreach ($r in $roots) {
    Try-Run "hľadanie v $r" {
        if (Test-Path $r) {
            Get-ChildItem -Path $r -Directory -Filter '.git' -Recurse -Depth 4 -Force -ErrorAction SilentlyContinue |
                Where-Object { $_.FullName -notmatch '\\(Windows|Program Files|Program Files \(x86\)|AppData|node_modules)\\' } |
                ForEach-Object { $script:repos += $_.Parent.FullName }
        }
    }
}
$repos = $repos | Select-Object -Unique | Sort-Object
Write-Output "nájdených repozitárov: $($repos.Count)"
$repos | ForEach-Object { Write-Output "  $_" }

# --------------------------------------------------------------------------
Section "2. Stav každého repozitára (rozpracovaná práca = riziko pri presune)"
# --------------------------------------------------------------------------
foreach ($repo in $repos) {
    Write-Output "`n--- $repo"
    Try-Run "git v $repo" {
        Push-Location $repo
        try {
        $branch  = (git rev-parse --abbrev-ref HEAD 2>$null)
        $dirty   = @(git status --porcelain 2>$null)
        $stash   = @(git stash list 2>$null)
        $remote  = (git remote get-url origin 2>$null)
        $ahead   = (git rev-list --count '@{u}..HEAD' 2>$null)
        Write-Output "  remote:        $remote"
        Write-Output "  vetva:         $branch"
        Write-Output "  necommitnuté:  $($dirty.Count) súborov"
        Write-Output "  stash:         $($stash.Count) položiek"
        Write-Output "  nepushnuté:    $(if ($ahead) { $ahead } else { '?' }) commitov"
        if ($dirty.Count -gt 0) { $dirty | Select-Object -First 15 | ForEach-Object { Write-Output "      $_" } }
        } finally { Pop-Location }
    }
}

# --------------------------------------------------------------------------
Section "3. Natvrdo zadrátované C: cesty (spojený vzor, bez URL)"
Write-Output "  (táto časť prechádza celé stromy repozitárov — môže trvať aj niekoľko minút)"
# --------------------------------------------------------------------------
$scanRoots = $repos + @('C:\revolis-ai-bus', 'C:\RealitkaAI-run', 'C:\onlinovo-seed') | Select-Object -Unique
$pattern = '[A-Za-z]:(\\\\|\\|/)(RealitkaAI|Projects|onlinovo|revolis|Users)'
foreach ($r in $scanRoots) {
    if (-not (Test-Path $r)) { continue }
    Try-Run "sken $r" {
        $hits = @(Get-ChildItem -Path $r -Recurse -File -Force -ErrorAction SilentlyContinue |
            Where-Object {
                $_.FullName -notmatch '\\(node_modules|\.git|\.next|dist|\.turbo)\\' -and
                $_.Length -lt 2MB -and
                $_.Extension -match '^\.(json|ps1|mjs|js|ts|cjs|toml|yml|yaml|cmd|bat|env|sh|py)$'
            } |
            Select-String -Pattern $pattern -ErrorAction SilentlyContinue |
            Where-Object { $_.Line -notmatch 'https?://' })
        Write-Output "`n--- $r  → $($hits.Count) výskytov"
        $hits | Select-Object -First 40 | ForEach-Object {
            Write-Output ("  {0}:{1}" -f $_.Path, $_.LineNumber)
        }
    }
}

# --------------------------------------------------------------------------
Section "4. Docker — lokálna Supabase (jediné, čo môže bolieť viac než minúty)"
# --------------------------------------------------------------------------
Try-Run "docker" {
    $d = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $d) { Write-Output "  docker nie je v PATH — lokálna Supabase pravdepodobne nebeží"; return }
    Write-Output "-- kontajnery:"
    docker ps -a --format "  {{.Names}}`t{{.Status}}`t{{.Image}}" 2>$null | Where-Object { $_ -match 'supabase|postgres' }
    Write-Output "-- volumes (tu žijú dáta; meno býva odvodené od cesty projektu):"
    docker volume ls --format "  {{.Name}}" 2>$null | Where-Object { $_ -match 'supabase|postgres' }
}

# --------------------------------------------------------------------------
Section "5. Plánovač úloh — úlohy odkazujúce na tieto cesty"
# --------------------------------------------------------------------------
Try-Run "scheduled tasks" {
    Get-ScheduledTask -ErrorAction SilentlyContinue | ForEach-Object {
        $t = $_
        if (-not $t.Actions) { return }
        foreach ($a in $t.Actions) {
            $s = "$($a.Execute) $($a.Arguments)"
            if ($s -match 'RealitkaAI|Projects|onlinovo|revolis|uptm') {
                Write-Output "  [$($t.State)] $($t.TaskPath)$($t.TaskName)"
                Write-Output "        $s"
            }
        }
    }
}

# --------------------------------------------------------------------------
Section "6. Služby odkazujúce na tieto cesty (napr. uptm-runner)"
# --------------------------------------------------------------------------
Try-Run "services" {
    Get-CimInstance Win32_Service -ErrorAction SilentlyContinue |
        Where-Object { $_.PathName -match 'RealitkaAI|Projects|onlinovo|revolis|uptm' } |
        ForEach-Object { Write-Output "  [$($_.State)] $($_.Name) → $($_.PathName)" }
}

# --------------------------------------------------------------------------
Section "7. node_modules — koľko sa toho pri presune zbytočne kopíruje"
# --------------------------------------------------------------------------
foreach ($repo in $repos) {
    Try-Run "node_modules v $repo" {
        $nm = Get-ChildItem -Path $repo -Directory -Filter 'node_modules' -Recurse -Depth 3 -Force -ErrorAction SilentlyContinue
        foreach ($n in $nm) {
            $sz = (Get-ChildItem $n.FullName -Recurse -File -Force -ErrorAction SilentlyContinue |
                   Measure-Object -Property Length -Sum).Sum
            if (-not $sz) { $sz = 0 }
            Write-Output ("  {0,8:N0} MB   {1}" -f ($sz / 1MB), $n.FullName)
        }
    }
}

# --------------------------------------------------------------------------
Section "8. .env súbory — IBA MENÁ, obsah sa zámerne nevypisuje"
# --------------------------------------------------------------------------
foreach ($repo in $repos) {
    Try-Run ".env v $repo" {
        Get-ChildItem -Path $repo -Recurse -File -Force -Filter '.env*' -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch '\\node_modules\\' } |
            ForEach-Object { Write-Output ("  {0}   ({1} B, zmenený {2:yyyy-MM-dd})" -f $_.FullName, $_.Length, $_.LastWriteTime) }
    }
}

# --------------------------------------------------------------------------
Section "9. Prostredie — dlhé cesty, OneDrive, voľné miesto"
# --------------------------------------------------------------------------
Try-Run "LongPathsEnabled" {
    $lp = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name LongPathsEnabled -ErrorAction SilentlyContinue
    Write-Output "  LongPathsEnabled: $(if ($lp) { $lp.LongPathsEnabled } else { 'nenastavené (= 0, limit 260 znakov platí)' })"
}
Try-Run "OneDrive" {
    Write-Output "  OneDrive:   $(if ($env:OneDrive) { $env:OneDrive } else { 'nenastavené' })"
    Write-Output "  (ak by nový priečinok padol dovnútra OneDrive, node_modules sa začnú synchronizovať — to treba vylúčiť)"
}
Try-Run "disk" {
    Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq 'C' } |
        ForEach-Object { Write-Output ("  C: voľné {0:N1} GB z {1:N1} GB" -f ($_.Free/1GB), (($_.Free + $_.Used)/1GB)) }
}

Write-Output "`n`nHOTOVO — nič sa nezmenilo. Výstup: $out"
if ($transcript) { try { Stop-Transcript | Out-Null } catch { } }
Write-Host ""
Write-Host "Hotovo. Posli tento subor dalej:" -ForegroundColor Green
Write-Host "  $out"

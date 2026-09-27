<#
    stash-rescue-report.ps1  --  LEN CITA. Nic nemeni, nic nemaze, nic neposiela.

    PRECO EXISTUJE
    Audit 2026-09-25 nasiel na disku 21 git repozitarov, v C:\RealitkaAI
    devatdesiat stashov, a tri repozitare bez remote - ich obsah teda
    neexistuje nikde inde nez na tom jednom disku.

    Tento skript NEZACHRANUJE. Iba vypise, CO je v ohrozeni, aby sa dalo
    rozhodnut, co zachranit. Zachrana je samostatny krok s vlastnym GO.

    SPUSTENIE
        powershell -ExecutionPolicy Bypass -File scripts\ops\stash-rescue-report.ps1

    VYSTUP: stash-rescue-<datum>.txt vedla skriptu.

    BEZPECNOST
    Skript zamerne nevypisuje OBSAH ziadneho suboru - iba mena, pocty riadkov
    a statistiky. Stash moze obsahovat zmeny v .env; tie su oznacene varovanim,
    ale ich obsah sa nikde nevypise. Ak by si vo vystupe nasiel nieco, co
    vyzera ako kluc alebo heslo, je to chyba skriptu - nahlas ju a vystup
    nikam neposielaj.

    POZNAMKY K PREVEDENIU
    - Bez diakritiky. Predchadzajuci skript sa musel prepisovat na UTF-8 BOM,
      lebo PowerShell 5.1 diakritiku v ASCII subore zle precital.
    - Kazda kontrola je v try/catch: zlyhanie jednej nezhodi zvysok.
    - Skript nebol spusteny ani odparsovany - v prostredi, kde vznikol,
      nie je PowerShell.
#>

$ErrorActionPreference = 'Continue'
$out = Join-Path $PSScriptRoot ("stash-rescue-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".txt")

function Section($name) { Write-Output ("`n" + ('=' * 74) + "`n== $name`n" + ('=' * 74)) }
function Try-Run($label, [scriptblock]$b) {
    try { & $b } catch { Write-Output "  [kontrola '$label' zlyhala: $($_.Exception.Message)]" }
}

$transcript = $true
try { Start-Transcript -Path $out -Force | Out-Null }
catch { $transcript = $false; Write-Host "Start-Transcript nedostupny - presmeruj rucne: ... > report.txt" -ForegroundColor Yellow }

Write-Output "stash-rescue-report  --  LEN CITANIE, nic sa nemeni"
Write-Output "cas:     $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "pocitac: $env:COMPUTERNAME"

# ---------------------------------------------------------------------------
Section "0. Hladam repozitare"
# ---------------------------------------------------------------------------
$roots = @('C:\', 'C:\Projects', "$env:USERPROFILE") | Select-Object -Unique
$repos = @()
foreach ($r in $roots) {
    Try-Run "hladanie v $r" {
        if (Test-Path $r) {
            Get-ChildItem -Path $r -Directory -Filter '.git' -Recurse -Depth 4 -Force -ErrorAction SilentlyContinue |
                Where-Object { $_.FullName -notmatch '\\(Windows|Program Files|Program Files \(x86\)|AppData|node_modules)\\' } |
                ForEach-Object { $script:repos += $_.Parent.FullName }
        }
    }
}
$repos = $repos | Select-Object -Unique | Sort-Object
Write-Output "najdenych repozitarov: $($repos.Count)"

# ---------------------------------------------------------------------------
Section "1. SUHRN - co je v ohrozeni (cele cislo = riadok na akciu)"
# ---------------------------------------------------------------------------
$summary = @()
foreach ($repo in $repos) {
    Try-Run "suhrn $repo" {
        Push-Location $repo
        try {
            $remote = (git remote get-url origin 2>$null)
            $stash  = @(git stash list 2>$null)
            $dirty  = @(git status --porcelain 2>$null)
            $untr   = @($dirty | Where-Object { $_ -match '^\?\?' })
            $mod    = @($dirty | Where-Object { $_ -notmatch '^\?\?' })
            # vetvy, ktore nie su nikde na remote
            $unpushed = @()
            if ($remote) {
                $unpushed = @(git for-each-ref --format='%(refname:short)' refs/heads 2>$null |
                    Where-Object { $_ -and -not (git rev-parse --verify --quiet "origin/$_" 2>$null) })
            }
            $script:summary += [pscustomobject]@{
                Repo       = $repo
                Remote     = if ($remote) { 'ano' } else { 'ZIADNY' }
                Stash      = $stash.Count
                Zmenene    = $mod.Count
                Netrackov  = $untr.Count
                VetvyLokal = $unpushed.Count
            }
        } finally { Pop-Location }
    }
}
$summary | Sort-Object -Property @{Expression={$_.Stash + $_.Zmenene + $_.VetvyLokal}; Descending=$true} |
    Format-Table -AutoSize | Out-String -Width 200 | Write-Output

$riziko = @($summary | Where-Object { $_.Remote -eq 'ZIADNY' -and ($_.Zmenene + $_.Netrackov) -gt 0 })
if ($riziko.Count -gt 0) {
    Write-Output "`n!! REPOZITARE BEZ REMOTE S NEULOZENOU PRACOU - existuju IBA na tomto disku:"
    $riziko | ForEach-Object { Write-Output "     $($_.Repo)   ($($_.Zmenene) zmenenych, $($_.Netrackov) netrackovanych)" }
}

# ---------------------------------------------------------------------------
Section "2. STASHE - co v nich je (bez obsahu suborov)"
# ---------------------------------------------------------------------------
foreach ($repo in $repos) {
    Try-Run "stash $repo" {
        Push-Location $repo
        try {
            $list = @(git stash list --date=short --format='%gd|%cd|%gs' 2>$null)
            if ($list.Count -eq 0) { return }
            Write-Output "`n########## $repo   ($($list.Count) stashov)"
            foreach ($line in $list) {
                $p = $line -split '\|', 3
                $ref = $p[0]; $date = $p[1]; $msg = $p[2]
                $stat = @(git stash show --stat $ref 2>$null)
                $last = if ($stat.Count -gt 0) { $stat[-1].Trim() } else { '(prazdny alebo necitatelny)' }
                # POZOR: 'git stash show --name-only' NETRACKOVANE subory nevypisuje.
                # Overene behom (git 2.43). Preto sa citaju zo tretieho rodica ^3
                # zvlast - inak by stashnuty .env nikto neoznacil.
                $tracked = @(git stash show --name-only $ref 2>$null)
                $untrack = @(git ls-tree -r --name-only "$ref^3" 2>$null)
                $files   = @($tracked + $untrack | Where-Object { $_ })
                $secret  = @($files | Where-Object { $_ -match '\.env|secret|credential|password|token|\.pem$|\.key$|\.pfx$' })
                Write-Output ("  {0,-12} {1}  {2}" -f $ref, $date, $msg)
                Write-Output ("      {0}" -f $last)
                if ($files.Count -gt 0 -and $files.Count -le 6) {
                    $files | ForEach-Object { Write-Output "        $_" }
                } elseif ($files.Count -gt 6) {
                    $files | Select-Object -First 5 | ForEach-Object { Write-Output "        $_" }
                    Write-Output ("        ... a dalsich {0} suborov" -f ($files.Count - 5))
                }
                if ($untrack.Count -gt 0) {
                    Write-Output ("      z toho {0} NETRACKOVANYCH (stash -u) - tie sa pri pushi vetvy dostanu na remote" -f $untrack.Count)
                }
                if ($secret.Count -gt 0) {
                    Write-Output ("      !! POZOR: stash sa dotyka {0} suborov, ktore vyzeraju ako tajomstva - NEPUSHOVAT bez kontroly" -f $secret.Count)
                }
            }
        } finally { Pop-Location }
    }
}

# ---------------------------------------------------------------------------
Section "3. NECOMMITNUTE ZMENY (mena suborov, nie obsah)"
# ---------------------------------------------------------------------------
foreach ($repo in $repos) {
    Try-Run "dirty $repo" {
        Push-Location $repo
        try {
            $dirty = @(git status --porcelain 2>$null)
            if ($dirty.Count -eq 0) { return }
            Write-Output "`n########## $repo   ($($dirty.Count) poloziek)"
            $dirty | Select-Object -First 60 | ForEach-Object { Write-Output "  $_" }
            if ($dirty.Count -gt 60) { Write-Output ("  ... a dalsich {0}" -f ($dirty.Count - 60)) }
        } finally { Pop-Location }
    }
}

# ---------------------------------------------------------------------------
Section "4. LOKALNE VETVY, KTORE NIE SU NA REMOTE"
# ---------------------------------------------------------------------------
foreach ($repo in $repos) {
    Try-Run "vetvy $repo" {
        Push-Location $repo
        try {
            if (-not (git remote get-url origin 2>$null)) { return }
            $b = @(git for-each-ref --format='%(refname:short)' refs/heads 2>$null |
                   Where-Object { $_ -and -not (git rev-parse --verify --quiet "origin/$_" 2>$null) })
            if ($b.Count -eq 0) { return }
            Write-Output "`n########## $repo"
            foreach ($n in $b) {
                $c = (git rev-list --count $n 2>$null)
                $d = (git log -1 --format='%cd' --date=short $n 2>$null)
                Write-Output ("  {0,-45} {1} commitov, posledny {2}" -f $n, $c, $d)
            }
        } finally { Pop-Location }
    }
}

# ---------------------------------------------------------------------------
Section "5. CO S TYM - navrhnute prikazy (NESPUSTAM ICH)"
# ---------------------------------------------------------------------------
Write-Output @'
  POZOR NA ROZSIREN'Y OMYL: "git bundle create ... --all" zabali vetvy a tagy,
  ale NEZABALI stashe ani necommitnute a netrackovane subory. Na to, co mas na
  disku ty, teda sam osebe nestaci.

  A) NAJISTEJSIA A NAJJEDNODUCHSIA ZALOHA - kopia celeho priecinka vratane .git.
     Zachyti VSETKO naraz: stashe, necommitnute, netrackovane, konfiguraciu.

         robocopy C:\RealitkaAI D:\zaloha\RealitkaAI /E /XD node_modules .next .turbo .worktrees /R:1 /W:1

     /XD vynecha to, co sa da kedykolvek doinstalovat. Cielovy disk ma byt INY
     fyzicky disk nez C:, inak zaloha nechrani pred zlyhanim disku.
     Toto je jediny krok, ktory odporucam urobit este dnes.

  B) MALY SUBOR LEN S HISTORIOU VETIEV - ak chces nieco lahke na odlozenie:

         cd C:\RealitkaAI
         git bundle create D:\zaloha\RealitkaAI-vetvy.bundle --all

     Opakujem: stashe v tom NEBUDU.

  C) STASHE DO VETIEV - aby prezili aj bundle a aby sa dali pushnut na GitHub,
     musia sa najprv premenit na vetvy:

         git branch zachrana/stash-0 stash@{0}

     Toto UZ JE zapis do repozitara (stash zostane zachovany, vznikne navyse
     vetva). Pri devatdesiatich stashoch to chce skript a rozvahu, ktore stoja
     za zachranu - preto na to chcem samostatne GO.

  D) REPOZITARE BEZ REMOTE zo sekcie 1: zaloz prazdne privatne repo na GitHube
     a pushni. Zapis navonok, takze tiez az po tvojom rozhodnuti.

  PORADIE, KTORE ODPORUCAM: najprv A (dnes, 10 minut, nulove riziko),
  potom sa pozri na vypis stashov a povedz, ci ist na C.
'@

Write-Output "`n`nHOTOVO - nic sa nezmenilo. Vystup: $out"
if ($transcript) { try { Stop-Transcript | Out-Null } catch { } }
Write-Host ""
Write-Host "Hotovo. Posli tento subor dalej:" -ForegroundColor Green
Write-Host "  $out"

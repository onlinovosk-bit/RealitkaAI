<#
    stash-to-branches.ps1
    Premeni stashe na lokalne vetvy, aby prezili a dali sa zalohovat.

    DRY-RUN JE VYCHODZI. Bez prepinaca -Execute sa NIC nevytvori, len sa vypise,
    co by sa stalo.

        powershell -ExecutionPolicy Bypass -File scripts\ops\stash-to-branches.ps1
        powershell -ExecutionPolicy Bypass -File scripts\ops\stash-to-branches.ps1 -Execute

    CO ROBI
      Pre kazdy stash vytvori lokalnu vetvu ukazujucu na ten isty commit.
      To je ciste pridanie: stash ZOSTAVA, nic sa nemaze, nic sa neprepisuje.

    CO NEROBI
      Nepushuje. Nikdy. Dovod je nizsie.
      Nemaze stashe. Nerobi checkout. Nemeni pracovny strom.

    OVERENA MECHANIKA (spustene, nie odhadnute; git 2.43)
      1. `git branch <meno> stash@{N}` vetvu vytvori a stash zostane v zozname.
      2. Obsah vetvy sa rovna obsahu stashu.
      3. Stash ulozeny s -u ma netrackovane subory v tretom rodicovi (^3)
         a tie pri pushi vetvy odchadzaju na remote tiez.
      4. `git stash show --name-only` netrackovane subory NEVYPISUJE.
         Preto sa citaju zo ^3 zvlast - inak by stashnuty .env nikto neoznacil.

    PRETO SA NEPUSHUJE AUTOMATICKY
      Z bodov 3 a 4 plynie: keby bol v stashi netrackovany .env, push vetvy ho
      zverejni na GitHube. Skript preto oznaci vetvy, ktore sa dotykaju
      tajomstiev, a prikaz na push vypise IBA pre tie ostatne. Rozhodnutie
      je tvoje, nie skriptu.

    POZNAMKY
      Bez diakritiky - PowerShell 5.1 ju v ASCII subore cita zle.
      Skript nebol spusteny (v prostredi, kde vznikol, nie je PowerShell),
      ale git mechanika pod nim overena je. Preto je aj dry-run vychodzi.
#>

param(
    [switch] $Execute,
    [string] $RepoPath = (Get-Location).Path,
    [string] $Prefix   = 'zachrana'
)

$ErrorActionPreference = 'Continue'
$SECRET_RX = '\.env|secret|credential|password|token|\.pem$|\.key$|\.pfx$'

function Slug([string]$text) {
    if (-not $text) { return 'stash' }
    # odstran typicky prefix "WIP on vetva: abc1234 " alebo "On vetva: "
    $t = $text -replace '^(WIP )?[Oo]n [^:]+:\s*', ''
    $t = $t -replace '^[0-9a-f]{7,40}\s+', ''
    $t = $t.ToLowerInvariant() -replace '[^a-z0-9]+', '-'
    $t = $t.Trim('-')
    if ($t.Length -gt 40) { $t = $t.Substring(0, 40).Trim('-') }
    if (-not $t) { $t = 'stash' }
    if ($t -match '\.lock$') { $t = $t + '-x' }
    return $t
}

Push-Location $RepoPath
try {
    if (-not (git rev-parse --is-inside-work-tree 2>$null)) {
        Write-Host "Toto nie je git repozitar: $RepoPath" -ForegroundColor Red
        exit 2
    }

    $stashes = @(git stash list --date=short --format='%gd|%cd|%gs' 2>$null)
    if ($stashes.Count -eq 0) { Write-Host "Ziadne stashe v $RepoPath - nie je co robit."; exit 0 }

    $mode = if ($Execute) { 'OSTRY BEH - vetvy sa vytvoria' } else { 'DRY-RUN - nic sa nevytvori' }
    Write-Host ""
    Write-Host "  $mode" -ForegroundColor Cyan
    Write-Host "  repozitar: $RepoPath"
    Write-Host "  stashov:   $($stashes.Count)"
    Write-Host ""

    $plan = @()
    $i = 0
    foreach ($line in $stashes) {
        $p    = $line -split '\|', 3
        $ref  = $p[0]; $date = $p[1]; $msg = $p[2]
        $idx  = '{0:d2}' -f $i; $i++

        $name = "$Prefix/$date-$idx-$(Slug $msg)"

        $tracked = @(git stash show --name-only $ref 2>$null)
        $untrack = @(git ls-tree -r --name-only "$ref^3" 2>$null)
        $all     = @($tracked + $untrack | Where-Object { $_ })
        $secrets = @($all | Where-Object { $_ -match $SECRET_RX })
        $exists  = [bool](git rev-parse --verify --quiet "refs/heads/$name" 2>$null)

        $plan += [pscustomobject]@{
            Ref = $ref; Vetva = $name; Datum = $date
            Suborov = $all.Count; Netrackovanych = $untrack.Count
            Tajomstva = $secrets.Count; UzExistuje = $exists
            Popis = $msg
        }
    }

    foreach ($r in $plan) {
        $flag = if ($r.Tajomstva -gt 0) { '  !! TAJOMSTVA' } else { '' }
        $skip = if ($r.UzExistuje) { '  (vetva uz existuje, preskakujem)' } else { '' }
        Write-Host ("  {0,-10} -> {1}" -f $r.Ref, $r.Vetva)
        Write-Host ("               {0} suborov ({1} netrackovanych){2}{3}" -f $r.Suborov, $r.Netrackovanych, $flag, $skip)
    }

    $doCreate = @($plan | Where-Object { -not $_.UzExistuje })
    $bezpecne = @($plan | Where-Object { $_.Tajomstva -eq 0 })
    $rizikove = @($plan | Where-Object { $_.Tajomstva -gt 0 })

    Write-Host ""
    Write-Host ("  na vytvorenie: {0}   uz existuje: {1}" -f $doCreate.Count, ($plan.Count - $doCreate.Count))
    Write-Host ("  bez tajomstiev: {0}   s tajomstvami: {1}" -f $bezpecne.Count, $rizikove.Count)

    if (-not $Execute) {
        Write-Host ""
        Write-Host "  DRY-RUN. Nic sa nevytvorilo." -ForegroundColor Yellow
        Write-Host "  Ked to takto sedi, spusti to iste s -Execute."
        exit 0
    }

    Write-Host ""
    $ok = 0; $err = 0
    foreach ($r in $doCreate) {
        try {
            git branch $r.Vetva $r.Ref 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) { $ok++ } else { $err++; Write-Host "  CHYBA pri $($r.Ref) -> $($r.Vetva)" -ForegroundColor Red }
        } catch { $err++; Write-Host "  CHYBA pri $($r.Ref): $($_.Exception.Message)" -ForegroundColor Red }
    }
    Write-Host ("  vytvorenych vetiev: {0}   chyb: {1}" -f $ok, $err) -ForegroundColor Green

    $zostali = @(git stash list 2>$null)
    Write-Host ("  stashov po behu: {0}  (malo by zostat {1} - nic sa nemaze)" -f $zostali.Count, $plan.Count)

    Write-Host ""
    Write-Host "  DALSI KROK - push, ale len toho, co je bezpecne:" -ForegroundColor Cyan
    if ($bezpecne.Count -gt 0) {
        Write-Host "      git push origin $($bezpecne[0].Vetva)"
        Write-Host "    ...alebo vsetky bezpecne naraz:"
        Write-Host "      git push origin $(($bezpecne | ForEach-Object { $_.Vetva }) -join ' ')"
    } else {
        Write-Host "      ziadna vetva nie je oznacena ako bezpecna"
    }
    if ($rizikove.Count -gt 0) {
        Write-Host ""
        Write-Host "  !! TIETO NEPUSHUJ, kym sa na ne nepozries - obsahuju subory, ktore vyzeraju ako tajomstva:" -ForegroundColor Red
        $rizikove | ForEach-Object { Write-Host ("      {0}" -f $_.Vetva) }
        Write-Host "     Pozri, co v nich je:  git show --stat <vetva>"
        Write-Host "     Push takej vetvy zverejni aj netrackovane subory zo stashu."
    }
}
finally { Pop-Location }

# A3 · Ranný brief — paste-ready

**Názov v UI:** `A3 Ranný brief`  
**Cron:** 02:40 CEST · **00:40 UTC** (ak Cursor cron = UTC) — **vždy posledný**  
**Fáza:** 1 — iba čítanie

Stealth: v reporte môžeš uviesť stav widgetu referenčného tenanta; **nepoužívaj** interné klientské údaje mimo read-only agregátov v inštrukciách; marketing/public copy bez mena klienta bez súhlasu.

Skopíruj do poľa **Agent Instructions**:

```
SPÚŠŤAČ: každý deň o 02:40 CEST (00:40 UTC ak cron je UTC) — po A1 a A2

ROZSAH:
  Smieš: HTTP GET na verejné endpointy, SELECT dotazy cez read-only databázové
  spojenie, čítanie výstupov automatizácií A1 a A2 z Run History.
  NESMIEŠ: akýkoľvek INSERT, UPDATE, DELETE. Žiadny commit, push ani PR.
  Žiadne odosielanie e-mailov — ani drafty, ani notifikácie zákazníkom.
  Žiadny portal scrape, auto-deploy, CREDITS_ENFORCEMENT zapnutie.

AKCIA:
  1. ZDRAVIE PRODUKCIE
     curl -fsS -o /dev/null -w "%{http_code}" https://app.revolis.ai/api/healthz
     curl -fsS -o /dev/null -w "%{http_code}" https://app.revolis.ai/odhad/reality-smolko
     POZOR: /api/health NEEXISTUJE a vracia 401. Nepoužívaj ho.

  2. LEADY ZA VČERA (read-only SELECT)
     select count(*) filter (where created_at >= current_date - 1) as vcera,
            count(*) filter (where created_at >= current_date - 7) as za_tyzden,
            count(*) filter (where status = 'Nový') as nekontaktovane,
            count(*) filter (where note ilike '%predaj_do_12m=ano%') as chce_predat
     from public.leads
     where agency_id = '11111111-1111-1111-1111-111111111111'
       and source = 'valuation_widget'
       and email not ilike '%@revolis.test';

  3. NAJSTARŠÍ NEKONTAKTOVANÝ LEAD
     Vypíš meno, telefón a koľko dní leží. Toto je jediné číslo, ktoré
     priamo ohrozuje platiaceho referenčného zákazníka.

  4. KONTROLA SANDBOXU — musí vrátiť 0 riadkov:
     select count(*) from public.leads
     where source = 'valuation_widget'
       and (email ilike '%@revolis.test' or note ilike '%demo%')
       and created_at >= now() - interval '1 day';
     Ak vráti čokoľvek iné než 0, je to INCIDENT — napíš to na prvý riadok reportu.

  5. VÝSLEDKY A1 A A2
     Prečítaj Run History predchádzajúcich dvoch automatizácií a zhrň ich
     jednou vetou každú.

DÔKAZ:
  Každý bod má číslo alebo HTTP kód. Žiadny bod nesmie skončiť slovným
  odhadom typu „vyzerá to v poriadku".

ROZPOČET:
  max 2 pokusy · max 10 minút
  STOP pri stagnácii: ak databáza neodpovie na druhý pokus, vynechaj body
  2 až 4, dokonči zvyšok a napíš, čo chýba.

FÁZA: 1 — IBA ČÍTANIE.

STOP + REPORT (toto čítam ráno, píš stručne):
  ## Ráno <dátum>
  🔴 / 🟢 na prvom riadku — červená len ak je niečo naozaj rozbité

  PRODUKCIA: healthz <kód> · widget referenčný tenant <kód>
  LEADY: včera X · týždeň Y · nekontaktovaných Z · chce predať do 12m W
  NAJSTARŠÍ NEKONTAKTOVANÝ: <meno>, <telefón>, <N> dní
  SANDBOX: čistý / INCIDENT
  KÓD: main <zelený/červený> · vetvy <čisté / N s konfliktom>

  ČO MUSÍM DNES UROBIŤ:
  <max 3 body, zoradené podľa toho, čo ohrozuje platiaceho zákazníka.
   Ak nie je nič, napíš „nič nehorí, choď volať kanceláriám.">

  NEPÍŠ nič ďalšie. Žiadne odporúčania k architektúre, žiadne návrhy
  na refaktoring. Toto je prevádzkový brief, nie konzultácia.

  Verdikt (konal / vedel / zbytočné): ____
```

# OVERNIGHT BRIEF: Sandbox Demo Tenant + GDPR Consent Column

**Cieľová cesta v repe:** `docs/briefs/overnight/overnight-brief-sandbox-gdpr.md`
**Dátum:** 2026-07-22 · **Kategória:** Core Platform (chráni platiaceho zákazníka)
+ compliance dokončenie z pôvodného briefu
**Kontext:** Wave 1 widgetu beží na PROD (`/odhad/reality-smolko`, PR #309),
GA4 tracking nasadený a funkčný (potvrdil founder). Tento brief rieši dva
zostávajúce blockery verejného zdieľania odkazu: (A) bezpečný sandbox, aby
zvedaví prospekti nevytvárali falošné leady v CRM platiaceho zákazníka;
(B) štruktúrovaný GDPR consent záznam namiesto poznámky v note.

Postaviteľné ako JEDEN PR (spoločná migrácia), alebo dva sekvenčné PR
(najprv B — migrácia, potom A). Rozhodne orchestrátor podľa CI zvyklostí;
paralelne NIE — obe časti siahajú na lead insert cestu.

**FOUNDER GO:** migrácia schválená 2026-07-22 (handoff s GO).

---

## ČASŤ A — Sandbox demo tenant

### Cieľ
Verejná adresa `/odhad/demo`, ktorú možno bez rizika poslať komukoľvek
(cold emaily, podpis, sociálne siete). Vyzerá a správa sa ako reálny widget,
ale NIKDY nezapíše lead do žiadneho reálneho CRM ani nepošle notifikáciu.

### Implementácia
1. **Migrácia:** `valuation_tenants` dostáva stĺpec
   `is_sandbox boolean not null default false`.
2. **Seed:** nový riadok — slug `demo`, brand_name "Ukážková kancelária",
   `is_sandbox=true`, `enabled=true`, primary_color default, BEZ
   `agency_id` väzby na reálnu agentúru → stĺpec `agency_id` sa mení na
   nullable, ALEBO (preferované, menší zásah) sa vytvorí interná
   "sandbox agency" s vlastným UUID, ktorá nie je nikomu viditeľná
   v aplikácii. Rozhodni podľa toho, čo menej rozbije existujúce FK/RLS —
   zdôvodni v PR popise.
3. **Lead flow pre sandbox:** ak `is_sandbox=true`:
   - `/api/valuation/estimate` funguje normálne (plný zážitok s reálnym
     NBS výpočtom),
   - `/api/valuation/submit` NEVYTVÁRA lead v `leads`, NEVOLÁ triage,
     NEPOSIELA notifikáciu. Namiesto toho zapíše riadok do novej tabuľky
     `sandbox_submissions` (payload jsonb, created_at, ip_hash) — čisto
     pre founder štatistiku záujmu — a vráti rovnaký success response ako
     reálny flow (návštevník rozdiel nevidí).
   - Rate limit prísnejší: 5 submitov/h/IP (demo láka na klikanie).
4. **UI odlíšenie (poctivosť):** malý badge "Ukážková verzia" v hlavičke
   widgetu pri `is_sandbox=true` + výsledková stránka namiesto Calendly CTA
   zobrazí: "Toto je ukážka. Vlastnú kalkulačku pre vašu kanceláriu vám
   spustíme — info@revolis.ai". Sandbox NIKDY nezobrazuje meno/logo
   reálnej kancelárie.
5. **GA4:** existujúce eventy fungujú aj na sandboxe, s `agency_slug=demo`
   — founder tak vidí, koľko prospektov z emailov si demo reálne vyskúšalo.

### Acceptance A
- `/odhad/demo` verejne funguje, plný formulár + reálny odhad.
- Submit na sandboxe: 0 nových riadkov v `leads`, 0 notifikácií,
  1 riadok v `sandbox_submissions`. Overené testom.
- `/odhad/reality-smolko` správanie NEZMENENÉ (regresný test: lead vzniká,
  triage beží, notifikácia ide).
- Sandbox viditeľne označený ako ukážka; žiadna reálna značka.

---

## ČASŤ B — GDPR consent ako štruktúrovaný záznam

### Cieľ
Splniť pôvodnú požiadavku validation briefu: uložiť verziu privacy textu,
timestamp potvrdenia a marketing opt-in ako dopytovateľné stĺpce, nie ako
text v poznámke. Umožňuje neskôr odpovedať na žiadosť dotknutej osoby
("kedy a s čím som súhlasil") bez ručného hľadania v notes.

### Implementácia
1. **Migrácia — nová tabuľka** `lead_consents` (NIE stĺpce na `leads` —
   menší zásah do existujúcej tabuľky a čistejšia história):
   ```sql
   create table lead_consents (
     id uuid primary key default gen_random_uuid(),
     lead_id uuid not null references leads(id) on delete cascade,
     tenant_slug text not null,
     privacy_policy_version text not null,   -- napr. "2026-07-v1"
     acknowledged_at timestamptz not null,
     marketing_opt_in boolean not null default false,
     created_at timestamptz not null default now()
   );
   ```
   RLS: prístup len service role + owner danej agentúry (rovnaký vzor ako
   leads). Sandbox submissions consent NEUKLADAJÚ do tejto tabuľky
   (nevzniká lead → nie je na čo viazať; payload v sandbox_submissions
   nesmie obsahovať osobné údaje v čitateľnej podobe — kontakt polia
   sa pri sandboxe zahadzujú pred zápisom).
2. **Lead ingest rozšírenie:** `/api/valuation/submit` pri reálnom tenantovi
   zapíše consent riadok v tej istej transakcii ako lead. Verzia policy
   sa číta z konfigu (`PRIVACY_POLICY_VERSION` env alebo konštanta
   v `src/lib/valuation/config.ts`) — NIE hardcode v route.
3. **Backfill:** existujúce leady z widgetu (ak nejaké sú) — vytiahnuť
   consent info z notes, zapísať do `lead_consents` s poznámkou
   `privacy_policy_version='pre-migration'`. Ak notes parsing nie je
   spoľahlivý, backfill preskočiť a uviesť v PR popise počet dotknutých
   leadov — founder rozhodne.

### Acceptance B
- Submit na `/odhad/reality-smolko` vytvorí lead + presne 1 consent riadok
  s verziou a timestampom. Test overuje transakčnosť (rollback pri páde
  consent insertu = žiadny lead).
- Chýbajúce GDPR potvrdenie vo formulári → validačná chyba, žiadny lead,
  žiadny consent (existujúci test rozšíriť).
- Sandbox submit → žiadny riadok v `lead_consents`, žiadne osobné údaje
  v `sandbox_submissions` payload. Test.
- RLS test: agentúra A nevidí consenty agentúry B.

---

## TESTY CELKU (e2e, rozšírenie existujúceho valuation-widget.spec.ts)
1. Demo happy path: `/odhad/demo` → formulár → odhad → submit → success
   screen s "Ukážková verzia" → DB assert (sandbox_submissions +1,
   leads +0).
2. Smolko happy path (regres): lead +1, lead_consents +1, notifikácia mock
   volaná.
3. Smolko bez GDPR checkboxu → 4xx, leads +0, lead_consents +0.
4. Rate limit sandbox: 6. submit z rovnakej IP → 429.

## VEDOME MIMO SCOPE
Admin UI pre sandbox štatistiky (SQL stačí) · export consentov (až pri
prvej reálnej žiadosti dotknutej osoby) · cookie banner (widget nepoužíva
marketingové cookies; GA4 beží v consent-šetrnom režime — ak by sa to
menilo, je to samostatné rozhodnutie).

## FOUNDER BRÁNY
- GO na migráciu (opäť PROD migrácia — explicitné potvrdenie). ✅ 2026-07-22
- Po merge + deploy: founder osobne otestuje `/odhad/demo` na mobile
  (kroky: vyplniť, odoslať, overiť v Supabase že leads tabuľka nemá nový
  riadok) — až POTOM sa demo link smie pridať do emailov/podpisu.
- Rozhodnutie o texte "Ukážková verzia" CTA (návrh vyššie, môžeš preformulovať).

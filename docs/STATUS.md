# Revolis.AI — STAV NA JEDNEJ STRÁNKE

> Aktualizuje sa **po každom uzavretom bloku** (jeden riadok zmeny hore + tabuľka). Čísla sú merané, kde je uvedený dôkaz;
> **celkové % je môj odhad** s uvedenými váhami (môžeš ich zmeniť). Posledná aktualizácia: **2026-10-02, 09:40 UTC** (RAU Leverage track — docs-only, % nezmenené).
> **celkové % je môj odhad** s uvedenými váhami (môžeš ich zmeniť). Posledná aktualizácia: **2026-10-02, 08:30 UTC** (EVENTS-WIRE + CRON-ALIVE, zatiaľ nezmergované).

## Celkom: ≈ 52 %  (odhad)

| blok | váha | stav | skóre | čo blokuje |
|---|---|---|---|---|
| **Predaj / platby (Stripe)** | 30 | **0 z 10 cien** na live účte | **0 %** | **founder: krok C v Stripe** |
| Príjem e-mailov → lead | 30 | parser ✅ · diagnostika (#743) ✅ · log schránok + trvalá stopa (#774) ✅ **nasadené a funguje** (23 riadkov od 1. 10. 19:41) · `unknown_source` → BACKLOG (dáta nepodporujú) | 80 % | nič — čaká na reálne portálové maily |
| AI návrh + odoslanie | 15 | triage ✅ · návrh ✅ · odoslanie ❌ | 67 % | founder: Resend DNS + reply-to + súhlas Smolka |
| **AI vrstva (BRI, skóre, briefy)** | *(v „Schéma + nasadenie")* | **crony BEŽIA** (meraná stopa v `cron_runs`) · zapisovateľ eventov zapojený (#786, čaká na merge) · `events` stále 0 do nasadenia | 40 % | merge #786 + nasadenie |
| Tenantová izolácia | 15 | 28 z 40 ciest zavretých | 70 % | nič naliehavé (zoznam nižšie) |
| Schéma + nasadenie | 10 | schéma ~98 % · nasadenie beží (buildy prechádzajú) · **hypotéza „cron blokuje plán Vercelu" VYVRÁTENÁ meraním** | 70 % | nič — Vercel Pro nie je pre crony potrebné |

## ONLINOVO — Agentic Revenue OS (P08 → P10, mimo Revolis % vyššie)

| časť | stav | dôkaz | čo blokuje ďalší krok |
|---|---|---|---|
| Špecifikácia (P08) + plán (P09) | ✅ | `docs/onlinovo/ONL-AGENTS-P08-*.md`, `P09-*.md` | — |
| 3 agenti (príležitosti, ďalšia akcia, experiment) | ✅ IMPLEMENTED/TESTED, read-only, **iba fixture/unconnected** | mcp-onlinovo 172/172, control-contract 72/72, crm agents 104/104 | živý zdroj dát = UNKNOWN |
| Odoslanie/plánovanie kampane, zápis journey | ⛔ BLOCKED v registri | `onlinovo.campaign.*`, `onlinovo.journey.write` FORBIDDEN, schválenie ich neodomkne | LeadHub API kontrakt = UNKNOWN (čaká odpoveď podpory) |
| Nezávislé overenie | ⏳ P11 | — | iná session; tento stav **nie je VERIFIED** |

*Stav: draft PR, nič nezmergované ani nenasadené. `packages/mcp-onlinovo` nemá CI job (`.github/**` je denylist → rozhodne founder).*

## Čo potrebujem od teba (zoradené podľa dopadu)
1. **Stripe krok C** — vytvoriť ceny: `bash scripts/ops/stripe-verify-prices.sh --spec` → potom pošli výstup `…verify-prices.sh`; overenie spravím ja. *(+30 bodov, jediný krok, ktorý odblokuje platiaceho klienta)*
2. ~~Merge #774~~ ✅ hotovo (`3dc3119`) a **nasadené v produkcii** (overené: deployment READY, 23 riadkov v `inbound_mail_outcomes`, nové `to_agency_mailbox` v logoch, 0× `mail_outcome_write_failed`).
3. **Vercel**: Pro **netreba kvôli cronom** — tie bežia, dokázané dvoma riadkami v `cron_runs`
   (`recompute-bri` 03:36:49, `morning-brief` 06:30:30, obe 2026-10-02, každý vo svojom okne s posunom 30–57 min).
   Denný limit nasadení riešený **bez platenia**: meranie 100 posledných nasadení ukázalo **88 preview vs 12 produkčných**,
   25 vetiev, jeden agentný workstream sám 30 — teda ~88 % stropu míňali agentné preview buildy, na ktorých
   `Playwright smoke` aj tak končil ako `skipped`. `ignoreCommand` ich odteraz na `claude/*` preskakuje
   (produkcia a `main` nikdy). Ak po tomto strop ešte padne, Pro je oprávnené a bude to vidieť na dátach.
   **Neoverené:** či Vercel Hobby licenčne pokrýva komerčný projekt — ak nie, Pro treba bez ohľadu na buildy.
4. **Resend DNS** (doména `revolis.ai`) + **reply-to** + súhlas Smolka s odosielaním. *(+5 bodov)*

## Hotové 2026-10-02 (docs-only, bez vplyvu na %)
- **RAU Leverage track (L01–L05):** päť read-only promptov v `docs/rau/leverage/` (znalosti foundera → páka → produkt → majetok), sprievodca, položka v Strategic Backlogu
  (predaj promptov ako produktu) a testy. **Nič nenasadené, nič nepredávame, užitočnosť NEMERANÁ** — overená je len štruktúra a ochranné pravidlá (49 testov, mutácie 76/76, dva slepé behy, nezávislý review).
  Podľa Ústavy v2 je to REJECT (skóre ≈ 2/12); GO prišlo pred kontrolou → **čaká na tvoje potvrdenie** (PR #803). Krok C ostáva #1.

## Hotové dnes (2026-10-01) — s dôkazom
- **Príjem:** `to_agency_mailbox` vs `to_unmatched` v logu, deterministický Gmail pull; tabuľka `inbound_mail_outcomes` v PROD (RLS on, 0 politík). Kód čaká na merge (#774).
- **Bezpečnosť (PROD):** únik `activities` zatvorený na všetkých cestách (tabuľka + pohľad × anon + authenticated; overené ako 4 agentúry);
  8/8 pohľadov `security_invoker`, 8/9 politík bez `agency_id IS NULL`, 11 `SECURITY DEFINER` funkcií uzavretých. `anon` čítal 240 rozhodnutí agentov — zatvorené.
- **`activities` agency kľúč (PROD):** nový stĺpec `agency_id` + trigger (doplní agentúru zo session, writery v aplikácii sa nemenia), politiky `activities_agency_select/insert`, zrušená `activities_insert_agency`. Dôkaz: suchý beh v rollbacku (8/8) + reálny stav ako 4 agentúry (3/0/3/0).
- **CI:** duplicitná verzia migrácie (moja chyba) a nekompatibilná migrácia s čistou DB opravené; #774 zmergovaný so zeleným CI.

## Hotové 2026-10-02 — s dôkazom
- **Crony bežia.** Moja predchádzajúca diagnóza („route nikto nedosiahol s platným `CRON_SECRET`") bola **vyvrátená
  meraním**: `cron_runs` má dva riadky, každý job vo svojom okne. Hypotéza o pláne Vercelu ako blokéri padá.
- **Prečo je AI vrstva napriek tomu prázdna:** `public.events` = 0 → BRI zámerne nepočíta (EVENTS-REVIVE-01, správne).
  A `events` bola prázdna preto, že `logEventClient()` nemal ani jedného volajúceho a jediný prehliadačový POST na
  `/api/events` posielal iný tvar, než route čítala — `as` pretypovanie namiesto validácie, chyba do `console.error`,
  odpoveď `ok: true`. Opravené v #786 (zod validácia, 400 bez zápisu, 500 pri zlyhaní, `lead_viewed` zapojené).
- **Druhý blokér nájdený:** `morning-brief` beží, ale `morning_brief_settings` má 0 riadkov — brief si nikto nevytvoril.
  Je to konfigurácia, nie chyba kódu.

## Otvorené, ale NIE naliehavé (v poradí)
- 12 funkcií volaných session/cronom (REVOKE bez testu by mohol rozbiť beh) · 193 riadkov `activities` má `agency_id = NULL` (187 historických bez vlastníka + 6 lead-viazaných) — viditeľné len service role, nemažú sa.
- Retencia 90 dní pre `inbound_mail_outcomes` — mazací cron nebeží.
- `lead_demands`, `demand_property_matches` chýbajú v PROD (demand vrstva).
- UI `/activities` po zúžení RLS som neotvoril.
- GDPR: posúdiť, či únik cez `anon` bol incident (rozhodnutie foundera).

## Pravidlá práce (aby si sa nemusel „uklikať")
- **Jeden uzavretý blok na jedno GO**, dôkaz priložený. Žiadne priebežné otázky ani správy k notifikáciám.
- Pred návrhom RLS/PROD zmeny najprv zmapovať **všetky** cesty (tabuľka, pohľady, funkcie × `anon`/`authenticated`) a predložiť jeden balík.
- Prioritu určuje Prime Directive: čo nezvyšuje šancu na platiaceho klienta, ide za predajom.

## Dáta z príjmu (prvé dáta po nasadení #774, 23 e-mailov, 14 domén)
- 22× `not_a_lead`, 1× `lead_created` (testovací mail z `revolis.ai`, zdroj Nehnuteľnosti.sk).
- `unknown_source` tvoria firemné/newsletterové domény (`backoffice.sk` 6×, `slovensko.sk` 3×, `kros.sk`, `tchibo.sk`, `lidlplus.sk`…), **žiadny portál**. Do `SOURCE_RULES` sa nič nepridáva; UNKNOWN-SOURCE-KEEP zostáva BACKLOG.
- Poznatok: do príjmu tečie celá pošta schránky agentúry, nielen portálové dopyty (GDPR minimalizácia — riešiť na zdroji preposielania).

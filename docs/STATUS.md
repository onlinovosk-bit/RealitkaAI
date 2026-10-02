# Revolis.AI — STAV NA JEDNEJ STRÁNKE

> Aktualizuje sa **po každom uzavretom bloku** (jeden riadok zmeny hore + tabuľka). Čísla sú merané, kde je uvedený dôkaz;
> **celkové % je môj odhad** s uvedenými váhami (môžeš ich zmeniť). Posledná aktualizácia: **2026-10-02, 07:40 UTC** (nasadenie #774 overené).

## Celkom: ≈ 49 %  (odhad)

| blok | váha | stav | skóre | čo blokuje |
|---|---|---|---|---|
| **Predaj / platby (Stripe)** | 30 | **0 z 10 cien** na live účte · audit cesty platby (2. 10.): zrušenie/zmena miest/zlyhaná platba sa nepremietne do `agencies`, `STRIPE_WEBHOOK_SECRET` sa nehlási; kontrakt PLATBY-E2E čaká na GO (`docs/reports/2026-10-02-platby-e2e-audit-a-kontrakt.md`) | **0 %** | **founder: krok C v Stripe** (+ GO PLATBY-E2E) |
| Príjem e-mailov → lead | 30 | parser ✅ · diagnostika (#743) ✅ · log schránok + trvalá stopa (#774) ✅ **nasadené a funguje** (23 riadkov od 1. 10. 19:41) · `unknown_source` → BACKLOG (dáta nepodporujú) | 80 % | nič — čaká na reálne portálové maily |
| AI návrh + odoslanie | 15 | triage ✅ · návrh ✅ · odoslanie ❌ | 67 % | founder: Resend DNS + reply-to + súhlas Smolka |
| Tenantová izolácia | 15 | 28 z 40 ciest zavretých | 70 % | nič naliehavé (zoznam nižšie) |
| Schéma + nasadenie | 10 | schéma ~98 % · nasadenie blokuje Vercel limit | 50 % | Vercel Pro alebo čakanie 24 h |

## Čo potrebujem od teba (zoradené podľa dopadu)
1. **Stripe krok C** — vytvoriť ceny: `bash scripts/ops/stripe-verify-prices.sh --spec` → potom pošli výstup `…verify-prices.sh`; overenie spravím ja. *(+30 bodov, jediný krok, ktorý odblokuje platiaceho klienta)*
2. ~~Merge #774~~ ✅ hotovo (`3dc3119`) a **nasadené v produkcii** (overené: deployment READY, 23 riadkov v `inbound_mail_outcomes`, nové `to_agency_mailbox` v logoch, 0× `mail_outcome_write_failed`).
3. **Vercel**: denný limit nasadení (free plán, >100/deň) sa dnes už uvoľnil (buildy bežia), ale hrozí znova → Pro plán, ak sa to bude opakovať.
4. **Resend DNS** (doména `revolis.ai`) + **reply-to** + súhlas Smolka s odosielaním. *(+5 bodov)*

## Hotové dnes (2026-10-01) — s dôkazom
- **Príjem:** `to_agency_mailbox` vs `to_unmatched` v logu, deterministický Gmail pull; tabuľka `inbound_mail_outcomes` v PROD (RLS on, 0 politík). Kód čaká na merge (#774).
- **Bezpečnosť (PROD):** únik `activities` zatvorený na všetkých cestách (tabuľka + pohľad × anon + authenticated; overené ako 4 agentúry);
  8/8 pohľadov `security_invoker`, 8/9 politík bez `agency_id IS NULL`, 11 `SECURITY DEFINER` funkcií uzavretých. `anon` čítal 240 rozhodnutí agentov — zatvorené.
- **`activities` agency kľúč (PROD):** nový stĺpec `agency_id` + trigger (doplní agentúru zo session, writery v aplikácii sa nemenia), politiky `activities_agency_select/insert`, zrušená `activities_insert_agency`. Dôkaz: suchý beh v rollbacku (8/8) + reálny stav ako 4 agentúry (3/0/3/0).
- **CI:** duplicitná verzia migrácie (moja chyba) a nekompatibilná migrácia s čistou DB opravené; #774 zmergovaný so zeleným CI.

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

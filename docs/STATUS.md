# Revolis.AI — STAV NA JEDNEJ STRÁNKE

> Aktualizuje sa **po každom uzavretom bloku** (jeden riadok zmeny hore + tabuľka). Čísla sú merané, kde je uvedený dôkaz;
> **celkové % je môj odhad** s uvedenými váhami (môžeš ich zmeniť). Posledná aktualizácia: **2026-10-01, 12:15 UTC.**

## Celkom: ≈ 40 %  (odhad)

| blok | váha | stav | skóre | čo blokuje |
|---|---|---|---|---|
| **Predaj / platby (Stripe)** | 30 | **0 z 10 cien** na live účte | **0 %** | **founder: krok C v Stripe** |
| Príjem e-mailov → lead | 30 | parser ✅ · diagnostika (#743) ✅ · log schránok + trvalá stopa (#774) ⏳ · `unknown_source` ⏸ | 50 % | merge #774; dáta z `inbound_mail_outcomes` |
| AI návrh + odoslanie | 15 | triage ✅ · návrh ✅ · odoslanie ❌ | 67 % | founder: Resend DNS + reply-to + súhlas Smolka |
| Tenantová izolácia | 15 | 27 z 40 ciest zavretých | 68 % | nič naliehavé (zoznam nižšie) |
| Schéma + nasadenie | 10 | schéma ~98 % · nasadenie blokuje Vercel limit | 50 % | Vercel Pro alebo čakanie 24 h |

## Čo potrebujem od teba (zoradené podľa dopadu)
1. **Stripe krok C** — vytvoriť ceny: `bash scripts/ops/stripe-verify-prices.sh --spec` → potom pošli výstup `…verify-prices.sh`; overenie spravím ja. *(+30 bodov, jediný krok, ktorý odblokuje platiaceho klienta)*
2. **Merge #774** — pripravený, čaká na posledný CI (`Lint, test, build` beží po oprave duplicitnej migrácie). *(+10 bodov, po nasadení sa rozbehne trvalá stopa príjmu)*
3. **Vercel**: denný limit nasadení (free plán, >100/deň) → buď Pro plán, alebo ≥24 h čakania; inak sa merge nedostane do produkcie.
4. **Resend DNS** (doména `revolis.ai`) + **reply-to** + súhlas Smolka s odosielaním. *(+5 bodov)*

## Hotové dnes (2026-10-01) — s dôkazom
- **Príjem:** `to_agency_mailbox` vs `to_unmatched` v logu, deterministický Gmail pull; tabuľka `inbound_mail_outcomes` v PROD (RLS on, 0 politík). Kód čaká na merge (#774).
- **Bezpečnosť (PROD):** únik `activities` zatvorený na všetkých cestách (tabuľka + pohľad × anon + authenticated; overené ako 4 agentúry);
  8/8 pohľadov `security_invoker`, 8/9 politík bez `agency_id IS NULL`, 11 `SECURITY DEFINER` funkcií uzavretých. `anon` čítal 240 rozhodnutí agentov — zatvorené.
- **CI:** duplicitná verzia migrácie (moja chyba) opravená.

## Otvorené, ale NIE naliehavé (v poradí)
- `activities_insert_agency` (agency kľúč pre aktivity bez leadu) · 12 funkcií volaných session/cronom (REVOKE bez testu by mohol rozbiť beh) · 187 riadkov `activities` bez leadu (vlastník neznámy).
- Retencia 90 dní pre `inbound_mail_outcomes` — mazací cron nebeží.
- `lead_demands`, `demand_property_matches` chýbajú v PROD (demand vrstva).
- UI `/activities` po zúžení RLS som neotvoril.
- GDPR: posúdiť, či únik cez `anon` bol incident (rozhodnutie foundera).

## Pravidlá práce (aby si sa nemusel „uklikať")
- **Jeden uzavretý blok na jedno GO**, dôkaz priložený. Žiadne priebežné otázky ani správy k notifikáciám.
- Pred návrhom RLS/PROD zmeny najprv zmapovať **všetky** cesty (tabuľka, pohľady, funkcie × `anon`/`authenticated`) a predložiť jeden balík.
- Prioritu určuje Prime Directive: čo nezvyšuje šancu na platiaceho klienta, ide za predajom.

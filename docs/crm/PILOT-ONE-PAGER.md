# Pilot — jedna strana (prvá realitná kancelária)

**Verzia:** 2026-04 · Platí prvé **2 týždne** po štarte

**Ferovo.sk:** konkrétna osnova discovery + jednopager — `docs/pilot-ferovo-discovery-outline.md`, `docs/pilot-ferovo-onepager.md`.

---

## Kto z kancelárie

| Rola | Meno / kontakt | Zodpovednosť |
|------|----------------|--------------|
| **Vlastník pilotu** | _doplň_ | Rozhoduje, či bug blokuje pilot; zber feedbacku 1× týždenne |
| **Denný používateľ** | _doplň_ | Leadová práca v CRM (najčastejší vstup) |
| **Záloha / back-office** | _voliteľne_ | Import, úlohy, prípadná administratíva |

---

## Čo meriame 2 týždne

| Metrika | Ako | Cieľ (orientačný) |
|---------|-----|-------------------|
| **Aktívne dni** | Koľko pracovných dní aspoň 1 človek reálne používa appku | ≥ 8 dní / 2 týždne |
| **Leady spracované** | Počet leadov s aspoň 1 zmenou stavu / poznámkou / úlohou | _baseline + X_ (dohodnúť) |
| **Čas do prvej akcie** | Od pridania leadu po prvý hovor / správu v systéme | Sledujeme trend, nie tvrdé číslo v týždni 1 |
| **Blokujúce chyby** | Počet závažností P0–P1 (ničí prácu) | **0** počas pilotu ideálne |

Nižšie sú len orientačné KPI — prioritný je **kvalitatívny feedback** (čo im chýba, čo je naviac).

---

## Bugy a incidenty

1. **Kanál:** _doplň — napr. spoločný Slack / WhatsApp / email na `support@…`_
2. **Šablóna hlásenia:** čo sa stalo · kde v appke (URL / obrazovka) · očakávanie vs. realita · screenshot ak ide o UI
3. **Závažnosť**
   - **P0** — úplne nejde prihlásenie / strata dát → okamžite volať / urgentný kanál
   - **P1** — kľúčová funkcia pokazená (žiadne obísť)
   - **P2** — nepríjemné, práca ide obísť
4. **Odpoveď:** do **1 pracovného dňa** potvrdenie prijatia; P0/P1 ako rýchlo sa dá.

---

## Koniec pilota

- Krátke stretnutie (30 min): čo ostal používať, čo nie, či pokračovať / upraviť rozsah
- Rozhodnutie o ďalšom kroku do 3 pracovných dní po skončení 2 týždňov

---

## Ako zistím, či mám overenú doménu na odosielanie (Resend)?

1. Prihlás sa na [resend.com](https://resend.com) → **Domains**.
2. Pozri **From** adresu v `OUTREACH_FROM_EMAIL` (napr. `Revolis <noreply@mg.revolis.ai>`) — doména je časť za `@` (`mg.revolis.ai`).
3. V zozname domén musí pri tejto doméne byť stav **Verified** (zelená). Ak tam doména **nie je**, ešte ju neposielaš z vlastnej domény (alebo používaš len testovací `onboarding@resend.dev`).
4. Ak je **Pending / Unverified**, doplň DNS záznamy (SPF, DKIM), ktoré Resend zobrazí pri danej doméne, a počkaj na revalidáciu (obvykle minúty až hodiny).

Podrobnejšie: `docs/email-delivery-setup.md`.

---

## CI

```bash
cd apps/crm && npm run pilot:check
```

Vypíše len **nastavené / CHÝBA**, nikdy nie hodnoty. Exit **1** len ak chýba `NEXT_PUBLIC_SUPABASE_URL`. Odporúčané premenné (Resend, URL) môžu chýbať s exit **0**; pre prísny režim: `STRICT_PILOT=1 npm run pilot:check`.

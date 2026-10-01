# OVERNIGHT BRIEF: n8n Foundation (V1)

**Cieľová cesta:** `docs/briefs/overnight/overnight-brief-n8n-foundation.md`
**Dátum:** 2026-07-22 · **Kategória:** Strategic Bet (founder rozhodol)
**Timebox:** 3 dni · **Kill kritériá (zapísané PRED prvým commitom):**
ak po 3 dňoch nebeží aspoň workflow W1 s reálnym behom end-to-end,
bet sa ukončí (promote/re-bet/kill — nič iné) a n8n sa vypne.

## Cieľ V1
Nasadiť n8n ako orchestračnú vrstvu Revolisu s TROMI workflowmi, ktoré
šetria founderov čas HNEĎ a neporušujú governance. Nie "automatizovať
všetko" — postaviť základ, na ktorom sa dá stavať.

## Hosting (rozhodni pri kickoffe, oba OK)
- **Variant A — n8n Cloud** (starter tier): nula ops, rýchly štart, ~20 €/m.
- **Variant B — malý VPS len pre n8n** (Hetzner CX22 ~4 €/m + Docker
  compose z oficiálneho n8n docs): lacnejšie dlhodobo, vyžaduje updates.
Odporúčanie pre V1: **A** (Cloud) — bet má timebox 3 dni, ops nula.
Migrácia na VPS je triviálna (export/import JSON) keď padne VPS brána
z tooling dokumentu.

## Workflowy V1 (presne tri, nič viac)

### W1 — Follow-up strážca (najvyššia hodnota)
Trigger: denne 07:30. Číta tracker (Google Sheets kópia
`docs/sales/revolis-sales-tracker` — jednorazovo preklopiť z xlsx, alebo
čítať cez Drive API) → nájde riadky Stav=Oslovený, Dátum oslovenia + 4 dni
= dnes, bez odpovede → vytvorí **Gmail DRAFT** follow-upu z šablóny
(personalizovaný oslovením a firmou) + pošle founderovi jednu súhrnnú
notifikáciu "dnes máš X follow-upov v konceptoch + Y telefonátov".
**NIKDY neodosiela — len drafty.** (ZAKÁZANÉ AKCIE.)

### W2 — Heartbeat watchdog
Trigger: každých 15 min. `GET https://app.revolis.ai/odhad/reality-smolko`
+ `GET /api/healthz` (existujúci heartbeat) → ak status != 200 dvakrát po
sebe → okamžitá notifikácia founderovi (email + push cez n8n app).
Dôvod: dnešný incident (500 na widgete platiaceho zákazníka) by bol
odhalený o hodiny skôr strojom, nie náhodou.

### W3 — Odpoveď-detektor
Trigger: každú hodinu. Gmail search `in:inbox newer_than:1h` od adries
v trackeri → ak prospekt odpovedal → notifikácia founderovi + návrh
riadku na update trackera (Stav=Odpovedal). Zápis do trackera robí
founder/Claude — W3 len deteguje a hlási (V1 bez zápisu, aby bet
nezávisel od Sheets write práv).

## Guardrails (tvrdé, platia pre KAŽDÝ budúci workflow)
1. Žiadny workflow neodosiela email/správu prospektovi ani zákazníkovi.
   Povolené: drafty, interné notifikácie founderovi, čítanie.
2. Žiadny workflow nezapisuje do produkčnej DB Revolisu. Integrácia
   s CRM = výhradne cez existujúce verejné API s auth, po samostatnom GO.
3. Credentials len v n8n credential store, nikdy v workflow JSON.
   Exportované JSON v `automation/n8n/` sa kontroluje na absenciu secrets
   (CI grep, rovnaký vzor ako stealth-recruiter guard).
4. Každý workflow má owner poznámku, popis a je exportnutý do gitu.

## Acceptance V1
- W1: aspoň 1 reálny beh, ktorý vytvoril správne drafty pre riadky s D+4
  (overené proti trackeru), 0 odoslaných emailov.
- W2: simulovaný výpadok (dočasne zlá URL) → notifikácia dorazila < 30 min.
- W3: testovacia odpoveď z iného účtu → detekovaná a nahlásená < 1 h.
- Všetky 3 JSON exporty v `automation/n8n/`, bez secrets, s README.

## FOUNDER BRÁNY
- Výber hostingu A/B (odporúčanie A).
- Google OAuth pre n8n (Gmail read + drafts, Sheets read) — schvaľuje
  founder osobne pri prvom pripojení.
- Po V1: rozhodnutie o Vlne 2 (content pipeline, tracker write-back,
  onboarding automatizácia) — samostatný brief, nie scope creep tohto.

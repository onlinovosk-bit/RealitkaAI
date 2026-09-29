# Audit volaní LLM na osobné údaje (P0 gate pred zapnutím D1)

**Dátum:** 2026-09-29 · **Rozsah:** celý monorepozitár (apps, packages, scripts, brain, edge functions)
**Metóda:** statické čítanie každého volania; tvrdenia pri PATCH overené druhým čítaním.

```
LLM CALL-SITE AUDIT
34 call sites (23 live, 11 code-only)
5 PATCH  — surový telefón/e-mail sa dostane k poskytovateľovi
  → 3 živé opravené v tomto PR, 2 len kód (bez vstupného bodu) zostávajú
19 MINIMIZE — posiela sa meno, ktoré úloha nepotrebuje (rozhodnutie foundera)
10 OK
raw phone reachable (live): áno → po tomto PR nie (3 opravené miesta)
raw email reachable (live): áno → po tomto PR nie
names sent: 19 miest (zoznam nižšie); maskuje ich iba lib/demand/extract
```

## Spoločné zistenia

1. **Sanitizer maskoval len časť telefónov.** Slovenské mobily v domácom tvare
   (`0903 123 456`) sa nemaskovali vôbec (regex s 9 číslicami). To je opravené
   v #749 a prenesené sem. Nemaskovali sa ani medzinárodné tvary (`00421 …`, `+43 …`,
   `+49 …`), čo je **opravené v tomto PR**. Pravidlo vyžaduje úvodné `+` alebo `00`,
   takže ceny a plochy maskované nie sú (pokryté testom).
2. **`callClaude` / `callOpenAI` maskujú len text promptu.** `sanitizeObject`
   (maskovanie podľa názvu poľa) sa v produkčnom kóde nevolá. Priame
   `client.messages.create` / `.stream` a surový `fetch` nemaskujú nič.
3. **Mená sa nemaskujú nikde okrem `lib/demand/extract`.**
4. **Verejná stránka `/legal/sub-processors`** (`app/(public)/legal/sub-processors/page.tsx:11`)
   uvádza iba OpenAI. Anthropic chýba, hoci k nemu smeruje ~20 volaní. Úprava
   verejného právneho textu je **rozhodnutie foundera / právnika**, v tomto PR
   sa nemení.

## PATCH — surový identifikátor ide k poskytovateľovi

| # | Miesto | Živé? | Čo odchádza | Stav |
|---|---|---|---|---|
| 1 | `app/api/ai/call-coach/stream/route.ts:54` (Anthropic, stream) | **áno** (call-analyzer) | surový prepis hovoru | **opravené**: `sanitizeText(transcript)` |
| 2 | `lib/embeddings.ts:40` (OpenAI embeddings, `fetch`) | **áno** (sémantické vyhľadávanie) | meno + poznámka leadu, dopyt používateľa | **opravené**: vstup prechádza `sanitizeText`. Meno ostáva, pozri MINIMIZE |
| 3 | `app/api/ai/listing-content/stream/route.ts:39` (Anthropic, stream) | volá ho každý prihlásený používateľ, UI nie | poznámky makléra (môžu obsahovať kontakt majiteľa) | **opravené**: `sanitizeText(userPrompt)` |
| 4 | `lib/multi-channel-sender.ts:178` | nie (mŕtvy kód) | poznámka, posledná správa | ostáva, návrh: zmazať |
| 5 | `lib/research-agent/build-dossier.ts:117` | nie (len testy) | celý záznam vrátane email/phone | ostáva, návrh: whitelist polí pred `JSON.stringify` |

## MINIMIZE — meno, ktoré úloha nepotrebuje (návrh, nie je v tomto PR)

| Miesto | Živé? | Čo sa posiela | Návrh |
|---|---|---|---|
| `lib/ai/lead-triage-batch.ts:88` | áno (cron + príjem) | celé meno leadu | vynechať meno (priorita ho nepotrebuje) |
| `lib/ai/open-followup-generator.ts:68` | áno (cron) | celé meno | iba krstné meno |
| `lib/inbound/auto-reply.ts:57` | áno | celé meno + meno makléra | `[MENO]` doplniť lokálne po odpovedi |
| `lib/morning-brief/generators/ai-text.ts:61,71` | áno (cron) | mená top leadov, meno makléra, adresy | iba krstné mená |
| `lib/ai/dashboard-insights.ts:98,192` | áno (cron) | mená leadov, meno makléra | poslať ID, mená doplniť lokálne |
| `lib/ai/rescue-message.ts:58,81` | áno | meno; volá priamo bez sanitizéra | prepnúť na `callClaude`, iba krstné meno |
| `lib/assistant-chat.ts:48` | áno | meno + poznámka | vynechať meno |
| `lib/rescore-lead.ts:64` | áno | meno | vynechať meno |
| `lib/ai-outreach.ts:112` | áno | meno | iba krstné meno |
| `app/api/ghostwriter/generate/route.ts:39,66` | áno | adresa majiteľa (kataster), voliteľne meno | oslovenie doplniť lokálne |
| `app/api/stealth-recruiter/outreach/route.ts:135`, `scan/route.ts:51` | áno | plná adresa predávajúceho | poslať mesto/časť, nie adresu |
| `lib/embeddings.ts:84` | áno | meno v texte embeddingu | vynechať meno (hľadanie mena patrí do DB, nie do vektorov) |
| ďalších 7 miest bez vstupného bodu (dead-lead-campaign, playbook-brief, recap-generator, call-scripts, shadow-inventory, bri-engine, multi-channel-sender) | nie | mená | pri oživení opraviť |

## OK (10)

`lib/demand/extract.ts` (vzor: redigované meno aj kontakty), `deal-strategy`, `sales-brain`
(whitelist polí), `call-analysis`, `call-coach` (nestream), `listing-content`
(nestream, `callClaude`), `valuation/commentary`, `action-executor` (len UUID),
`call/transcribe` (Whisper, nahrávka je nevyhnutná; OpenAI je v zozname
subprocesorov), `scripts/prospecting/personalize` (B2B verejné údaje).

## Neoverené

- Automatické indexovanie embeddingov pri uložení leadu
  (`leads-store.ts:984` → `/api/embeddings/index`) volá route bez cookies. Route
  vracia 401, takže indexovanie **pravdepodobne nikdy nebeží**. Za behu som to
  neoveril.

## Gate pre `DEMAND_EXTRACTION_ENABLED`

- [x] Živé PATCH = 0 (po merge tohto PR)
- [x] Nová funkcia D1 neposiela meno ani kontakty (test v #749)
- [ ] MINIMIZE: rozhodnutie foundera. Nie je podmienkou D1, ale je súčasťou
      odpovede „aké údaje posielame“ v oznámení Smolkovi.
- [ ] `/legal/sub-processors` + čl. 6 DPA: doplniť Anthropic (founder / právnik)

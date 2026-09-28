# S0 — SYSTEM doplnky (Smolko Concierge)

Táto vrstva **nedopĺňa** `docs/prompts/runner/00-system.md` — **rozširuje** ju.
Pri rozpore platí `runner/00-system.md`.

---

## 1. CODE ≠ PROD

```
Existencia súboru / zelený unit test / merged PR  = CODE_PRESENT
PASS v registri                                   = CODE_PRESENT + PROD evidence
```

Prepísať `BLOCKED` → `PASS` len na základe CI je **porušenie** tohto stacku
a pravidla EC-001 / registra. Ak nemáš produkčný dôkaz, status je `BLOCKED`
alebo `unknown` — nie `done`.

## 2. Smolko absolútne zákazy (navyše k ústave)

```
NIKDY  apply migrácie do produkcie (ani „len scheduled_events“)
NIKDY  INSERT/UPDATE/DELETE v prod DB Reality Smolko
NIKDY  scrape Valuo / RealityMap / Únia
NIKDY  odosielať e-maily / SMS / Telegram zákazníkom v tomto stacku
NIKDY  sľubovať potvrdený termín bez B07+B08+B09 PASS
NIKDY  otvárať public Concierge traffic bez B04 PROD + B05 GO + B06 PASS
NIKDY  meniť PUBLIC_PATHS / auth proxy bez explicitného Founder GO
NIKDY  meniť .github/workflows bez Founder GO
```

## 3. Misplaced CRM chatbot

Interný panel na `/revolis-ai` + `POST /api/ai/smolko-chat` **nie je**
požiadavka p. Smolka. Verejný bot patrí na web Reality Smolko.
Cleanup je uzol N01. Nestavať ďalší dashboard chat „kým sa Concierge nestihne“.

## 4. Voiceflow

Ak na `realitysmolko.sk` už beží Voiceflow widget, **najprv over** (read-only),
či pokrýva visitor flow. Nevymýšľaj druhý paralelný widget bez GO.
Ak Voiceflow stačí na M1 visitor UX a Revolis drží len callback API — zapíš to
ako nález, nemeň architektúru potichu.

## 5. Stop vetý

Pri akomkoľvek z nasledujúceho **zastav** a vráť `BLOCKED` / `HUMAN`:

- treba credentials / service role / OAuth consent
- treba zápis do prod
- treba schválenie právnych textov (B05)
- treba rozhodnutie p. Smolka o routingu (B06)
- write-set nestačí na úlohu

# CLAUDE.md - Memory System Hook

> PRIME DIRECTIVE: Každá hodina vývoja je investícia rizikového kapitálu. Ak
> funkcionalita nezvyšuje pravdepodobnosť získania ďalšieho platiaceho klienta
> alebo retencie existujúceho, predpokladaj, že ide o nesprávnu investíciu,
> pokiaľ sa nepreukáže opak.

## Initialization
At the start of every session:
1. Read all files in the `/memory` directory to synchronize project state.
2. If `memory/session-summary.md` exists, read it first — it contains the compressed state from the previous session.

## Core Directives
0. **Steny, nie skrutky — jeden hotový blok na jedno GO, nie priebežné otázky.**
   Founder schvaľuje celé steny. Rozpracovaná práca sa nerozsypáva do desiatok
   mikro-updatov („beží ~7 min", „Vercel, bez akcie"). Keď je blok hotový, príde
   naraz — vrátane dôkazu. Keď treba rozhodnutie, príde raz, s možnosťami a
   odporúčaním, nie ako séria priebežných otázok uprostred úlohy.
   **Automatické prebudenia (PR eventy, naplánované kontroly, bot statusy) sú
   TICHÉ.** Founderovi sa z nich ozvi len keď je niečo rozbité alebo potrebuješ
   rozhodnutie — nikdy preto, že event prišiel.
   Toto pravidlo nevynucuje pamäť, ale harness: `memory/working-agreement.md`
   je zdroj pravdy a `.claude/hooks/working-agreement.sh` ho vkladá na
   `SessionStart`, `UserPromptSubmit` a — pre pravidlo o mlčaní — na
   `PostToolUse` po `ReadNotifications` (#796). Dôvod: CLAUDE.md sa pri dlhej
   session dostane mimo kontext; 2026-10-02 sa tak práca rozsypala na skrutky.

   **Vynucujú to hooky, nie dobrá vôľa.** Toto pravidlo bolo v CLAUDE.md celý
   čas a 2026-09-28 aj tak nevydržalo do polovice session: šesť správ za sebou
   v tvare „bez zmeny, check-in preplánovaný na 18:31". CLAUDE.md sa číta RAZ,
   na začiatku session — v jej strede už pravidlo nedrží. Preto ho do kontextu
   vkladajú hooky v `.claude/settings.json`, pri KAŽDOM prompte aj po
   resume/compact:
   - `.claude/hooks/working-agreement.sh` — zdroj pravdy je
     `memory/working-agreement.md`, blok `DIGEST` (`SessionStart`,
     `UserPromptSubmit`) a blok `WEBHOOK` (`PostToolUse: ReadNotifications`).
     Text pravidla sa mení TAM, nie v skripte.
   - `cat .claude/WALL-RULES.md` — plné znenie pravidiel stien.

   **Tie hooky nie sú duplicita tohto odstavca — sú jeho jediné vynútenie.
   Nemazať.** A naopak: tretí hook s natvrdo zapísaným textom pravidla
   nepridávať. 2026-10-02 to #800 skúsil (`wall-rule.sh`) a merge `main`
   zlúčil oba príkazy do jedného JSON objektu s dvoma kľúčmi `"command"` —
   `JSON.parse` aj `jq` nechajú posledný, takže nový hook sa nespustil nikdy.
   Jeden zdroj pravdy, jeden skript.

   Tiché čakanie je správne chovanie: check-in, ktorý nič nenašiel, sa
   nehlási, len sa preplánuje. Výnimka, kedy sa ozvať okamžite aj uprostred
   bloku: rozbitá produkcia, strata dát, bezpečnostná diera, alebo premisa
   úlohy prestala platiť (STOP podľa skillu `kontrolor`).
1. Maintain "Senior Staff Engineer" persona (L99 standards).
2. Stealth Mode: Reality Smolko vs. Revolis.AI secrecy. Reference confidentiality: Reality Smolko is a reference client using
   Revolis. Do NOT name them publicly or in marketing without consent.
   Do NOT share their internal data externally. Do NOT promote unfinished features as done. (This is client discretion, NOT secrecy toward the client.)
3. Keep Segment A/B/C outreach strategies active.
4. Data sourcing: Before building ANY data-dependent feature, consult
   `docs/architecture/master-data-sourcing-map.md`. Never guess a data source.
   Never scrape personal data (GDPR). Cadastre owners ONLY via ÚGKK contract.
   Portals: listing facts only, respect robots.txt/ToS, prefer official API.
   If a feature's source isn't in the map, STOP and flag it as an open unknown.
   Unconnected source → honest "computed from {source}" state, never a fake number.
5. GDPR gate: For any feature touching external/personal data, run the
   `gdpr-advisor` skill against the chosen source from the data-sourcing map
   before implementation. Document the legal basis (6(1)(f) + balancing test).
6. UI/marketing copy: When writing any user-facing text (...) consult
   `docs/architecture/clay-positioning-reframe.md`. Lead with the OUTCOME (...)  
7. Decision gate: Before proposing or building ANY feature, run it through
   `docs/architecture/revolis-constitution-v2.md` (12-question Founder Reality
   Check). Respect the VETOES: "too early" timing → Strategic Backlog regardless
   of score; "no customer would pay" → max VALIDATE. Record BUILD/BACKLOG +
   reason in decisions.md.    
8. **Dôkazová brána — žiadny verdikt bez primárneho vstupu** (founder, 2026-10-02).
   Hook `.claude/hooks/evidence-gate.sh` toto pravidlo pripomína pri každej GO / verdikt / merge / PROD správe.
   - Stav („zelené", „PASS", „hotové", „bezpečné") iba z primárneho zdroja overeného V TOMTO turne
     (CI log, DB agregát, súbor, výstup príkazu). Nie z pamäti, súhrnu ani predpokladu.
   - Chýba vstup → NEVYMÝŠĽAJ. Najprv over, či naozaj chýba (hľadaj súbor, stav PROD), potom raz povedz:
     čo presne chýba, v akej forme to poslať a čo founder dostane späť.
   - Overovacie dáta (gold labels, správne odpovede) robí človek nezávisle. Model ich nikdy nevypĺňa,
     inak brána meria model voči sebe.
   - Pred experimentom alebo bránou pre-flight na agregátoch: môže to vôbec prejsť (support, objem)?
     Ak nie, povedz to vopred s možnosťami A/B/C a odporúčaním, nespúšťaj naslepo.
   - Opakované GO bez nového vstupu → krátka odpoveď: čo som práve overil, že sa nič nezmenilo, čo treba
     poslať. Neopakuj celý postup.
   - PROD, merge a flagy iba na explicitné GO. Merge až keď je CI na aktuálnom heade zelené.
9. **Postup session v %** (founder, 2026-10-02). Každá odpoveď foundrovi končí riadkom
   `Session <cieľ>: NN % (a/b míľnikov) · ďalší míľnik: …` z bloku SESSION v `docs/STATUS.md`
   (`bash .claude/hooks/session-progress.sh print`). % = hotové míľniky / všetky, odškrtnuté iba s dôkazom.
   Na začiatku novej session nahraď blok SESSION novým cieľom. Vynucuje to Stop hook: odpoveď bez riadku sa zablokuje.

## Token Hygiene — Active Rules
- Default model routing: Haiku for speed tasks (analysis, scoring, replies), Sonnet for quality tasks (content generation, architecture decisions).
- Prompt caching: always set `cache_control: { type: "ephemeral" }` on system prompts that repeat across calls.
- Limit tool result output — never return full DB rows when only IDs/counts are needed.
- Avoid re-reading files you just wrote (the write succeeded or it errored — no verification read needed).
- When context approaches limit, write `memory/session-summary.md` immediately, then continue with `/clear`.

## Session Wrap-up
At the end of each session, update:
- `memory/decisions.md` (new milestones, architectural decisions).
- `memory/people.md` (team/stakeholders changes).
- `memory/session-summary.md` — **PREPEND, nikdy neprepisuj.** Súbor je
  chronologický log, do ktorého každá session pridáva na začiatok. Formulácia
  „compressed state from the previous session" nižšie opisuje tvar JEDNÉHO
  záznamu, nie celého súboru. 2026-09-25 to zviedlo agenta k `write` namiesto
  `prepend` a zmazalo 1339 riadkov histórie (48 sessions) — zachytené pred
  mergom, viď #701.

**Task-loop (povinné):** Pred ukončením turnu aplikuj `.claude/skills/task-loop/SKILL.md` — navrhni jednu ďalšiu úlohu s GO bránou. Nepokračuj autonómne na PROD/merge/novú scope bez explicitného GO.

## Session Summary Format (memory/session-summary.md)
> Toto je tvar JEDNÉHO záznamu, ktorý sa pridáva NA ZAČIATOK súboru.
> Existujúci obsah zostáva nedotknutý.
```
## Session [DATE]
### Dokončené
- [bullet per completed task with file path]
### Rozpracované / Pending
- [bullet per open task]
### Kľúčové súbory zmenené
- [file path]: [one-line change description]
### Ďalší krok
[Single most important next action]
```

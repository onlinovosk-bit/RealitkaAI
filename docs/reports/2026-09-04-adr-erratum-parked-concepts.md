# Report — ADR erratum + parked concepts (2026-09-04)

## Čo sa zmenilo

1. **`docs/architecture/adr-2026-09-03-growth-intelligence-principles.md`**
   - Dva chybné riadky v sekcii 1 (gtag / Dôsledok) ostali v tabuľke; v stĺpci dôkaz pribudol marker `⚠️ OPRAVENÉ, viď Erratum nižšie`.
   - Doplnené **Erratum — 2026-09-04**: meranie `revolis.ai` nebolo meraním projektu `realitka-ai` (`app.revolis.ai`).
   - Odsek „Overiť pred zápisom APPLIED" nahradený overeným stavom (GA ID nastavené, meranie beží; otvorené: GA mimo marketing layoutov).

2. **`docs/architecture/l99-parked-concepts.md`**
   - Do tabuľky doplnené **Growth Intelligence System (plná verzia)** a **Model Routing + Cost Governor**.
   - Append sekcií **P-GI** a **P-MR** s re-open podmienkami (text z foundera / tohto zadania — nie z externých súborov).

## Ownership chyby

Nesprávny dôkaz (fetch `revolis.ai` namiesto `app.revolis.ai`) je **founder-owned** ako AP-005 poučenie: doména v prehliadači ≠ doména Vercel projektu. Erratum opravuje tvrdenie bez mazania pôvodných riadkov.

## Scope

- Docs-only: 2 architecture MD + tento report.
- Žiadne `.ts` / `.tsx`.

# WAVES — write territories (nesmú sa križiť)

Pred každou vlnou: `git fetch origin main` + write-probe (žiadny prienik pathov).

## W0 — Reconcile (1 worker)

| Uzol | Write-set |
|---|---|
| N00 | `docs/reports/20XX-XX-XX-smolko-concierge-reconcile.md` (NOVÝ) · voliteľne **jeden** update bloku stavu v `docs/briefs/reality-smolko-blocking-conditions-register.md` len ak máš príkazy+výstupy |

## W1 — Parallel foundation (až 4 workeri)

| Uzol | Write-set (výhradný) |
|---|---|
| N01 | `apps/crm/src/components/revolis/SmolkoChatbotPanel.tsx` (delete) · `apps/crm/src/lib/smolko-chatbot.ts` (delete) · `apps/crm/src/app/api/ai/smolko-chat/**` (delete) · testy/registry odkazy na ne · `docs/reports/*-smolko-crm-chat-cleanup.md` · **nie** Voiceflow balík mimo CRM ak nie je v write-sete PR #544 — drž sa diffu #544 |
| N04 | `docs/reports/*-smo-b04-prod-evidence.md` (NOVÝ) · **žiadny** app kód (read-only prod SQL cez founder/ops ak worker nemá prístup → HUMAN) |
| N05 | `docs/legal/*` alebo `docs/briefs/*-concierge-privacy-faq-draft.md` (NOVÝ draft) · **žiadny** production copy deploy |
| N06 | `docs/briefs/*-smo-b06-routing-matrix.md` (NOVÝ) · voliteľne test skeleton v `apps/crm/tests/verification/*callback*` **len ak** path je v write-sete uzla |

**Write-probe W1:** prienik write-setov = FAIL, vlnu nespúšťaj.

## W2 — Public read MVP (1 worker, po GO)

| Uzol | Write-set |
|---|---|
| N07 | verejný Concierge povrch dohodnutý v HANDOFF N00 (typicky `apps/crm/src/app/(public)/**` **alebo** docs + API callback only, ak Voiceflow drží UI) · verification testy · report. **Zakázané:** booking, calendar, migrácie, `PUBLIC_PATHS` bez GO. |

## W3 — Booking prep + calendar (sériovo)

| Uzol | Write-set |
|---|---|
| N08 | `docs/reports/*-smo-b07-preflight.md` · **migračný súbor už existuje — needituj ho preventívne**; žiadny apply |
| N09 | `apps/crm/src/app/api/integrations/google/**` (len scopes/docs/testy v rozsahu) · `docs/reports/*-smo-b08-*.md` · **žiadny** OAuth consent klik |
| N10 | `apps/crm/src/lib/scheduled-events/**` · `apps/crm/src/app/api/scheduled-events/**` · verification · report |

## Zakázané vo všetkých vlnách

```
apps/crm/supabase/migrations/**          (apply / nové migrácie bez GO-B07)
.github/workflows/**
apps/crm/src/proxy.ts PUBLIC_PATHS       (bez Founder GO)
memory/**                                (worker nepisuje; orchestrátor áno)
```

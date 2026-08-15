# V4-B one-pager — inbound OAuth pull (DMARC)

**Dátum:** 2026-08-15
**Lane:** Vlna 4 / V4-B
**Stav:** DESIGN ONLY. STOP. Žiadna implementácia. Žiadny merge bez founder GO.

Kanonický dizajn: [`docs/architecture/inbound-oauth-pull-design.md`](../architecture/inbound-oauth-pull-design.md)

## Čo je rozbité (merané 2026-08-15)

Gmail auto-forward do Revolis aliasu láme DMARC. Prod `inbound_mailboxes.last_received_at` pre `smolko-a7f2@revolis.ai` = **2026-07-14 20:53:09+00**. Live router je `POST /api/acquire/email` + `mailbox.agencyId`, nie mŕtvy `agency-map.ts`. Dôkaz: PR #402 / `docs/reports/2026-08-17-inbound-zisti.md`.

Druhý landmine: `resolveInboundFromEmail` použije `*.revolis.ai` ako From. `agencies.email` u referenčného tenanta je `null`; nastavenie aliasu do `agencies.email` by rozbilo auto-odpoveď. **Tento PR to neopravuje.**

## Návrh

1. Zákazník udelí **samostatný** OAuth (Gmail read-only + labels — **nie** existujúci Calendar/`gmail.send`).
2. Ingest job číta len označený label a volá **existujúci** acquire pipeline.
3. Tokeny tenant-scoped, šifrované, service_role; revoke pred pullom.
4. Cloudflare alias ostáva fallback.

## GO

Founder písomne: `GO V4-B` (Fáza 1 súhlas+vault) → neskôr `GO V4-B Fáza 2` (pull). Bez toho STOP.
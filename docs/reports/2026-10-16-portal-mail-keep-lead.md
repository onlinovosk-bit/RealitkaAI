# Portálový dopyt s kontaktom v zátvorkách alebo odkaze

**Dátum:** 2026-10-16 · **Vetva:** `cursor/portal-mail-keep-lead-479b` · **PROD:** bez zápisu, bez odoslania mailu

## Čo padalo

`htmlToText` v `apps/crm/src/lib/acquire/email-adapter.ts` bral ako HTML tag čokoľvek tvaru `<` + písmeno. Tým zmizol:

- e-mail v tvare `Meno <jana.vzorova@example.com>` (RFC 5322),
- telefón, ktorý je len v `href="tel:…"`,
- e-mail, ktorý je len v `href="mailto:…"` a text odkazu adresu neopakuje,
- jediná zmienka portálu v plain-text autolinku `<https://www.nehnutelnosti.sk/…>`.

`detectSource` / `notLeadReason` potom vrátili `no_contact` alebo `unknown_source`. `toLeadCandidate` vrátil `null`, route to uloží ako `not_a_lead`. Platí pre existujúce `SOURCE_RULES` (nehnutelnosti.sk, bazos.sk, byty.sk, topreality.sk, reality.sk, realitysmolko.sk). Nové domény sa nepridávali.

Syntetická reprodukcia pred opravou (bez osobných údajov): správa s `nehnutelnosti.sk` v texte, predmetom aj `From: noreply@nehnutelnosti.sk`, e-mailom `Jana Vzorova <jana.vzorova@example.com>` a telefónom len v `tel:+421912345678` → `notLeadReason` = `no_contact`, `contactEmail` aj `contactPhone` null.

## Oprava

`PARSER_VERSION` 1.4 → 1.5. Pred strhnutím tagov sa rozbalí angle-addr a autolink. `mailto:` / `tel:` sa doplnia na koniec textu, aby neprebili adresu, ktorá je v správe skôr. Čistý text bez skutočného tagu ostáva bajtovo rovnaký (`rawHash` sa nemení). `unknown_source` pre domény mimo `SOURCE_RULES` ostáva.

## Overenie

`npx vitest run src/lib/acquire/__tests__/email-adapter.test.ts src/lib/acquire/__tests__/not-lead-reason.test.ts src/lib/acquire/__tests__/unsubscribe-footer.test.ts src/lib/acquire/__tests__/source-detection.test.ts src/lib/demand/__tests__/backfill-input.test.ts src/app/api/acquire/email/__tests__/route.test.ts` → 6 súborov, 79 testov, všetky prešli.

## Čo ostáva

Telefón so lomkou (`0905/123456`) parser stále neprečíta. Predmet s „odhlás“ bez explicitného `subject` (prvý riadok HTML preheaderu) je stále `not_inquiry`. Ani jedno nie je táto oprava.

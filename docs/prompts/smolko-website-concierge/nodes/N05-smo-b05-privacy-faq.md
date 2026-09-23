# N05 — SMO-B05 privacy / AI disclosure / FAQ (draft → HUMAN)

## S2 TASK

Priprav **draft** textov, bez ktorých sa nesmie pustiť public AI traffic:

- AI disclosure (EU AI Act čl. 50 — zrozumiteľné, že ide o AI)
- controller / purpose / retention (GDPR)
- minimum PII + marketing consent oddelený
- FAQ snapshot + cesta k človeku (telefón/formulár)

**Nepublikuj.** Neaplikuj na web. Výstup je draft na GO-B05-COPY.

## S3 TERRITORY

**Write:** `docs/briefs/smolko-concierge-privacy-faq-DRAFT.md` (NOVÝ)  
**Read:** Trust Center, existujúce legal docs, status report  
**Forbidden:** production copy v `apps/crm` marketing pages bez GO, e-mail send

## S4 ACCEPTANCE

- Draft má sekcie: Disclosure · Controller · Purpose · Retention · PII min · Consent · FAQ (≥8 Q) · Human fallback
- Každá sekcia má stav `DRAFT` a pole `APPROVED_BY: _pending_`
- Explicitný STOP: „N07 zakázané do GO-B05-COPY“

## S5 VALIDATION

```bash
test -f docs/briefs/smolko-concierge-privacy-faq-DRAFT.md
rg -n "Disclosure|Retention|Human fallback|APPROVED_BY|GO-B05" docs/briefs/smolko-concierge-privacy-faq-DRAFT.md
```

## S6 FAILURE

- Chýbajú právne vstupy → HUMAN so zoznamom otázok na Privacy/foundera
- Neskúšaj „schváliť“ text sám

## S7 HANDOFF

```text
NODE: N05
RESULT: HUMAN
DRAFT: docs/briefs/smolko-concierge-privacy-faq-DRAFT.md
GO_REQUIRED: GO-B05-COPY (Founder + Privacy + Smolko)
BLOCKS: N07
```

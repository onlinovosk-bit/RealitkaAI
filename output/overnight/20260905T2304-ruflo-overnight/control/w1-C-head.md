# Lane C — Portal contracts (Nehnutelnosti.sk / Reality.sk / Topreality)

**RUN_ID:** `20260905T2304-ruflo-overnight`  
**lane_id:** `C`  
**BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`  
**accessed_at:** `2026-09-05`  
**status:** `PASS_WITH_CONDITIONS`  
**scope:** research_and_specs only (no product code writes)

## Executive summary

All three portals are operated under **United Classifieds (UC)** / Realsoft admin ecosystem. Public sources confirm **automated listing sync exists**, but **full production import credentials, per-portal activation, and downloadable XSD/OpenAPI artifacts are vendor-gated** (commercial order + UC activation). Same owner **does not** prove identical per-brand public endpoints; no invented XSD/endpoints below.

**Direction clarity (critical):**
- **Export-from-CRM (publish to portals)** = CRM/software produces listings that UC **imports** into portal inventory (UC Import docs / Realsoft-facing feed).
- **Import-into-CRM (ingest from portals/admin)** = UC/Realsoft **exports** to a callback URL that CRM hosts (UC Export docs — POST to integrator URL).

Repo already has **inbound** Realsoft/UC receivers (`/api/realsoft/import`, `/api/uc/import`) for import-into-CRM. **Outbound publish-to-portal adapter is NOT present** as a production-ready module (scraping source is not a publish contract).

---

## 1. Integration matrix

| Concern | Nehnutelnosti.sk | Reality.sk | Topreality.sk | Notes |
|---|---|---|---|---|
| Operator | United Classifieds | United Classifieds | United Classifieds | Confirmed by third-party CRM vendors + Topreality ToS |
| Public open publish API (no contract) | **NO** (third-party: no public API) | **NO** (admin + paid 3rd-party import) | **NO** (ToS: Realsoft package; unauthorized import/export forbidden) | Scrapers are not vendor contracts |
| Documented UC Import (CRM to portals) | Shared UC Realsoft Import docs | Shared UC Realsoft Import docs | Shared UC Realsoft Import docs | Docs titled for Realsoft; activation per UC account UNKNOWN per brand |
| Documented UC Export (portals/admin to CRM/web) | Shared UC Realsoft Export docs | Shared UC Realsoft Export docs | Shared UC Realsoft Export docs | Push POST to integrator URL |
| Protocol (publicly evidenced) | REST/JSON validation + full-file import cadence | Same UC family | Same UC family | Agency blogs mention XML; **no public XSD retrieved** |
| SOAP | UNKNOWN / not evidenced | UNKNOWN / not evidenced | UNKNOWN / not evidenced | Do not invent |
| Auth (publish) | Vendor-activated UC import service | Import zo softveru 3. stran + portal linking | Realsoft firemny ucet + UC package | Production import credentials: UNKNOWN beyond export login fields |
| Auth (ingest into CRM) | Login user/pass on export callback (Wrong login data code 10) | Same pattern via Realsoft export | Same pattern | Repo implements bcrypt-mapped agency credentials |
| Testing | Public validation POST + swagger note; test-only caution | Same | Same | Validation URL public; schema.json HEAD returned 400 here |
| Access conditions | Paid/ordered UC import activation | Contract + activate 3rd-party import + email Reality.sk | ToS Balik + Realsoft registration; no unauthorized import/export | Commercial terms UNKNOWN (no public price sheet) |
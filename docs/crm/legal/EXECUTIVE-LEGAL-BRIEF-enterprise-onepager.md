# EXECUTIVE LEGAL BRIEF — REVOLIS.AI (ENTERPRISE)

**Účel dokumentu:** rýchly právny prehľad pre procurement, legal a security tímy pred full redline kolom.  
**Verzia:** 1.0  
**Dátum:** 15. apríla 2026

---

## 1) Contract Stack (čo je pripravené)

- Master Service Agreement (`MSA-master-service-agreement.md`)
- Data Processing Agreement (`DPA-zmluva-o-spracuvani-osobnych-udajov.md`)
- Service Level Agreement (`SLA-service-level-agreement.md`)
- Všeobecné obchodné podmienky (`VOP-vseobecne-obchodne-podmienky.md`)
- Indemnification (`INDEMNIFICATION-dolozka-o-odskodneni.md`)
- Privacy Policy (`PRIVACY-POLICY-zasady-ochrany-osobnych-udajov.md`)

---

## 2) Core legal posture (executive summary)

- **Model:** B2B SaaS + AI decision support + performance fee.
- **IP ochrana:** black-box model, zákaz reverse engineeringu a benchmarkingu bez súhlasu.
- **Data ownership:** zákaznícke dáta vlastní zákazník; platforma/algoritmy vlastní Revolis.AI.
- **AI liability posture:** AI je rozhodovacia podpora; finálne rozhodnutie ostáva na zákazníkovi.
- **Human oversight:** dostupné kill switch/human-in-the-loop mechanizmy pre kritické workflowy.

---

## 3) GDPR, privacy a transfery

- Revolis.AI vystupuje ako **Processor**, zákazník ako **Controller** (DPA).
- Primárne spracovanie dát v EÚ; mimo EÚ transfery kryté SCC + TIA.
- DSAR súčinnosť a procesné lehoty nastavené na enterprise použitie.
- No-training commitment: zákaznícke dáta sa nepoužívajú na tréning modelov.

---

## 4) Security a resilience snapshot

- TLS 1.3 in-transit, AES-256 at-rest, RBAC + MFA pre privilegované prístupy.
- Incident management + AI incident taxonómia + komunikačný štandard v SLA.
- BCP/DR s definovaným RTO/RPO a pravidelným DR testovaním.
- Third-party fallback/degrade mode pre kritické vendor závislosti.

---

## 5) Commercial guardrails

- Transparentné rozdelenie na Base Fee a Performance Fee.
- SLA service credits s definovaným stropom.
- Zmluvné limity zodpovednosti a indemnity rámec nastavené na enterprise rokovania.
- Predpripravené redline fallback pozície (soft/hard) pre rýchle uzavretie dealu.

---

## 6) Annexes pre diligence

- `ANNEX-E-AI-CHANGE-LOG-RELEASE-GOVERNANCE.md`
- `ANNEX-F-BCP-DR.md`
- `ANNEX-G-SECURITY-CONTROLS-SCHEDULE.md`
- `ANNEX-H-EPRIVACY-OUTREACH-COMPLIANCE.md`
- `TRUST-CENTER-PROCUREMENT-PACK.md`
- `REDLINE-FALLBACKS-enterprise-soft-hard.md`

---

## 7) Recommended next step (pre podpisom)

1. 30–45 min legal alignment call (scope, liability, data transfer profile).
2. Výměna redline verzie MSA/DPA/SLA (iba otvorené body).
3. Potvrdenie security evidence packu (pen-test summary, subprocessors, DR test summary).
4. Final sign-off matrix (Legal + DPO + CTO + Procurement).

---

**Kontakt pre enterprise legal review:** legal@revolis.ai  
**Kontakt pre security due diligence:** security@revolis.ai

# LEGAL GAP LIST — ENTERPRISE PROCUREMENT

**Produkt:** Revolis.AI  
**Dátum:** 15. apríla 2026  
**Verzia:** 1.0  
**Účel:** Identifikovať zostávajúce právne/compliance medzery pred enterprise procurementom.

---

## Skórovacia metodika

- **Kritické** — blokuje podpis enterprise zmluvy alebo bezpečnostný audit  
- **Vysoké** — výrazne spomaľuje procurement alebo zvyšuje právne riziko  
- **Stredné** — odporúčané dorobiť pred scale do viac krajín  
- **Nízke** — zlepšenia kvality, nie hard blocker

---

## Gap Register

| # | Oblasť | Gap / chýbajúci artefakt | Riziko | Priorita | Odporúčaná náprava | Owner | ETA |
|---|---|---|---|---|---|---|---|
| 1 | Security assurance | Chýba oficiálne vydaná SOC 2 Type II alebo ISO 27001 certifikácia na úrovni Revolis.AI entity | Enterprise security review fail | Kritické | Spustiť certifikačný program + pripraviť bridge letter dočasne | CTO + Security Lead | 3-6 mes. |
| 2 | Vendor due diligence | Chýba štandardizovaný balík pre procurement (SIG Lite/CAIQ odpovede, pen-test executive summary, architektúra) | Predĺženie predaja o 4-10 týždňov | Vysoké | Vytvoriť „Trust Center Pack“ v PDF + aktualizácia kvartálne | Legal + Security | 2-3 týždne |
| 3 | AI governance | Chýba samostatný „AI Governance & Model Risk Policy“ dokument | AI Act / enterprise AI committee požiadavky | Vysoké | Vydanie politiky: lifecycle, human oversight, bias monitoring, incident response | Legal + ML Lead | 2 týždne |
| 4 | Subprocessor transparency | Zoznam subprocesorov je v DPA, ale chýba public changelog a subscription notice mechanizmus | Námietky klientov pri novom subprocessore | Stredné | Pridať verejný register subprocesorov + webhook/email notice | Legal Ops | 1-2 týždne |
| 5 | Data residency controls | Dokumentácia uvádza EÚ, ale chýba zmluvná voľba „EU-only processing“ pre enterprise zákazníkov | Objection pri regulovaných klientoch | Vysoké | Pridať EU Data Boundary addendum s auditovateľným záväzkom | Legal | 1 týždeň |
| 6 | Business continuity | Chýba samostatný BCP/DR Annex s RTO/RPO číslami a test cadence | Security/legal red flag | Vysoké | Vydať BCP/DR annex (RTO, RPO, failover, tabletop testing) | SRE + Legal | 2 týždne |
| 7 | Incident communications | Lehota notifikácie je definovaná, chýba incident comms template + severity matrix pre klientov | Operatívny chaos pri incidente | Stredné | Incident playbook + komunikačné šablóny (P1/P2) | Security + Support | 1 týždeň |
| 8 | ePrivacy / outbound | Chýba samostatná outbound communications policy (legal basis per channel: email/SMS/call) | Riziko sankcií pri kampaniach | Kritické | Policy + guardrails v produkte (opt-out, suppression list, logging) | Legal + Product | 2-4 týždne |
| 9 | Records of processing | Chýba interný ROPA register pre všetky processing aktivity | GDPR audit gap | Stredné | Dokončiť ROPA + mapovanie retention a legal basis | DPO/Privacy Lead | 1-2 týždne |
| 10 | Contract operations | Chýbajú redline fallback playbooks pre enterprise vyjednávanie | Deal friction a nejednotné pozície | Vysoké | Zaviesť soft/hard fallback library (hotové v samostatnom dokumente) | Legal | hotovo v1 |

---

## Najvyššie priority (30-dňový plán)

1. Vydať **Trust Center Pack** (security + privacy artefakty).  
2. Doplniť **AI Governance Policy** (EU AI Act-ready).  
3. Doplniť **BCP/DR Annex** s RTO/RPO.  
4. Vydať **ePrivacy outbound policy** + produktové guardrails.  
5. Zaviesť **EU Data Boundary Addendum** pre enterprise.

---

## Evidence checklist pre enterprise procurement

- Aktuálne MSA, VOP, DPA, SLA, Privacy Policy  
- Subprocessor list + SCC references + TIA statement  
- Security architecture one-pager  
- Pen-test summary (posledných 12 mesiacov)  
- Incident response policy + breach workflow  
- AI explainability statement + human oversight workflow  


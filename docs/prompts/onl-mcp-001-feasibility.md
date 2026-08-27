# ONL-MCP-001 — Onlinovo MCP Gateway feasibility audit

**PROJECT:** Onlinovo.sk (nie Revolis CRM)  
**WAVE:** Night 26. → 27. 8. 2026  
**STATUS:** QUEUED — nespúšťať 25. → 26. 8.  
**PRIORITY:** P1 strategic infrastructure  
**EXECUTION POLICY:** DO NOT RUN CONCURRENTLY WITH ANY ACTIVE REVOLIS NIGHT WAVE

Pred štartom prečítaj `.ai/bus/tasks/TASK-0005.md` a `.ai/bus/state/night-wave-queue.md`. Ak preflight FAIL, nechaj QUEUED.

Revolis má prioritu pred Onlinovo pri konflikte o AI compute, kontext, token budget alebo execution slot.

---

## OBJECTIVE

Preskúmaj realizovateľnosť vlastného Onlinovo MCP Gateway — jednotná AI-accessible vrstva medzi Onlinovo.sk a dátovými/systémovými zdrojmi.

Dlhodobý cieľ:

Claude / ChatGPT / Cursor / Claude Code / Ruffo Swarm / ďalší AI agenti  
→ ONLINOVO MCP GATEWAY  
→ jednotná dátová/akčná vrstva  
→ Shoptet + LeadHub + GA4 + Google Search Console + P&L + produktové dáta + ďalšie systémy.

**NEJDE** o jednorazové napojenie Claude na Shoptet.

Preskúmaj, či je možné vybudovať opakovane použiteľný, bezpečný, ekonomicky racionálny a vendor-neutral MCP gateway.

---

## ABSOLÚTNA PRIORITA: NEKOLIDOVAŤ S REVOLIS VLNOU

1. Zisti, či existuje aktívna Ruffo nočná vlna (Revolis).
2. Identifikuj jej project/task/job scope.
3. Ak je aktívna akákoľvek nočná vlna, **NEŠTARTUJ** ONL-MCP-001 paralelne.
4. ONL-MCP-001 musí zostať QUEUED, kým predchádzajúca vlna neskončí.
5. Nezasahuj do bežiacej vlny.
6. Nevytváraj merge, PR ani deployment, ktorý patrí do iného projektu.
7. Onlinovo a Revolis musia zostať oddelené workload lanes.
8. Žiadny zápis do `apps/crm/**`, prod DB, secrets.

---

## SCOPE — štyri cesty

Hodnoť nielen techniku: cenu, čas, prevádzku, spoľahlivosť, bezpečnosť, udržiavateľnosť, škálovateľnosť, API limity, právne/ToS, permissions, read/write, webhooks, latenciu, vendor lock-in, riziko zmeny Shoptet platformy, riziko zmeny Claude/ChatGPT MCP podpory, ROI pre Onlinovo, potenciál v Ruffo Swarm, znovupoužitie.

### A. Oficiálny Shoptet MCP / Premium

Aktuálna oficiálna dokumentácia. Premium požiadavky, cena, tools, read/write, entity, limity, auth, bezpečnostný model, použitie z Claude / ChatGPT / Cursor / Claude Code / vlastného agenta.

Zisti, či existuje spôsob použiť relevantnú časť API/MCP **bez** plného Premium. **NEPREDPOKLADAJ „nie“.** Over to.

### B. Vlastný Shoptet addon + MCP

Addon model, OAuth, API, schvaľovanie, developer requirements, read/write endpoints, webhooks, rate limits, náklady, ToS, single-shop vs multi, vlastný backend, addon ako adapter pre gateway.

Výslovne odpovedz: **Can Onlinovo build its own compliant Shoptet integration without buying Shoptet Premium?** Ak áno — ako. Ak nie — prečo.

### C. Data / export bridge

Shoptet exports → ingestion → normalization → Onlinovo Data Layer → MCP.  
Entity: products, categories, orders, customers, inventory, prices, discounts, invoices, product feed, XML, CSV, iné. Frekvencia: daily / hourly / event-driven / manual.  
Kombinácia so Search Console, GA4, LeadHub, P&L.

### D. Browser automation (fallback)

AI → MCP → Browser Adapter → Shoptet Admin.  
Playwright, session, auth, 2FA, persistence, read/write, UI fragility, detection, maintenance, security, reliability.  
**Nesmie byť primárna cesta**, ak existuje stabilnejšia API/data cesta.

---

## ONLINOVO MCP GATEWAY (návrh v audite)

Preferuj vendor-neutral:

AI CLIENTS → MCP → ONLINOVO MCP GATEWAY → ADAPTERS → DATA / SYSTEMS

Adapters minimálne: ShoptetAdapter, LeadHubAdapter, GA4Adapter, GSCAdapter, PnLAdapter, ProductDataAdapter.

Oddelenie: READ / WRITE / ANALYTICS / ACTIONS.  
Write = silnejšie permission boundaries. Citlivé/nevratné = explicitný approval gate.

## SECURITY

Least privilege, read/write separation, per-system credentials, secrets management, audit log, action log, idempotency, rollback, rate limiting, authn/authz, tool-level permissions, human approval for destructive actions.

**Nikdy** neukladaj API keys, heslá ani OAuth secrets do repository.

## AI / MCP COMPATIBILITY

Claude, Claude Code, ChatGPT, Cursor, Ruffo Swarm. Gateway nesmie byť navrhnutý tak, že funguje iba s jedným providerom.

## COST / TCO / ROI

TCO 1 rok a 3 roky pre A/B/C/D. CAPEX aj OPEX (Shoptet fees, hosting, DB, development, maintenance, monitoring, API, AI, overhead).

ROI na **contribution/profit**, nie len revenue. Ak Premium ~€1 000/mes, urči minimálny dodatočný mesačný contribution, aby to bolo racionálne.

---

## DELIVERABLE

Až pri spustení (nie pri queue) vytvor:

**`docs/onlinovo/ONL-MCP-FEASIBILITY.md`**

(Brief pôvodne žiadal `docs/architecture/ONL-MCP-FEASIBILITY.md`. Ten strom je Revolis ústava — Onlinovo výstup držíme v `docs/onlinovo/`, kým founder nepovie inak.)

Sekcie 1–20: Executive Summary, Current State, Constraints, Requirements, Option A–D, Architecture / Security / Cost comparison, TCO, ROI, Risks, Recommended Architecture, Why alternatives rejected, Implementation Roadmap, MVP Definition, Future Architecture, Open Questions.

## FINAL DECISION

Jednoznačný verdikt: **BUILD** | **BUY** | **DON'T BUILD** s povinnými poliami z briefu.

## IMPORTANT

NEIMPLEMENTUJ produkčný gateway. Toto je FEASIBILITY + ARCHITECTURE AUDIT.  
Výnimka: malý izolovaný PoC len na overenie zásadnej technickej otázky.  
Žiadne produkčné zmeny v Shoptete. Žiadne produkčné write. Žiadne secrets. Žiadne zmeny v Revolis `apps/crm`.

## DONE

Štyri cesty preskúmané na aktuálnej Shoptet dokumentácii, TCO, ROI threshold, security, architecture, verdikt, MVP plán, súbor v `docs/onlinovo/`.

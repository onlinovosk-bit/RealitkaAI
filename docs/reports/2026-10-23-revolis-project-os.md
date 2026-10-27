---
cursor:
  subagentId: "bc-83874a64-bcae-54d1-bdca-9d785a01d61a"
---

# Revolis Project OS — správa z behu 2026-10-23

Beh: [Implement Revolis Project OS](https://cursor.com/agents/bc-83874a64-bcae-54d1-bdca-9d785a01d61a).
Repozitár: `github.com/onlinovosk-bit/RealitkaAI`. Základ `main` `a2e42ace` (po `git fetch origin main` zhodný s `origin/main`).

ChatGPT konverzácie, nastavenia Cursor projektov a presuny chatov tento beh nerobil. Nižšie je len to, čo vrátil nástroj alebo čo je súbor v repe.

## Zhrnutie

Project OS je dokumentačný rozcestník v `docs/project-os/`. Pravidlá agentov ostávajú v [kontrakte](../architecture/cross-agent-engineering-contract.md), v `AGENTS.md`, v `CLAUDE.md`, v `.cursor/rules/` a v `.claude/skills/`. Tieto súbory sa neprepisovali. Pribudol jeden odkaz v [MAPA.md](../architecture/MAPA.md).

Oblasť C ostáva na existujúcom projekte, ktorého beh sa volá **Revolis Security Audits**. Druhý bezpečnostný projekt sa nezakladal. Oblasť F je sekcia v repe. Nástroj na založenie Cursor projektu ani na hromadný presun chatov v tomto behu nebol. Oblasť G (Onlinovo) sa nemodifikovala.

Klasifikácia 117 cloud agent behov je podľa názvu, stavu a zdroja z `list-cloud-agents`. Telo konverzácie som čítal len pri tomto zadaní. Jediný ďalší text projektu je riadok v `notes.md` projektu Revolis Security Audits.

## Mapa súborov

Zapísaná v [pláne](../plans/2026-10-23-revolis-project-os-plan.md) pred ostatnými súbormi. `plan-lint` na pláne vrátil `PLAN OK` ešte pred ich vznikom.

| Cesta | Úloha |
|---|---|
| `docs/plans/2026-10-23-revolis-project-os-plan.md` | plán, vznikol prvý |
| `docs/project-os/README.md` | register |
| `docs/project-os/taxonomy.md` | taxonómia, vylúčenia, názvy |
| `docs/project-os/classification-and-handoff.md` | zaradenie, skill, brána GO |
| `docs/project-os/conversation-governance.md` | výber projektu a limity nástrojov |
| `docs/project-os/briefs/a-core-product.md` | produkt |
| `docs/project-os/briefs/b-engineering-agentic.md` | inžinierstvo a agenti |
| `docs/project-os/briefs/c-security-compliance.md` | bezpečnosť |
| `docs/project-os/briefs/d-marketing-sales.md` | marketing a predaj Revolis |
| `docs/project-os/briefs/e-integrations-operations.md` | integrácie |
| `docs/project-os/briefs/f-releases-production.md` | vydania ako sekcia |
| `docs/project-os/briefs/g-onlinovo-excluded.md` | vylúčenie Onlinovo |
| `docs/project-os/briefs/h-business-administration.md` | stub |
| `docs/project-os/briefs/i-personal-research.md` | stub |
| `docs/reports/2026-10-23-revolis-project-os.md` | táto správa |
| `docs/architecture/MAPA.md` | jeden odkaz na register |

Prečo nová zložka `docs/project-os/`: `docs/architecture/` drží ústavy a kontrakt, `docs/briefs/` sú nočné vykonávacie briefy, `docs/security/` má len `AI_SECURITY.md`, `docs/ops/` sú runbooky. Jeden register je menší zásah ako rozptyl po architektúre. [engineering-os-revolis-rightsized.md](../architecture/engineering-os-revolis-rightsized.md) varuje pred 15-priečinkovou taxonómiou. Tu je jedna zložka s odkazmi.

## Existujúce projekty a stavy, ktoré nástroj vrátil

`run-info` pre tento beh:

- názov: `Implement Revolis Project OS`
- stav: `RUNNING` v čase volania
- zdroj: `desktop`
- repozitár: `github.com/onlinovosk-bit/RealitkaAI`
- URL: https://cursor.com/agents/bc-83874a64-bcae-54d1-bdca-9d785a01d61a
- pole Cursor projektu v JSON nie je

`list-cloud-agents` (prvá strana `limit=50`, druhá `offset=50`, `limit=200`):

- `totalMatched`: 117
- `hasMore` na druhej strane: false
- `includeArchived` som nezapol (predvolene false). Archivované behy v 117 nie sú.
- odpoveď nemá pole projektu

Beh s názvom **Revolis Security Audits**:

- stav `IDLE`
- zdroj `desktop`
- vznik `2026-10-23T11:23:35Z`
- URL: https://cursor.com/agents/bc-97e25073-0157-4db4-ad68-1d2f901b9438
- systém tohto vlákna hovorí, že projekt sa tak volá a že sa má znovupoužiť
- `notes.md` v úložisku projektu má jeden riadok o tejto úlohe. Iné nastavenie projektu som nečítal a nemenil

Beh s názvom **Revolis Marketing Site**:

- stav `RUNNING` v čase prvej strany
- zdroj `desktop`
- URL: https://cursor.com/agents/bc-072bfe72-87f7-462c-a77f-f9e33fe4d586
- nie je overené, že ide o trvalý projekt oblasti D

Iné názvy z 117 sú behy úloh (desktop, internal, automations, sand, mobile, setup), nie overené projekty.

## Nástroje na projekty a chaty

| Volanie | Výsledok |
|---|---|
| Schéma `run-info`, potom volanie | identita tohto behu, bez poľa projektu |
| Schéma `list-cloud-agents`, dve stránky | 117 behov, bez poľa projektu |
| Schéma `rename-chat` | vie premenovať len tento chat. Nevolal som ju. Zadanie premenovanie nechcelo. |
| Vyhľadanie názvov nástrojov `project\|createProject\|moveChat\|conversation` | 0 nástrojov |

Hromadný presun, založenie projektu a premenovanie cudzích chatov sú preto manuálne. Checklist je nižšie.

## Taxonómia

Plné znenie: [taxonomy.md](../project-os/taxonomy.md).

| | Oblasť | V tomto repe |
|---|---|---|
| A | Core product | brief, odkazy na STATUS a rozhodnutia |
| B | Engineering a agentické systémy | brief, kontrakt ostáva autoritou |
| C | Security | existujúci projekt Revolis Security Audits |
| D | Marketing a predaj Revolis | brief |
| E | Integrácie a operácie | brief |
| F | Vydania a produkcia | sekcia, nie Cursor projekt |
| G | Onlinovo | vylúčené, súbory nemenené |
| H | Firemná administratíva | stub, oblasť v repe nie je založená |
| I | Osobný a všeobecný výskum | stub |

## Inventár konverzácií

Zdroj: dve odpovede `list-cloud-agents` v tomto behu, 117 unikátnych `bcId`, žiadny prekryv stránok. Stĺpec „Aktuálne umiestnenie" je stav behu, zdroj, čas vzniku v UTC a URL. Členstvo v Cursor projekte nástroj nevrátil, okrem priradenia tohto vlákna k Revolis Security Audits v systémovom kontexte.

Istota `high` je len pri tomto zadaní (telo mám) a pri behu Revolis Security Audits (názov z nástroja plus priradenie projektu v tomto vlákne). Ostatné riadky sú názov bez tela: najviac `medium`, pri zmiešanom názve `low`.

Akcia `move` v tabuľke nie je. Presun sa nedá potvrdiť. `leave unchanged` znamená, že beh ostal kde je. `blocked` znamená, že odporúčaný presun nástrojom neprebehol. `review` + `not started` znamená, že zaradenie čaká na foundera a nič sa nepresúvalo. `keep` + `completed` je len Revolis Security Audits: projekt sa znovupoužil, nastavenia sa nemenili, duplicitný projekt nevznikol.

Súhrn istoty: low 67, medium 48, high 2.

Súhrn navrhovanej oblasti (počet behov, nie projektov):

- na posúdenie: 67
- C — SECURITY & COMPLIANCE: 23
- F — RELEASES (sekcia v repe, nie Cursor projekt): 11
- D — MARKETING & SALES: 8
- B — ENGINEERING & AGENTIC SYSTEMS: 5
- A — CORE PRODUCT: 2
- E — INTEGRATIONS & OPERATIONS: 1

Súhrn akcie: review 69, leave unchanged 47, keep 1.

| Konverzácia (presný názov) | Aktuálne umiestnenie | Navrhovaný projekt | Istota | Zdôvodnenie | Akcia | Stav |
|---|---|---|---|---|---|---|
| Implement Revolis Project OS | beh RUNNING, zdroj desktop, vznik 2026-10-23T11:28:57Z, https://cursor.com/agents/bc-83874a64-bcae-54d1-bdca-9d785a01d61a; Cursor Project v odpovedi nástroja nie je. Systémový kontext: vlákno projektu Revolis Security Audits. | B — ENGINEERING & AGENTIC SYSTEMS | high | Telo tohto zadania som čítal. Primárny cieľ je riadenie projektov a agentov. | review | blocked |
| Revolis Security Audits | beh IDLE, zdroj desktop, vznik 2026-10-23T11:23:35Z, https://cursor.com/agents/bc-97e25073-0157-4db4-ad68-1d2f901b9438; Cursor Project v odpovedi nástroja nie je. Tento názov je názov projektu v systémovom kontexte workerov. | C — SECURITY & COMPLIANCE | high | Názov vrátil list-cloud-agents a toto vlákno je priradené k projektu s týmto názvom. Okrem jedného riadku v notes.md telo nečítané. Nastavenia som nemenil. | keep | completed |
| Revolis Marketing Site | beh RUNNING, zdroj desktop, vznik 2026-10-23T11:23:08Z, https://cursor.com/agents/bc-072bfe72-87f7-462c-a77f-f9e33fe4d586; Cursor Project v odpovedi nástroja nie je. | D — MARKETING & SALES | medium | Názov hovorí o marketingovom webe. Pole projektu nástroj nevrátil, telo nečítané. Nie je overené, že ide o trvalý projekt. | review | not started |
| Scan gmail/credits bugs | beh IDLE, zdroj internal, vznik 2026-10-22T23:03:04Z, https://cursor.com/agents/bc-7fb66123-6c7f-5d7e-be1c-2d74ed3ec0b0; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Scan deliverability/auth bugs | beh IDLE, zdroj internal, vznik 2026-10-22T23:03:04Z, https://cursor.com/agents/bc-b0933f01-d26e-5f84-986a-937fa1e2ad1b; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug detection | beh IDLE, zdroj automations, vznik 2026-10-22T23:01:41Z, https://cursor.com/agents/bc-36824690-25eb-49f1-8dd2-deced69498f3; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Revolis v3: 8 Stripe Price ID per plán + testy | beh ERROR, zdroj sand, vznik 2026-10-22T06:52:56Z, https://cursor.com/agents/bc-427842f9-c76d-5408-aa3a-2177e25403eb; Cursor Project v odpovedi nástroja nie je. | A — CORE PRODUCT | medium | Názov je produktová cena alebo zápis lead eventu. Telo nečítané. | leave unchanged | blocked |
| PR #886: CTA na app.revolis.ai + merge | beh IDLE, zdroj sand, vznik 2026-10-22T06:12:50Z, https://cursor.com/agents/bc-149a5585-6508-5bc7-830c-767665092969; Cursor Project v odpovedi nástroja nie je. | D — MARKETING & SALES | medium | Názov má primárny cieľ marketingového webu alebo textu. Telo nečítané. | leave unchanged | blocked |
| Hunt auth/permissions bugs | beh IDLE, zdroj internal, vznik 2026-10-21T23:03:43Z, https://cursor.com/agents/bc-29e7e6c1-b3b1-58aa-a66c-8b5cb5aa1e77; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Hunt Gmail/inbound bugs | beh IDLE, zdroj internal, vznik 2026-10-21T23:03:43Z, https://cursor.com/agents/bc-b171c224-f991-501d-9fb0-efc932ea14a3; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Hunt pricing/billing bugs | beh IDLE, zdroj internal, vznik 2026-10-21T23:03:43Z, https://cursor.com/agents/bc-44ccadc0-31cf-5b8c-a47f-92a434760972; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug detection | beh IDLE, zdroj automations, vznik 2026-10-21T23:03:05Z, https://cursor.com/agents/bc-d6cce243-18d1-40aa-a53e-7c7d747a2416; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Audit Realvia and permissions | beh IDLE, zdroj internal, vznik 2026-10-20T23:02:31Z, https://cursor.com/agents/bc-39ec0db1-65bb-50c4-93ec-e50579ae6acf; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Audit Gmail OAuth critical paths | beh IDLE, zdroj internal, vznik 2026-10-20T23:02:29Z, https://cursor.com/agents/bc-a3dc4e8a-b01c-580d-aa78-ff3f1bc85076; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Audit billing/credits critical paths | beh IDLE, zdroj internal, vznik 2026-10-20T23:02:25Z, https://cursor.com/agents/bc-3318e3a2-539b-502c-9449-3d92b6282f69; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug detection | beh IDLE, zdroj automations, vznik 2026-10-20T23:00:44Z, https://cursor.com/agents/bc-5e719227-8736-4839-ba16-dc3c4757a271; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Verify landing copy in browser | beh ERROR, zdroj internal, vznik 2026-10-20T09:28:36Z, https://cursor.com/agents/bc-ee7d6e18-68c2-557b-83ea-65ab1c200767; Cursor Project v odpovedi nástroja nie je. | D — MARKETING & SALES | medium | Názov má primárny cieľ marketingového webu alebo textu. Telo nečítané. | leave unchanged | blocked |
| Verify landing copy in browser | beh ERROR, zdroj internal, vznik 2026-10-20T09:28:24Z, https://cursor.com/agents/bc-d93c0653-f86e-54b7-849d-f6ab6abee92e; Cursor Project v odpovedi nástroja nie je. | D — MARKETING & SALES | medium | Názov má primárny cieľ marketingového webu alebo textu. Telo nečítané. | leave unchanged | blocked |
| Verify landing copy in browser | beh ERROR, zdroj internal, vznik 2026-10-20T09:28:13Z, https://cursor.com/agents/bc-c03a4f1f-a7eb-5e14-a339-536a5e52ede7; Cursor Project v odpovedi nástroja nie je. | D — MARKETING & SALES | medium | Názov má primárny cieľ marketingového webu alebo textu. Telo nečítané. | leave unchanged | blocked |
| F2 fix: demo/capture-lead fail-closed (draft PR) | beh IDLE, zdroj sand, vznik 2026-10-20T08:43:19Z, https://cursor.com/agents/bc-2fa72aa7-1bf1-506c-9479-1352bce2c902; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| F1 reachability: licensing.ts server actions in production build (read-only) | beh IDLE, zdroj sand, vznik 2026-10-20T08:13:55Z, https://cursor.com/agents/bc-d9c194b9-f07d-5f5d-9ec2-e8dbe3d5b9b1; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Audit cron privileged routes | beh IDLE, zdroj internal, vznik 2026-10-20T07:59:08Z, https://cursor.com/agents/bc-d87560e3-fca0-5cd6-90ed-53bba21e01aa; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Audit public webhook privileged routes | beh IDLE, zdroj internal, vznik 2026-10-20T07:59:08Z, https://cursor.com/agents/bc-11a0d5c0-847e-5077-82e2-eab189e09e01; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Audit user-auth privileged routes | beh IDLE, zdroj internal, vznik 2026-10-20T07:59:08Z, https://cursor.com/agents/bc-c8cb638b-fe66-50b9-a1f6-1535ac0c899b; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| S2 read-only audit: privileged API routes tenant isolation | beh IDLE, zdroj sand, vznik 2026-10-20T07:57:32Z, https://cursor.com/agents/bc-7efe5387-d8dd-52f4-8638-aaa7df6536ec; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Revolis F1 read-only data audit + independent review PR #892 | beh IDLE, zdroj sand, vznik 2026-10-20T07:29:10Z, https://cursor.com/agents/bc-c6e3ac13-52dd-55ee-b606-8f3f3bafedda; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Audit marketing landing copy | beh IDLE, zdroj internal, vznik 2026-10-20T06:54:42Z, https://cursor.com/agents/bc-9be0bee4-c5ec-5e58-865f-3c424f5a9a67; Cursor Project v odpovedi nástroja nie je. | D — MARKETING & SALES | medium | Názov má primárny cieľ marketingového webu alebo textu. Telo nečítané. | leave unchanged | blocked |
| Audit AI listing + credits | beh IDLE, zdroj internal, vznik 2026-10-20T06:54:42Z, https://cursor.com/agents/bc-0f9a9284-d319-57f8-ad2a-4c49a31c754b; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Revolis: rýchlosť + úspora času — plán funkcií + landing copy | beh IDLE, zdroj sand, vznik 2026-10-20T06:53:59Z, https://cursor.com/agents/bc-84eb591a-605e-5642-ab8b-d80cc86163f8; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Marketing landing: nová farebná paleta (navy + zlatá) | beh IDLE, zdroj sand, vznik 2026-10-20T06:07:39Z, https://cursor.com/agents/bc-937fc91f-d85f-55b6-8c34-f742fd7fb8a7; Cursor Project v odpovedi nástroja nie je. | D — MARKETING & SALES | medium | Názov má primárny cieľ marketingového webu alebo textu. Telo nečítané. | leave unchanged | blocked |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-10-19T23:01:35Z, https://cursor.com/agents/bc-4623aa89-180d-4bee-8283-e2a75aa7fe2b; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Deep audit grant expire path | beh IDLE, zdroj internal, vznik 2026-10-18T23:15:09Z, https://cursor.com/agents/bc-1f03d0eb-90f2-5ab0-a17d-c26c079dcc72; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Hunt auth/RLS critical bugs | beh IDLE, zdroj internal, vznik 2026-10-18T23:11:14Z, https://cursor.com/agents/bc-a5775200-74f3-556f-8103-6100407b487f; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Audit acquire/email/cron paths | beh IDLE, zdroj internal, vznik 2026-10-18T23:07:18Z, https://cursor.com/agents/bc-1ddf3afa-dba5-54ee-b5ce-e370d2eba325; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Audit xlsx import risks | beh IDLE, zdroj internal, vznik 2026-10-18T23:02:34Z, https://cursor.com/agents/bc-1c7a8817-8957-5bd0-88a7-53f1ac05f786; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Audit billing/credits paths | beh IDLE, zdroj internal, vznik 2026-10-18T23:02:30Z, https://cursor.com/agents/bc-c231b1d4-b954-5ea6-8a96-06668ba8c614; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Nightly critical bug scan | beh IDLE, zdroj automations, vznik 2026-10-18T23:01:17Z, https://cursor.com/agents/bc-ec4f6775-919a-4c0f-a602-83c852b831f3; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Hunt credit/billing races | beh IDLE, zdroj internal, vznik 2026-10-17T23:08:31Z, https://cursor.com/agents/bc-2041ca81-2491-5b91-a504-b6fd76cbf580; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Audit xlsx import risks | beh IDLE, zdroj internal, vznik 2026-10-17T23:03:42Z, https://cursor.com/agents/bc-da79bbc3-44c4-574b-97d2-4751516338cd; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Audit portal import + crons | beh IDLE, zdroj internal, vznik 2026-10-17T23:03:42Z, https://cursor.com/agents/bc-09144abb-aef5-50e3-89c7-d135aa77f596; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Audit billing and auth paths | beh IDLE, zdroj internal, vznik 2026-10-17T23:03:42Z, https://cursor.com/agents/bc-e3eb71f4-55c9-5577-964d-311b98e76bbb; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-10-17T23:02:57Z, https://cursor.com/agents/bc-c1ec43be-2983-451b-a0d6-fbb65ceb7981; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| SEO: 308 redirect na www, canonical, robots.txt, sitemap | beh IDLE, zdroj sand, vznik 2026-10-17T08:47:42Z, https://cursor.com/agents/bc-5e4fb3f8-af20-5e99-a97b-888a70821aac; Cursor Project v odpovedi nástroja nie je. | D — MARKETING & SALES | medium | Názov má primárny cieľ marketingového webu alebo textu. Telo nečítané. | leave unchanged | blocked |
| Audit xlsx import safety | beh IDLE, zdroj internal, vznik 2026-10-16T23:05:45Z, https://cursor.com/agents/bc-9ae4a7a9-3c54-5f76-af67-df242e39a41a; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Audit trial gate bypass | beh IDLE, zdroj internal, vznik 2026-10-16T23:05:45Z, https://cursor.com/agents/bc-42ce7e7b-98a1-5689-9e83-81150665ba55; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Audit billing trial credits | beh IDLE, zdroj internal, vznik 2026-10-16T23:05:45Z, https://cursor.com/agents/bc-d8711e31-148a-561a-9ab2-cd862959e537; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Recent commit bug inspection | beh IDLE, zdroj automations, vznik 2026-10-16T23:04:58Z, https://cursor.com/agents/bc-3f9a090f-a57f-41e2-bbe9-a0b209eb8d29; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Portal mail drop check | beh IDLE, zdroj internal, vznik 2026-10-16T17:53:11Z, https://cursor.com/agents/bc-3d801ce2-793a-51e0-a6a7-24ec995f6066; Cursor Project v odpovedi nástroja nie je. | E — INTEGRATIONS & OPERATIONS | medium | Názov je prevádzková kontrola prítoku portálovej pošty. Telo nečítané. | leave unchanged | blocked |
| Lead event write check | beh IDLE, zdroj internal, vznik 2026-10-16T17:53:11Z, https://cursor.com/agents/bc-fb6e4a83-62a5-5210-ad1b-746e1ed73669; Cursor Project v odpovedi nástroja nie je. | A — CORE PRODUCT | medium | Názov je produktová cena alebo zápis lead eventu. Telo nečítané. | leave unchanged | blocked |
| Tenant fail-closed slice | beh IDLE, zdroj internal, vznik 2026-10-16T17:53:11Z, https://cursor.com/agents/bc-bda0e504-4671-5b46-afd3-6184eed4d596; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Find critical bugs in recent CRM code | beh IDLE, zdroj internal, vznik 2026-10-15T23:05:26Z, https://cursor.com/agents/bc-0d008c0e-a8f7-5f75-b1bb-885b1944c71f; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-10-15T23:04:21Z, https://cursor.com/agents/bc-91729041-5362-417b-80b4-9aa5a26267ad; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Diagnose failed CI check | beh IDLE, zdroj internal, vznik 2026-10-15T13:45:49Z, https://cursor.com/agents/bc-b795fba4-10f0-5702-a876-22c9df5a10d9; Cursor Project v odpovedi nástroja nie je. | F — RELEASES (sekcia v repe, nie Cursor projekt) | medium | Názov je vyšetrenie CI alebo Vercelu. Oblasť F je v repe sekcia, nie overený Cursor projekt. Telo nečítané. | leave unchanged | blocked |
| Realvia: dump=headers vyžaduje CRON_SECRET | beh IDLE, zdroj sand, vznik 2026-10-15T13:30:42Z, https://cursor.com/agents/bc-4ea736e5-df71-58f0-b8e0-3bcaf894479b; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| P11 QA verify auth PR | beh IDLE, zdroj internal, vznik 2026-10-15T11:42:15Z, https://cursor.com/agents/bc-7c2afaa1-48a6-562a-a8b9-ea0b5f0623f4; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Login/Register: reálne features + modrý gradient | beh IDLE, zdroj sand, vznik 2026-10-15T11:35:47Z, https://cursor.com/agents/bc-63325976-1f8d-53c7-be52-df95ea7996e9; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Prompt caching pre Claude volania v Revolis | beh IDLE, zdroj sand, vznik 2026-10-15T10:58:27Z, https://cursor.com/agents/bc-3ae37bf2-0b01-5934-8d20-4c3c6bfc9470; Cursor Project v odpovedi nástroja nie je. | B — ENGINEERING & AGENTIC SYSTEMS | medium | Názov je prompt, zbernica alebo protokol agentov. Telo nečítané. | leave unchanged | blocked |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-10-14T23:02:32Z, https://cursor.com/agents/bc-ec6dd672-03e1-41bb-964e-b105b0ef4015; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-10-13T23:04:31Z, https://cursor.com/agents/bc-b1ce1f9b-1dc8-4f86-bfe5-91d095e16ab3; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Web: odstrániť Lemon Squeezy + nové kredity 25/60/120/175 | beh IDLE, zdroj sand, vznik 2026-10-13T14:08:12Z, https://cursor.com/agents/bc-a17fffc4-dea6-567d-bd69-1863479e4131; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Audit recent WP/billing diffs | beh IDLE, zdroj internal, vznik 2026-10-12T23:01:26Z, https://cursor.com/agents/bc-bbd838bd-3ac8-50a5-9bdb-72323639113e; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Fresh-look rejected security bugs | beh IDLE, zdroj internal, vznik 2026-10-12T23:01:22Z, https://cursor.com/agents/bc-ce529ee2-8d9a-50b0-b6e6-6ad450f11d91; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-10-12T23:00:17Z, https://cursor.com/agents/bc-13e0a971-c39f-4ec2-9830-0cffa9f1189c; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Pull request readiness | beh ERROR, zdroj desktop, vznik 2026-09-25T10:00:25Z, https://cursor.com/agents/bc-e5096f93-43b1-46bb-9064-eb642295ee5e; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-18T23:04:46Z, https://cursor.com/agents/bc-3f1575c0-013e-44e3-b702-d227d89582a4; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-17T23:02:06Z, https://cursor.com/agents/bc-5758df07-15ff-4165-a3e3-98e5b994dc15; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-16T23:18:47Z, https://cursor.com/agents/bc-12781a95-75ac-470e-981f-b04ff06ddfd4; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Hunt critical CRM bugs | beh IDLE, zdroj internal, vznik 2026-09-15T23:06:44Z, https://cursor.com/agents/bc-bb5df2b7-bad6-55ff-9cea-9693b3c948cf; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-15T23:05:55Z, https://cursor.com/agents/bc-30613aff-0935-4840-8f7d-58ec2e912f40; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-14T23:00:09Z, https://cursor.com/agents/bc-33ec4284-12a4-4229-991f-8ad1a274010f; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Hunt critical CRM bugs | beh IDLE, zdroj internal, vznik 2026-09-13T23:08:00Z, https://cursor.com/agents/bc-2c047e71-ff31-505e-86c7-ceef264ed004; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-13T23:04:32Z, https://cursor.com/agents/bc-ccf11434-041e-4530-a85c-3f0aae515afd; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-12T23:04:08Z, https://cursor.com/agents/bc-4add4018-5860-452d-817d-225e721f75f5; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Revolis AI komunikačný protokol | beh IDLE, zdroj mobile, vznik 2026-09-06T13:39:30Z, https://cursor.com/agents/bc-01a076f2-045b-74e9-97de-45ab012b0b41; Cursor Project v odpovedi nástroja nie je. | B — ENGINEERING & AGENTIC SYSTEMS | medium | Názov je prompt, zbernica alebo protokol agentov. Telo nečítané. | leave unchanged | blocked |
| Investigate PR 473 CI | beh IDLE, zdroj internal, vznik 2026-09-06T12:24:07Z, https://cursor.com/agents/bc-3ee28031-a84b-5526-8882-5675d72abde2; Cursor Project v odpovedi nástroja nie je. | F — RELEASES (sekcia v repe, nie Cursor projekt) | medium | Názov je vyšetrenie CI alebo Vercelu. Oblasť F je v repe sekcia, nie overený Cursor projekt. Telo nečítané. | leave unchanged | blocked |
| Investigate failing CI | beh IDLE, zdroj internal, vznik 2026-09-06T11:46:26Z, https://cursor.com/agents/bc-69b92822-ea56-5f6d-85b9-5722713d5b91; Cursor Project v odpovedi nástroja nie je. | F — RELEASES (sekcia v repe, nie Cursor projekt) | medium | Názov je vyšetrenie CI alebo Vercelu. Oblasť F je v repe sekcia, nie overený Cursor projekt. Telo nečítané. | leave unchanged | blocked |
| Chatbot požiadavka | beh IDLE, zdroj mobile, vznik 2026-09-06T09:14:01Z, https://cursor.com/agents/bc-01a075fe-f952-7f4d-96de-56083098ed18; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-05T23:07:30Z, https://cursor.com/agents/bc-da0bb4a4-84e5-4ae2-bad8-2096745d181c; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Notification delivery conflicts | beh IDLE, zdroj desktop, vznik 2026-09-05T20:25:14Z, https://cursor.com/agents/bc-d0da224a-f20b-43f1-aa21-5689fa1e2a7d; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Notification delivery readiness | beh IDLE, zdroj desktop, vznik 2026-09-05T20:06:19Z, https://cursor.com/agents/bc-0d6e9a19-ae65-4d54-bb42-d80763441c75; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-04T23:02:46Z, https://cursor.com/agents/bc-1b246f13-215f-49a5-9ad8-31259ac45881; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-03T23:01:18Z, https://cursor.com/agents/bc-881ad7bd-5dd8-4679-a306-e4e31b97aae8; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Hunt critical CRM bugs | beh IDLE, zdroj internal, vznik 2026-09-02T23:02:21Z, https://cursor.com/agents/bc-12b4190a-39d3-51cb-8684-153a4bbf317e; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-02T23:01:34Z, https://cursor.com/agents/bc-37c5ec7b-60be-42e5-abba-9ce3814f1c8f; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-09-01T23:07:20Z, https://cursor.com/agents/bc-80e133e9-78aa-44a7-aac2-4665a4e44a0c; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-08-31T23:03:36Z, https://cursor.com/agents/bc-af68414a-7ab5-4d3d-aa5f-f2fd1d34e8e2; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-08-30T23:03:14Z, https://cursor.com/agents/bc-04e3edec-639e-421f-81ec-8d4d16dc61b2; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-08-29T23:09:02Z, https://cursor.com/agents/bc-dc385a84-3c7f-4c9c-82df-22141725509b; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Hunt critical CRM bugs | beh IDLE, zdroj internal, vznik 2026-08-28T23:12:00Z, https://cursor.com/agents/bc-66fad01a-8406-56c1-bb2a-f20ed0218c9c; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-08-28T23:11:17Z, https://cursor.com/agents/bc-b07a6e42-ea6f-4d1d-ad14-8a06fc3885f8; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-08-27T23:01:25Z, https://cursor.com/agents/bc-c4c3b844-3db6-4a4b-b520-244788f6b7a8; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-08-26T23:04:02Z, https://cursor.com/agents/bc-0dc59d93-6ff2-4b9f-9cb6-990b31f0db67; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Hunt critical auth bugs | beh IDLE, zdroj internal, vznik 2026-08-25T23:03:35Z, https://cursor.com/agents/bc-c0c8bb73-20f0-519f-a92b-b3b628f3cee7; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Hunt data-loss race bugs | beh IDLE, zdroj internal, vznik 2026-08-25T23:03:35Z, https://cursor.com/agents/bc-7b8a0d93-97bf-5125-85a7-4cb51365734d; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-08-25T23:02:03Z, https://cursor.com/agents/bc-f9ce853a-7aa5-4ea6-983f-7dadeb916725; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Revolis workdesk pôvod | beh IDLE, zdroj mobile, vznik 2026-08-25T07:50:13Z, https://cursor.com/agents/bc-01a037e5-f624-792f-a9ba-40a3241e104f; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Investigate CI lint-test-build | beh IDLE, zdroj internal, vznik 2026-08-24T20:05:28Z, https://cursor.com/agents/bc-44f15ae5-ef1e-5d93-a8b3-7e00ece4c3e5; Cursor Project v odpovedi nástroja nie je. | F — RELEASES (sekcia v repe, nie Cursor projekt) | medium | Názov je vyšetrenie CI alebo Vercelu. Oblasť F je v repe sekcia, nie overený Cursor projekt. Telo nečítané. | leave unchanged | blocked |
| Investigate CI lint-test-build | beh IDLE, zdroj internal, vznik 2026-08-24T20:03:26Z, https://cursor.com/agents/bc-bef6fb9c-e71f-5ebd-8249-893c01962d7e; Cursor Project v odpovedi nástroja nie je. | F — RELEASES (sekcia v repe, nie Cursor projekt) | medium | Názov je vyšetrenie CI alebo Vercelu. Oblasť F je v repe sekcia, nie overený Cursor projekt. Telo nečítané. | leave unchanged | blocked |
| Inspect install setup logs | beh IDLE, zdroj internal, vznik 2026-08-24T17:25:16Z, https://cursor.com/agents/bc-37c885b6-43c6-57e2-bb5f-34d7be42395c; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Hunt critical CRM bugs | beh IDLE, zdroj internal, vznik 2026-08-23T23:03:44Z, https://cursor.com/agents/bc-95cf5835-5145-5d45-b5b3-215ff6c749fc; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-08-23T23:02:38Z, https://cursor.com/agents/bc-dd234c36-8b40-4769-bab9-516ff5dde3bd; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-08-22T23:01:20Z, https://cursor.com/agents/bc-d1c6c1d5-61c5-49b9-ba69-d0830b53fd21; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Investigate Vercel revolis-marketing | beh IDLE, zdroj internal, vznik 2026-08-22T19:32:02Z, https://cursor.com/agents/bc-6ffc2c0e-00ee-5f67-908a-d27d8cc5e6e1; Cursor Project v odpovedi nástroja nie je. | F — RELEASES (sekcia v repe, nie Cursor projekt) | medium | Názov je vyšetrenie CI alebo Vercelu. Oblasť F je v repe sekcia, nie overený Cursor projekt. Telo nečítané. | leave unchanged | blocked |
| Investigate Vercel realitka-ai | beh IDLE, zdroj internal, vznik 2026-08-22T19:32:01Z, https://cursor.com/agents/bc-40f09840-58b4-5b09-a949-02a659af575d; Cursor Project v odpovedi nástroja nie je. | F — RELEASES (sekcia v repe, nie Cursor projekt) | medium | Názov je vyšetrenie CI alebo Vercelu. Oblasť F je v repe sekcia, nie overený Cursor projekt. Telo nečítané. | leave unchanged | blocked |
| Investigate Vercel revolis-marketing | beh IDLE, zdroj internal, vznik 2026-08-22T13:57:14Z, https://cursor.com/agents/bc-7294b1f4-a9c3-5dce-861c-fcb787cfeb98; Cursor Project v odpovedi nástroja nie je. | F — RELEASES (sekcia v repe, nie Cursor projekt) | medium | Názov je vyšetrenie CI alebo Vercelu. Oblasť F je v repe sekcia, nie overený Cursor projekt. Telo nečítané. | leave unchanged | blocked |
| Investigate Vercel realitka-ai | beh IDLE, zdroj internal, vznik 2026-08-22T13:57:13Z, https://cursor.com/agents/bc-460886ee-f748-54db-8406-6fcb8b45db5f; Cursor Project v odpovedi nástroja nie je. | F — RELEASES (sekcia v repe, nie Cursor projekt) | medium | Názov je vyšetrenie CI alebo Vercelu. Oblasť F je v repe sekcia, nie overený Cursor projekt. Telo nečítané. | leave unchanged | blocked |
| Investigate Vercel revolis-marketing | beh IDLE, zdroj internal, vznik 2026-08-22T13:25:42Z, https://cursor.com/agents/bc-6833e22e-2317-5e0c-accd-8ced6b13e4dc; Cursor Project v odpovedi nástroja nie je. | F — RELEASES (sekcia v repe, nie Cursor projekt) | medium | Názov je vyšetrenie CI alebo Vercelu. Oblasť F je v repe sekcia, nie overený Cursor projekt. Telo nečítané. | leave unchanged | blocked |
| Investigate Vercel realitka-ai | beh IDLE, zdroj internal, vznik 2026-08-22T13:25:41Z, https://cursor.com/agents/bc-c8fe4f83-c92b-5366-a05c-c10d27564bac; Cursor Project v odpovedi nástroja nie je. | F — RELEASES (sekcia v repe, nie Cursor projekt) | medium | Názov je vyšetrenie CI alebo Vercelu. Oblasť F je v repe sekcia, nie overený Cursor projekt. Telo nečítané. | leave unchanged | blocked |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-08-21T23:03:47Z, https://cursor.com/agents/bc-e11c324d-9820-4a91-a029-7b56a01d4abe; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Lane B acquire dedup | beh IDLE, zdroj internal, vznik 2026-08-21T20:34:20Z, https://cursor.com/agents/bc-eb521b4f-a072-5744-b762-53ca25784466; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Lane C proxy fail-closed | beh IDLE, zdroj internal, vznik 2026-08-21T20:34:20Z, https://cursor.com/agents/bc-166821fd-ff9a-54ac-9716-6b7f41715df4; Cursor Project v odpovedi nástroja nie je. | C — SECURITY & COMPLIANCE | medium | Názov je audit alebo kontrola privilegovanej, prístupovej alebo izolačnej cesty. Telo nečítané. | leave unchanged | blocked |
| Inspect install setup logs | beh IDLE, zdroj internal, vznik 2026-08-21T18:02:58Z, https://cursor.com/agents/bc-81f58430-cb2d-55d3-bd4e-b795d0260bdc; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Medzi-agentová zbernica v0.1 | beh IDLE, zdroj mobile, vznik 2026-08-21T09:05:00Z, https://cursor.com/agents/bc-01a02390-fb24-7049-82cb-2397349edb1f; Cursor Project v odpovedi nástroja nie je. | B — ENGINEERING & AGENTIC SYSTEMS | medium | Názov je prompt, zbernica alebo protokol agentov. Telo nečítané. | leave unchanged | blocked |
| Inter-agent bus v0.1 skeleton | beh IDLE, zdroj mobile, vznik 2026-08-21T08:51:51Z, https://cursor.com/agents/bc-01a02384-f2d1-701f-9312-1f8f1a78e57d; Cursor Project v odpovedi nástroja nie je. | B — ENGINEERING & AGENTIC SYSTEMS | medium | Názov je prompt, zbernica alebo protokol agentov. Telo nečítané. | leave unchanged | blocked |
| Hunt critical store bugs | beh ERROR, zdroj internal, vznik 2026-08-20T23:02:45Z, https://cursor.com/agents/bc-00dbaf0b-f0af-51d2-8a9e-d9aa2ea35a08; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| Critical bug management | beh IDLE, zdroj automations, vznik 2026-08-20T23:01:30Z, https://cursor.com/agents/bc-06d4e06e-f67f-493b-8b63-91f39c7622b6; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |
| New development environment | beh IDLE, zdroj setup, vznik 2026-08-20T18:43:57Z, https://cursor.com/agents/bc-53ec2622-855d-4414-a980-b47507ce4850; Cursor Project v odpovedi nástroja nie je. | na posúdenie | low | Názov mieša viac cieľov alebo je všeobecný lov chýb. Telo nečítané, preto bez zaradenia do A–I. | review | not started |


## Dokončené zmeny v repe

Súbory z mapy vyššie. Žiadny aplikačný kód. Žiadna zmena `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, `.claude/skills/`, `memory/working-agreement.md`, `memory/decisions.md`, `memory/session-summary.md`, `docs/STATUS.md`, `docs/onlinovo/`, `packages/mcp-onlinovo/`.

`apps/crm/supabase/.branches/` bol v worktree neuložený už pred vetvou. Nesiahal som naň.

## Nepresunuté a prečo

Všetkých 117 behov ostalo na mieste. `list-cloud-agents` nevracia projekt a v katalógu nebol nástroj na presun ani na založenie projektu. `rename-chat` som nespustil. ChatGPT som nemal čím čítať, takže žiadna ChatGPT konverzácia sa nepresúvala a ani sa neinventarizovala.

## Nejasné položky na posúdenie

Všetky riadky tabuľky s istotou `low` a akciou `review`. Typické skupiny podľa názvu, bez čítania tela:

- opakované „Critical bug management" (29), „Critical bug detection", „Hunt critical CRM bugs", „Nightly critical bug scan", „Recent commit bug inspection", „Find critical bugs in recent CRM code" — môže ísť o bezpečnosť (C) aj o kvalitu vydania (F)
- zmiešaný názov fakturácie a auditu (kredity, trial, billing, gmail/credits, acquire/email/cron, AI listing + credits)
- „Revolis: rýchlosť + úspora času — plán funkcií + landing copy" — produkt aj marketing
- „Web: odstrániť Lemon Squeezy + nové kredity…" — cenník aj web
- „Login/Register: reálne features + modrý gradient"
- „F2 fix: demo/capture-lead fail-closed"
- „Notification delivery conflicts" a „Notification delivery readiness"
- „Chatbot požiadavka", „Revolis workdesk pôvod"
- „Lane B acquire dedup"
- „Pull request readiness"
- „New development environment", „Inspect install setup logs"
- „Revolis Marketing Site" — bežiaci beh, neoverený ako trvalý projekt D

Tento beh („Implement Revolis Project OS") má istotu high pre oblasť B a akciu `review` / stav `blocked`: vlákno visí v projekte bezpečnosti, lebo odtiaľ prišlo zadanie, a presun do samostatného inžinierskeho projektu nástrojom neprebehol.

## Budúce riadenie

[conversation-governance.md](../project-os/conversation-governance.md): pred väčšou úlohou vybrať oblasť; ak už si v správnom projekte, zostať; ak nie, odporučiť cieľ a nechať presun, kým ho nástroj nepotvrdí. Názov `[PROJECT] — [WORKSTREAM] — [OBJECTIVE]` je dohoda, nie vykonané premenovanie. Jeden chat, jeden domov, inde len odkaz.

## Manuálne kroky podľa priority

1. Prejsť riadky `review` / `low` a potvrdiť oblasť. Kým telo nie je prečítané, názov nestačí na presun.
2. V UI Cursora, ak produkt projekty vie založiť, založiť chýbajúce trvalé projekty až po overení v UI. Návrh poradia: B (inžinierstvo), A (produkt), D (marketing Revolis), E (integrácie). C nezakladať znova. F nezakladať, kým vznik nejde overiť. G neriešiť v tomto repe. H a I až keď budú mať reálnu prácu.
3. Presúvať chat ručne, jednu kópiu, bez mazania originálu, kým nie je isté, že presun nie je kópia. Tento beh mazanie nezakazuje len slovne: nič nemazal.
4. Premenovať chat na dohodnutý tvar až po súhlase s konkrétnym názvom. `rename-chat` v cloud agentovi vie len aktuálny chat.
5. Ak má register vidieť aj Claude pri štarte bez čítania `docs/project-os/`, doplniť jednu vetu do `CLAUDE.md` alebo `AGENTS.md` samostatným malým PR. V tomto PR som tie súbory nechal nedotknuté. Odkaz v `MAPA.md` je jediný zásah do existujúceho indexu.
6. Záznam do `memory/decisions.md` len ak founder chce Project OS ako rozhodnutie. Tento PR pamäť nezapisoval.
7. Merge tohto PR až po zelenom CI na tomto heade a po FOUNDER GO. Nasadenie dokumentácia nepotrebuje a nespúšťa sa.

## Čo sa nepodarilo otvoriť alebo overiť

- Telo 116 cudzích behov. Klasifikácia je z názvu.
- Archivované behy (`includeArchived` false).
- Behy iných účtov, ak ich nástroj principálovi nevracia. Vrátil 117.
- ChatGPT a iné nástroje mimo Cursor cloud agent zoznamu.
- Nastavenia projektu okrem `notes.md` (jeden riadok) a názvu behu.
- Zelené CI, Preview, produkcia, Stripe, Supabase, Vercel env. Netvrdím ich.
- `memory/open-tasks.md` existuje, nečítal som ho.
- Telo rozhodnutia REALVIA-PRICINY a preflight auditu 2026-10-20 som nečítal, len hlavičku vo výpise.
- Či sú draft PR z rozhodnutí 2026-10-17 a 2026-10-20 dnes zlúčené, som cez stav PR nezisťoval. Cost Governor súbor na `main` overený je (`149074b9`).
- Obsah `docs/onlinovo/` som zámerne nepoužil ako stav.

## Validácia

„Hotovo" podľa `revolis-verify-completion` **nie je povolené** (`DONE povolené: NIE`). Dokumenty sú v PR. Zelené CI netvrdím.

| Kontrola | Stav | Príkaz a výsledok v tomto behu |
|---|---|---|
| plan-lint | PASS | `node scripts/ci/revolis-verify.mjs plan-lint docs/plans/2026-10-23-revolis-project-os-plan.md` → `PLAN OK`, exit 0 |
| Relatívne odkazy | PASS | 14 markdown súborov v `docs/project-os/` a táto správa, 153 relatívnych odkazov, 0 neexistujúcich cieľov. Wiki odkaz `[[docs/project-os/README]]` v `docs/architecture/MAPA.md` mieri na existujúci `docs/project-os/README.md`. |
| Diff zakázaných ciest | PASS | `git diff --stat origin/main -- AGENTS.md CLAUDE.md .cursor/rules .claude/skills memory/working-agreement.md docs/onlinovo packages/mcp-onlinovo memory/decisions.md memory/session-summary.md docs/STATUS.md` je prázdny |
| completion verifier | FAIL | `node scripts/ci/revolis-verify.mjs completion --base origin/main --scope "docs/plans/2026-10-23-revolis-project-os-plan.md,docs/project-os/**,docs/reports/2026-10-23-revolis-project-os.md,docs/architecture/MAPA.md" --criteria /tmp/project-os-criteria.json --run` skončil exit 1. Súhrn: žiadna spustiteľná kontrola pre tento diff → **NOT_VERIFIED**. Rozsah **FAIL**: 1 cesta mimo scope, `apps/crm/supabase/.branches/` (neuložený stav checkoutu spred tejto vetvy, tento PR ho nepridáva). Kritériá AC-LINKS a AC-PLAN sú **NOT_VERIFIED**, lebo evidence `check:related-tests` sa pri čistej dokumentácii nenaplánuje. `DONE povolené: NIE`. |
| CI na tomto heade | NOT_VERIFIED | beh CI som nečítal |
| Preview a Playwright smoke | NOT_VERIFIED | nespustené |
| Produkcia, Stripe, databáza, Vercel env | NOT_VERIFIED | nespustené a mimo rozsahu |

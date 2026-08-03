# Inzerát Generátor — checklist a stav

**Cieľová cesta:** `docs/prompts/inzerat-generator-tab.md`
**Kapacita:** KF1 · **Aktualizované:** 2026-08-03

---

## Čo to je

Z parametrov nehnuteľnosti vygeneruje texty pre päť kanálov naraz: portál
(nehnutelnosti.sk, topreality.sk), Facebook, Instagram, e-mail a SEO kľúčové slová.
Persona kupujúceho (investor / rodina / 50+ / všeobecný) mení stratégiu textu,
nie len tón.

---

## Stav

| Vrstva | Stav | Kde |
|---|---|---|
| AI prompt + persony | ✅ | `lib/ai/listing-content.ts` |
| `POST /api/ai/listing-content` | ✅ | rate limit, audit, kredity, perzistencia |
| `POST .../stream` (SSE) | ✅ | rate limit, kredity, audit |
| Perzistencia draftov | ✅ | `ai_generations` + `lib/listings/generations-store.ts` |
| `GET /generations` · `PATCH /generations/:id` | ✅ | zoznam draftov, uloženie úprav |
| Broker UI | ✅ | `(dashboard)/inzerat-generator` |
| Vstup v navigácii | ✅ | `lib/navigation.ts` |
| Unit testy store | ✅ | `lib/listings/__tests__/` |
| **E2E happy path** | ⬜ | Playwright — čaká |
| **Zápis späť do `properties`** | ⬜ | vyžaduje rozhodnutie foundera |
| **Publish CTA** | ⬜ | zapnúť až po overení save flow v prevádzke |
| **Streamovaný draft** | ⬜ | stream vracia surový text; parse a uloženie je na klientovi |

---

## Kontrolný zoznam pred označením „billable"

- [ ] Maklér prejde celý tok bez pomoci: formulár → generovanie → úprava → uloženie
- [ ] Úprava prežije obnovenie stránky (`GET /generations` vráti `edited_output`)
- [ ] Pri nedostatku kreditov sa zobrazí zrozumiteľná hláška, nie chyba 500
- [ ] Cudzia agentúra nevie cez `PATCH` zmeniť cudzí draft (RLS + explicitný filter)
- [ ] Sandbox / demo cesta nezapisuje do `ai_generations` reálnej agentúry
- [ ] E2E test prejde v `nightly-playwright.yml`
- [ ] `docs/pricing/credit-topup-proposal.md:83` už neodkazuje na neexistujúci
      `ListingGeneratorForm`

---

## Rozhodnutia, ktoré čakajú na foundera

1. **`CREDITS_ENFORCEMENT`** — dnes `off`. Popis inzerátu stojí
   `CREDIT_ACTION_COSTS.listingDescription` = 2 kredity. Zapnutie na `enforce`
   začne reálne strhávať; Reality Smolko to má dnes zadarmo a musí to vedieť dopredu.
2. **Zápis späť do `properties`** — má generovaný text prepísať popis nehnuteľnosti,
   alebo zostať oddelený? Prepis je nevratný, oddelenie znamená dve pravdy.
3. **Publish CTA** — odoslanie na portál je integračná práca (Realvia / RealSys),
   nie súčasť MVP. Zapnúť až keď je save flow overený v prevádzke.

---

## Moat poznámka

`ai_generations` drží `output` (pôvodné AI) aj `edited_output` (úprava makléra)
a `output` sa **nikdy neprepisuje**. Rozdiel medzi nimi hovorí, čo AI píše zle
a ako to maklér opravuje. To je tréningový signál, ktorý konkurencia nemá —
a je to najcennejšia časť celej tejto funkcie.

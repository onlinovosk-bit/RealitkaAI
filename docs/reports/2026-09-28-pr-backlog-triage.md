# Triáž otvoreného PR backlogu (PR-BACKLOG-TRIAGE)

**Dátum:** 2026-09-28
**Brána:** `GO PR-BACKLOG-TRIAGE`
**Rozsah:** iba meranie a klasifikácia. **Nič sa nemergovalo, nič nezatváralo.**
**Referenčný `main`:** `fe505a26`

---

## Metóda — prečo sa tu nič neodvodzuje z názvu PR

Názov PR ani jeho popis nehovoria nič o tom, či chyba **dnes ešte existuje**.
Osem z týchto PR má popis napísaný v auguste; `main` sa odvtedy posunul o stovky
commitov. Preto sa každý PR meral dvoma nezávislými spôsobmi:

1. **Je chyba stále na `main`?** — nie z popisu PR, ale čítaním súčasného kódu
   na `origin/main` a hľadaním konkrétneho vzoru, ktorý PR opravuje.
2. **Dá sa to vôbec zmergovať?** — `git merge-tree --write-tree origin/main <head>`,
   teda **skutočný trojcestný merge**, nie odhad z `git diff`.

### Jedna chyba v mojom prvom meraní, ktorú tu priznávam

Prvé kolo porovnávalo `git diff origin/main <head>` a vyšlo z neho, že osem PR by
**zmazalo 136 až 841 súborov** z `main`. To bolo **nesprávne**. `git diff` porovnáva
dva stromy; merge berie **zmeny vetvy od spoločného predka**, nie jej celý strom.
Súbory, ktoré `main` pribudol po odbočení vetvy, merge nemaže. Skutočný merge cez
`merge-tree` ukázal iné a oveľa miernejšie čísla — viď tabuľka. Číslo z prvého
kola v tomto dokumente nefiguruje.

---

## Výsledok

| PR | téma | verdikt | merge |
|---|---|---|---|
| **#490** | assignment rules cross-tenant wipe | **PLATÍ — 1** | čistý |
| **#486** | HubSpot / call-analyze fail-open | **PLATÍ — 2** | konflikt iba v `memory/` |
| **#447** | pozvánka bez `agency_id` | **PLATÍ — 3** | konflikt iba v `memory/` |
| **#370** | kredity lost-update | **PLATÍ — 4** | čistý |
| **#462** | cross-tenant recovery link | **PLATÍ — 5** | konflikt iba v `memory/` |
| **#495** | inbound-lead webhook | **ČIASTOČNE PREKONANÉ** | čistý |
| **#443** | properties scoped client | **ČIASTOČNE PREKONANÉ** | konflikt iba v `memory/` |
| **#371** | billing legacy webhook | **PREKONANÉ — nemergovať** | čistý, ale prináša iba duplicitu |
| **#444** | matching recalculate | **PREKONANÉ — nebezpečné** | **konflikt v kóde** |
| **#459** | onboarding unauth PII | **PREKONANÉ** | nemergovateľné |
| **#439** | acquire dedup claim | **PREKONANÉ** | nemergovateľné |
| **#475** | ONL-MCP-001 queue | **ZAVRIEŤ** | 0 kódových súborov |

Zo štrnástich mesiacov práce, ktorá visí otvorená, je **päť opráv stále platných**
a **sedem už neplatí**. Jedna je administratívna.

---

## A. Platné — chyba je dnes na `main`

### 1. #490 — cross-tenant wipe assignment rules

**Dôkaz, že chyba žije.** `apps/crm/src/lib/lead-automation-store.ts` na `main`
stále staví **cookie-less anon singleton**:

```ts
globalRulesStore.__realitkaLeadAutomationSupabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
```

Klient bez session nenesie JWT, takže nenesie ani tenant kontext. Migrácia
`20260827230000_lead_assignment_rules_tenant_rls.sql`, ktorá by tabuľke pridala
`agency_id` a zavrela otvorenú demo RLS, **na `main` neexistuje** (overené výpisom
`apps/crm/supabase/migrations/`).

**Merge:** čistý — 9 súborov, 556 pridaní, **0 zmazaných súborov**.

**Prečo prvé miesto:** jediná položka v celej sade, kde je následkom **mazanie cudzích
dát**, nie ich čítanie. A jediná, ktorá je zároveň platná *aj* čistá na merge.

**Zvyškové riziko, ktoré PR sám priznáva:** existujúce riadky s `agency_id IS NULL`
sa po zapnutí tenant RLS stanú neviditeľnými, kým ich niekto nebackfilluje. To je
vedomá voľba — neviditeľné pravidlo je menej škodlivé než otvorená cesta k mazaniu.
**Backfill treba naplánovať pred aplikovaním migrácie na PROD, nie po nej.**

### 2. #486 — fail-open tenant gate pred admin klientom

**Dôkaz.** Oba vzory sú na `main` doslova:

- `apps/crm/src/app/api/integrations/hubspot/sync/route.ts:46`
  `if (callerProfile?.agency_id && lead.agency_id !== callerProfile.agency_id)`
- `apps/crm/src/app/api/ai/call/analyze/route.ts:34`
  `if (callerProfile?.agency_id && leadRow?.agency_id !== callerProfile.agency_id)`

Keď je `agency_id` null, podmienka sa skratuje a **beží admin cesta**, ktorá
obchádza RLS. Pri HubSpote to znamená odoslanie cudzieho leadu aj s PII do externej
služby.

**Merge:** konflikt iba v `memory/session-summary.md`.

### 3. #447 — pozvánka vytvorí profil bez `agency_id`

**Dôkaz.** `apps/crm/src/app/api/invite/route.ts` na `main` (51 riadkov, celý
prečítaný) upsertuje profil takto:

```ts
await admin.from("profiles").upsert({
  id: data.user.id, full_name: fullName, email, role: role ?? "agent", is_active: true,
}, { onConflict: "id" });
```

`agency_id` tam nie je. Každá pozvánka teda vyrobí **sirotu** — profil bez agentúry.

**Toto je zosilňovač #486, nie samostatná drobnosť.** #486 padá práve na profiloch
s `agency_id IS NULL` a #447 je továreň na ne. Ak sa má mergovať iba jedna z dvojice,
poradie je #486 (zavrie dieru) a potom #447 (zastaví výrobu kľúčov k nej).

### 4. #370 — lost update na kreditoch

**Dôkaz.** `apps/crm/src/lib/credits-billing.ts` na `main` robí klasický
read-modify-write:

```ts
const purchased = (agency.purchased_credits_balance ?? 0) + pkg.credits;
...
.update({ purchased_credits_balance: purchased, credits_balance: grant + purchased })
```

Dva súbežné nákupy prečítajú ten istý stav a druhý zápis prepíše prvý. Ani
`apps/crm/src/lib/credits/mutate-credits.ts`, ani migrácia
`20260804230000_atomic_credit_mutations.sql` na `main` neexistujú.

**Merge:** čistý — 9 súborov, 0 zmazaných.

**Poznámka k naliehavosti:** dnes sa cez `/upgrade` nedá zaplatiť (`CHECKOUT-ENV-01`),
takže súbeh nákupov je zatiaľ teoretický. **Presne preto to patrí pred spustenie
platieb, nie po ňom** — potom už každý stratený zápis stojí peniaze.

### 5. #462 — cross-tenant recovery link

**Dôkaz.** `apps/crm/src/app/api/settings/auth-email-tests/route.ts` na `main`
kontroluje iba **rolu**, nie agentúru:

```ts
requestedEmail !== ownEmail && !canManageUsers  → 403
```

`canManageUsers` je owner/founder. Owner agentúry A teda môže vygenerovať
`recovery-link` na e-mail používateľa agentúry B. `recovery-link` vracia
`action_link` priamo v odpovedi — to nie je reset hesla, to je **prevzatie účtu**.
PR pridáva `assertSameAgencyTarget()`.

---

## B. Prekonané — chyba už na `main` nie je

### #495 — inbound-lead webhook (čiastočne)

Tri zo štyroch vecí, ktoré PR opravuje, sú už na `main`:

| tvrdenie PR | stav na `main` |
|---|---|
| fail-open auth (`if (secret) {`) | opravené — `route.ts:23-24` vracia 503 bez secretu (TASK-SEC-002) |
| `agency_id` sa nepečiatkuje | opravené — `process-lead.ts:75` `agency_id: agencyId` |
| tichý ACK pri zlyhanom inserte | opravené — `if (insertErr) throw new Error(...)` (AP-010) |
| **vymyslené BRI skóre** | **stále tam** — `const briScore = bri?.new_score ?? 50` |

Posledný riadok je reálna chyba: prah pre auto-odpoveď je 40, takže **zlyhaný
výpočet BRI vyrobí skóre 50 a spustí automatickú odpoveď klientovi**. To je fikcia
dát s vonkajším následkom.

**Odporúčanie: #495 nemergovať.** Bola by to prepísaná verzia súboru, ktorý na
`main` už funguje, kvôli jednému riadku. Vyrezať ten jeden riadok do samostatnej
zmeny (`?? 0` + podmienka na `!bri`) je menšie riziko než 484-riadkový merge.

### #443 — properties scoped client (čiastočne)

PATCH handler aj `properties-store.ts` sú na `main` **identické** s tým, čo PR
navrhuje, vrátane komentára `agencyId is intentionally NOT accepted from body`.

Zostáva presne jedno miesto: `apps/crm/src/app/api/matching/action/route.ts:25-26`

```ts
getProperty(propertyId),   // bez scoped klienta
getLeadById(leadId),       // bez scoped klienta
```

Dva riadky. Rovnaké odporúčanie ako pri #495 — vyrezať, nie mergovať celok.

### #371 — billing legacy webhook: **nemergovať**

Vecná oprava je na `main`: `if (tier === "unknown") return;` plus komentár
*„Unknown Stripe prices must not mutate a paid profile to free."*

Čo by merge dnes priniesol, je iba toto:

```diff
+ * path would resolve priceId=undefined → free and wipe the paid tier.
  * path would previously resolve priceId=undefined → free and wipe the paid tier.
```

Duplicitný komentárový riadok vedľa takmer identického. To nie je oprava; je to
stopa po zle vyriešenom merge na vetve. **Zavrieť bez mergu.**

### #444 — matching recalculate: **prekonané a jediné s konfliktom v kóde**

`main` po #719 (`MATCHING-ZERO`) používa v `matching-store.ts` `resolveTenantSupabase`
a scoped klienta naprieč `recalculateMatchesForLead`. A zároveň: **jediné dva kódové
konflikty v celej dvanástke** sú `matching-hooks.ts` a `matching-store.ts` — presne
tie súbory. Vetva a `main` opravili tú istú vec inak.

**Zavrieť.** Merge by znamenal ručne rozhodovať konflikt medzi starou a novou
opravou toho istého defektu — s rizikom, že sa vráti `MATCHING-ZERO`.

### #459 — onboarding unauth PII: prekonané

`apps/crm/src/app/api/onboarding/mvp/at-risk/route.ts` na `main` začína:

```ts
const denied = await requirePlatformAdmin();
if (denied) return denied;
```

Neautentifikovaný dump PII tam už nie je.

### #439 — acquire dedup claim: prekonané

`apps/crm/src/app/api/acquire/email/route.ts` na `main` obsahuje presne to, čo PR
pridáva, vrátane komentára *„On lead failure we MUST delete the claim"* (riadky
309-313) a samotného uvoľnenia claimu (407-412). Zmergované ako #440.

---

## C. Dva PR sa nedajú zmergovať vôbec

`git merge-tree --write-tree origin/main refs/pr/439` a to isté pre `#459`:

```
fatal: refusing to merge unrelated histories
```

**Príčina, overená a nie odhadnutá.** Repozitár má **tri root commity**. `main` rastie
z `43c21f4b`; vetvy #439 a #459 z úplne iného root commitu `75e75c0c`. Ich stromová
štruktúra tomu zodpovedá — nesú `apps/crm/apps/crm/tsconfig.json`, `apps/crm/build.log`
a vlastnú kópiu `.cursor/rules/`, teda celý repozitár vnorený do `apps/crm/`.

Vznikli tak, že agent v Cursore inicializoval nový repozitár namiesto toho, aby
pracoval v existujúcom. **Nie je to stav, ktorý sa opravuje mergom.** Keďže obsah
oboch je medzičasom na `main` aj tak, jediná rozumná akcia je zavrieť ich.

---

## D. Administratíva

**#475** (`chore(bus): queue ONL-MCP-001 for 26–27 Aug`) nemení ani jeden kódový
súbor — iba `memory/`. Termín, ktorý plánuje, uplynul pred mesiacom, a má tri
konflikty v memory súboroch. **Zavrieť.**

---

## E. Nález, ktorý nepatrí žiadnemu otvorenému PR

Pri čítaní `main` kvôli #443 vyšlo najavo, že
`apps/crm/src/app/api/properties/[id]/route.ts` má **tú istú triedu fail-openu ako #486**:

```ts
if (callerProfile?.agency_id && oldProperty?.agencyId && oldProperty.agencyId !== callerProfile.agency_id) {
  return errorResponse("Forbidden", 403);
}
```

Dve `&&` pred porovnaním. Profil bez `agency_id` — teda presne ten, ktorý vyrába
#447 — prejde. **Toto nekryje žiadny z dvanástich PR.** Neopravujem to v rámci tejto
brány; zaznamenávam ako otvorený nález.

---

## Odporúčané poradie

**Mergovať (v tomto poradí):** #490 → #486 → #447 → #370 → #462.
Prvé tri sú jeden príbeh: #486 zavrie dieru, #447 zastaví výrobu profilov, ktoré ňou
prechádzajú, #490 zavrie mazaciu cestu. Merge je founderov akt; tento dokument
nemerguje nič.

**Pred #490 na PROD:** naplánovať backfill `agency_id` na `lead_assignment_rules`.

**Zavrieť bez mergu:** #371, #444, #459, #439, #475.

**Vyrezať do samostatnej malej zmeny, PR zavrieť:** #495 (jeden riadok — `?? 50` → `?? 0`
a gate na `!bri`), #443 (dva riadky — scoped klient v `matching/action`).

---

## Dodatok, dopísaný v ten istý deň: čo táto triáž nezachytila

**#370 sa zmergoval a `main` po ňom nelintoval.**

Merania vyššie sú platné, ale **neúplné**. Overoval som dve veci — či chyba žije
na `main`, a či sa vetva dá zmergovať (`merge-tree`). Neoveril som **tretiu, ktorá
rozhodla**: či kód na tej vetve vôbec kompiluje.

`refs/pr/370` niesol štyri súbory, v ktorých sa stará a nová verzia prekrývali bez
konfliktných markerov. Tri z nich neparsujú, a jeden — `credits-billing.ts` —
parsuje a padá až za behu (`ReferenceError: supabase is not defined`) uprostred
Stripe top-up webhooku. Keby som na tej vetve spustil `npm run lint`, tri parsing
errors by vyšli **pred** mergom.

`merge-tree` odpovedá na otázku „zlúčia sa stromy". Neodpovedá na otázku
„je výsledok správny kód". Pri vetve staršej než pár dní to nie je to isté.

### Pravidlo, ktoré z toho platí pre zvyšné PR z tohto zoznamu

Pred mergom ktoréhokoľvek z **#490, #486, #447, #462** treba na jeho vetve spustiť
repo bránu, nie len pozrieť mergovateľnosť:

```
git fetch origin pull/<N>/head:refs/pr/<N> && git checkout refs/pr/<N>
bash scripts/ci/prepush-gate.sh
```

Zelená brána na vetve, nie zelený `merge-tree`. Oprava škody po #370 je v tom
istom PR ako tento dokument.

---

## Čo tento dokument netvrdí

- **Netvrdí, že päť „platných" PR prejde CI.** Merge-tree overil zlučiteľnosť
  stromov, nie beh testov. Každý z nich treba pred mergom nechať prejsť pipeline.
- **Netvrdí, že prekonané PR neobsahujú nič navyše.** Merané bolo, či je **opravený
  defekt** preč z `main`, nie či vetva nenesie aj niečo iné. Pri #371, #439, #444
  a #459 som obsah videl celý; pri #475 nie je čo merať.
- **Netvrdí nič o PROD dopade.** Všetky výroky sú o kóde na `main`, nie o tom, čo
  je nasadené.

# FAIL-OPEN SWEEP — kde zlyhanie znamená „povoliť"

> Read-only audit, 2026-10-05. Žiadna zmena kódu, žiadny zápis do DB.
> Dôvod: tá istá trieda chyby padla 2026-10-02 **trikrát** — `staleContacts48h` (#735),
> `pendingContact` (#804) a súhlas agentúry s auto-odpoveďou (#811). Pri treťom výskyte
> prestáva byť náhodou a stáva sa vzorom, ktorý treba hľadať cielene.

## Čo sa hľadalo

Brána, ktorej **predvolený stav pri zlyhaní je „povoliť"**. Päť vzorov:

| vzor | čo to je |
|---|---|
| A | `!== false` / `!= false` — NULL a `undefined` prejdú ako súhlas |
| B | `?? true` / `\|\| true` — chýbajúca hodnota znamená povolené |
| C | `let x = true` a až potom podmienené prepísanie — zlyhanie nechá `true` |
| D | `catch` alebo neprečítaná chyba → vráti povoľujúci default |
| E | tenant / operátorská brána, ktorá pri nerozhodnutom stave neblokuje |

Rozsah: `apps/crm/src/**` (mimo `__tests__`).

## Nálezy

### P1 — `canUseFullApp` je natvrdo `true` s komentárom „DEV OVERRIDE"

`lib/saas-ops.ts:336`

```ts
// DEV OVERRIDE: Always allow full app access for development/testing
const canUseFullApp = true;
```

`lib/feature-gating.ts:31` je jediná brána prístupu k aplikácii:

```ts
if (!snapshot.canUseFullApp) {
  throw new Error(snapshot.trialGrace.message || "Prístup k aplikácii je obmedzený.");
}
```

`requireActiveAppAccess()` teda **nemôže nikdy vyhodiť výnimku**. `getTrialGraceState()`
(`saas-ops.ts:211`) pritom stav trialu aj grace obdobia **počíta** — vracia `state: "limited"`
po vypršaní trialu bez predplatného — a nikto ten výsledok nepoužije na blokovanie.

**Vrstva je LIVE, nie mŕtva.** Prechádza ňou:

- **8 API ciest** cez `requireFeature`: `team/assign-lead`, `outreach/approve`,
  `outreach/preview`, `outreach/send`, `integrations/email/sync`,
  `integrations/calendar/sync`, `integrations/portal/import`, `scoring/recalculate`
- **7 stránok** cez `getFeatureGateState`: `team`, `forecasting`, `outreach`,
  `integrations`, `integrations/realvia`, `scoring`

Plánové príznaky (`flags[feature]`) stále fungujú, takže jednotlivé funkcie sú podľa plánu
obmedzené. Nefunguje **stav predplatného**: po vypršaní trialu aj po zrušení platby
zostáva prístup otvorený.

**Čo to stojí dnes: 0 €.** `docs/STATUS.md` hlási **0 z 10 cien na live Stripe účte** —
nikoho nie je o čo pripraviť, lebo nikto zatiaľ neplatí. **Preto to nie je incident, ale
termín:** v momente, keď krok C pôjde naživo, táto jedna premenná **mlčky zruší paywall**.
Nie je to vedľajšia úloha popri predaji — je to podmienka, aby predaj vôbec niečo vynucoval.

Oprava je jeden riadok plus test, ktorý padne, kým tam `true` je. Vyžaduje rozhodnutie
foundera o tom, **čo presne sa po vypršaní má stať** (úplné zamknutie vs. read-only
režim), preto to nerobím v rámci tohto auditu.

### P2 — zlyhané čítanie oprávnení vráti povoľujúci default

`app/api/nav/permissions/route.ts` — tri cesty vracajú `DEFAULT_TEAM_PERMISSIONS`:
chýbajúci `team_license_id` (r. 19), `perms ?? DEFAULT` (r. 37) a `catch` (r. 38).

`types/navigation.ts:65` tento default obsahuje:

```
can_see_team_pipeline:   true
can_see_shared_contacts: true
can_export_contacts:     true     <-- export kontaktov
can_see_colleague_leads: false
can_delete_leads:        false
can_edit_colleagues_tasks: false
```

Je to **čiastočný** fail-open: tri najnebezpečnejšie práva default zamieta, ale
**export kontaktov povoľuje**. A tabuľka `team_member_permissions` **v PROD neexistuje**
(vypisuje to aj `prepush-gate.sh` ako tolerovanú medzeru), takže dnes čítanie zlyháva
vždy → každý člen tímu má export kontaktov zapnutý.

Pri osobných údajoch je „nevieme, či smie" totéž ako „nesmie". Odporúčanie: `can_export_contacts: false`
v defaulte a odlíšiť „bez tímu" (legitímny default) od „čítanie zlyhalo" (zamietnuť).

### P3 — `is_active ?? true` v `auth.ts` (latentné)

`lib/auth.ts:137` — deaktivovaný profil sa prečíta ako aktívny, ak stĺpec chýba.
**Dnes nie je prístupovou bránou:** `is_active` z profilu nikde neblokuje prístup; jediné
použitie je `lib/operator/gather.ts:49`, kde `agency.is_active === false` len vyberá
onboarding nápis. Preto latentné, nie živé — ale ak sa niekto raz rozhodne deaktiváciu
vynucovať, táto hodnota mu to tichým `true` prebije.

## Čo audit NEnašiel — a je to tiež výsledok

Tieto `!== false` sú **fail-safe** a nie sú na opravu. Default v nich padá na tú
bezpečnejšiu stranu, a hodnota pochádza od volajúceho, nie z DB, ktorá môže zlyhať:

| miesto | default | prečo je to v poriadku |
|---|---|---|
| `universal-import/realvia/realvia-import.ts:201` | `dryRun` = true | bez vyžiadania nič nezapíše |
| `enrichment/engine.ts:69` | `persistAudit` = true | audit sa vypína vedome |
| `research-agent/build-dossier.ts:164` | `persist` = true | — |
| `infra/platform-heartbeat.ts:306` | `notify` = true | upozornenie sa vypína vedome |
| `leads-store.ts:1562` | `withEmailOnly` = true | užší, nie širší výber |
| `customer-health/scan.ts:67` | `is_active !== false` | len filter do reportu |

Ďalej overené ako fail-closed: `credits-billing.ts` (chyba → `return false` /
`skipped: true`, grant sa nepridelí), tenant a admin brány (`isPlatformAdmin === true`,
`metrics/access.ts:32`), `getCurrentAgencyId()` vracia pri zlyhaní `null`.

**Kredity sa dnes vôbec neodpočítavajú** — `lib/program-tier-pricing.ts:121` to hovorí
otvorene („Does not wire spendCredits(); call-site spend = Wave 7"). Kreditová brána teda
nemôže zlyhať otvorene, lebo neexistuje. To nie je čisté vysvedčenie, je to iná medzera.

## Zhrnutie

| # | brána | default pri zlyhaní | fail-open? | dopad dnes |
|---|---|---|---|---|
| P1 | prístup k aplikácii (`canUseFullApp`) | **povoliť** (natvrdo) | **áno** | 0 € (Stripe nie je live) — ale zruší paywall v deň spustenia |
| P2 | oprávnenia člena tímu | povoliť export kontaktov | **čiastočne** | export kontaktov pre každého člena tímu |
| P3 | `is_active` profilu | aktívny | áno, **latentne** | žiadny — `is_active` nie je brána |
| — | kredity, tenant, admin | zamietnuť / `null` | nie | — |

**Jedna veta, čo to mení na pláne:** fail-open nie je rozsypaný po kóde — je sústredený
v **jednej premennej na jednom riadku**, ktorá stojí presne v ceste prvému platiacemu
klientovi.

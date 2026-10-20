# P06 — DATA / EVENT CONTRACT: Strážca follow-upu (WP-5)

> Stav: NÁVRH. Cesty a riadky sú z `origin/main` @ `e9ece0f`. „PROD" stav som nečítal (CHECKS NOT RUN).
> Odkazy `súbor:riadok` sú orientačné (riadky sa môžu posunúť); overuje implementátor v P10.

## 1. Zdroje dát (podľa `docs/architecture/master-data-sourcing-map.md`)

| Zdroj | Mapa | Stav | Poznámka |
|---|---|---|---|
| `leads` (`created_at`, `status`, `source`, `assigned_*`, `agency_id`) | Zhluk 1 „vlastné CRM dáta" | MAPPED, v kóde CONNECTED | Vlastné dáta, 0 externých závislostí |
| `lead_events` typ `contact_attempted` | Zhluk 1 („timestampy kontaktu"); tabuľka v mape **nie je vymenovaná menom** | MAPPED (nepriamo), v kóde CONNECTED, **PROD NEZNÁME** | Odporúčam doplniť mapu (zmena mapy je mimo write-setu WP-5) |
| `guardian_findings` | Zhluk 1 (vlastný výstup) | v kóde CONNECTED; beh v PROD závisí od `GUARDIAN_AGENCY_ALLOWLIST` → **NEZNÁME** | Mapa tabuľku nevymenúva |
| `leads.last_contact_at`, `auto_response_sent_at` | Zhluk 1 | CONNECTED | **Nepoužiť ako „reakciu"** (§2) |
| Realvia webhooky (Zhluk 8) | MAPPED | Nesú len ponuky (`advert`, `delete`), žiadne dopyty | Importované kontakty NIE sú dopyty s časom vzniku → mimo kohorty |
| Príchodzie dopyty (e-mail brána, web formulár, webhook) | **NOT_IN_MAP** (mapa kanály príjmu dopytov nevymenúva) | CONNECTED v kóde | **OTVORENÁ NEZNÁMA U2** |
| Telefónne záznamy (ústredňa, mobil) | **NOT_IN_MAP** | žiadny zdroj | **U5** — hovor mimo CRM sa nezachytí |
| Portály, kataster, RPO, ÚPV | n/a | **Nepoužité.** Strážca nečerpá žiadny externý zdroj | Žiadny scraping, žiadne osobné údaje z katastra |

Nepripojený zdroj ⇒ stav „vypočítané z {zdroj}" alebo „NEMERANÉ", nikdy vymyslené číslo. Napríklad bez zapisovača reakcie zoznam hlási „Reakcie sa zatiaľ nezaznamenávajú" (P04 §2), nie „0 čakajúcich".

## 2. Definícia „reakcie" (rozhodnutie čaká na foundera — README)

**Návrh definície:** prvá ľudská reakcia = prvý riadok `lead_events` s `type='contact_attempted'`, `actor_profile_id IS NOT NULL`, `source IN ('manual','system-assisted')`, `occurred_at IS NOT NULL`. Je to **pokus o kontakt**, nie dôkaz, že klient odpovedal (výsledok `outcome` je voliteľný a UI ho neposiela, podľa `contact-attempt/route.ts`).

| Signál | Počíta sa? | Prečo |
|---|---|---|
| `contact_attempted` z tlačidiel Volať/E-mail (detail leadu) | **ÁNO** | Ľudský klik, serverový čas, `store.ts` |
| `contact_attempted` z odoslania schváleného návrhu (`source='system-assisted'`) | **ÁNO, ale dnes sa NEZAPISUJE** | `approve-draft.ts:235` stampuje len `last_contact_at`; zápis eventu je položka implementácie |
| Klik Volať/Napísať v Action Queue | **ÁNO, ale dnes sa NEZAPISUJE ako event** | `DashboardPageClient.tsx:148` robí PATCH `status="Teplý"` + aktivita „Kontakt"; nejde do `lead_events` |
| `leads.last_contact_at` | **NIE** | Zapisuje ho aj auto-potvrdenie pri vzniku leadu (`inbound-lead-auto-response.ts:~248`); je monotónne „posledný", nie „prvý" |
| `auto_response_sent_at`, šablónové potvrdenie | **NIE** | Systém, nie človek |
| Vytvorený AI návrh (follow-up sweep, auto-reply draft) | **NIE** | Neodišiel; „nie je kontakt" (`mark-contacted.ts`) |
| Zmena `status`, `updated_at`, AI skóre | **NIE** | Nie sú kontakt (príčina R2) |
| `email_open`, `click` | **NIE** | Správanie klienta, nie reakcia kancelárie |
| Hovor z mobilu / WhatsApp mimo CRM | **NEZACHYTÁVA SA** | Žiadny zdroj (U5). Dôsledok: zoznam môže ukázať lead, ktorému sa už volalo (§3 P02) |
| `broker_events.message_responded` | **NIE** | Žiadny zapisovač v `src` |

Krížová kontrola pokrytia (iba diagnostika merania, nie vstup strážcu): `last_contact_at > auto_response_sent_at` (alebo `auto_response_sent_at IS NULL ∧ last_contact_at IS NOT NULL`) znamená, že existuje ľudsky schválené odoslanie. Predpokladá, že jediní zapisovači sú dvaja (auto-potvrdenie a `markLeadContacted`), čo hlavička `mark-contacted.ts` tvrdí; implementátor to znovu overí grepom.

## 3. Tabuľka eventov

Stĺpce: TRIGGER · EVENT · WRITER (kód:riadok, kto volá) · READER · STATE TRANSITION · IDEMPOTENCY · RECOVERY · AUDIT. Stav implementácie: **IMPL** = je v kóde, **NAVRH** = chýba.

| # | TRIGGER | EVENT | WRITER | READER | STATE TRANSITION | IDEMPOTENCY | RECOVERY | AUDIT | Stav |
|---|---|---|---|---|---|---|---|---|---|
| E1 | Maklér klikne Volať/E-mail na detaile leadu | `lead_events` `contact_attempted` (channel, `occurred_at` serverový čas, `actor_profile_id`, `source='manual'`) | `src/lib/lead-contact-events/store.ts:~107` (`recordContactAttempt`) ← `src/app/api/leads/[id]/contact-attempt/route.ts:75` ← `src/app/(dashboard)/leads/[id]/page.tsx:~260` (`keepalive` fetch) | `getFirstContactAttemptAt` (`store.ts:~143`), `resolveFirstContactAttempt`; nový: strážca | append-only; lead: `none → known` (alebo `unknown` ak chýba čas) | **Žiadna** (dvojklik = 2 riadky); neškodí, lebo sa berie `min(occurred_at)` | Zlyhanie fetchu zobrazí toast „Pokus o kontakt sa nezaznamenal"; automatický retry neexistuje | samotný riadok (aktér, čas) + `logEventDetailed` v route | IMPL; **PROD NEZNÁME** |
| E2 | Maklér schváli a odošle AI návrh (transport ok) | `contact_attempted` `source='system-assisted'`, `channel='email'`, `outcome='sent'` | **NAVRH:** pridať vedľa `markLeadContacted` v `src/lib/inbound/approve-draft.ts:~235`, len pri `result.ok` | ako E1 | ako E1 | Odoslanie je už jednorazové cez `claimedMeta` v approve ceste; riadok viazať na `message_id` v `note`. Unikátny kľúč: **OPEN** (nevytvárať stĺpec bez dôvodu) | fail-soft ako `markLeadContacted` (správa už odišla) | ako E1 + `ai_action_audit` | NAVRH |
| E3 | Klik Volať/Napísať v Action Queue | `contact_attempted` (rovnaký E1) | **NAVRH:** presmerovať/doplniť `DashboardPageClient.tsx:148` na `/contact-attempt`; PATCH `status="Teplý"` je legacy | ako E1 | ako E1 | ako E1 | ako E1 | ako E1 | NAVRH |
| E4 | Denný beh strážcu | `guardian_findings` riadok, `rule_code=NO_FIRST_RESPONSE` (návrh), `meta {threshold_hours, age_hours, params_version, t0}` | `src/lib/guardian/runner.ts:65` (`insertFinding`), volané z `runGuardianForAgency:~111` | CRM zoznam/ranný brief (nový, prihlásený kontext); `loadOpenFindingCounts` (len počty) | `∅ → open` | `guardian_open_unique (agency_id, lead_id, rule_code) WHERE resolved_at IS NULL`; duplicitný insert = `23505` ignorovaný (`runner.ts:~70`) | Pri páde behu ďalší beh vyhodnotí znova; deterministické | `detected_at`, `meta`, `routine_notifications` súhrn (`runner.ts` guardian_runner) | NAVRH (vyžaduje migráciu `rule_code CHECK`, Tier 3) |
| E5 | Ďalší beh vidí reakciu / terminálny status / pravidlo už neplatí | `guardian_findings.resolved_at` | `src/lib/guardian/runner.ts:~147/156/166` (existujúci auto-resolve) | UI zoznam | `open → resolved` | `UPDATE … SET resolved_at` opakovaný je neškodný | ako E4 | `resolved_at` | IMPL (rozšíriť o nový kód) |
| E6 | Koniec behu | `routine_notifications` `guardian_runner` (počty podľa pravidla) | `runner.ts` | brief/founder | — | nový riadok na beh | — | samotný riadok | IMPL |
| E7 | Pokus o odoslanie správy zo strážcu | **ŽIADNY EVENT. ZAKÁZANÉ** | nikto | nikto | — | — | — | Akcia bez záznamu = FORBIDDEN | — |

**Pozn.:** `guardian-digest` zostáva nezmenený (počty, žiadne PII, `assertDigestNoPii`). Nový kód pravidla by sa objavil aj v digeste ako počet, takže `DigestCounts` a `emptyCounts` treba rozšíriť (položka implementácie, inak pravidlo v digeste ticho chýba).

## 4. Parameter X, pracovné hodiny, kohorta

- **X (`FIRST_RESPONSE_AFTER_HOURS`)** — OPEN QUESTION foundera (návrh 4 h, PREDPOKLAD z briefu §2.2). **Žiadna zabudovaná predvolená hodnota**: nenastavený ⇒ pravidlo nežiari a hlási `NEKONFIGUROVANÉ`. Miesto: konštanta/env (vzor `GUARDIAN_THRESHOLDS`, `FOLLOWUP_STALE_DAYS`); stĺpec per agentúra sa nezavádza (n = 1, Tier 3 migrácia by nebola oprávnená).
- **Pracovné vs kalendárne hodiny** — NEZNÁME (U1). Ak kalendárne: dopyt o 20:00 je ráno „čaká 10 h". Ak pracovné: treba kalendár (svátky SK) a časové pásmo `Europe/Bratislava`. Rozhodnutie foundera.
- **Kohorta:** `created_at ≥ T0`, otvorený stav (`OPEN_PIPELINE_STATUSES` z `active-leads.ts`), zdroj v allowliste (U3), `agency_id` = kancelária. Importované/historické leady sa vylúčia cutoffom T0.
- **Čas príchodu:** `leads.created_at` je čas vzniku riadku, nie čas pôvodného dopytu klienta (oneskorenie pull/spracovania je NEZNÁME, U4). Čakanie je teda podhodnotené o toto oneskorenie.
- **Určený čas:** vstup `now` sa predáva zvonka (testovateľné, deterministické).

## 5. Kto smie čítať/zapisovať (RLS, tenant)

- `lead_events`: agency-scoped RLS, ale existujúca politika povoľuje `agency_id IS NULL` (nález z `decisions.md` ~r. 5602, mimo rozsahu). Zápis E1 má aplikačnú kontrolu agentúry (`store.ts`). Strážca číta len cez `agency_id` filter.
- `guardian_findings`: politika `guardian_findings_tenant` cez `profile_agencies_for_auth()`; service role pre runner.
- Zoznam s menami/telefónmi len v prihlásenom kontexte; **nie v e-maile ani v logoch** (`assertDigestNoPii` je vzor).

## 6. GDPR brána

**Skill `gdpr-advisor` v repe NEEXISTUJE** (`.claude/skills/` obsahuje `kontrolor`, `rau`, `strategic-analysis`, `task-loop`; AP-024). Pravidlo 5 z `CLAUDE.md` sa preto nedá splniť tak, ako je napísané. Rozbor nižšie je **ručný, nie nezávislý**, a nenahrádza právnika.

- **Dáta:** vlastné dáta leadov kancelárie (osoby, ktoré samy kontaktovali kanceláriu) + časy a aktéri reakcií maklérov (zamestnanci/spolupracovníci). Žiadny externý zdroj, žiadne dáta z katastra, žiadny scraping.
- **Právny základ:** čl. 6(1)(f), oprávnený záujem kancelárie odpovedať na dopyt. Pre záujemcov môže byť primerané aj čl. 6(1)(b) (kroky na žiadosť dotknutej osoby pred zmluvou). Voľba a presná formulácia: OPEN pre právnika.
- **Balancing test (zhrnutie):**
  - Účel: včas odpovedať na dopyt, ktorý osoba sama poslala.
  - Nevyhnutnosť: stačia `lead_id`, `created_at`, čas a aktér reakcie. Nová kategória údajov nevzniká; text správy sa nespracúva.
  - Dopad na osobu: nízky. Očakáva odpoveď. Strážca nikomu nepíše.
  - Záruky: tenant RLS, bez PII v e-mailoch, bez LLM (žiadne údaje k modelu), len zoznam na obrazovke prihláseného makléra.
  - **Slabé miesto:** časy reakcií sú de facto monitoring práce makléra. To je samostatný právny rozmer (zamestnanecké dáta, transparentnosť voči maklérom). Per-maklér rebríčky sú mimo rozsahu. Posúdenie: OPEN, vyžaduje právnika (U7).
- **Retencia:** `guardian_findings` nemá definovanú retenciu a mazací cron pre príbuznú tabuľku `inbound_mail_outcomes` nebeží (`docs/STATUS.md`). Retencia: OPEN (U6).
- **Informačná povinnosť:** údaje pochádzajú od dotknutej osoby (čl. 13); či ich oznámenie o spracúvaní kancelárie zahŕňa tento účel, NEZNÁME.

## 7. PII do LLM

Strážca LLM nepoužíva ⇒ k modelu nejde nič. Ak by sa neskôr pridal LLM krok (nie je navrhnutý), platí redakcia pred volaním (`apps/crm/src/lib/ai/sanitize.ts`, oprava P0 v #750) a P08 sa mení na novú verziu.

## 8. Zoznam OTVORENÝCH NEZNÁMYCH

| ID | Neznáma | Kto/ako zistí |
|---|---|---|
| U1 | Hodnota X a „pracovné vs kalendárne hodiny" | Founder (+ rozhovor s kanceláriou) |
| U2 | Kanály príjmu dopytov nie sú v sourcing mape | Doplniť do mapy (mimo WP-5) |
| U3 | Allowlist `leads.source` = „skutočný dopyt" (voľný text, 14 hodnôt) | Read-only dotaz `SELECT source, count(*)` + rozhodnutie foundera |
| U4 | Oneskorenie `created_at` oproti reálnemu času dopytu | Porovnať s hlavičkou `Date` pôvodného e-mailu na vzorke |
| U5 | Zdroj pre hovory mimo CRM | Rozhovor; telefónna ústredňa? (bez zdroja zostane nezachytené) |
| U6 | Retencia `guardian_findings`/`lead_events` | Founder + právnik |
| U7 | Zamestnanecký rozmer monitoringu reakcií | Právnik |
| U8 | Stav substrátu `20260924060000` a Guardiana (`GUARDIAN_AGENCY_ALLOWLIST`) v PROD | Founder/read-only overenie (Fáza 0) |
| U9 | Počet skutočných dopytov za týždeň (N) | Rozhovor + `leads` po T0 |

## 9. Stav zdrojov — zhrnutie

- NOT_IN_MAP: príchodzie kanály dopytov, telefónne záznamy.
- MAPPED: `leads`, `lead_events` (nepriamo), `guardian_findings` (nepriamo).
- CONNECTED (v kóde; PROD NEZNÁME): `lead_events.contact_attempted` (len zapisovač E1), `guardian_findings`.

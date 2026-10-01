# A3 — zvyškové riziká verejného `/api/onboarding/session`

**Dátum:** 2026-09-17
**Rozhodnutie:** `DEC-20260917-005` (nahrádza `DEC-20260917-003`)
**Stav:** FINDING — **nič z toho nie je opravené**, obe položky čakajú na founderovo rozhodnutie.

Po #574 je endpoint verejný a chráni ho neuhádnuteľnosť `session_id`.
Vzor je v poriadku. Má však dve slabiny, ktoré sa neprejavia v testoch,
lebo nie sú o logike kódu — sú o tom, kadiaľ token cestuje a ako dlho žije.

---

## RIZIKO 1 — `session_id` cestuje v query stringu

```
GET /api/onboarding/session?session_id=8f1e6a2c-…
```
`src/lib/onboarding/session-api.ts:32`

Pri capability-URL vzore je token **jediná** ochrana. Query string je zároveň
tá časť requestu, ktorá sa zapisuje na najviac miest:

| kam sa dostane | dôsledok |
|---|---|
| access logy servera a reverse proxy | token v logu = prístup k osobným údajom pre každého, kto číta logy |
| história prehliadača | zdieľaný počítač |
| `Referer` hlavička | ak onboarding stránka načíta **akýkoľvek** externý zdroj (font, analytics, pixel), token odíde tretej strane |
| zdieľaný odkaz | používateľ pošle URL kolegovi a pošle s ňou aj prístup |

`form_data` obsahuje `name`, `phone`, `linkedin`, `bio`
(`src/app/onboarding/OnboardingClient.tsx:86,325,329,334`) — teda osobné údaje
v zmysle GDPR, nie technické metadáta.

**Návrh opravy (neaplikovaný):** presunúť `session_id` z query stringu do
hlavičky (napr. `X-Onboarding-Session`) alebo do tela POST requestu.
Zmena sa dotkne `session-api.ts` a route handlera; je to zmena kontraktu API,
preto ju nerobím bez GO.

**Rýchla čiastočná mitigácia:** overiť, že onboarding stránka nenačítava
externé zdroje, a nastaviť `Referrer-Policy: no-referrer` pre tú cestu.
To zavrie najhorší z kanálov vyššie bez zmeny API.

---

## RIZIKO 2 — token nemá expiráciu

```sql
select session_id, step, form_data, updated_at
  where session_id = $1
```
`src/app/api/onboarding/session/route.ts:64-65`

V dopyte **nie je žiadna podmienka na vek záznamu**. `updated_at` sa číta,
ale nepoužíva sa na odmietnutie starej session.

Dôsledok: `session_id` vygenerovaný dnes otvára tie isté osobné údaje aj
o rok. Capability, ktorá nikdy nevyprší, sa nedá odvolať — ak token unikne
ktorýmkoľvek kanálom z rizika 1, niet čím to zavrieť.

**Návrh opravy (neaplikovaný):** doplniť do dopytu hranicu veku
(napr. `updated_at > now() - interval '30 days'`) a vracať `404` po jej
prekročení. Čistejšie riešenie je stĺpec `expires_at` s indexom a
periodické mazanie — to je **migrácia**, teda samostatné rozhodnutie.

---

## Čo NIE JE riziko

Aby zoznam nebol dlhší, než si zaslúži:

- **Uhádnutie `session_id`** — `uuidv4`, 122 bitov entropie. Nie je to riziko.
- **Enumerácia** — route nemá list/bulk variant (`route.ts:85` to hovorí
  explicitne) a rate limit beží na IP pre GET aj POST.
- **Otvorenie sesterských ciest** — `PUBLIC_PATHS.has(pathname)` je presná
  zhoda, nie prefix; zamknuté tromi testami v
  `proxy-onboarding-session-gate.test.ts`.

---

## Ďalší krok

**GO REQUIRED** na ktorúkoľvek z troch možností:

1. **Len `Referrer-Policy`** — najlacnejšie, zavrie únik cez tretie strany,
   nemení API. Odhad: jeden súbor.
2. **Presun tokenu z query stringu** — rieši riziko 1 poriadne, mení kontrakt
   API a dotkne sa frontendu.
3. **Expirácia** — rieši riziko 2. Bez migrácie sa dá urobiť podmienkou na
   `updated_at`; so stĺpcom `expires_at` je to migrácia a samostatné rozhodnutie.

Odporúčam **1 + 3 bez migrácie** ako prvý krok: spolu je to malá zmena,
ktorá zavrie najhorší únikový kanál aj neobmedzenú životnosť tokenu.

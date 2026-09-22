# Gate C-0 — remote execution evidence. Výsledok: BLOCKED.

**Zadanie:** spustiť runbook `bus:serve → store: github → cloudflared →
bus:handshake --url <live-tunnel>` a doložiť `MODE: remote` plus dôkaz na
`bus/main`. Neopravovať handshake, ak zlyhá.

**Výsledok:**

```
C-0 = BLOCKED / NOT ATTEMPTED
```

Nie `FAIL` — remote vetva nebola spustená a teda ani nezlyhala. Rozlíšenie je
podstatné: `FAIL` by znamenalo, že transport nefunguje. Tu sa beh nedal ani začať.

Žiadny súbor v `packages/bus-core`, `scripts/bus`, ani v Gate A/B sa nemenil.
Tento dokument je jediný výstup.

---

## 1. Prečo BLOCKED — tri chýbajúce predpoklady

| Krok runbooku | Stav v tomto kontajneri |
|---|---|
| 3. `cloudflared tunnel --url http://localhost:8787` | `cloudflared` nie je nainštalovaný. Stiahnutie binárky zamietnuté policy prostredia. |
| 0. `store: github` | `REVOLIS_BUS_GITHUB_TOKEN` nie je v prostredí — a podľa tvojho pravidla mi PAT poslať nemáš. |
| — | Odchádzajúce HTTPS zo shellu je zamietnuté (`curl https://api.github.com/rate_limit` → denied). GitHub Contents API teda nie je dosiahnuteľné ani keby token bol. |

Tunel z efemérneho cloud kontajnera by aj tak nebol to, čo C-0 potrebuje: zomrie
s kontajnerom a Custom GPT Action by na neho nedosiahla.

---

## 2. Kritérium `MODE: remote` je falšovateľné. Doložené.

Toto je hlavné zistenie a mení zadanie C-0.

`scripts/bus/handshake.ts` rozhoduje o `MODE` jedinou vecou — či je prítomný
flag `--url`:

```ts
const urlFlag = process.argv.indexOf("--url");
const remoteUrl = urlFlag === -1 ? undefined : process.argv[urlFlag + 1];
```

Nič viac. Nie hostname, nie TLS, nie to, či je endpoint mimo localhostu.

**Kontrapríklad, skutočne spustený (nie úvaha):** server na loopbacku, temp
adresár, `FileBusStore`, zdieľaný token, žiadny tunel, žiadny GitHub:

```
revolis-bus listening on :8799 (store: filesystem)
AUTH MODE: DEGRADED — single shared credential, no caller identity
/health -> { "auth_mode": "shared", "from_binding": false, "outbox_provenance": "unverified" }

$ node scripts/bus/handshake.ts --url http://127.0.0.1:8799
MODE: remote (live endpoint — the same calls a ChatGPT Action makes)
ENDPOINT: http://127.0.0.1:8799 reachable (health 200)
AUTH: anonymous 401, wrong token 401, valid token 200
BUS-001 PASS  transport: sol-gpt -> BUS -> claude-code
BUS-002 PASS  return path: claude-code -> BUS -> sol-gpt
BUS-003 PASS  gate: GO REQUIRED survives ack; no execute/approve/merge route exists

HANDSHAKE: PASS
COPY_PASTE_REQUIRED: no — every hop went over the bus
```

Správy skončili na `<temproot>/inbox/` a `<temproot>/outbox/` — na lokálnom
disku, v adresári, ktorý po behu zanikol.

Riadok `COPY_PASTE_REQUIRED: no — every hop went over the bus` je pritom
nepravdivý práve v tomto režime: founder zostáva poštárom, lebo správy nikam
neodišli.

**Dôsledok:** `MODE: remote` + `PASS 4/4` nesmie byť akceptačné kritérium C-0.
Vyrobí sa jedným príkazom bez tunela a bez GitHubu.

---

## 3. Handshake môže prejsť **iba** v degradovanom režime

Runbook v kroku 1 predpisuje per-agent tokeny, v kroku 4 spúšťa handshake.
Tá dvojica nemôže prejsť. Harness používa pre obe identity jeden
`REVOLIS_BUS_TOKEN`, ale server po #612 viaže `envelope.from` na bearer.

Spustené proti serveru s `auth_mode: per-agent`, `from_binding: true`:

```
token = REVOLIS_BUS_TOKEN_SOL     -> BUS-001 PASS, potom
                                     HANDSHAKE: FAIL — POST result returned 403
                                     (posiela from: claude-code pod sol-gpt identitou)

token = REVOLIS_BUS_TOKEN_CLAUDE  -> HANDSHAKE: FAIL — POST task returned 403
                                     (posiela from: sol-gpt pod claude-code identitou)
```

To je korektné správanie autorizačnej hranice — bráni presne tomu, čomu má.
Ale znamená to:

> Jediná konfigurácia, v ktorej sa dá vyrobiť artefakt `HANDSHAKE: PASS` cez
> `--url`, je tá, v ktorej je autorizačná hranica vypnutá.

C-0 v zadanom tvare bolo teda nesplniteľné aj na tvojom stroji, s tunelom aj
s PAT-om — pokiaľ by sa nespustilo v degradovanom režime, čím by sa poprelo
Gate A/B. Handshake som **neopravoval**, bolo to mimo rozsahu tohto GO. Hlásil.

> **Dodatok (overené po napísaní tohto reportu):** paralelná session to medzitým
> opravila — **#626 (`fb2280d5`)** je na `main` a handshake už berie
> `REVOLIS_BUS_TOKEN_SOL` aj `REVOLIS_BUS_TOKEN_CLAUDE` a posiela každú správu
> pod vlastnou identitou. Tento odsek preto popisuje stav **pred** #626.
> **§2 tým dotknuté nie je** — `MODE: remote` stále rozhoduje iba flag `--url`,
> overené na `main` po #626. Táto kolízia je sama o sebe dôkaz, prečo dve session
> nemajú pracovať nad tým istým súborom bez toho, aby o sebe vedeli.

---

## 4. Nič v remote ceste nepozoruje backend skladu

V remote režime je `ctx.store` v harnesse `undefined` — všetky kontroly idú cez
HTTP. `GET /health` vracia `auth_mode`, `from_binding`, `outbox_provenance`, ale
**žiadne pole o sklade**. Riadok `store: github` ide len na stdout servera, teda
na tvoj stroj — nie je súčasťou dôkazu.

Preto žiadny HTTP volajúci, vrátane handshake harnessu, nevie odlíšiť
`FileBusStore` od `GitHubBusStore`. A presne tento rozdiel rozhoduje o tom, či
founder prestal byť poštárom. Tvoja námietka bola správna; dôvod je silnejší,
než znel — nejde o to, že handshake *môže* prejsť lokálne, ale o to, že
v remote ceste **neexistuje žiadne tvrdenie o sklade**.

---

## 5. GitHubBusStore proti reálnemu API už raz bežal — a ten dôkaz expiroval

Runbook tvrdí, že `GitHubBusStore` „nikdy nebežal proti reálnemu GitHub API".
To je neaktuálne. Na `bus/main` sú commity:

```
0a2cbb6 revolis-bus <bus@revolis.local> 2026-09-18 bus(outbox): MSG-20260918-001-...
231221a revolis-bus <bus@revolis.local> 2026-09-18 bus(move): remove MSG-... from inbox
9deae81 revolis-bus <bus@revolis.local> 2026-09-18 bus(move): MSG-... inbox -> outbox
a1f5f28 revolis-bus <bus@revolis.local> 2026-09-18 bus(inbox): MSG-20260918-001-...
```

Identita `revolis-bus <bus@revolis.local>` je v kóde nastavená **iba** na github
vetve `storeFromEnv()`. Formát správ sedí so šablónami v `github-store.ts`
(`bus(${box}): ${envelope.id}`). Správa nesie
`task_id: TASK-20260918-002-bus-live-test-...`. Na GitHub API je `a1f5f28`
author == committer == `revolis-bus`, `2026-09-18T20:22:47Z`.

Bol to teda reálny beh github backendu. **Ale pre dnešok je nepoužiteľný:**

| | |
|---|---|
| `bus(move): remove ... from inbox` | Táto commit správa v dnešnom kóde **neexistuje**. Move bol prepísaný na jeden atomický Trees commit v #611 (2026-09-21). |
| autorizačná hranica | prepísaná v #601 a #612 (2026-09-21) — vtedy bežal zdieľaný token |

Dôkaz pokrýva kód, ktorý už nie je v repozitári. Presne P12: *evidence has
commit & expiry.*

---

## 6. Čo by bolo nefalšovateľným dôkazom C-0

Nie `MODE: remote`. Artefakt, ktorý nevie vzniknúť lokálne:

1. Commit na `bus/main` od `revolis-bus <bus@revolis.local>`, ktorého `envelope.id`
   sa zhoduje s ID vypísaným handshakeom, s timestampom v okne behu, nad
   `github-store.ts` @ `0341c45` alebo novším.
2. Hostname tunela v prístupovej ceste servera pre tie isté ID.
3. Server stdout `store: github` **spolu s** `AUTH MODE: per-agent`.

Bod 3 je v rozpore s bodom 1–2, pokiaľ správy posiela súčasný harness (§3).
Znamená to, že C-0 potrebuje buď zdroj, ktorý posiela pod vlastnou identitou
každej strany, alebo vedomé rozhodnutie, že C-0 sa meria v degradovanom režime
a Gate A/B sa preň dočasne neuplatní.

**Toto rozhodnutie je tvoje. Nerobím ho a nepokračujem na C-1.**

---

## 7. Čo tento dokument nerobí

- Nemení BUS implementáciu, Gate A/B, ani C-1/C-2/C-3.
- Neodomyká ani neblokuje C-1 — len hlási, že C-0 nie je preukázané.
- Neopravuje handshake harness, hoci §3 popisuje konkrétnu nezrovnalosť.
- Nemieša sa do PR #626 ani do jeho Vercel/CI stavu. Sú to paralelné udalosti.

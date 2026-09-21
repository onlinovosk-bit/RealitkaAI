# BUS handshake runbook — prvý dogfood ChatGPT ↔ Claude

**Cieľ:** jedna otázka — *dokáže ChatGPT → BUS → Claude → BUS → ChatGPT fungovať
bez foundera ako poštára?*
**Status transportu:** Cloudflare Tunnel = **validačná infraštruktúra**, nie produkčná
architektúra BUS (founder D1, 2026-09-18).
**Rozsah:** handshake a nič viac. Žiadne CRM/DB zmeny, žiadny orchestrátor, MCP,
cost governor, žiadna migrácia pre-v1 správ.

---

## 0. Kritické rozhodnutie PRED tunelom: ktorý backend

`bus:serve` má dva sklady a **tento výber rozhoduje, či founder zostane poštárom.**

| Backend | Kde správa skončí | Vidí ju Claude Code? |
|---|---|---|
| **file** (default) | `.ai/bus/` v tvojom lokálnom checkoute | **Nie** — kým to sám nescommituješ a nepushneš. Si opäť poštár, len s viac krokmi. |
| **github** | commit do repa cez Contents API | **Áno** — Claude si vetvu fetchne. Slučka je zavretá. |

**Pre dogfood použi github backend.** File backend použi len na overenie, že server
vôbec beží.

> ⚠️ Nezamlčím riziko: `GitHubBusStore` je pokrytý unit testami proti fake fetchu,
> ale **nikdy nebežal proti reálnemu GitHub API**. Pokus o živé overenie z tejto
> session skončil `401` a príčinu (token vs. kód) sa mi nepodarilo doložiť —
> token v cloud kontajneri nie je GitHub API credential. Prvý reálny beh je teda
> zároveň prvým testom tejto cesty. Ak zlyhá, zlyhá hlasno (`GitHub write failed (4xx)`),
> nie potichu.

---

## 1. Tokeny (mimo repa, mimo chatu)

Dva secrety, jeden na agenta. Bearer sa na serveri rozlúšti na identitu, identita
určuje zapisovateľné boxy a `envelope.from` musí sedieť s ňou — inak 403.

```bash
openssl rand -hex 32                          # pre ChatGPT
export REVOLIS_BUS_TOKEN_SOL='<hodnota 1>'
openssl rand -hex 32                          # pre exekučného agenta
export REVOLIS_BUS_TOKEN_CLAUDE='<hodnota 2>'
```

| | `sol-gpt` | `claude-code` |
|---|---|---|
| POST `inbox`/`tasks`/`context`/`decisions` | ✅ | ✅ |
| POST `outbox` | ❌ | ✅ |
| ack do `outbox` | ❌ | ✅ |
| `state` | ❌ | ❌ |

**Degradovaný režim.** Ak nie je nastavený ani jeden z dvoch, server berie starý
`REVOLIS_BUS_TOKEN` a na štarte vypíše
`AUTH MODE: DEGRADED — single shared credential, no caller identity`.
Beží ďalej, ale `from` sa neviaže na nikoho a `GET /health` to prizná:

```json
{ "auth_mode": "shared", "from_binding": false, "outbox_provenance": "unverified" }
```

Po prechode na dva secrety starý zdieľaný token **rotuj preč** — pozná ho obe
strany, takže nesmie prežiť ako credential ani jednej z nich.

Odobratie credentialu = revokácia; prejaví sa až reštartom servera. Živý
revocation list neexistuje.

```bash
openssl rand -hex 32
export REVOLIS_BUS_TOKEN='<vygenerovaná hodnota>'   # iba degradovaný režim
```

Pre github backend ešte fine-grained PAT s `Contents: Read and write` na
`onlinovosk-bit/RealitkaAI`:

```bash
export REVOLIS_BUS_GITHUB_TOKEN='<PAT>'
export REVOLIS_BUS_REPO='onlinovosk-bit/RealitkaAI'
export REVOLIS_BUS_BRANCH='bus/main'      # vyhradená vetva, main sa nedotýka
```

Vetvu vytvor raz: `git push origin main:refs/heads/bus/main`

Token nepatrí: do repa, do `.md`, do OpenAPI YAML, do GitHub issue/PR, do promptu
pre Clauda, ani do BUS správy. OpenAPI popisuje **mechanizmus** autentifikácie,
nikdy tajomstvo. Nepoužívaj ho ani ako CLI flag — flagy končia v histórii shellu
a v zozname procesov.

## 2. Server

```bash
npm run bus:serve          # bez REVOLIS_BUS_TOKEN odmietne naštartovať
# -> revolis-bus listening on :8787 (store: github)
```

Riadok `store:` musí sedieť s tým, čo si zvolil v kroku 0. Nad ním musí byť
`AUTH MODE: per-agent (sol-gpt, claude-code)`. Ak tam je `DEGRADED`, server beží
na zdieľanom tokene a hranica medzi agentmi neplatí — over krok 1.

## 3. Tunel

```bash
cloudflared tunnel --url http://localhost:8787
# -> https://<náhodné>.trycloudflare.com
```

Quick tunnel je efemérny: po reštarte má inú URL a Custom GPT Action treba
prepísať. Pre dogfood to stačí — na to je.

## 4. Overenie round-tripu (pred tým, než sa dotkneš ChatGPT)

```bash
npm run bus:handshake -- --url https://<tunel>.trycloudflare.com
```

Spustí tie isté tri testy, aké robí harness lokálne, ale cez živý endpoint —
presne tie volania, aké pošle ChatGPT Action:

- **BUS-001** transport: `sol-gpt → BUS → claude-code`
- **BUS-002** return path: `claude-code → BUS → sol-gpt`
- **BUS-003** gate: `GO REQUIRED` prežije `ack`; neexistuje žiadna
  approve/execute/merge route

Token si berie z `REVOLIS_BUS_TOKEN` v prostredí. Ak tento krok neprejde,
**nepokračuj na ChatGPT** — chyba je v transporte, nie v Actione.

## 5. ChatGPT Custom GPT Action

1. Create a GPT → Configure → Actions → Import from file
2. Nahraj `docs/prompts/revolis-bus-openapi.yaml`
3. V `servers[0].url` prepíš placeholder na svoju tunel URL
4. Authentication → API Key → Auth Type **Bearer** → vlož `REVOLIS_BUS_TOKEN_SOL`
   (tu, do ChatGPT konfigurácie — nie do repa). Nikdy nie `*_TOKEN_CLAUDE`: ten
   patrí exekučnému agentovi a otvára `outbox`.

## 6. Handshake — jediná správa

Nech ChatGPT zavolá `postBusMessage` s `box=inbox` a týmto telom:

```json
{
  "type": "task",
  "status": "open",
  "from": "sol-gpt",
  "to": "claude-code",
  "task_id": "TASK-BUS-HANDSHAKE-001",
  "mode": "READ_ONLY",
  "stop_after_report": true,
  "summary": "Potvrď, že dokážeš prijať túto správu cez Revolis BUS",
  "next_action": {
    "gate": "AUTO-SAFE",
    "description": "Odpovedz result správou s received=true"
  },
  "body": "Nevykonávaj žiadne zmeny v repozitári. Vráť: received, bus_message_id, current_main_commit, timestamp, response_message_id."
}
```

Claude Code potom v ďalšej session:

```bash
git fetch origin bus/main && git checkout bus/main
npm run bus -- pull --box inbox --to claude-code
npm run bus -- send --box outbox --file odpoved.md
git push origin bus/main
```

a ChatGPT si výsledok vytiahne cez `listBusMessages` s `format=digest`.

> Pozn.: pokiaľ Claude beží v efemérnom cloud kontajneri, aj on potrebuje
> `bus/main` fetchnúť a pushnúť. To je git, nie founder — slučka zostáva zavretá.

## 7. Čo musí byť v reporte

- endpoint status (health + `store:` riadok)
- authentication status (anonymný 401, zlý token 401, platný 200)
- message ID oboch smerov
- request/response evidence
- **či bolo potrebné čokoľvek kopírovať**
- zostávajúce blockery

## 8. Známe režimy zlyhania

| Príznak | Príčina | Riešenie |
|---|---|---|
| `REVOLIS_BUS_TOKEN is required` | token nie je v prostredí | krok 1 |
| `401` z handshake harness | iný token v serveri než v klientovi | jeden shell, jeden export |
| `GitHub write failed (401/403)` | PAT bez `Contents: write` alebo zlý repo | krok 1 |
| `GitHub write failed (404)` | `REVOLIS_BUS_BRANCH` neexistuje | `git push origin main:refs/heads/bus/main` |
| `413 payload_too_large` | do správy sa lepí log | odkáž na súbor v repe |
| `403 box_not_writable` | zápis do boxu, ktorý táto identita nesmie | odpoveď vypíše `writable` pre daný credential |
| `403 from_not_authorized` | `envelope.from` nesedí s agentom credentialu | posielaj pod vlastnou identitou, nie cudzou |
| `403 ack_target_not_writable` | ack do `outbox` neexekučnou identitou | `outbox` píše len exekučný agent |
| `two credentials share a secret` | oba exporty majú rovnakú hodnotu | vygeneruj dva rôzne secrety (krok 1) |
| `from_binding: false` na `/health` | beží degradovaný režim | nastav oba `*_TOKEN_SOL` / `*_TOKEN_CLAUDE` |
| správa je na serveri, Claude ju nevidí | beží **file** backend | krok 0 |

## 9. Po handshake

**STOP.** Rozšírenie BUS (MCP → cost governor → orchestrator) je samostatný
founder GO. Handshake dokazuje transport a gate, nič viac.

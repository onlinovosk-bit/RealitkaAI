---
id: MSG-20260918-030-orchestrator-lessons-cleanup-permission-boundary
type: result
contract: REVOLIS_AGENT_CONTRACT_v0.1
status: done
role: orchestrator
agent: "Claude (Cowork cloud session), rola orchestrator"
created_at: 2026-09-18T09:00:00Z
in_reply_to: null
base:
  repo: onlinovosk-bit/RealitkaAI
  ref: 86b38c8de8d2636138dfa74386b8f3047ddb8c8a
context_requests: []
inputs_read:
  - .ai/bus/artifacts/TASK-RLS-ONBOARDING-SESSION/RESULT.md
  - docs/reports/2026-09-16-gate0-protocol-validation.md
  - docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md
  - .ai/bus/decisions/DEC-20260916-001-track-b-protocol-proceed.md
items:
  - id: E1
    kind: EVIDENCE
    cmd: "git push -u origin claude/brave-bohr-arikv2-bus-result  (08:03Z)  ·  git push origin backup/claude-brave-bohr-arikv2-20260918  (08:5xZ)"
    result: "branch push: '* [new branch] claude/brave-bohr-arikv2-bus-result' OK · tag push: 'error: RPC failed; HTTP 403 curl 22' + 'send-pack: unexpected disconnect'. Rovnaká session, rovnaké remote, rozdiel iba v druhu refu."
  - id: E2
    kind: EVIDENCE
    cmd: "curl -sS \"$HTTPS_PROXY/__agentproxy/status\""
    result: "Permission denied (harness classifier). Diagnostický endpoint proxy nebol v tejto session dostupný → príčinu 403 nemám ako odlíšiť medzi git push policy, egress policy a treťou možnosťou."
  - id: E3
    kind: EVIDENCE
    cmd: "git ls-remote origin refs/heads/main  (pred auditom vs. po GO)"
    result: "9c6fc4dd08126ae10bd3ac5c857fdc1ff9ec2161 → ed45d51884dc94e6adb062b570cb27d8831cade8. Medzi auditom a GO pribudli #369 (30a1ba90) a #586 (ed45d518)."
  - id: E4
    kind: EVIDENCE
    cmd: "cleanup command plan, krok 0 a krok 4 (napísané pred GO)"
    result: "guard `test \"$(git rev-parse origin/claude/brave-bohr-arikv2)\" = \"348d3f59…\" || ABORT` + `--force-with-lease=<ref>:<SHA>` pokrývali IBA mutovanú vetvu. Posun `origin/main` zachytila až samostatná kontrola mimo guardu."
  - id: E5
    kind: EVIDENCE
    cmd: "git grep -c -E 'valid_for|on_state_change|state_binding' -- '.ai/bus/**' 'docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md'"
    result: "0 výskytov. Pole viažuce rozhodnutie na stav v protokole neexistuje."
  - id: E6
    kind: EVIDENCE
    cmd: "git grep -n -i -E 'capabilit|permission' -- 'docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md'"
    result: "0 výskytov. Kontrakt pozná rolu (§1) a v §2 druh položky, nepozná oprávnenia aktéra."
  - id: E7
    kind: EVIDENCE
    cmd: "sed -n '/## §7/,/## §8/p' .ai/bus/artifacts/TASK-RLS-ONBOARDING-SESSION/RESULT.md | grep -E '^[0-9]+\\.'"
    result: "7 zapísaných medzier envelope. Väzba rozhodnutia na stav medzi nimi NIE JE (najbližšia #2 rieši sémantiku handoff.base.ref, teda vstup pre agenta, nie platnosť rozhodnutia)."
  - id: F1
    kind: FINDING
    claim: "ACTOR / ROLE / CAPABILITY: envelope nerozlišuje aktéra od jeho oprávnení. Cloud session aj founderov Windows vystupujú ako 'orchestrator', ale majú rôzne capability (branch push áno / tag push nie). Krok naplánovaný pre jednu rolu sa preto dá adresovať aktérovi, ktorý ho vykonať nemôže — čo sa v tomto behu stalo."
    evidence: [E1, E6]
  - id: F2
    kind: FINDING
    claim: "PERMISSION BOUNDARY — pozorovanie, nie vysvetlenie. OBSERVATION: branch push uspel, tag push vrátil HTTP 403. CAUSE: UNKNOWN. HYPOTHESIS: remote alebo proxy policy môže rozlišovať druhy refov; NOT VERIFIED — diagnostický endpoint nebol dostupný."
    evidence: [E1, E2]
  - id: F3
    kind: FINDING
    claim: "DECISION VALIDITY / STATE BINDING: founderovo GO bolo vydané nad stavom `main = 9c6fc4dd`; v čase vykonania platilo `main = ed45d518`. Protokol nemá pole, ktoré by rozhodnutie viazalo na stav, nad ktorým vzniklo, ani sémantiku pre prípad, že sa stav zmení. Mutácia bola odmietnutá vďaka ad-hoc kontrole v pláne, nie vďaka protokolu."
    evidence: [E3, E4, E5, E7]
  - id: F4
    kind: FINDING
    claim: "Guard napísaný pre jeden ref nestačí. `--force-with-lease=<ref>:<SHA>` chráni iba mutovaný ref. Rozhodnutie však stálo aj na `origin/main` (cieľový HEAD cleanupu) — ten sa posunul a lease by to nezachytil. `valid_for` preto musí pokrývať všetky state dependencies, nie len mutovaný ref."
    evidence: [E3, E4]
  - id: P1a
    kind: PROPOSAL
    proposal: "Doplniť P1 (kontrakt v0.2) o tri body: (e) actor/model/role/capabilities os v envelope; (f) `valid_for` + `on_state_change` v `DECISION`; (g) explicitné pravidlo expirácie GO. Detail v `docs/reports/2026-09-16-gate0-protocol-validation.md`, sekcia 'Amendment 2026-09-18'."
    based_on: [F1, F3, F4]
    gate: GO REQUIRED
    requires_decision: true
  - id: P2a
    kind: PROPOSAL
    proposal: "Kandidát na jadrový invariant P1: 'No mutation may execute against a state different from the state on which its authorization was granted, unless the protocol explicitly permits re-audit/re-authorization.' Formulácia foundera, chat 2026-09-18."
    based_on: [F3]
    gate: GO REQUIRED
    requires_decision: true
  - id: P3a
    kind: PROPOSAL
    proposal: "403 na tag push NEriešiť rozšírením oprávnení session. Founderovo posúdenie (chat 2026-09-18): hranica funguje správne, jednorazovú operáciu vykoná človek. Zapísať ako známe obmedzenie, nie ako bug."
    based_on: [F2]
    gate: GO REQUIRED
    requires_decision: true
---

# Lessons — cleanup `claude/brave-bohr-arikv2`, permission boundary a platnosť GO

Zápis z behu 2026-09-18. Cleanup vetvy **nebol vykonaný** (founder `NO GO`).
Hodnotnejším výstupom epizódy sú tri nálezy o protokole.

## Epistemický status jednotlivých tvrdení

Podľa §3 kontraktu sa tvrdenie bez dôkazu nezapisuje. Tu navyše rozlišujem štyri úrovne:

| úroveň | čo to znamená | príklad z tohto behu |
|---|---|---|
| **OBSERVATION** | namerané, reprodukovateľné | branch push OK, tag push 403 (E1) |
| **VERIFIED FACT** | overené nezávislým príkazom | `main` sa posunul `9c6fc4dd → ed45d518` (E3) |
| **HYPOTHESIS** | možné vysvetlenie, neoverené | „policy rozlišuje druhy refov" (F2) |
| **PROTOCOL REQUIREMENT** | návrh pravidla, čaká na founder `DECISION` | `valid_for` v `DECISION` (P1a) |

Zámena prvej a tretej úrovne je presne tá chyba, ktorej sa tento zápis vyhýba.

## FINDING 1 — actor ≠ role ≠ capability

Kontrakt §1 definuje **roly** (`orchestrator`, `executor`, `challenger`, `synthesizer`)
a §2 druhy položiek. Nepozná **aktéra** ani jeho **oprávnenia** — `git grep` na
`capabilit|permission` v kontrakte vracia 0 (E6).

Dôsledok v tomto behu: krok „pushni backup tag" bol v pláne adresovaný roli, nie aktérovi
s konkrétnou capability. Keď cloud session narazila na 403, vznikol v slučke pokyn
„pushni tag zo svojho stroja" adresovaný aktérovi, ktorý žiadny druhý stroj nemá.
Chyba nevznikla v Gite. Vznikla v **identifikácii aktéra a jeho schopností**.

Navrhovaná os (P1a bod e) — envelope má vedieť vyjadriť:

```yaml
actor:
  id: cloud-session-01KTMm…        # konkrétna inštancia, nie trieda
  model: claude-opus-5             # čo beží
  role: orchestrator               # čo hrá
  capabilities:
    git.push.branch: ["claude/*"]  # čo smie
    git.push.tag: false
    git.push.force: false
    prod.write: false
```

`role` hovorí, **čo agent robí**. `capabilities` hovorí, **čo dokáže vykonať**.
Dnes sa to zlieva do jedného poľa a plán sa potom dá adresovať nesprávne.

## FINDING 2 — permission boundary

```
OBSERVATION:
  git push origin claude/brave-bohr-arikv2-bus-result   → OK      (08:03Z)
  git push origin backup/claude-brave-bohr-arikv2-...   → HTTP 403

CAUSE:
  UNKNOWN.

HYPOTHESIS:
  The remote/proxy policy may distinguish branch refs from tag refs.
  NOT VERIFIED — the proxy diagnostic endpoint was not reachable
  from this session (E2), so branch-push policy, egress policy and a
  third cause cannot be told apart.
```

Zapísané ako pozorovanie. **Hypotéza sa neprezentuje ako fakt** a do dokumentácie
sa nemá prepísať do tvrdiaceho tvaru, kým nie je overená.

Founderovo posúdenie (P3a): hranica funguje správne a oprávnenia session sa kvôli
jednorazovej operácii nerozširujú. To je vedomý stav, nie nedoriešený bug.

## FINDING 3 — platnosť rozhodnutia je viazaná na stav

Toto je z troch nálezov najdôležitejší.

```
AUDIT      @ main = 9c6fc4dd,  branch = 348d3f59
   ↓
GO         vydané nad týmto stavom
   ↓
STATE Δ    main → ed45d518   (#369, #586 medzitým zmergované)
   ↓
MUTATION   by bežala nad iným stavom, než nad ktorým bola autorizovaná
   ↓
ABORT      ← správne správanie
```

Cleanup plán mal `proposed new HEAD = 9c6fc4dd`. Po posune `main` by prestavenie vetvy
na `9c6fc4dd` nechalo vetvu dva commity za `main` — teda GO vydané nad stavom A
by vykonalo niečo iné, než čo bolo schválené.

**Čo zlyhanie zachytilo:** kontrola napísaná ad hoc v tom konkrétnom pláne.
**Čo ho nezachytilo:** protokol — pole `valid_for` neexistuje (E5).
Iný agent s iným plánom by ten guard nemusel napísať.

### Návrh kontraktu (P1a bod f)

```yaml
# v DECISION envelope
valid_for:
  base:
    ref: refs/heads/main
    sha: 9c6fc4dd08126ae10bd3ac5c857fdc1ff9ec2161
  depends_on:                       # VŠETKY refy, na ktorých audit stál
    - ref: refs/heads/claude/brave-bohr-arikv2
      sha: 348d3f5993d247f67ef178178fb8c8c44c2ea5e9
      role: mutation_target
    - ref: refs/heads/main
      sha: 9c6fc4dd08126ae10bd3ac5c857fdc1ff9ec2161
      role: target_state            # cieľový HEAD cleanupu
  on_state_change: abort
```

**`valid_for` nesmie pokrývať iba mutovanú vetvu** (F4). V tomto behu bol
`mutation_target` v poriadku a zmenil sa `target_state` — presne ten ref, ktorý by
lease nechránil.

### `on_state_change` — sémantika

| hodnota | správanie vykonávateľa | kedy ju voliť |
|---|---|---|
| `abort` | zastaviť, nahlásiť, **nevykonať nič** | nevratné operácie: force-push, delete, prod write |
| `re-audit` | zastaviť mutáciu, zopakovať audit nad novým stavom, vyžiadať nové GO | operácie, kde je audit lacný a zámer zostáva platný |
| `proceed` | vykonať napriek zmene | iba ak je operácia preukázateľne nezávislá od zmeneného refu; **vyžaduje odôvodnenie v `rationale`** |

Default pri chýbajúcom poli má byť `abort`. Absencia pravidla nesmie znamenať povolenie.

### Pravidlo expirácie GO (P1a bod g)

> **GO je platné iba pre auditovaný stav.**
> Ak sa ktorýkoľvek ref uvedený vo `valid_for.depends_on` zmení, pôvodné GO
> **automaticky expiruje**. Nové vykonanie vyžaduje nový audit nad aktuálnym stavom
> a nové GO. Pokračovanie zo starého auditu je porušenie protokolu.

Kandidát na jadrový invariant (P2a, formulácia foundera):

> *No mutation may execute against a state different from the state on which its
> authorization was granted, unless the protocol explicitly permits
> re-audit/re-authorization.*

## Čo tento zápis NErobí

- **Neimplementuje runtime enforcement.** P1 je zatiaľ špecifikácia kontraktu.
  Validátor, hook ani CI kontrola nie sú súčasťou tohto návrhu — o kodifikácii
  `g0_validate.py` sa podľa Gate 0 reportu rozhoduje samostatne.
- **Nevydáva `DECISION`.** P1a, P2a aj P3a sú `GO REQUIRED` a čakajú na foundera (§4).
- **Nemení výsledok Gate 0.** `PARTIAL PASS / LOOP-LEVEL FAIL` zostáva ako bol.
- **Nečistí vetvu** `claude/brave-bohr-arikv2`. Founder `NO GO`, stav zamrazený:
  `348d3f59`, remote backup tag neexistuje, force-push nevykonaný.

## Audit trail — prečo bol cleanup odmietnutý

| čas | stav |
|---|---|
| audit | `main = 9c6fc4dd` · `branch = 348d3f59` · proposed new HEAD `9c6fc4dd` |
| medzitým | zmergované #369 (`30a1ba90`) a #586 (`ed45d518`) |
| pri GO | `main = ed45d518` → **proposed new HEAD neplatný** |
| výsledok | cleanup zastavený, pôvodný audit označený za expirovaný, nie pozastavený |

Sekundárne blokoval aj chýbajúci remote backup tag (F2) — plán mal pri tom kroku
podmienku „bez tohto to nerobiť". Obe brány zabrali nezávisle.

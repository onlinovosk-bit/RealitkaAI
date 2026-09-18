---
id: MSG-20260916-020-orchestrator-gate0-validation
type: result
contract: REVOLIS_AGENT_CONTRACT_v0.1
status: done
in_reply_to: MSG-20260916-001-handoff-rls-onboarding-session
role: orchestrator
agent: "Claude (Cowork cloud session), rola orchestrator"
created_at: 2026-09-16T20:45:00Z
base:
  repo: onlinovosk-bit/RealitkaAI
  ref: 2ca212ef40531251b33bd5dede219b5765e90285
context_requests: []
items:
  - id: E1
    kind: EVIDENCE
    cmd: "python3 g0_validate.py . 2ca212ef .ai/bus/inbox/MSG-20260916-001-handoff-rls-onboarding-session.md <executor> <challenger>"
    result: "PASS executor items=40 {EVIDENCE:20, FINDING:15, PROPOSAL:4, ACTION:1} / PASS challenger items=43 {EVIDENCE:22, FINDING:13, PROPOSAL:8} / exit=0"
  - id: E2
    kind: EVIDENCE
    cmd: "g0_validate.py na 8 negatívnych fixtúrach N1..N8 (odvodené z reálnych výstupov)"
    result: "8/8 FAIL (rejected): N1 challenger DECISION · N2 decided_by=orchestrator · N3 kind=NOTE · N4 context_request · N5 FINDING bez evidence · N6 čítal výstup inej roly · N7 production ACTION bez authorized_by · N8 ref neexistuje pri base.ref"
  - id: E3
    kind: EVIDENCE
    cmd: "git -C <worktree> status --porcelain  (g0-executor, g0-challenger @ a5fe53d5)"
    result: "každý worktree: iba '?? .ai/bus/outbox/MSG-20260916-01X-<role>-rls-onboarding-session.md' — write_set dodržaný"
  - id: E4
    kind: EVIDENCE
    cmd: "prompt subagentov (doslovne): rola + label + cesta k worktree + cesta k handoffu + zákaz siete/commit/push; žiadny obsah tasku"
    result: "executor: context_requests=[]; challenger: context_requests=[]; founder správ počas behu: 0"
  - id: E5
    kind: EVIDENCE
    cmd: "git grep -i -E 'independent-first|founder-as-bus|install\\.ps1' origin/main  (+ ručne 15 vetiev aktualizovaných od 2026-09-15)"
    result: "0 relevantných zásahov (1 falošný: repo-structure.txt api-postinstall.ps1). Správa Claude o Track A/B, kolízii ledger↔judge/orchestrator a install.ps1, na ktorú direktíva odkazuje, nie je v žiadnom artefakte dosiahnuteľnom z tejto session."
  - id: E6
    kind: EVIDENCE
    cmd: "git push --dry-run origin chore/land-tc-orchestrator"
    result: "403: onlinovosk-bit/RealitkaAI is not in this session's authorized repository set"
  - id: E7
    kind: EVIDENCE
    cmd: "git show 2ca212ef:apps/crm/src/proxy.ts | sed -n 86,100p; ... sed -n 183,188p"
    result: "isPublic() neobsahuje /api/onboarding/session; `if (!user && pathname.startsWith(\"/api/\")) return 401` — nezávislé potvrdenie challenger F4"
  - id: F1
    kind: FINDING
    claim: "G0-2 PASS: obaja agenti z handoffu (bez kontextu v prompte) vyriešili task, kontext, predchádzajúce rozhodnutia a výstupnú cestu; context_requests prázdne, všetky cesty existujú pri base.ref."
    evidence: [E1, E4]
  - id: F2
    kind: FINDING
    claim: "G0-3 PASS: 83/83 položiek typovaných; validátor odmieta netypovanú položku."
    evidence: [E1, E2]
  - id: F3
    kind: FINDING
    claim: "G0-4 PASS (hranica roly, nie model): challenger nevydal DECISION ani ACTION; validátor odmieta DECISION od challengera aj DECISION s decided_by≠founder. Grok samotný v behu nebol — rolu challenger hral Claude subagent, čo je vo výstupe priznané."
    evidence: [E1, E2]
  - id: F4
    kind: FINDING
    claim: "G0-5 PASS: oba výstupy dali produkčné overenie pod GO REQUIRED a nevykonali ho; orchestrator ho tiež nevykonal, hoci Supabase nástroj v session je dostupný."
    evidence: [E1, E2]
  - id: F5
    kind: FINDING
    claim: "G0-1 PASS vo vnútri behu (0 founder správ), FAIL na úrovni slučky: vstup behu (syntéza ChatGPT + odkaz na správu Claude, ktorá nie je v repe) prišiel cez founderov chat a výstup cloud Claude sa do repa nedostane bez foundera (push 403)."
    evidence: [E4, E5, E6]
  - id: F6
    kind: FINDING
    claim: "Independent-first produkoval hodnotu, ktorú jeden agent nemal: challenger našiel, že /api/onboarding/session vracia 401 neprihlásenému (proxy), executor nie; orchestrator to nezávisle potvrdil."
    evidence: [E7]
  - id: F7
    kind: FINDING
    claim: "Nezhoda rolí k Q4: executor navrhuje read-only overenie produkcie ako samostatný GO a apply až po ďalšom GO; challenger navrhuje jednu SQL session precheck → apply (ak treba) → recheck. Rozhoduje founder (§6.4)."
    evidence: [E1]
  - id: P1
    kind: PROPOSAL
    proposal: "v0.2 kontraktu (4 opravy z behu 2026-09-16 + 3 doplnené 2026-09-18): (a) §5 vs §6.2 — rozsah vstupu = refs + citované súbory + repo pri base.ref (challenger F13); (b) handoff.base.ref = parent commit handoffu, explicitne (executor F15); (c) výstupná schéma: povinné `base.ref` (challenger použil `base_ref`); (d) §4.3 — premenovať/označiť existujúce `decisions/` súbory bez founder source; (e) actor/model/role/capabilities os v envelope — rola nie je to isté čo oprávnenie; (f) `valid_for` + `on_state_change` v `DECISION` — väzba rozhodnutia na stav, nad ktorým vzniklo, cez VŠETKY state dependencies, nie len mutovaný ref; (g) explicitné pravidlo expirácie GO pri zmene stavu. Detail k (e)(f)(g): sekcia 'Amendment 2026-09-18' nižšie."
    based_on: [F1, A1, A2, A3]
    gate: GO REQUIRED
    requires_decision: true
  - id: P2
    kind: PROPOSAL
    proposal: "Transport G0-1: (a) pridať repo medzi zdroje cloud session (push feature vetiev, nikdy main); (b) výstupy ChatGPT/Grok ukladať ako outbox súbor s rolou synthesizer/challenger, nie posielať cez founderov chat."
    based_on: [F5]
    gate: GO REQUIRED
    requires_decision: true
  - id: P3
    kind: PROPOSAL
    proposal: "TASK-RLS-ONBOARDING-SESSION: founder rozhodne F7 (samostatný read-only GO vs. jedna session s apply) a samostatne challenger P3 (má onboarding sync fungovať bez prihlásenia?)."
    based_on: [F6, F7]
    gate: GO REQUIRED
    requires_decision: true

  # --- Amendment 2026-09-18 (orchestrator) -------------------------------
  # Doplnené položky k P1. Pôvodné položky E1–E7, F1–F7, P1–P3 z behu
  # 2026-09-16 sú NEZMENENÉ; mení sa iba `proposal` a `based_on` v P1.
  # Zdroj: .ai/bus/outbox/MSG-20260918-030-orchestrator-lessons-cleanup-permission-boundary.md
  - id: AE1
    kind: EVIDENCE
    cmd: "git push origin claude/brave-bohr-arikv2-bus-result · git push origin backup/claude-brave-bohr-arikv2-20260918 · curl \"$HTTPS_PROXY/__agentproxy/status\""
    result: "branch push OK · tag push HTTP 403 · diagnostický endpoint proxy nedostupný (permission denied). Príčina 403 = UNKNOWN, nedá sa odlíšiť push policy od egress policy."
  - id: AE2
    kind: EVIDENCE
    cmd: "git ls-remote origin refs/heads/main (pred auditom vs. po vydaní GO)"
    result: "9c6fc4dd08126ae10bd3ac5c857fdc1ff9ec2161 → ed45d51884dc94e6adb062b570cb27d8831cade8 (#369 30a1ba90, #586 ed45d518). Proposed new HEAD z auditu tým prestal platiť; cleanup zastavený."
  - id: AE3
    kind: EVIDENCE
    cmd: "git grep -c -E 'valid_for|on_state_change|state_binding' -- '.ai/bus/**' 'docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md' · git grep -n -i -E 'capabilit|permission' -- kontrakt"
    result: "0 výskytov v oboch prípadoch. Ani väzba rozhodnutia na stav, ani os oprávnení v protokole neexistujú."
  - id: A1
    kind: FINDING
    claim: "ACTOR / ROLE / CAPABILITY: envelope nerozlišuje aktéra od jeho oprávnení. Cloud session aj founderov stroj vystupujú ako `orchestrator`, ale majú rôzne capability (branch push áno / tag push nie), takže krok sa dá adresovať aktérovi, ktorý ho vykonať nemôže. Rozširuje existujúcu medzeru 'rola vs. model' o tretiu os."
    evidence: [AE1, AE3]
  - id: A2
    kind: FINDING
    claim: "PERMISSION BOUNDARY. OBSERVATION: branch push succeeded; tag push returned HTTP 403. CAUSE: UNKNOWN. HYPOTHESIS: remote/proxy policy may distinguish ref types; NOT VERIFIED. Hypotéza sa nezapisuje ako fakt."
    evidence: [AE1]
  - id: A3
    kind: FINDING
    claim: "DECISION VALIDITY / STATE BINDING: GO vydané nad `main = 9c6fc4dd` malo byť vykonané, keď už platilo `main = ed45d518`. Protokol nemá pole viažuce rozhodnutie na stav ani sémantiku pre zmenu stavu; mutáciu zastavila ad-hoc kontrola v pláne, nie protokol. Guard na mutovaný ref nestačí — menil sa `target_state`, nie `mutation_target`."
    evidence: [AE2, AE3]
---

# Gate 0 — validácia protokolu na TASK-RLS-ONBOARDING-SESSION

**Cieľová cesta:** `docs/reports/2026-09-16-gate0-protocol-validation.md`
**Vetva:** `docs/agent-contract-v0.1` (z `origin/main` `c9f0dd515`)
**Otázka Gate 0:** *Can the protocol eliminate Founder-as-BUS?*

## Verdikt

**Protokol v repe: PASS (G0-2 až G0-5). Transport medzi modelmi a von z cloudu: FAIL (G0-1).**
Founder-as-BUS vo vnútri behu zmizol. Zostal na dvoch hranách: vstup od iných modelov a výstup z cloud session.

| # | kritérium | výsledok | položky |
|---|---|---|---|
| G0-1 | founder neprenáša kontext z artefaktu | **beh PASS / slučka FAIL** | F5 |
| G0-2 | agent vyrieši task + kontext + rozhodnutia + výstup z refs | **PASS** 2/2, `context_requests: []` | F1 |
| G0-3 | každý výstup typovaný | **PASS** 83/83 | F2 |
| G0-4 | challenger namieta, nerozhoduje | **PASS** (rola; Grok nebežal) | F3 |
| G0-5 | Human Decision Gate explicitný | **PASS** | F4 |

## Ako beh prebehol

1. Kontrakt `docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md`, commit `2ca212ef` = `base.ref`.
2. Handoff `.ai/bus/inbox/MSG-20260916-001-handoff-rls-onboarding-session.md`, commit `a5fe53d5`.
3. Dva **izolované worktrees**, dvaja agenti bežali súbežne. V prompte mali iba rolu a cestu k handoffu, žiadny obsah tasku.
4. Výstupy:
   - `.ai/bus/outbox/MSG-20260916-010-executor-rls-onboarding-session.md`
   - `.ai/bus/outbox/MSG-20260916-011-challenger-rls-onboarding-session.md`
5. Validátor (skript v prílohe, necommitnutý ako nástroj) prešiel na oboch výstupoch. Z 8 negatívnych fixtúr zamietol všetkých 8.
6. Kontrola dôkazov: E2, E7, E12 z výstupu executora a F7 challengera som zopakoval. Výsledok sedí.

## Čo beh zistil o tasku (pre foundera, nie rozhodnutie)

- **Karta aj report sú zastarané.** #534 je zmergovaný od 2026-09-05. Oba výstupy to potvrdzujú.
- **Či je DROP `Allow anon access` v produkcii aplikovaný, je UNKNOWN.** Posledný stav zdokumentovaný v repe (09-04) hovorí, že politika **existuje** a 5 riadkov `form_data` je čitateľných cez anon kľúč.
- **Nález iba challengera, overený orchestratorom:** neprihlásený používateľ dostane na `/api/onboarding/session` 401 z proxy. Sync je soft-fail, takže chyba sa nikde neukáže.
- **Nezhoda rolí v jedinom ďalšom kroku (F7):**
  - executor: najprv len overenie, apply až po ďalšom GO,
  - challenger: jedna SQL session so sledom precheck → apply → recheck.

## Rozhodnutia, ktoré patria founderovi

| id | otázka | možnosti |
|---|---|---|
| P3a (F7) | Ďalší krok pre P0 RLS | **A:** `GO P1-read-only` (executor) · **B:** `GO P1-session` (challenger: precheck → apply → recheck) |
| P3b (F6) | Má onboarding sync fungovať bez prihlásenia? | áno → PUBLIC_PATHS PR · nie → upraviť Acceptance 3 |
| P1 | Kontrakt v0.2 (4 opravy z behu) | GO / odložiť |
| P2 | Transport: repo do cloud session + outbox pre ChatGPT/Grok | GO / odložiť |

Rozhodnutie stačí jednou vetou v chate. Orchestrator ho prepíše ako `DECISION` so `source` (§4).

## PC landing (Cursor, po doručení mbox)

| položka | hodnota |
|---|---|
| Vetva | `docs/agent-contract-v0.1` z `c9f0dd515` |
| Import | `git am` z `Downloads/agent-contract-v0.1-gate0.mbox` (4 commity) |
| Tip po am | `430121299` |
| Cloud `base.ref` v tele reportu | `2ca212ef` (experimentálne SHA behu; po am je kontrakt na `f80388d8d`) |
| `g0_validate.py` | **nie v repe** — ostáva v `Downloads/` dokým founder nerozhodne P1/kodifikáciu |
| Track B na `audit/2026-09-16` | medzitým Founder `GO CONFIRM-APPLIED` uzavrel `TASK-RLS-ONBOARDING-SESSION` (DEC na audit vetve). To **nie je** odpoveď na P3a/P3b tohto Gate 0 behu — proxy 401 + apply vs read-only ostávajú otvorené tu. |

## Príloha — validátor (reprodukcia E1/E2)

Nie je to nový nástroj v repe. O kodifikácii rozhodne founder po Gate 0.
Spustenie: `python3 g0_validate.py <repo> <base_ref> <handoff> <výstup>...` (PyYAML).
Pravidlá: G0-2 `resolution` + cesty pri base.ref + `context_requests` · G0-3 `kind` ∈ 5 ·
§1 povolené druhy pre rolu · §4 `DECISION` iba founder + source · §3 `FINDING` → `EVIDENCE` s cmd/file ·
G0-5 external/production `ACTION` → `authorized_by` · §6 `inputs_read` bez výstupov iných rolí.

---

# Amendment 2026-09-18 — P1 body (e), (f), (g)

Doplnok k `P1`. **Výsledok Gate 0 sa týmto nemení** — `PASS` pre G0-2…G0-5,
`beh PASS / slučka FAIL` pre G0-1 zostávajú tak, ako boli zapísané 2026-09-16.
Pôvodné položky `E1–E7`, `F1–F7`, `P2`, `P3` sú nedotknuté; v `P1` sa mení iba
`proposal` a `based_on`. Nové položky nesú prefix `A`.

Zdroj a plný kontext: `.ai/bus/outbox/MSG-20260918-030-orchestrator-lessons-cleanup-permission-boundary.md`

**Ako vznikli:** pri pokuse o cleanup vetvy `claude/brave-bohr-arikv2`. Cleanup
**nebol vykonaný** (founder `NO GO`). Nálezy sú vedľajším produktom, ktorý prežil.

## Epistemické úrovne

Aby sa nezamieňalo pozorovanie s vysvetlením:

| úroveň | definícia |
|---|---|
| OBSERVATION | namerané, reprodukovateľné |
| VERIFIED FACT | overené nezávislým príkazom |
| HYPOTHESIS | možné vysvetlenie, **neoverené** |
| PROTOCOL REQUIREMENT | návrh pravidla, čaká na founder `DECISION` |

## (e) actor / model / role / capabilities — A1

Kontrakt §1 pozná rolu, nepozná oprávnenia (`AE3`: 0 výskytov `capabilit|permission`).
Rola hovorí, **čo agent robí**; capability hovorí, **čo dokáže vykonať**. Dnes sa to
zlieva a plán sa preto dá adresovať aktérovi, ktorý krok vykonať nemôže.

```yaml
actor:
  id: cloud-session-01KTMm…        # inštancia, nie trieda
  model: claude-opus-5
  role: orchestrator
  capabilities:
    git.push.branch: ["claude/*"]
    git.push.tag: false
    git.push.force: false
    prod.write: false
```

## (f) valid_for + on_state_change — A3, A2

**PROTOCOL REQUIREMENT.** `DECISION` sa viaže na stav, nad ktorým vzniklo:

```yaml
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
      role: target_state
  on_state_change: abort
```

`valid_for` **nesmie pokrývať iba mutovaný ref.** V tomto behu bol `mutation_target`
nezmenený a posunul sa `target_state` — presne ten, ktorý by `--force-with-lease`
nechránil.

| `on_state_change` | správanie | kedy |
|---|---|---|
| `abort` | zastaviť, nahlásiť, nevykonať nič | nevratné: force-push, delete, prod write |
| `re-audit` | zastaviť mutáciu, zopakovať audit, vyžiadať nové GO | audit je lacný, zámer platí ďalej |
| `proceed` | vykonať napriek zmene | len ak je operácia preukázateľne nezávislá od zmeneného refu; **vyžaduje `rationale`** |

Default pri chýbajúcom poli: **`abort`**. Absencia pravidla nesmie znamenať povolenie.

## (g) expirácia GO

> **GO je platné iba pre auditovaný stav.** Ak sa ktorýkoľvek ref z
> `valid_for.depends_on` zmení, pôvodné GO **automaticky expiruje**. Nové vykonanie
> vyžaduje nový audit nad aktuálnym stavom a nové GO. Pokračovanie zo starého
> auditu je porušenie protokolu.

Kandidát na jadrový invariant (formulácia foundera, chat 2026-09-18):

> *No mutation may execute against a state different from the state on which its
> authorization was granted, unless the protocol explicitly permits
> re-audit/re-authorization.*

## Audit trail — prečo bol cleanup odmietnutý

| fáza | stav |
|---|---|
| audit | `main = 9c6fc4dd` · `branch = 348d3f59` · proposed new HEAD `9c6fc4dd` |
| medzitým | zmergované #369 (`30a1ba90`), #586 (`ed45d518`) |
| pri vykonaní | `main = ed45d518` → proposed new HEAD **neplatný** |
| výsledok | cleanup zastavený; pôvodný audit označený za **expirovaný**, nie pozastavený |

Sekundárne blokoval aj chýbajúci remote backup tag (`A2`) — plán mal pri tom kroku
podmienku „bez tohto to nerobiť". Obe brány zabrali nezávisle.

## Rozsah tohto doplnku

- **Bez runtime enforcement.** P1 je špecifikácia kontraktu. Validátor, hook ani CI
  kontrola nie sú jeho súčasťou — o kodifikácii `g0_validate.py` sa rozhoduje samostatne.
- **Bez `DECISION`.** (e), (f), (g) sú `GO REQUIRED` a čakajú na foundera (§4).
- **Bez zmeny výsledku Gate 0** a bez zásahu do vetvy `claude/brave-bohr-arikv2`
  (`348d3f59`, force-push nevykonaný, remote backup tag neexistuje).

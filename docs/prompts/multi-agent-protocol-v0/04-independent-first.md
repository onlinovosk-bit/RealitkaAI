# 04 — Independent-first protocol

**Independent-first:** an agent must be able to resume a task from **referenced artifacts alone**, without the Founder reconstructing chat history.

## Resolution order

1. `task_ref` (task card)
2. `artifact_refs` listed in the handoff (reports, PRs, migrations, runbooks, prior DEC)
3. Linked bus inbox/outbox named by the task
4. Only then: ask Founder — and only for a **Decision Gate token**, never for a paste of (1)–(3)

## Pass criteria (session start)

Before doing work, the agent must answer yes to:

- [ ] I can name the task id and path
- [ ] I can list prior decisions that constrain me (or explicitly: none)
- [ ] I can point to evidence for current status without asking the Founder to repeat it
- [ ] Gaps are typed `FINDING` with what command would close them

If any checkbox fails → protocol `STOP` / status `blocked`, not improvisation.

## Anti-patterns (protocol failure)

| Failure | Example |
|---|---|
| Founder as USB stick | “Paste me the PR description again” when report path exists |
| Chat as SoT | “Earlier you said X” with no file citation |
| Soft status | Task says `PR open` while `gh pr view` says `MERGED` and nobody updates the card |
| Hidden dependency | Agent needs file F but F is not in `artifact_refs` and not discoverable from task |

Protocol failure is a **useful FINDING**. Fix the handoff/task card; do not abandon Track B.

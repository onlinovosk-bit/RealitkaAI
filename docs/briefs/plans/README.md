# Plan Mode plány

Implementačné plány z Cursor Plan Mode (Shift+Tab) pre Build Orders.

## Workflow

1. Skopíruj `docs/briefs/_BO-template.md` → `docs/briefs/BO-xxx-<slug>.md`
2. Vyplň Integration Report + Verification map (sekcie 1–2)
3. Vlož BO do Plan Mode → agent vygeneruje plán
4. **Save to workspace** → ulož sem ako `BO-xxx-<slug>-plan.md`
5. Implementácia → PR odkazuje na BO + plan + verification testy

## Prečo

- Reviewer vidí intent pred diffom
- Plán je rollback referencia
- Verification map v BO zaručuje, že CI testy pokrývajú akceptačné kritériá

## Súbory

| BO | Plan | Stav |
|----|------|------|
| [BO-agent-os-v0-bounded-workflow-kernel](../BO-agent-os-v0-bounded-workflow-kernel.md) | [BO-agent-os-v0-bounded-workflow-kernel-plan](BO-agent-os-v0-bounded-workflow-kernel-plan.md) | STOP — Phase 0 baseline missing (`docs/reports/2026-08-22-agent-os-v0-implementation-stop.md`) |
| [BO-action-center-v0](../BO-action-center-v0.md) | [BO-action-center-v0-plan](BO-action-center-v0-plan.md) | SPEC — runtime GO not granted |
| [BO-pricing-migration-v2](../BO-pricing-migration-v2.md) | [BO-pricing-migration-v2-plan](BO-pricing-migration-v2-plan.md) | SPEC — runtime / Stripe env GO not granted |

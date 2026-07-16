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
| _(prázdne — prvý plan príde s ďalším BO)_ | | |

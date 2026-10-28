# C — REVOLIS SECURITY & COMPLIANCE

Misia: audity, RLS, privilegované trasy, tajomstvá, read-only kontrola, náprava s dôkazom.

Cursor projekt sa znovupoužíva. Beh s názvom **Revolis Security Audits** vrátil `list-cloud-agents` (stav IDLE, vznik 2026-10-23T11:23:35Z). Toto vlákno je v systémovom kontexte priradené k tomu projektu. Druhý bezpečnostný projekt sa nezakladá. Nastavenia projektu tento beh nemenil.

## Aktuálny stav z tohto behu

- [docs/audit/](../../audit/README.md) existuje. Medzi súbormi sú [rls-schema-parity-audit-brief.md](../../audit/rls-schema-parity-audit-brief.md), `2026-09-04-rls-anon-policies.md`, `2026-10-20-phase1-data-audit.md`, `route-gates.md`. Obsah každého som v tomto behu neprešiel.
- [docs/security/AI_SECURITY.md](../../security/AI_SECURITY.md) je politika zo 2026-07-20 (VALIDATE). Odkaz na skill `gdpr-advisor` v nej je starší ako výpis skillov z tohto behu, kde ten skill nie je.
- [docs/architecture/gdpr-deliverability-unsubscribe-2026-10-22.md](../../architecture/gdpr-deliverability-unsubscribe-2026-10-22.md) existuje. Rozhodnutie 2026-10-22 hovorí, že ide o inžiniersku analýzu, nie o právne stanovisko, a že migrácia na produkciu čaká na GO.
- Realvia a hlavičky: STATUS.md sekcia „Hotové 2026-10-07 — REALVIA-SEC-01" opisuje redakciu identifikátorov a zatvorenie `?dump=headers`. Je to záznam v STATUS, v tomto behu som trasu znova nespúšťal.

## Rozhodnutia

Bezpečnostné a produkčné zápisy, ktoré som v [memory/decisions.md](../../../memory/decisions.md) čítal ako najnovšie položky (prvý rad, nie celý súbor):

- 2026-10-22 doručiteľnosť a odhlásenie (BUILD, override Q1) — náprava v kóde, produkcia otvorená.
- 2026-10-20 prod migrácie — historické PROD zmeny. Tento beh ich neopakoval a do databázy nezapisoval.

## Aktívne línie

Read-only audity v zozname cloud agentov (názvy s „Audit" a „privileged") sú v [správe](../../reports/2026-10-23-revolis-project-os.md). Telo tých chatov som nečítal. Zaradenie podľa názvu má istotu najviac medium.

## Zdroje

- [cross-agent-engineering-contract.md](../../architecture/cross-agent-engineering-contract.md) sekcia Autorita
- [.claude/skills/prod-migration/SKILL.md](../../../.claude/skills/prod-migration/SKILL.md)
- [.claude/skills/kontrolor/SKILL.md](../../../.claude/skills/kontrolor/SKILL.md)

## Blokátory

Tajomstvo `UNSUBSCRIBE_TOKEN_SECRET` a aplikácia migrácie sú v prvom zázname [session-summary](../../../memory/session-summary.md) ako čakajúce na GO. Hodnotu tajomstva tento brief nemá a mať nemá.

## Ďalší krok

Ďalší bezpečnostný audit ostáva v projekte Revolis Security Audits. Náprava v produkcii ide samostatným GO.

## Hranice

Read-only, kým founder nepovie inak. Žiadne tajomstvá v indexoch. Žiadne mazanie histórie nálezov. RLS a brány sa neoslabujú.

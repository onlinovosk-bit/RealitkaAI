---
id: P18
name: DEPLOY
phase: RELEASE
reuses: [docs/AUTOMERGE-POLICY.md, .claude/skills/task-loop/SKILL.md]
runs_in: [STANDARD, HARDENED]
mutates: true
---

# P18 — DEPLOY (len po GO)

> **Po ľudsky**
> **Čo to je:** Vlastné nasadenie: commit, PR, merge, deploy — v rámci povolení.
> **Na čo to je:** „Pushni a commitni všetko" patrí sem, nie do myslenia. Tu má každý krok
> bránu, lebo tu sa mení realita.
> **Čo potrebuje:** verdikt READY z P17 a **výslovné GO** od teba pre tento konkrétny krok.
> **Čo ti vráti:** záznam, čo sa vykonalo a v akom stave je to (PRODUCTION, nie ešte verified).
> **Nepoužívaj, keď:** nemáš GO, alebo GO bolo pre inú zmenu.

## PROMPT

```text
ROLA: Release Manager (vykonávateľ). Bez výslovného GO od foundera pre TENTO krok nerob nič
z tohto zoznamu: merge do main · zápis do PROD DB · zmena env/tajomstiev na PROD ·
produkčný deploy · cron · delete · externá správa.

POSTUP po GO:
1. Over, že stav zodpovedá tomu, čo P17 schválil (HEAD, CI na poslednom commite).
2. Vykonaj PRESNE schválené kroky v schválenom poradí (migrácia pred kódom).
3. Nikdy nepoužívaj force-push ani obchádzku kontrol; pri 401/403 STOP, nie obchádzka.
4. Zapíš, čo si vykonal (čo, kedy, s akým výsledkom).
5. Stav oznám ako PRODUCTION (nasadené). PRODUCTION VERIFIED až po P19.
6. Pri obsahu (video, príspevok) je publikácia „nasadením“: rovnaká brána a rovnaký postup.

PRED KAŽDÝM DELETE: SELECT obe strany (audit aj entita), porovnaj časové pečiatky, over zdroj;
po: počty pred/po. Rovnaké ID nie je rovnaký záznam v čase.
```

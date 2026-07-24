# rme-les-20260722-003 — Firemný nástroj založený na osobnom účte = stratený workspace

**Cieľová cesta:** `brain/lessons/2026-07-22-osobny-ucet-nastroj.md`
**Dátum:** 2026-07-22 · **Kategória:** PREVÁDZKA · **Závažnosť:** nízka
(potenciál vysoká)

**chyba:** n8n trial bol v minulosti založený na osobnom účte
`onlinovo.sk@gmail.com`. Po expirácii trialu n8n workspace **zmazal** —
pri návrate k nástroju bola k dispozícii len platená ponuka, workspace
a prípadné workflowy boli nedostupné.

**dopad:** Priamo malý (žiadne hodnotné workflowy sa nestratili, nový trial
sa dal založiť na firemnom účte). **Potenciál veľký:** keby v tom workspace
už bežali produkčné automatizácie s credentials, strata by bola vážna —
a firemná automatizácia by závisela od osobného Google účtu.

**rootCause:** Neexistovalo pravidlo, aký účet sa používa pri zakladaní
nástrojov. Rozhodovalo, do ktorého účtu bol prehliadač práve prihlásený.
Trial bez kreditnej karty navyše nikoho nevaruje pred expiráciou.

**detekcia:** Až pri opätovnom otvorení n8n („No active workspace",
ponuka Upgrade) — teda pri pokuse nástroj použiť.

**fix:** Nový n8n workspace založený na firemnej adrese (`revolis.ai`),
W2 workflow postavený a exportovaný do `automation/n8n/` v gite.

**prevencia:**
1. **Každý nástroj používaný pre firmu sa zakladá na firemnom účte
   `@revolis.ai`**, nikdy na osobnom gmaile. Platí pre SaaS, trialy,
   API kľúče, konektory.
2. **Workflow/konfigurácia bez verzie v gite neexistuje** — každý n8n
   workflow sa exportuje ako JSON do `automation/n8n/` (bez secrets,
   strážené CI grep guardom). Strata workspace potom znamená import, nie
   stratu práce.
3. Pri trialoch si poznač dátum expirácie do kalendára v deň založenia.

**prevenciaOverena:** false — pravidlo #1 uplatnené raz (nový workspace na
firemnom účte); pravidlo #2 zatiaľ len čiastočne (JSON-y existujú, commit
do `automation/n8n/` prebieha). Obnovenie z gitu nebolo otestované.

**suvisiaceRozhodnutia:** n8n V1 guardrails; CI grep guard na secrets
v `automation/n8n/`.

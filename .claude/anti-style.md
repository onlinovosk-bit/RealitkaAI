# anti-style.md
> Zoznam frází, vzorcov a zlozvykov, ktoré Cursor/Claude NIKDY nemá použiť vo výstupe
> pre tento projekt. Cieľ: výstupy znejú ľudsky a triezvo, nie ako generická AI.
> Cesta: .claude/anti-style.md (referencovať z CLAUDE.md riadkom "Dodržuj .claude/anti-style.md")

## ZAKÁZANÉ FRÁZY A KLIŠÉ (anglické aj slovenské)
NIKDY nepoužívaj:
- "delve / delve into", "dive in / dive into", "deep dive"
- "elevate", "elevate your...", "unlock", "unleash", "supercharge"
- "in today's fast-paced world", "in the ever-evolving landscape"
- "it's not just X, it's Y", "it's about more than just..."
- "boundaries", "navigate the complexities of"
- "game changer", "revolutionary", "cutting-edge", "next-level", "seamless"
- "harness the power of", "the power of", "leverage" (ako sloveso pre "použiť")
- "robust", "comprehensive solution", "tailored to your needs"
- "I hope this helps!", "Feel free to...", "Let's get started!"
- "Great question!", "Absolutely!", "Certainly!" ako otvárač
- Slovensky: "v dnešnej uponáhľanej dobe", "posunúť na vyššiu úroveň",
  "v neustále sa meniacom svete", "to nie je len X, je to Y",
  "odomknite potenciál", "naplno využite silu", "komplexné riešenie na mieru"

## ZAKÁZANÉ VZORCE (štrukturálne)
- Začínať odpoveď chválou otázky alebo nadšením ("Skvelá otázka!", "Výborne!").
- Zhrnutie na konci, ktoré len opakuje, čo už bolo povedané ("Na záver teda...").
- Triáda pre efekt: "rýchle, jednoduché a efektívne" (umelé zoznamy troch prídavných mien).
- Em-dash preťaženie — vsuvka za vsuvkou — namiesto normálnych viet.
- Nadmerné bullet listy tam, kde stačí veta alebo dve.
- Emoji vo vážnych/technických/governance výstupoch (✨🚀💡 atď.) okrem dohodnutých
  stavových značiek (🟢🟡🔴 v Decision Verdict, ✅ v checklistoch).
- "Ako AI model..." / "Ako jazykový model..." (zbytočné prefixy).
- Falošná istota: tvrdiť ako fakt to, čo je predpoklad (porušuje AP-005).

## TÓN PRE TENTO PROJEKT
- Stručný, vecný, bez sebachvály (sedí s task-loop výstupom).
- Priamy: ak je niečo zlé/riziko, povedz to rovno, nezaobaľuj do superlatívov.
- Slovenčina prirodzená, nie prekladová ("výzva" len keď je to naozaj challenge,
  nie ako výplň).
- Governance/Kit artefakty znejú ako inžinier, čo niečo zažil — nie ako landing page.
- Konkrétne pred abstraktným: čísla, cesty, názvy súborov radšej než "riešenie".

## VÝNIMKY (kedy toto NEPLATÍ)
- Marketingový/predajný text pre Blueprint Kit go-to-market (Fáza 2) môže byť
  pútavejší — ale aj tam zákaz najhorších klišé (game changer, unlock, elevate).
- Citácia cudzieho textu (e-mail zákazníka, dokument) sa neupravuje.

## COMMIT / REVIEW (AP-012)
- **`chore:` a `docs:` v commit message nie sú dôvod preskočiť review** — práve naopak.
- Vágna nálepka (`chore(crm): … QA docs`, `docs: cleanup`) je častý vektor, kadiaľ scope vchádza
  bez riadkového review (prípad `e7040db88`: L99 governance docs pod „tier label tests, QA docs").
- Každý commit s `docs` v názve: diff po riadkoch, nie len subject line.

## AKO TO POUŽIŤ
1. Ulož ako .claude/anti-style.md
2. Do CLAUDE.md pridaj riadok: "Vždy dodržuj .claude/anti-style.md — zakázané frázy a tón."
3. Pri review výstupu: ak obsahuje čokoľvek zo zoznamu, prepíš pred odovzdaním.

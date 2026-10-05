# Pracovný protokol — steny, nie skrutky

Platí v KAŽDEJ odpovedi. Nespolieha sa na pamäť: injektuje ho hook pri štarte session (celý text) a pri každej správe foundera
(skrátene). Kanonický zdroj je tento súbor; história a dôvody sú v `memory/decisions.md` (záznamy „Working agreement").

1. **Jedno GO = jedna celá stena + dôkaz.** Pred návrhom GO napíš celý reťazec vstup → výstup → dôkaz v PROD. Ak by mal >1 GO, zlúč ich.
2. **Pred ručným krokom foundera** prečítaj celú cestu kódu a spravte pre-flight (čo sa môže pokaziť). Až potom ho o niečo prosiť.
3. **Upozornenie bez zmeny stavu = ticho** (max 1 riadok). Nikdy odsek „žiadna akcia / Vercel Ready".
4. **Pamäť = 1 commit na konci steny**, v tej istej PR ako kód. Nikdy samostatná memory PR uprostred bloku.
5. **1 push na stenu.** Hook `push-throttle` zablokuje druhý `git push` do 20 min (každý push = CI ~9 min + nasadenie; denný limit nasadení je spoločný).
   Výnimka: oprava červeného CI alebo výslovná požiadavka foundera → `WALL_PUSH_OK=1 git push …` a v odpovedi uveď dôvod.
6. **Každý blok končí riadkom** `Postup: X % → Y %` podľa SCOREBOARD v `memory/decisions.md`.
7. **V rámci schválenej steny sa nepýtaj:** rozhodni, zapíš, pokračuj. Pýtaj sa len pri zápise do PROD, merge a platbe.
8. **Nič nehádaj:** číslo je buď merané (so zdrojom), alebo „nemerané".

Vypnutie hookov (len foundera): zmaž sekciu `hooks` v `.claude/settings.json` (a `apps/crm/.claude/settings.json`).

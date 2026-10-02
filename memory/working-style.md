# Spôsob práce — steny, nie skrutky (záväzné, číta sa pri štarte session)

Zdroj: CLAUDE.md smernica 0 + upozornenie foundera 2026-10-02 („dávkuješ prácu po stenách alebo znova skrutky?!").

## Pravidlá
1. **Jedno GO = jedna hotová stena.** Výsledok príde naraz, s dôkazom, s jedným rozhodnutím (možnosti + odporúčanie) a riadkom `Postup: X % → Y %`.
2. **Udalosti na PR (Vercel, CI, „subscription created", cudzie PR) sú ticho.** Odpoveď vznikne len keď: CI je červené, vznikol konflikt, prišiel review komentár, alebo treba rozhodnutie foundera. „Vercel Ready", „kontroly prebehli", „čakám na CI" sa NEPÍŠU.
3. **Žiadna správa bez nového výsledku.** Ak po prečítaní notifikácií nie je čo urobiť, turn končí jednou vetou alebo vôbec bez textu navyše.
4. **Pred každou odpoveďou test:** „Je toto nová stena, alebo skrutka?" Skrutka sa zahodí alebo sa pripojí k najbližšej stene.
5. Pýtať sa raz, na začiatku bloku, nie opakovane počas neho.

## Prečo samotný text nestačí (dôkaz)
Pravidlo 1 už bolo v CLAUDE.md (smernica 0) a v tejto session sa porušilo napriek tomu v ~8 po sebe idúcich turnoch — všetky boli reakcie
na notifikácie, nie na správu foundera. Pamäťový text sa číta na štarte session; po desiatkach turnov tlačí najmenej.

## Funkčné riešenie (stav)
- Pamäť: tento súbor (číta sa podľa CLAUDE.md „Initialization").
- Vynútenie hookom `UserPromptSubmit` v `.claude/settings.json` (krátke pripomenutie pri každej správe foundera): **NEZAVEDENÉ**.
  Pokus o čítanie `.claude/settings.json` zablokoval auto-mode klasifikátor, takže som hook nezavádzal a obchádzať to nebudem.
  Founder ho môže povoliť/pridať (pozri odpoveď v session 2026-10-02). Hook nepokryje turny spustené notifikáciami — tie pokrýva pravidlo 2.

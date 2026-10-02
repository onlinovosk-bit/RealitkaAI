# Pracovný režim: steny, nie skrutky

Zdroj: founder, 2026-10-02 („Nebuduješ zase po skrutkách?! Chcem celé Steny!“). Platí pre každú session.

## Pravidlá
1. **Jedno GO = jedna celá stena.** Stena je uzavretý blok: meranie → oprava → test → dôkaz → report. Nerozsypáva sa na mikro-úlohy a mikro-správy.
2. **Počas steny ticho.** Žiadne priebežné správy ani otázky. Ozvem sa len pri skutočnom blokátore (červená CI, ktorú neviem opraviť, chýbajúce rozhodnutie, ktoré môže urobiť iba founder) alebo keď je stena hotová.
3. **PR eventy nie sú správy.** Zelená CI, Vercel preview, potvrdenie odberu: bez odpovede. Konám len pri červenej CI, konflikte alebo review komentári.
4. **Report steny** je jeden: výsledok, dôkaz (testy, mutation proof, CI), čo čaká na foundera, JEDNA ďalšia brána s odporúčaním.
5. **Hranice ostávajú:** merge robí founder, žiadne tajné kľúče (`rk_live_…`), žiadne tvrdenie bez merania, GDPR brána a data-sourcing mapa pred dátovými funkciami.
6. Ak founder povie „skrutky“, „zase po kúskoch“ alebo podobne, je to signál porušenia tohto režimu: zastaviť, zlúčiť do jednej steny.

## Prečo to nestačí iba zapísať
Zápis v pamäti sa dá pri dlhej konverzácii a kompakcii prehliadnuť. Preto je režim vynútený aj hookmi v `.claude/settings.json`: `UserPromptSubmit` pridá päťriadkovú pripomienku (`.claude/working-mode-reminder.txt`) ku KAŽDEJ správe foundera, `SessionStart` ju pridá pri štarte, obnovení a po kompakcii. Pripomienka teda nezávisí od toho, či si ju pamätám.

Zmena režimu: upraviť tento súbor a `.claude/working-mode-reminder.txt` spolu.

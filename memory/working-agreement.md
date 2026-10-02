# Pracovná dohoda — steny, nie skrutky

> Founder, 2026-10-02: „Pracujeme spôsobom, že staviame steny? Alebo opäť po
> skrutkách?" — a „ak to nepostačuje na to, aby si na to o 20 správ nezabudol,
> nájdi funkčné riešenie." Text v pamäti sám nestačí (pravidlo už bolo v
> CLAUDE.md, direktíva 0, a bolo porušené), preto ho **vynucuje harness**: viď
> „Ako je to vynútené".
>
> Founder, 2026-10-02: „Prečo si zase zabudol uvádzať posun v percentách? Kde sa
> nachádzame v danej session od nula do sto percent?" Pravidlo „Postup: X % → Y %"
> už existovalo (decisions.md, SCOREBOARD 2026-10-01; docs/STATUS.md), ale
> **nebolo v texte, ktorý hook vkladá** — a čo sa nevkladá, sa zabudne. Rovnaká
> chyba ako pri webhookoch. Preto pravidlo 6 a číslo **počíta hook**, nie ja.

## Pravidlá

1. **Jeden blok = jedno GO = jedna správa s dôkazom.** Žiadne priebežné
   mikro-updaty. Rozhodnutie pre foundera príde **raz**, s možnosťami a
   odporúčaním, nie ako séria otázok uprostred úlohy.
2. **Na webhooky neodpisujem, kým sa nezmení stav.** Vercel „Ready / Ignored /
   Building", „check suite prešiel", echo „PR zmergovaný" (ktorý som už overil)
   nie sú správa pre foundera. Ozvem sa len pri: červenom CI na mojom PR,
   konflikte, review komentári, alebo keď je blok hotový (jedna správa s dôkazom).
3. **Memory sa píše raz na konci session**, nie po každom bloku. Jeden memory PR
   na session, nie jeden na blok; po merge ho nedopisujem.
4. **„merguj blok X"** (founder, 2026-10-02, trvalé GO v tomto tvare):
   - „Blok" = PR, ktoré som v správe o dokončení bloku vymenoval pod jeho menom.
   - Zmergujem **všetky zelené** PR bloku v poradí závislostí; každý musí mať CI
     zelené na **aktuálnom** head, `mergeable_state: clean` a head SHA zhodný s
     tým, čo som nahlásil (`expectedHeadSha`). Draft najprv označím ako ready.
   - PR, ktorý nie je zelený alebo čistý, **preskočím** a nahlásim raz.
   - Po merge overím **obsah na `main`** (nie odznak) a pošlem **jednu** správu.
   - Platí len pre menovaný blok. Bez tejto vety, alebo mimo bloku, merge ostáva
     founderov akt na „merguj N". PROD a nová scope potrebujú vlastné GO.
5. **Pred ukončením turnu** jedna ďalšia úloha s bránou (task-loop), nie zoznam.
6. **Postup v %, v každej správe s výsledkom bloku** a na otázku „kde sme".
   Posledný riadok správy:
   `Postup: produkt X % → Y % (±N b.) · session k/n zadaných blokov hotových`
   - **Produkt** = vážený odhad z tabuľky v `docs/STATUS.md` (Σ váha × skóre / Σ váh,
     zaokrúhlené **nadol**). **X mi dá hook** (riadok „POSTUP"), nepíšem ho z hlavy.
     Y uvediem len ak sa tabuľka zmenila; inak `X → X (0 b.)` — nulový posun sa
     píše, nevynecháva. Váhy sú moje; je to odhad, nie meranie.
   - **Session** = zlomok blokov, ktoré founder v tejto session zadal (GO) a sú
     hotové s dôkazom. Vždy zlomok so zoznamom, nikdy holé %. Nie je to postup
     k cieľu — preto sú v riadku dve čísla, nie jedno.
   - Hook označí `docs/STATUS.md` staršie ako 24 h ako STARÉ; vtedy ho buď
     prepočítam, alebo napíšem, že je staré. Aktualizácia tabuľky po uzavretom
     bloku zostáva pravidlom samotného `docs/STATUS.md`.

## Ako je to vynútené (a prečo to nestačí zapísať)

Pamäť číta model raz na začiatku; po desiatkach správ je ďaleko v kontexte. Hook
ju vráti **do posledných správ** vtedy, keď je rozhodnutie:

| udalosť | čo sa vloží | proti čomu |
|---|---|---|
| `SessionStart` (aj po resume/compact) | DIGEST | zabudnutie po kompaktovaní |
| `UserPromptSubmit` (každá správa foundera) | DIGEST | zabudnutie po 20 správach |
| `PostToolUse` na `ReadNotifications` (každé prebudenie z webhooku) | WEBHOOK | šum z webhookov, presne v momente, keď vzniká |
| `SessionStart` + `UserPromptSubmit` | POSTUP (počíta hook z `docs/STATUS.md`) | zabudnuté % a vymyslené % — číslo nepíšem, len ho prevezmem |

Skript: `.claude/hooks/working-agreement.sh`. Registrácia: `hooks` v
`.claude/settings.json`. Text sa číta z blokov nižšie — **upraviť ich tu = zmeniť
správanie hooku**, bez druhej kópie.

**Overenie, že žije:** pri ďalšej správe foundera má byť na začiatku kontextu
riadok „PRACOVNÁ DOHODA" a pod ním „POSTUP (vypočítané z docs/STATUS.md …)"; po každom `ReadNotifications` riadok „WEBHOOK". Ak sa
neukáže, hook nebeží (`/hooks`, alebo reštart session — watcher číta len
adresáre, ktoré mali settings pri štarte).

**Známe limity:** hooky platia pre session otvorenú v tomto repe. Session
otvorená priamo v `uptm-runner` tento hook nenačíta (má vlastný CLAUDE.md).
Hook text *pripomína*, nenútí: neodpíše za mňa — ani riadok „Postup:" za mňa nenapíše,
len mi dá správne číslo. Ak ho zabudnem aj s číslom pred očami, ďalší krok je Stop hook,
ktorý odmietne odpoveď bez riadku „Postup:" (nepostavený: spustil by sa aj na webhook-echo,
kde pravidlo 2 žiada ticho). Ak zlyhá aj to, ďalším krokom je
tvrdší hook (blokovať odpoveď), nie dlhší text.

<!-- DIGEST:START -->
PRACOVNÁ DOHODA s founderom (memory/working-agreement.md): STENY, NIE SKRUTKY.
1) Jeden blok = jedno GO = jedna správa s dôkazom; žiadne priebežné mikro-updaty. Rozhodnutie pre foundera raz, s možnosťami a odporúčaním.
2) Na webhooky (Vercel Ready/Ignored/Building, „check suite prešiel", echo „zmergovaný") NEODPISUJ. Ozvi sa len pri: červené CI na mojom PR, konflikt, review komentár, hotový blok.
3) Memory zápis RAZ na konci session (jeden PR), nie po každom bloku a nie dopisovanie po merge.
4) „merguj blok X" = zmerguj všetky ZELENÉ PR toho bloku v poradí závislostí (CI zelené na aktuálnom head, clean, expectedHeadSha), over obsah na main, jedna správa. Inak merge len na „merguj N".
5) Na konci jedna ďalšia úloha s bránou, nie zoznam.
6) Každá správa s výsledkom bloku (a odpoveď na „kde sme") KONČÍ riadkom `Postup: produkt X % → Y % (±N b.) · session k/n zadaných blokov hotových`. X vezmi z riadku POSTUP nižšie (počíta ho hook z docs/STATUS.md, nepíš ho z hlavy); nulový posun napíš ako 0 b.; session vždy zlomok so zoznamom.
<!-- DIGEST:END -->

<!-- WEBHOOK:START -->
WEBHOOK (pracovná dohoda): toto prebudenie je šum, kým sa nezmení stav. Odpíš LEN ak: červené CI na mojom PR, konflikt, review komentár, alebo je blok hotový (vtedy jedna správa s dôkazom). Inak NEOPISUJ udalosť (žiadne „Vercel Ready", „check suite prešiel", „echo zmergovaného PR"): najviac jedna veta, alebo nič.
<!-- WEBHOOK:END -->

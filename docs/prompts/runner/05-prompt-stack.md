# 05 — PROMPT STACK

Prompt workera sa **nikdy neskladá ručne.** Orchestrátor ho vygeneruje zo
siedmich vrstiev do `PROMPT.md` v tom worktree a zapíše hash každej vrstvy
do task kontraktu.

Keď sa o mesiac spýtaš, čím bol agent riadený, odpoveďou je sedem hashov,
nie spomienka.

---

## Sedem vrstiev

```
S0  SYSTEM        ústava (00-system.md), nemenná, identická pre každého
S1  PROJECT       relevantné pravidlá repa, architektúra, governance
S2  TASK          jeden konkrétny uzol z DAG
S3  TERRITORY     write-set, read-set, forbidden — generované z vlny
S4  ACCEPTANCE    čo musí byť pravda po dokončení
S5  VALIDATION    doslovné príkazy, ktoré ho budú súdiť
S6  FAILURE       čo urobiť pri blokácii
S7  HANDOFF       aký artefakt odovzdá orchestrátorovi
```

Poradie je záväzné. Pri rozpore platí **nižšie číslo**.

---

## Prečo vrstvy a nie jeden prompt

**S0 sa nedá zabudnúť.** Je to jeden súbor pripojený ku každému promptu.
V ručne skladaných promptoch sa raz niektoré pravidlo vynechá — a bude to to,
na ktorom záleží.

**S5 je doslovný príkaz, nie parafráza.** Agent vidí presne ten reťazec, ktorý
ho bude súdiť. Keď ho preformuluje človek, vzniká rozdiel medzi tým, čo si agent
myslí, že má splniť, a tým, čo sa meria.

**Pri zlyhaní sa dá ukázať vrstva.**

```
porušil územie                    -> S3
nepochopil úlohu                  -> S2
minul bránu, o ktorej nevedel     -> S5
urobil niečo zakázané             -> S0
pri blokácii pokračoval odhadom   -> S6
neodovzdal, čo mal                -> S7
```

Bez vrstiev je každé zlyhanie len „zlý prompt" a nedá sa opraviť adresne.

---

## Pravidlá skladania

```
Worker nikdy nedostane širší scope, než potrebuje.
S1 obsahuje len pravidlá relevantné pre jeho územie, nie celý CLAUDE.md.
S2 obsahuje jeden uzol. Nikdy dva, ani keď sú podobné.
S4 a S5 nesmú byť parafrázou toho istého — S4 je stav, S5 je príkaz.
Žiadna vrstva neobsahuje credentials ani hodnoty tajomstiev.
```

---

## Zápis do kontraktu

```json
"prompt_stack": {
  "S0": { "file": "docs/prompts/runner/00-system.md", "sha256": "" },
  "S1": { "file": "", "sha256": "" },
  "S2": { "inline": true, "sha256": "" },
  "S3": { "inline": true, "sha256": "" },
  "S4": { "inline": true, "sha256": "" },
  "S5": { "inline": true, "sha256": "" },
  "S6": { "file": "docs/prompts/runner/07-worker-contract.md", "sha256": "" },
  "S7": { "file": "docs/prompts/runner/07-worker-contract.md", "sha256": "" }
}
```

Hashe sa počítajú z presného textu, ktorý agent dostal — nie zo súboru na disku
v čase auditu. Ak sa súbor medzitým zmenil, hash to ukáže.

---

## Čo stack nerieši

Buďme presní, aby sa tomu neprikladalo viac, než unesie.

```
Stack nezaručuje, že agent pravidlá dodrží. Zaručuje, že ich dostal,
a že sa dá dokázať, ktoré presne.
```

Vynucovanie robia brány a kontrola územia, nie prompt. Stack je dôkazný
mechanizmus, nie donucovací.

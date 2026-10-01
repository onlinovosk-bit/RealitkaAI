# rme-les-20260722-002 — Tri prospekty dostali ten istý cold email dvakrát

**Cieľová cesta:** `brain/lessons/2026-07-22-duplicitne-emaily.md`
**Dátum:** 2026-07-21/22 · **Kategória:** BIZNIS · **Závažnosť:** stredná

**chyba:** TOP Real Košice, ZARA REALITY a Staviame Bývanie Prešov dostali
cold email 21.07 večer (verzia s odkazom na web v podpise) a znova 22.07
ráno (nová verzia bez odkazu) — dva takmer identické emaily do 12 hodín.

**dopad:** Riziko, že prvý dojem u troch prospektov je „spam". Nikto z nich
neodpovedal negatívne, ale nemerateľne poškodená dôveryhodnosť a mierne
zvýšené riziko spam-report u nezahriatej domény `revolis.ai`.

**rootCause:** Founder odoslal časť pripravených konceptov **skôr**, než AI
dokončila hromadné mazanie starej verzie a vytvorenie novej. Stav „čo je
odoslané vs. čo je koncept" existoval len v hlave/chate, nie v jedinom
autoritatívnom zdroji. AI navyše ešte hodiny neskôr pracovala so zastaraným
predpokladom „9 konceptov čaká", pričom už boli všetky odoslané.

**detekcia:** Pri neskoršej forenzike Gmailu (`in:sent newer_than:1d`)
kvôli inému účelu — nie systematicky.

**fix:** Stav trackera zosúladený so skutočnosťou priamo z Gmailu (nie
z pamäte). Do call listu pridaná poznámka + odzbrojujúca veta pre telefonát
(„áno, aktualizovali sme text, systém poslal obe verzie, ospravedlňujem sa").

**prevencia:**
1. **Gmail je autoritatívny zdroj** stavu odoslania, nie chat ani pamäť AI.
   Pred akoukoľvek zmenou stavu v trackeri sa overí `in:sent` / `in:draft`.
2. Nikdy nemazať a nevytvárať koncepty pre tú istú kampaň, kým sa
   nepotvrdí, že žiadny z nich nebol odoslaný.
3. **n8n W3 odpoveď-detektor** ohlási reakcie prospektov do 1 h, takže stav
   sa nedozvie AI až pri forenzike.
4. Rozložiť odosielanie na hodiny, nie minúty (21 emailov za 3 min je
   spam-bot vzorec).

**prevenciaOverena:** false — pravidlo #1 sa už raz uplatnilo (oprava
trackera z Gmailu), ale W3 detektor ešte nie je aktivovaný a rozložené
odosielanie nebolo pri ďalšej vlne otestované.

**suvisiaceRozhodnutia:** W1/W3 n8n workflowy; opt-out veta v každom maile;
tracker ako sekundárny, nie primárny zdroj stavu.

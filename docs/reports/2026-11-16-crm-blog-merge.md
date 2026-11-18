# Zlúčenie draft článkov CRM (16. 11. 2026)

**Vetva:** `cursor/merge-crm-blog-drafts-611f`
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/956 (Draft)
**GO:** Founder 16. 11. 2026 — zlúčiť `crm-pre-realitnych-maklerov` do `crm-pre-realitnych-maklerov-ako-vybrat`; oba nové články `published: false`; zverejnenie NEMÁ GO; never merge/deploy; nemeň `vercel.json` ani CI.
**Base:** `main` @ `933e65b1` (PR #954).

## Odkaz na PR

https://github.com/onlinovosk-bit/RealitkaAI/pull/956 (Draft) — vetva `cursor/merge-crm-blog-drafts-611f`.

## Čo sa zmenilo

- `apps/marketing/lib/blog.ts` — odstránený záznam a konštanta `CRM_ARTICLE_SLUG`; checklist má zlúčené telo (**1029 slov**).
- `apps/marketing/__tests__/blog.test.tsx` — starý slug chýba v katalógu; checklist overuje presunuté fakty (portály, dve knihy, CSV/XLSX/RealSoft); bez refund.
- `apps/marketing/__tests__/seo.test.ts` — sitemap bez starého aj nového slug-u.
- `docs/reports/2026-11-16-crm-blog-merge-plan.md`, tento report.

**Nemením:** `vercel.json`, CI workflow, `published: true`, AI inzerát článok.

## Odkazy na starý slug

`rg crm-pre-realitnych-maklerov` v kóde: len testy (že slug **nie je** v katalógu ani v sitemape) a historické `docs/` / `memory/`. Žiadny runtime odkaz, žiadny `Link`, žiadny rewrite. Článok nikdy nebol `published` (`dynamicParams=false` → 404). Presmerovanie netreba.

## Čo sa presunulo zo staršieho článku

| Z starého | Kam v checkliste |
|---|---|
| Tri oddelené záznamy (schránka, hárok, pamäť); piatok popoludní; medzera medzi mailom a hovorom | Úvod pod „Prečo desať otázok…“ |
| Portály Nehnuteľnosti.sk, TopReality, Reality.sk, Bazoš, Byty.sk; výber kontaktu a ID inzerátu | Otázka 2 |
| Nie je auto-odpoveď; správa ostáva v kancelárii; nájsť dopyt pri kontakte aj nehnuteľnosti | Otázka 2 |
| Dve knihy (ľudia + nehnuteľnosti); priečinok s fotkami vs karta ponuky | Otázka 3 |
| Text z parametrov, nie z vymysleného marketingu | Otázka 4 |
| Import CSV (Excel, Google Sheets), .xlsx, RealSoft + mapovanie stĺpcov | Otázka 6 |
| Dva systémy v prvom mesiaci, ak kontakty ostanú vonku | Otázka 6 |

## Čo sa vynechalo a prečo

| Vynechané | Prečo |
|---|---|
| **100 % peňazí späť do 30 dní** | Founder: refund v novej copy nespomínať. |
| Sekcia „Čo overiť pred výberom CRM“ (6 bodov) | Duplicita desiatich otázok. |
| Samostatné H2 „Prečo tabuľka…“, „Dopyty z realitných portálov“, „Evidencia…“, „Text inzerátu“, „Prechod z CSV…“ | Boli by druhý článok v jednom; fakty sú v odpovediach 1–6. |
| „Nepýtajte sa najprv na umelú inteligenciu“ | To isté hovoria otázky 1–3 a 7; šetrí slová. |
| Keyword „CRM pre realitných maklérov“ ako hlavné | Ostáva checklist keyword `ako vybrať CRM pre realitných maklérov`, aby sa články nekanibalizovali. |
| Dlhší postup písania inzerátu | Žije v `ai-inzerat-nehnutelnosti`; v checkliste ostala výberová otázka. |

## Testy

| Kontrola | Výsledok |
|---|---|
| `npx vitest run` apps/marketing | 89/89 PASS |
| `npx tsc --noEmit` apps/marketing | exit 0 |
| `marketing-blog.verification.test.ts` | 1/1 PASS |

CI na heade `7afdc06d`: **Lint, test, build** pass 7m50s ([beh](https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/43841421308)). Merge nie.

## Výsledné znenie zlúčeného článku (1029 slov)

- slug: `crm-pre-realitnych-maklerov-ako-vybrat`
- SEO title: Ako vybrať CRM pre realitných maklérov: 10 otázok pred rozhodnutím
- meta description: Desať otázok pred výberom CRM pre realitných maklérov: dopyty, kontakty, inzerát, import a skúška bez karty.
- keyword: ako vybrať CRM pre realitných maklérov
- published: false

# Ako vybrať CRM pre realitných maklérov: 10 otázok pred rozhodnutím

Kancelária zvyčajne nekupuje ďalší program. Kupuje odpoveď na to, či dopyt z portálu skončí v evidencii, alebo v schránke, kým maklér stojí na obhliadke. Tento text je výberový checklist: desať otázok, ktoré si položte na ukážke alebo vo vlastnom účte, kým sa rozhodnete. Nie je to prehľad toho, čo má realitné CRM všeobecne vedieť. Tu ide o praktický výber.

Hlavná otázka tohto checklistu je **ako vybrať CRM pre realitných maklérov**. Otázky sú zámerne konkrétne: ide o to, čo uvidíte na obrazovke, nie o sľub v prezentácii.

## Prečo desať otázok namiesto porovnávacej tabuľky

Porovnávanie programov podľa mena kancelárii nepomôže, ak nevie, ktorý problém má dnes. Maklér stratí čas tam, kde dopyt ostane v maili, inzerát sa píše z čistého papiera a kontakty žijú v súkromnom hárku. Checklist nižšie tie miesta pomenúva. Každú otázku overte na vlastných dátach, nie na ukážkovom účte s vymyslenými menami.

Tabuľka je dobrá na zoznam. Schránka je dobrá na správy. Ani jedna z nich nie je evidencia obchodu. Keď dopyt príde na spoločný e-mail, ostane tam, kým ho niekto neprečíta a neprepíše. Ak ho asistentka vloží do hárku a maklér volá z telefónu, vzniknú tri oddelené záznamy: správa v schránke, riadok v tabuľke a pamäť makléra. V piatok popoludní, keď klient čaká na termín, nie je jasné, ktorý z nich platí. Medzi doručením mailu a prvým hovorom vzniká medzera, v ktorej záujemca čaká.

Ak na otázku nedostanete jasnú odpoveď do niekoľkých minút, ostávate pri tom, čo už máte — schránke a tabuľke.

## 1. Kam dnes padne dopyt, keď maklér nie je pri počítači?

Opýtajte sa: príde správa z portálu a niekto v kancelárii ju nájde v evidencii, alebo ostane v osobnej schránke, kým sa maklér vráti z terénu? CRM, ktoré dopyt neuloží, vás vráti k prepisovaniu. Overte to na maili, ktorý naozaj používate, nie na vete, že portály sú podporované.

## 2. Uloží sa portálový e-mail ako dopyt s kontaktom?

Na Slovensku chodia dopyty predovšetkým e-mailom z inzertných portálov. Maklér ich inak ručne kopíruje: meno, telefón, odkaz na inzerát, veta od záujemcu. Revolis vie tieto správy prijať a uložiť ako dopyt: rozpozná bežné portály podľa textu alebo odosielateľa — Nehnuteľnosti.sk, TopReality, Reality.sk, Bazoš aj Byty.sk — a z tela vyberie kontakt, identifikátor inzerátu a text.

To nie je tlačidlo na zverejnenie ponuky ani odpoveď namiesto vás. Správa ostáva vo vašej kancelárii. Úlohou CRM je dopyt uložiť tak, aby ste ho našli pri kontakte a pri nehnuteľnosti, nie aby žil iba v doručenej pošte.

Test: ukážte skutočný mail z vášho portálu. Pribudne dopyt s menom a telefónom, alebo ostane v schránke?

## 3. Vidíte na karte človeka aj nehnuteľnosť?

CRM pre realitných maklérov musí evidovať dve knihy naraz. Prvá je kniha ľudí: záujemcovia, predávajúci, volania, poznámky. V Revolise je to zoznam klientov a príležitostí — meno, kontakt, zdroj, stav. Druhá je kniha nehnuteľností: byty, domy, pozemky, lokalita, parametre, stav ponuky. V Revolise má kancelária evidenciu so zoznamom, filtrami a kartou ponuky.

Ak evidujete len kontakty, viete komu volať, ale neviete, o čo. Ak evidujete len inzeráty v priečinku s fotkami, viete čo ponúkate, ale neviete, kto sa ozval. Text inzerátu a dopyt z portálu dávajú zmysel až vtedy, keď viete, ku ktorej nehnuteľnosti patria.

Praktický test: otvorte kartu človeka a kartu ponuky. Vidíte históriu kontaktu a parametre? Ak nie, ostávate pri tabuľke v inom obale.

## 4. Vzniká text inzerátu z parametrov, alebo z čistého papiera?

Pýtajte sa, či text vzniká z typu, lokality, výmery, ceny, stavu a vybavenia, ktoré už máte. Revolis má generátor inzerátu: zadáte parametre a pripraví sa text na portál, Facebook, Instagram a e-mail. Nie je to automatické zverejnenie na portál. Overte, že text vzniká z parametrov, nie z vymysleného marketingu.

## 5. Dá sa text pred použitím upraviť?

Generátor, ktorý sa nedá opraviť, je pre kanceláriu riziko. V Revolise sa text pred použitím upraví a úpravy sa uložia. Overte, že maklér vidí návrh skôr, než ho niekam vloží.

## 6. Ako prenesiete kontakty, ktoré už máte?

Nové CRM bez starých dát je prázdna skriňa. Kancelárie bežne prichádzajú s tabuľkou kontaktov alebo s exportom z doterajšieho systému. Ľudia prechádzajú aj z RealSoftu.

Revolis má import príležitostí z CSV (Excel, Google Sheets) a sprievodcu, ktorý prečíta CSV aj súbor .xlsx. V sprievodcovi je medzi zdrojmi aj RealSoft: stĺpce sa mapujú na kontakty a súvisiace polia. Prechod teda nie je sľub, že to niekto niekedy prenesie, ale import, ktorý kancelária spustí vo vlastnom účte.

Overte, či viete priniesť aspoň kontakty. Ak ostanú v starom systéme, prvý mesiac budete žiť v dvoch evidenciách a prepisovanie sa len presunie, nezmizne.

## 7. Odíde správa klientovi bez vášho schválenia?

Toto je otázka dôvery, nie módneho slova o automatizácii. V Revolise sa návrh odpovede na nový dopyt uloží ako koncept. Odoslanie je rozhodnutie makléra — spracovanie dopytu samo o sebe správu neposiela. Ak vám niekto sľúbi, že systém odpovie za vás, pýtajte sa, kto stlačí odoslať.

## 8. Pracuje kancelária v jednom účte?

Keď maklér odíde, majú ostáť dopyty v kancelárii, nie v súkromnej schránke. Pýtajte sa, či tím vidí spoločnú evidenciu. Táto otázka nie je o cene sídla. Je o tom, či kontakty patria kancelárii.

## 9. Ako vyzerá skúška bez karty?

Revolis môžete vyskúšať 14 dní zadarmo, bez platobnej karty. Po skončení skúšobná verzia prejde do režimu len na čítanie a nič sa neúčtuje automaticky. Overte, či naozaj nemusíte zadávať kartu a čo sa stane s dátami po skončení skúšobnej doby.

## 10. Nájdete človeka, keď klient zavolá?

Praktický test: kolega povie meno alebo telefón z dnešného dopytu. Nájdete kartu do chvíle, kým hovor zvoní, alebo hľadáte v schránke? Ak CRM toto nezvládne, ostatné funkcie sú ozdoba.

## Čo to znamená pre makléra

Pred výberom si kancelária overí desať vecí na vlastných dátach, nie na slajde. Dopyt z portálu má skončiť v evidencii, nie v troch oddelených záznamoch. Človek a nehnuteľnosť majú byť na jednom mieste. Text inzerátu má vzniknúť z parametrov a má sa dať opraviť. Kontakty z CSV, XLSX alebo RealSoftu majú ísť importom. Správa klientovi má čakať na vás.

Ak chcete checklist vyskúšať na vlastných dopytoch, Revolis je **14 dní zadarmo, bez platobnej karty**. Po skončení sa nič neúčtuje automaticky. [Vytvoriť účet na app.revolis.ai](https://app.revolis.ai/register)

/**
 * A3 golden regression fixtures — 4 schválené listing texty (Smolko demo).
 * Input = PRED / fakta zo sales docs; approvedPortalText = K3 C4 výstup.
 * Vlastnosti výstupu (nie doslovný snapshot assert) sú v listing-golden.test.ts.
 */
import type { PropertyInput } from "@/lib/ai/listing-content";

export type ListingGoldenFixture = {
  id: string;
  label: string;
  sourceDocs: string[];
  input: PropertyInput;
  broker: { name: string; nameNeedles: string[]; phone: string };
  /** Povolené faktické tokeny / frázy odvoditeľné zo vstupu (allowlist). */
  allowedFacts: string[];
  /** Uložený K3/approved portal_text — validuje sa BEZ LLM volania. */
  approvedPortalText: string;
};

export const LISTING_GOLDEN_FIXTURES: ListingGoldenFixture[] = [
  {
    "id": "sabinov",
    "label": "Sabinov — 2-izbový byt so záhradkou",
    "sourceDocs": [
      "docs/sales/smolko-inzerat-demo-2026-07-30.md",
      "apps/crm/tests/verification/fixtures/listing-c4/t1-sabinov.json"
    ],
    "input": {
      "type": "2-izbový byt",
      "location": "Sabinov",
      "size_m2": 64,
      "floor": 0,
      "total_floors": 3,
      "price": 131000,
      "rooms": "2",
      "condition": "po čiastočnej rekonštrukcii",
      "features": [
        "zateplený dom",
        "murovaná pivnica",
        "malá záhradka",
        "nové sadrokartónové stropy",
        "prízemie"
      ],
      "agent_notes": "PRED portálový text (fakty): 2-izbový byt Sabinov 64 m² prízemie, čiastočná rekonštrukcia, zateplený dom, murovaná pivnica, malá záhradka, nové sadrokartónové stropy. Maklérka: Eva Burgrová, 0907 920 193. Portfóliové porovnanie (ak použiť): Prešov 2-izbový 158 000 € / 49 m² ≈ 3 224 €/m².",
      "charakterLokality": {
        "kind": "malé mesto",
        "text": "Sabinov nie je Prešov — menšie mesto"
      }
    },
    "broker": {
      "name": "Eva Burgrová",
      "nameNeedles": [
        "Burgrov"
      ],
      "phone": "0907 920 193"
    },
    "allowedFacts": [
      "2-izbový",
      "byt",
      "Sabinov",
      "64 m²",
      "64",
      "prízemie",
      "3",
      "131 000 €",
      "131000",
      "131 000",
      "2047",
      "2 047",
      "čiastočná rekonštrukcia",
      "čiastočne zrekonštruovaný",
      "zateplený dom",
      "murovaná pivnica",
      "záhradka",
      "sadrokartónové stropy",
      "Eva Burgrová",
      "Burgrovej",
      "0907 920 193",
      "malé mesto",
      "Sabinov nie je Prešov"
    ],
    "approvedPortalText": "Ráno vyjdete z bytu a stojíte na vlastnej tráve — nie na spoločnej chodbe.\n\nPreto je tento byt na prízemí. Vlastná záhradka pri byte inak neexistuje: buď prízemie a kúsok zeme, alebo vyššie poschodie a balkón. Tu máte 2-izbový byt 64 m² v Sabinove, čiastočne zrekonštruovaný, v zateplenom dome, s novými sadrokartónovými stropmi. K bytu patrí murovaná pivnica — skutočná pivnica, nie kobka v spoločnej chodbe — a malá záhradka, ktorú si na obhliadke môžete prejsť krok za krokom.\n\nCena 131 000 € pri 64 m² je 2 047 €/m². Čísla hovoria sami: za túto sumu kupujete výmeru aj vonkajší priestor, ktorý na vyšších poschodiach neexistuje. Ak chcete porovnať cenu s inou lokalitou, do vstupu treba doplniť porovnávacie číslo — bez neho trhové porovnanie neuvádzame. [DOPLNIŤ: výmera záhradky v m²] [DOPLNIŤ: orientácia záhradky] [DOPLNIŤ: typ vykurovania]\n\nPre koho je to trafené presne:\n— Rodina s malým dieťaťom: priestor na hry vonku, bez nosenia kočíka po schodoch.\n— Majiteľ psa: ráno von bez výťahu a chodby.\n— Kto chce pestovať v zemi, nie v kvetináči na balkóne.\n— Kto nechce schody — dnes ani o pätnásť rokov.\n\nBytov s vlastnou záhradkou je toľko, koľko je bytov na prízemí. To nie je reklamný slogan, ale logický dôsledok dispozície. Zavolajte Eve Burgrovej na 0907 920 193 a na obhliadke si nechajte čas postáť na tej záhradke — to predáva lepšie ako akýkoľvek odsek o „prízemí“ v zozname parametrov. Ak Vám chýba rok výstavby alebo detail rekonštrukcie, pýtajte sa priamo na mieste; v texte ich nevymýšľame."
  },
  {
    "id": "teriakovce",
    "label": "Teriakovce — 4i rodinný dom",
    "sourceDocs": [
      "docs/sales/smolko-inzeraty-3x-2026-08-06.md",
      "apps/crm/tests/verification/fixtures/listing-c4/t2-terakovce.json"
    ],
    "input": {
      "type": "4-izbový rodinný dom",
      "location": "Teriakovce",
      "district": "Prešov",
      "size_m2": 102,
      "price": 325000,
      "rooms": "4",
      "condition": "rok výstavby 2012, kolaudácia 2013",
      "features": [
        "pozemok 698 m²",
        "všetko na jednom podlaží",
        "pochôdzne podkrovie s elektrinou",
        "terasa 18 m² krytá lexanom",
        "letná kuchyňa",
        "altánok",
        "podlahové vykurovanie",
        "studňa s ponorným čerpadlom",
        "čistička + 12 000 l nádrž",
        "optika",
        "3D obhliadka Matterport",
        "obecná kanalizácia v riešení",
        "MHD"
      ],
      "agent_notes": "Maklérka: Ing. Iveta Adamovičová, 0904 898 696. Úžitková 102 m², pozemok 698 m². Pôvodný titulok: Na predaj 4i RODINNÝ DOM, pozemok 698 m², TERIAKOVCE.",
      "charakterLokality": {
        "kind": "satelit",
        "text": "Teriakovce pri Prešove, MHD"
      }
    },
    "broker": {
      "name": "Iveta Adamovičová",
      "nameNeedles": [
        "Adamovič"
      ],
      "phone": "0904 898 696"
    },
    "allowedFacts": [
      "Teriakovce",
      "Prešov",
      "4",
      "102",
      "102 m²",
      "698",
      "698 m²",
      "325 000",
      "325000",
      "2012",
      "2013",
      "18 m²",
      "18",
      "lexan",
      "letná kuchyňa",
      "altánok",
      "podlahové vykurovanie",
      "studňa",
      "ponorným čerpadlom",
      "čistička",
      "12 000",
      "12000",
      "optika",
      "Matterport",
      "3D",
      "MHD",
      "Iveta Adamovičová",
      "Adamovičovej",
      "0904 898 696",
      "jednom podlaží",
      "podkrovie"
    ],
    "approvedPortalText": "V tomto dome neexistuje veta „vynesieš to hore?“ — niet kam. Celý život je dole.\n\n4 izby, úžitková 102 m², všetko na jednom podlaží. Podkrovie je pochôdzne, s elektrinou — sklad alebo priestor s potenciálom; absolútne „bez jediného schodu“ neuvádzame, kým nie je potvrdený prístup na pôjd. Vonku na 698 m² stojí letná kuchyňa, altánok a 18 m² terasa krytá lexanom: od jari do jesene máte o tri miestnosti viac, než hovorí pôdorys. To je zhmotnenie čísla — nie metafora, ale tri vonkajšie priestory navyše.\n\nDom z roku 2012 (kolaudácia 2013), podlahové vykurovanie, optika. Voda a odpad na rovinu: vlastná studňa s ponorným čerpadlom a čistička s 12 000 l nádržou; obecná kanalizácia je v riešení. V praxi ste menej viazaní na vodárne — bez sľubov o výnosoch, len o prevádzke. Cena 325 000 €.\n\nPre koho je to trafené presne:\n— Rodina, ktorá chce dvor na očiach, nie výhľad na cudzí dvor.\n— Kto nechce schody v obytnej časti — s kočíkom ani o dvadsať rokov.\n— Kto pracuje v Prešove a chce ticho; Teriakovce majú MHD.\n\nDom si môžete prejsť z gauča — má 3D obhliadku Matterport. Potom zavolajte Ivete Adamovičovej na 0904 898 696 a príďte si sadnúť do altánku. [DOPLNIŤ: parkovanie/garáž] [DOPLNIŤ: vzdialenosť do centra Prešova] [DOPLNIŤ: energetický certifikát]. Na obhliadke si overte aj to, či vedú schody na pochôdzne podkrovie — v texte to bez vstupu nešpekulujeme."
  },
  {
    "id": "lubotice",
    "label": "Ľubotice — dva stavebné pozemky",
    "sourceDocs": [
      "docs/sales/smolko-inzeraty-3x-2026-08-06.md",
      "apps/crm/tests/verification/fixtures/listing-c4/t3-lubotice.json"
    ],
    "input": {
      "type": "stavebný pozemok",
      "location": "Ľubotice",
      "district": "Prešov",
      "size_m2": 623,
      "price": 155500,
      "condition": "intravilán, určené k výstavbe RD",
      "features": [
        "dva pozemky",
        "menší 623 m² za 155 500 €",
        "väčší 854 m² za 205 500 €",
        "podiel 117 m² na prístupovej ceste ku každému",
        "asfaltový prístup",
        "elektrina na pozemku",
        "voda na pozemku",
        "kanalizácia na pozemku",
        "plyn na pozemku",
        "optika na pozemku",
        "koeficient zastavanosti 40 % podľa ÚP",
        "rovina",
        "slnečné",
        "oplotené",
        "cena vrátane provízie a právneho servisu"
      ],
      "agent_notes": "Maklér: Erik Birkner, +421 949 553 341 (0949 553 341). Pôvodný titulok obsahoval EXKLUZÍVNE — nepoužívať. Susednosť pozemkov nepotvrdená explicitne.",
      "charakterLokality": {
        "kind": "satelit",
        "text": "Ľubotice pri Prešove"
      }
    },
    "broker": {
      "name": "Erik Birkner",
      "nameNeedles": [
        "Birkner"
      ],
      "phone": "0949 553 341"
    },
    "allowedFacts": [
      "Ľubotice",
      "Lubotice",
      "Prešov",
      "623",
      "854",
      "155 500",
      "155500",
      "205 500",
      "205500",
      "117",
      "40 %",
      "40",
      "intravilán",
      "ÚP",
      "elektrina",
      "voda",
      "kanalizácia",
      "plyn",
      "optika",
      "asfalt",
      "rovina",
      "oplotené",
      "províziu",
      "právny servis",
      "Erik Birkner",
      "Birknerovi",
      "0949 553 341",
      "949 553 341"
    ],
    "approvedPortalText": "Najdrahšie na stavbe domu nebýva betón. Býva čakanie na siete a povolenia.\n\nTieto pozemky v Ľuboticiach majú elektrinu, vodu, kanalizáciu, plyn aj optiku priamo na pozemku a prístup po asfalte. Projektant sa môže pustiť do práce bez rokov ťahania prípojok. Intravilán, podľa ÚP na rodinné domy, koeficient zastavanosti až 40 %. Rovina, slnko, oplotené — fakty zo vstupu, nie marketingové prívlastky. Asfaltový prístup znamená, že na pozemok dojdete rovnako v januári ako v júli.\n\nNa výber:\n— 623 m² za 155 500 €\n— 854 m² za 205 500 €\nKu každému patrí spoluvlastnícky podiel 117 m² na prístupovej ceste. Cena je konečná — zahŕňa províziu, právny servis, zmluvy aj poplatky za prevod. To je cenové ukotvenie zo vstupu, nie sľub o výnosoch.\n\nPre koho je to trafené presne:\n— Staviteľ, ktorý nechce čakať na siete.\n— Domácnosť, ktorá chce pozemok s jasnými pravidlami ÚP a sieťami na pozemku.\n— [DOPLNIŤ: či sú pozemky susediace — ak áno, uhol „dve spriaznené domácnosti“ dostane plnú silu]\n\nZavolajte Erikovi Birknerovi na 0949 553 341 — prevedie vás pozemkami a odpovie aj na otázky k územnému plánu. Bez potvrdených tarch alebo „právnej čistoty“ vo vstupe tieto tvrdenia neuvádzame. Ak Vám chýba šírka pozemku alebo vzdialenosť do centra Prešova, pýtajte sa priamo — v texte ich nevymýšľame. Susednosť dvoch pozemkov potvrďte vo vstupe, kým ju budeme predávať ako hlavný uhol."
  },
  {
    "id": "modra-nad-cirochou",
    "label": "Modrá nad Cirochou — novostavba RD",
    "sourceDocs": [
      "docs/sales/smolko-inzeraty-3x-2026-08-06.md",
      "apps/crm/tests/verification/fixtures/listing-c4/t4-modra.json"
    ],
    "input": {
      "type": "5-izbový rodinný dom",
      "location": "Modrá nad Cirochou",
      "district": "Humenné",
      "size_m2": 120,
      "price": 0,
      "rooms": "5",
      "condition": "murovaný dom z roku 2016 (cena na vyžiadanie v RK)",
      "features": [
        "úžitková 120 m²",
        "obytná 76 m²",
        "zastavaná 167 m²",
        "pozemok 4 500 m²",
        "jedno podlažie",
        "možnosť podkrovnej izby",
        "murivo hr. 450 mm",
        "ihlanová strecha TONDACH",
        "el. podlahové vykurovanie",
        "plastové 3-komorové okná",
        "krytá terasa",
        "orientácia juh/sever",
        "elektrina",
        "voda",
        "kanalizácia",
        "možnosť optiky",
        "Školská ulica"
      ],
      "agent_notes": "Maklérka: Ing. Anna Chalčaková, 0905 960 447. Cena na vyžiadanie v RK. Pôvodný titulok: Predaj novostavby RD v obci Modrá nad Cirochou, okr. Humenné.",
      "charakterLokality": {
        "kind": "vidiek",
        "text": "pokojná časť obce, Školská ulica"
      }
    },
    "broker": {
      "name": "Anna Chalčaková",
      "nameNeedles": [
        "Chalčak"
      ],
      "phone": "0905 960 447"
    },
    "allowedFacts": [
      "Modrá nad Cirochou",
      "Humenné",
      "5",
      "120",
      "76",
      "167",
      "4 500",
      "4500",
      "2016",
      "450 mm",
      "450",
      "TONDACH",
      "podlahové vykurovanie",
      "3-komorové",
      "krytá terasa",
      "Školská",
      "elektrina",
      "voda",
      "kanalizácia",
      "optiky",
      "Anna Chalčaková",
      "Chalčakovej",
      "0905 960 447",
      "na vyžiadanie",
      "jednom podlaží",
      "podkrovie"
    ],
    "approvedPortalText": "Postavte sa doprostred pozemku a rozhliadnite sa: všetko, kam dovidíte, je vaše — 4 500 m².\n\nTo nie je záhrada za domom. To je priestor na sad, záhony, výbeh, dielňu aj vonkajšie hry naraz. Tu je pozemok hlavný produkt; dom je druhý. Bez referenčného rozsahu bežnej parcely vo vstupe neporovnávame „ako X bežných parciel“ — zhmotňujeme samotnú výmeru a čo sa na ňu zmestí ako potenciál, nie ako hotové vybavenie.\n\nDom je murovaný, z roku 2016, celý na jednom podlaží. Murivo hrúbky 450 mm, strecha TONDACH, plastové 3-komorové okná, elektrické podlahové vykurovanie, krytá terasa. Napojený na elektrinu, vodu a kanalizáciu, s možnosťou optiky. Úžitková plocha 120 m², obytná 76 m², zastavaná 167 m², 5 izieb; podkrovie ponúka možnosť ďalšej izby. [DOPLNIŤ: detailná dispozícia miestností] [DOPLNIŤ: stav dokončenia — nasťahovanie vs. holodom]\n\nPre koho je to trafené presne:\n— Rodina, ktorá chce detstvo vonku, nie na parkovisku.\n— Kto chce chovať a pestovať bez rozhodovania „čo z toho“.\n— Remeselník alebo podnikateľ, ktorému doma chýba dielňa a sklad.\n\nCena je na vyžiadanie v RK — na portáli to znižuje počet reakcií; uveďte aspoň orientačnú sumu, ak ju máte. Zavolajte Anne Chalčakovej na 0905 960 447 a prejdite si ten pozemok pešo od plotu k plotu. Lokalita: Modrá nad Cirochou, okr. Humenné, Školská ulica. Bez vzdialeností vo vstupe neuvádzame minúty do Humenného. [DOPLNIŤ: vzdialenosť do Humenného / Sniny] [DOPLNIŤ: energetický certifikát]."
  }
] as ListingGoldenFixture[];

export const LISTING_GOLDEN_WORD_MIN = 220;
export const LISTING_GOLDEN_WORD_MAX = 320;

/** Ban words — superlatív bez čísla (FINAL prompt §3 / lane L12). */
export const LISTING_GOLDEN_BAN_WORDS = [
  "krásny",
  "krásna",
  "krásne",
  "útulný",
  "útulná",
  "útulné",
  "jedinečný",
  "jedinečná",
  "jedinečné",
  "exkluzívne",
] as const;

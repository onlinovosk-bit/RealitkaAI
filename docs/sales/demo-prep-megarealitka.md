# Demo príprava: Mega realitka (Harasim) — Realvia prepojenie

**Cieľová cesta:** `docs/sales/demo-prep-megarealitka.md`
**Termín:** pia 24.07. 11:00 alebo pon 27.07. 8:00 (čaká sa na výber)

## Scenár dema (20–30 min)

1. **Otvorenie (2 min):** „Ukážem vám presne to, čo dnes beží u prvej
   kancelárie — a na konci, ako to prepojíme s vaším Realvia systémom."
2. **Pohľad majiteľa (5 min):** živá kalkulačka `/odhad/demo` — prejsť
   formulár, ukázať okamžitý odhad z NBS dát. Zdôrazniť: „takto to vyzerá
   pod VAŠOU značkou, s vaším logom a farbami — pre všetky pobočky naraz."
3. **Pohľad makléra (8 min):** CRM na demo tenante — nový lead padne dnu,
   AI triage ho vyhodnotí (priorita, dôvod), notifikácia príde do ~10 s.
   Ukázať Next Best Action panel.
4. **Realvia prepojenie (5 min) — KĽÚČOVÝ MOMENT:**
   „Váš inzertný systém je Realvia — s tou máme hotové technické prepojenie,
   overené v prevádzke. Nastavenie je na strane Realvie pár minút: vaše
   webhook prihlasovacie údaje zadáme pri onboardingu a nové dopyty z vašich
   inzerátov začnú padať priamo do Revolisu — bez ručného prepisovania."
   (NEsľubovať import historických dát — webhook = nové udalosti.)
5. **Podmienky Founding Partner (5 min):** rovnaký model ako Kamzík
   (99 € onboarding, 3 mesiace 0 €, 199 € pri realizovanom obchode) ALEBO
   štandard — founder rozhodne pred demom, ktorú ponuku dá.
6. **Uzavretie:** „Čo potrebujete vidieť, aby to bolo áno?"

## Čo je pripravené vopred (Cursor úloha — vyžaduje founder GO, PROD insert)

Prompt pre Cursor po GO:
> Vytvor v `valuation_tenants` tenant pre Mega realitku: slug
> `mega-realitka`, enabled=false, is_sandbox=false, primary_color podľa
> ich webu (over na megarealitka.sk), logo_url zatiaľ NULL. Rovnaký vzor
> ako Molnárov tenant. Výstup: SELECT riadku. Žiadne ďalšie zmeny.

Efekt: na deme vieš povedať „váš tenant už čaká pripravený — zapnutie je
jeden prepínač po dohode" (a je to pravda).

## Čo NEROBÍME pred zmluvou (a prečo)

- ŽIADNE sťahovanie/scraping jeho inzerátov či kontaktov z portálov —
  ZAKÁZANÉ AKCIE + GDPR (nie sme sprostredkovateľ jeho dát bez zmluvy).
- ŽIADNE pripájanie jeho Realvia credentials — tie zadáva on pri
  onboardingu, po podpise.
- Ak chce vidieť „svoje dáta" už na deme: legitímna cesta = sám pošle
  dobrovoľnú vzorku (napr. CSV 10–20 kontaktov) s výslovným súhlasom →
  import do jeho vypnutého tenanta pred demom. Ponúknuť, nevnucovať.

## Argumenty šité na Harasima
- Multi-pobočky: jedna kalkulačka + tenant pokrýva všetky pobočky,
  leady sa dajú smerovať podľa lokality.
- Realvia: nulové prepisovanie dopytov, prepojenie overené v prevádzke.
- Referencia: prvá kancelária v Prešovskom kraji beží, druhá (Poprad)
  práve podpisuje.

# Plan — Reality Smolko Voiceflow correction

**Build Order:** `docs/briefs/BO-smolko-voiceflow-correction.md`
**Status:** IN PROGRESS

1. Auditovať verejný web a odlíšiť existujúci Voiceflow projekt od interného panelu Revolisu.
2. Odstrániť celý chybný CRM chatbot slice: dashboard import/render, API route, deterministic engine, registry záznam, metriku a testy určené len pre tento slice.
3. Zdokumentovať kopírovateľný Voiceflow canvas: tri otázky, premenné, vetvy a bezpečný výsledok bez zberu kontaktu.
4. Overiť lokálne, že na `/revolis-ai` nezostal import ani `/api/ai/smolko-chat` route a že existujúci AI registry test prejde.
5. Po získaní prístupu do Voiceflow: nakonfigurovať tok v existujúcom projekte, otestovať tri cesty (byt/kúpa, dom/prenájom, pozemok/predaj), publikovať a vizuálne overiť widget na `realitysmolko.sk`.

## Zastavenia

- Nezadal som údaje ani nevytvoril účet vo Voiceflow; Creator ukazuje prihlásenie / vytvorenie účtu.
- Nehádam URL parametre vyhľadávania Reality Smolko. Kým ich CMS nepotvrdí, widget iba transparentne otvorí existujúci výpis ponúk.
- Bez samostatného zadania nepridávam lead capture, CRM zápis, e-mail, booking ani externý zdroj dát.

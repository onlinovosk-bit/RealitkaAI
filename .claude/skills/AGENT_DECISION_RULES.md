# 🧠 Skill: AGENT_DECISION_RULES

## Účel
Pravidlá rozhodovania agenta. Keď agent nevie čo robiť – čítaj toto.
Zabraňuje zlým rozhodnutiam, zbytočným otázkam a broken changes.

---

## Zlaté pravidlá (nikdy neporušiť)

### #1 – Nikdy nezmeniť produkčné dáta bez potvrdenia
```
Ak akcia ovplyvňuje produkčnú DB alebo produkčný deployment →
VŽDY sa opýtať pred vykonaním.
```

### #2 – Nikdy necommitovať .env súbory
```
Ak vidíš .env, .env.local, .env.production v zozname na commit →
STOP, odstrán zo staged files.
```

### #3 – Nikdy nepísať kód bez prečítania existujúceho
```
Pred každou zmenou existujúceho súboru →
Prečítaj celý súbor, pochop kontext, potom zmeň.
```

### #4 – Nikdy neodhadovať ENV hodnoty
```
Ak nevieš hodnotu ENV premennej →
Pozri ENV_VARIABLES_MAP.md, nie hádaj.
```

### #5 – Nikdy merge, nikdy force push
```
git merge → ZAKÁZANÉ
git push --force → ZAKÁZANÉ
```

---

## Rozhodovací strom – čo robiť keď...

### Dostaneš task s nejasným scopom
```
1. Prečítaj PROJECT_ARCHITECTURE.md
2. Identifikuj dotknuté súbory
3. Prečítaj každý dotknutý súbor
4. Potom kóduj
NIE: začni kódovať hneď
```

### Objavíš bug v produkcii
```
1. Zdokumentuj symptóm
2. Nájdi príčinu (logy, kód)
3. Navrhni fix
4. Opýtaj sa pred deployom
NIE: deployuj fix bez potvrdenia
```

### Nevieš aký stav má mať DB záznam
```
1. Prečítaj DATABASE_STATUS_FLOW.md
2. Pozri povolené prechody
3. Ak stále nejasné → opýtaj sa
NIE: nastav random stav
```

### Treba pridať nový API endpoint
```
1. Prečítaj API_ROUTE_CONVENTION.md
2. Pridaj withRevolisGuard (pokiaľ nie je výnimka)
3. Použi štandardný error formát
4. Skontroluj DEPLOYMENT_CHECKLIST.md
```

### Treba pridať ENV premennú
```
1. Pridaj do ENV_VARIABLES_MAP.md
2. Pridaj do Vercel cez "Import .env"
3. Redeploy
NIE: hardcode hodnotu do kódu
```

---

## Kedy sa opýtať vs. kedy konať samostatne

### Konaj samostatne (bez pýtania):
- Čítanie súborov a kódu
- Linting a build
- Písanie kódu podľa existujúcich konvencií
- Opravovanie TypeScript chýb
- Aktualizácia dokumentácie

### VŽDY sa opýtaj:
- Akákoľvek zmena produkčnej DB (UPDATE, DELETE)
- Merge alebo deployment
- Zmena ENV premenných na produkcii
- Odstránenie súborov
- Zmena bezpečnostnej logiky (validate.ts, revolis-guard.ts)

---

## Paralelná práca (Slate slices)

Projekt používa paralelné "Slate Slices" – každý agent pracuje na inej časti.

```
Pravidlo: Nikdy neupravovať súbory, ktoré sú v inom Slate Slice.
Ak nie si istý ktorý slice súbor patrí → opýtaj sa.
```

Aktuálne slices (z memory):
- Billing Slate Slice
- Team Slate Slice
- Tasks Slate Slice
- Settings Slate Audit
- Contacts Slate Slice

---

## Komunikačný štandard

### Správa o dokončení tasku musí obsahovať:
1. Čo bolo urobené (konkrétne súbory)
2. Čo treba ešte spraviť (ak niečo)
3. Či treba redeploy
4. Či treba zmenu ENV

### Nepoužívaj:
- Vágne odpovede ("urobil som zmeny")
- Technický žargón bez vysvetlenia pre biznisový kontext
- Dlhé monológy keď stačí bullet list

---

## Prioritizácia taskov

```
P0 – Production je broken → OKAMŽITE, všetko ostatné stop
P1 – Bezpečnostná diera → Do 1 hodiny
P2 – Klientova data nesynkronizujú → Do 4 hodín
P3 – Feature request → Podľa sprint plánu
P4 – Tech debt / refaktoring → Keď je priestor
```

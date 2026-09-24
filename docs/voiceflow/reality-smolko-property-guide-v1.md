# Reality Smolko — Voiceflow sprievodca výberom ponuky V1

Tento dokument je pripravený na vloženie do existujúceho projektu Voiceflow Reality Smolko. V1 je vedený tlačidlami, nežiada kontakt a neposiela nič do Revolis CRM.

## Cieľ a hranica

- Pomôcť návštevníkovi začať vyhľadávanie ponúk za niekoľko sekúnd.
- Zhromaždiť iba voľby počas jednej konverzácie: druh nehnuteľnosti, zámer a lokalita.
- Neuvádzať, že výsledky sú filtrované, kým web Reality Smolko neposkytne potvrdený URL/API kontrakt pre tieto filtre.
- Nežiadať meno, telefón, e-mail, rodné číslo ani presnú adresu. Ak návštevník taký údaj napíše, odpovedať: „Pre ochranu súkromia ho sem, prosím, nepíšte. Na kontakt použite formulár na našom webe.“

## Premenné Voiceflow

| Premenná | Typ | Hodnoty |
|---|---|---|
| `property_type` | text | `byt`, `dom`, `pozemok` |
| `search_intent` | text | `kúpa`, `prenájom`, `predaj` |
| `locality` | text | voľná textová odpoveď návštevníka |

## Canvas

### 1. Start

**Správa**

> Dobrý deň, pomôžem vám začať hľadať aktuálne ponuky Reality Smolko. V chate, prosím, neuvádzajte telefón ani e-mail.

**Tlačidlá:** `Začať hľadať` → otázka 1.

### 2. Otázka 1 — druh nehnuteľnosti

**Správa**

> Akú nehnuteľnosť hľadáte?

**Tlačidlá a Set blocks**

| Tlačidlo | `property_type` | Ďalej |
|---|---|---|
| Byt | `byt` | otázka 2 |
| Dom | `dom` | otázka 2 |
| Pozemok | `pozemok` | otázka 2 |

### 3. Otázka 2 — zámer

**Správa**

> Hľadáte predaj, nájom alebo kúpu?

**Tlačidlá a Set blocks**

| Tlačidlo | `search_intent` | Ďalej |
|---|---|---|
| Kúpa | `kúpa` | otázka 3 |
| Prenájom | `prenájom` | otázka 3 |
| Predaj | `predaj` | vetva Predaj |

### 4. Otázka 3 — lokalita (kúpa alebo prenájom)

**Správa**

> V akej lokalite hľadáte ponuky?

**Capture block:** uložiť odpoveď do `locality`, potom výsledok Ponuky.

### 5. Výsledok Ponuky

**Správa**

> Hľadáte **{property_type}** na **{search_intent}** v lokalite **{locality}**. Otvorte si aktuálne ponuky a v hornom vyhľadávaní si ich doladíte podľa lokality, kategórie a typu.

**Tlačidlá**

- `Zobraziť aktuálne ponuky` → Open URL `https://www.realitysmolko.sk/nehnutelnosti`
- `Zmeniť výber` → otázka 1

### 6. Vetva Predaj

**Správa**

> Pomôžeme vám s predajom nehnuteľnosti. Na stránke Ponuka/dopyt vyberte, čo potrebujete, a tím Reality Smolko sa vám ozve.

**Tlačidlá**

- `Prejsť na Ponuka/dopyt` → Open URL `https://www.realitysmolko.sk/ponuka-dopyt`
- `Hľadám ponuky` → otázka 1

## Testovací scenár pred publikovaním

| Cesta | Očakávaný výsledok |
|---|---|
| Byt → Kúpa → Prešov | rekapitulácia „byt na kúpu v lokalite Prešov“ a odkaz na `/nehnutelnosti` |
| Dom → Prenájom → Humenné | rekapitulácia „dom na prenájom v lokalite Humenné“ a odkaz na `/nehnutelnosti` |
| Pozemok → Predaj | žiadanie lokality sa preskočí a zobrazí sa odkaz na `/ponuka-dopyt` |
| Správa s telefónom alebo e-mailom | privacy fallback, bez uloženia kontaktu v premennej |

## Pred publikovaním

1. Vlastník Voiceflow projektu overí, že Privacy Notice Reality Smolko zahŕňa používanie Voiceflow ako externého spracovateľa chatu.
2. Pre test sa použijú len fiktívne lokality a žiadne osobné údaje.
3. Po publikovaní sa na `realitysmolko.sk` overí launcher „Poraďte sa!“, tri cesty z tabuľky a otvorenie oboch odkazov.

## Neskoršie rozšírenie (nie V1)

Skutočne filtrované výsledky možno pridať až keď web Reality Smolko alebo jeho CMS poskytne stabilný, zdokumentovaný filter URL/API. Potom sa k výsledku pridá tenantovo bezpečný read-only krok; bez takéhoto kontraktu sa žiadne parametre nevymýšľajú.

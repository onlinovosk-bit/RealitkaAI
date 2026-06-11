# Migrácia kontaktov z Nehnuteľnosti.sk

Playbook pre import **kontaktov / dopytov** z exportu Nehnuteľnosti Admin do Revolis CRM cez Universal Import.

> **Poznámka:** Tento import spracúva **export kontaktov** (CSV/JSON), nie scraping portálu ani export inzerátov.

---

## Predpoklady

- Aktívny účet v [Nehnuteľnosti Admin](https://admin.nehnutelnosti.sk/)
- Rola s právom exportovať kontakty / dopyty
- Prístup do Revolis CRM → **Import** → Universal Import

---

## Krok 1 — Stiahnutie exportu z Nehnuteľnosti Admin

1. Prihláste sa do Nehnuteľnosti Admin.
2. Prejdite do sekcie **Kontakty** / **Dopyty** (presný názov menu sa môže líšiť podľa verzie).
3. Vyberte **Export** → formát **CSV** alebo **JSON**.
4. Stiahnite súbor na disk.

<!-- TODO(andy): screenshot — Nehnuteľnosti Admin → Export kontaktov -->

**Očakávané stĺpce v CSV:**

| Stĺpec | Príklad |
|--------|---------|
| ID kontaktu | `C-9001` |
| Meno a priezvisko | `Jana Fiktívna` |
| E-mail | `jana@example.sk` |
| Telefón | `+421901234567` |
| Mesto | `Prešov` |
| Adresa | `Hlavná 1` |
| Poznámka | voľný text |
| Typ dopytu | Kúpa / Predaj / Prenájom |
| Stav | Aktívny / Archivovaný |
| Maklér | meno makléra |
| Dátum vytvorenia | `2025-03-10` |
| Rozpočet | `185000` |

---

## Krok 2 — Dry-run v Revolise (predvolené)

1. V Revolise otvorte **Universal Import** alebo zavolajte API:

```bash
curl -X POST "https://<your-domain>/api/universal-import/nehnutelnosti-export?dryRun=true" \
  -H "Cookie: <session>" \
  -F "file=@contacts-export.csv"
```

2. Skontrolujte odpoveď:
   - `wouldCreate` — nové kontakty
   - `wouldUpdate` — existujúce podľa email/telefón
   - `duplicatesInFile` — duplicity v exportnom súbore
   - `wouldSkip` — chýba meno alebo kontakt

<!-- TODO(andy): screenshot — dry-run report v UI -->

> **Default:** `dryRun=true`. Pre zápis do DB explicitne pridajte `?dryRun=false`.

---

## Krok 3 — Kontrola duplicít

Revolis deduplikuje podľa **e-mailu a telefónu** (normalizované na posledných 9 číslic):

- Rovnaký email v súbore → `duplicate`
- Rovnaký telefón v súbore → `duplicate`
- Email/telefón už v CRM → `update` (nie nový create)

Odporúčanie: pred commitom vyriešte duplicity v exporte alebo v Revolise manuálne.

---

## Krok 4 — Commit importu

Keď dry-run vyzerá správne:

```bash
curl -X POST "https://<your-domain>/api/universal-import/nehnutelnosti-export?dryRun=false" \
  -H "Cookie: <session>" \
  -F "file=@contacts-export.csv"
```

Alternatíva cez wizard: vyberte zdroj **Nehnuteľnosti.sk export**, nahrajte CSV a dokončite mapovanie.

---

## Krok 5 — Verifikácia po importe

1. `/leads` — skontrolujte počet nových leadov
2. Overte zdroj: `Universal Import — Nehnutelnosti.sk export`
3. Skontrolujte 3–5 náhodných kontaktov (meno, telefón, poznámka, maklér)

<!-- TODO(andy): screenshot — leads zoznam po importe -->

---

## Riešenie problémov

| Problém | Riešenie |
|---------|----------|
| CSV bez hlavičky | Export znova z Admin; skontrolujte UTF-8 / Windows-1250 |
| Vysoký `wouldSkip` | Doplňte chýbajúce mená alebo aspoň email/telefón v zdroji |
| Vysoké duplicity | Vyčistite export; skontrolujte staré importy v CRM |
| JSON parse error | Overte, že súbor je validný JSON s poľom `contacts` |

---

## Technické referencie

- Parser: `apps/crm/src/lib/universal-import/nehnutelnosti/`
- API route: `/api/universal-import/nehnutelnosti-export`
- Syntetické fixtures (bez PII): `apps/crm/src/lib/universal-import/__fixtures__/nehnutelnosti/`
- Source system v DB: `nehnutelnosti_sk`

---

## TODO pre Andyho

- [ ] Screenshot: export v Nehnuteľnosti Admin
- [ ] Screenshot: dry-run report
- [ ] Screenshot: leads po importe
- [ ] Overiť reálny export 439 kontaktov proti parseru (staging)

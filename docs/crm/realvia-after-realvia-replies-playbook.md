# Keď Realvia odpovie na e-mail — ďalšie kroky

Použi ako checklist po prijatí odpovede od Realvie (technická aktivácia PUSH exportu).

## 1. Hneď po odpovedi

- [ ] Uložiť odpoveď (datum, meno kontaktu, číslo ticketu ak majú).
- [ ] Skontrolovať, či potvrdili presne **URL**: `POST https://app.revolis.ai/api/webhooks/realvia` (alebo finálna doména).
- [ ] Skontrolovať, či hlavičky **`identifikator` / `identifikator2`** sú **zhodné** s Vercel (`REALVIA_IDENTIFIER`, `REALVIA_IDENTIFIER_2`) a `agencies`.
- [ ] Ak uvádzajú **iné** hodnoty ako vy ste poslali: uprav **najprv** Vercel + `UPDATE agencies`, potom **redeploy**.

## 2. Po ich „export zapnutý“

- [ ] Počkaj 15–60 min na prvý hit alebo požiadaj o **testovací jednorazový export**.
- [ ] Supabase: `SELECT COUNT(*) FROM realvia_webhook_logs;` — má narásť.
- [ ] Ak `0`: skontroluj Vercel **Logs** / Supabase či nepadá 403 (IP, hlavičky, `REALVIA_SHARED_SECRET`).
- [ ] CRM: `/integrations/realvia` → Refresh → prípadne **Process Queue**.
- [ ] Over `properties` podľa `source_id` z ich payloadu.

## 3. Ak píšu problém (403, timeout, TLS)

- [ ] Požiadať o **čas odoslania** + **presný HTTP status** z ich logu.
- [ ] U vás: Vercel deployment logs pre `/api/webhooks/realvia`.
- [ ] Over `REALVIA_ALLOWED_IP` vs ich egress IP (môžu mať viac IP).

## 4. Uzavretie

- [ ] Krátky interný zápis: GO-live Reality Smolko + Realvia, dátum prvého úspešného zápisu.
- [ ] Naplánovať kontrolu za 7 dní (failed jobs, orphan unknown payloads).

---

# E-mailová koordinácia vs. „napojenie cez API“ (zmysel pojmov)

| | **Váš aktuálny model (PUSH webhook + e-mail)** | **„API napojenie“ (typicky)** |
|--|------------------|-------------------------------|
| **Čo tým myslíme** | Realvia poštou potvrdí URL a hlavičky; vy nastavíte env/DB; prídu POST požiadavky. | Dokumentované REST/OpenAPI, vývojársky účet, API kľúče alebo OAuth, často sandbox + produkcia, changelog verzií. |

---

## Výhody PUSH webhook + e-mail

- **Rýchly štart** bez vlastného klienta, ktorý by ťahal dáta pollovaním.
- **Minimum tokov na vašej strane** — jeden endpoint, jedna zodpovednosť (prijať a zaradiť).
- **Realvia vie riadiť frekvenciu** odosielania (push pri zmene).
- **Funguje aj keď nemajú verejný „pull“ API pre vás** — len výstupný export.

## Nevýhody PUSH webhook + e-mail

- **Slabá observabilita** — závislosť na komunikácii a ručnej zhode stringov (hlavičky, IP).
- **Žiadny štandardný discovery** — žiadny OpenAPI pre ich exportné payloady u vás v CI.
- **Bezpečnosť cez e-mail** — tajné hodnoty sa ľahko vytrasú (lepšie secure channel alebo ticket s ACL).
- **Zmeny na ich strane** (formát, hlavičky) môžu prísť „tiško“ — treba monitoring a alerty.

---

## Výhody klasického API integračného modelu (ak by existoval)

- **Verzovaná dokumentácia**, sandbox kľúče, predvídateľné chybové kódy.
- **Rotácia kľúčov** cez portál namiesto e-mailu.
- **Kontrakty** (JSON schema / OpenAPI) — testy v CI proti mock serveru.

## Nevýhody API modelu

- **Vyšší náklad** na obe strany (auth, rate limits, backwards compatibility).
- Ak **export je len push z ich systému**, full REST API nemusí byť ponúkaný — stále ostane webhook ako jediná realita.

---

## Návrhy vylepšení (realistické)

1. **Ticket namiesto čistého e-mailu** (support portal) s technickým ACL — menej únikov hesiel/hlavičiek.
2. **Jeden „integration contract“ PDF/Markdown**: URL, hlavičky, ukážkový JSON advert/delete, IP rozsahy — podpísané oboma stranami.
3. **Alert** pri `payload_type = unknown` alebo spike failed jobs (Sentry / email).
4. **Staging parity**: rovnaký webhook na preview URL + samostatné env — Realvia najprv staging (ak sú ochotní).
5. **Podpis telá** (napr. HMAC nad raw body) — ak Realvia vie pridať hlavičku — silnejšie ako čistý shared string v header.
6. **identifikator3/4** — doplniť v kóde a DB, ak ich štandard vyžaduje.
7. **Váš status page / health URL** len pre Realviu (bez leaku interných detailov).

---

*Súvisiaci dokument: `realvia-first-production-runbook.md`*

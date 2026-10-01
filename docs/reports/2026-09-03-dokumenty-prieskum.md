# L5 — Prieskum: modul Dokumenty / odovzdávací protokol

**Date:** 2026-09-03  
**Branch:** `docs/dokumenty-prieskum`  
**Mode:** READ-ONLY — žiadny kód, žiadny `npm install`, žiadna migrácia v `supabase/migrations/`

Brief: `docs/briefs/brief-dokumenty-protokol.md` (Downloads `briefdokumentyprotokol.md`).

---

## 1. Dáta na predvyplnenie

Tabuľka `contacts_dossier` **v repe neexistuje**. Kontakt je `public.leads` (+ voliteľný `leads.dossier` jsonb = research agent, nie kontaktné polia).

### 1a. Čo kopírovať do protokolu (deterministicky, bez LLM)

| Pole protokolu | Tabuľka | Stĺpec | Typ | Poznámka |
|---|---|---|---|---|
| Adresa / lokalita nehnuteľnosti | `properties` | `location` | `text` | Baseline |
| Názov inzerátu | `properties` | `title` | `text` | |
| Typ | `properties` | `type` | `text` | default `Byt` |
| Izby (text) | `properties` | `rooms` | `text` | |
| Počet izieb | `properties` | `rooms_count` | `smallint` | `20260617120000` |
| Podlažie | `properties` | `floor` | `smallint` | `20260617120000` |
| Úžitková výmera | `properties` | `usable_area` | `numeric(10,2)` | |
| Pozemok | `properties` | `land_area` | `numeric(10,2)` | |
| Zastavaná | `properties` | `building_area` | `numeric(10,2)` | |
| Cena | `properties` | `price` | `integer` | nie vždy relevantné pre odovzdanie |
| Meno vlastníka (listing) | `properties` | `owner_name` | `text` | v `10_add_properties_optional_columns_*` (mimo numbered migrations — overiť na PROD) |
| Telefón vlastníka | `properties` | `owner_phone` | `text` | rovnako |
| Maklér (meno) | `properties` | `broker_name` | `text` | import |
| Maklér (email) | `properties` | `broker_email` | `text` | |
| Maklér (telefón) | `properties` | `broker_phone` | `text` | |
| Klient — meno | `leads` | `name` | `text` | |
| Klient — email | `leads` | `email` | `text` | |
| Klient — telefón | `leads` | `phone` | `text` | |
| Dátum vytvorenia leadu | `leads` | `created_at` | `timestamptz` | nie dátum odovzdania |
| Tenant | `leads` / `properties` | `agency_id` | `uuid` | povinné pre RLS |

`lead_property_matches` slúži na **väzbu** lead ↔ property (`lead_id`, `property_id`), nie ako zdroj adries (má denormalizované `property_title`, `property_location`, `property_price` — použiť len ako fallback, kanonické sú `properties` / `leads`).

`leads.dossier` (`jsonb`): `owner`, `estimated_value_eur`, `company_ico` — **nesmie** ísť do protokolu ako fakt (research / LLM-adjacent). Fáza 1: ignorovať.

### 1b. Čo v CRM nie je — maklér vyplní ručne (prázdne, označené)

- stavy meračov (elektro, plyn, voda, teplo)
- odpočty / čísla meračov
- počet kľúčov / čipov / diaľkových ovládačov
- závady / poškodenia
- vybavenie odovzdané (inventár)
- dátum a čas odovzdania (nie `created_at`)
- podpis odovzdávajúceho / preberajúceho
- parcelné číslo / LV / kataster (nie v `properties`)
- počet osôb / spoluvlastníkov nad `owner_name`

---

## 2. Tenant izolácia súborov

**Supabase Storage bucket v migráciách CRM: žiadny** (`create bucket` / `storage.buckets` = 0 hits). `@supabase/storage-js` je len transitívna závislosť klienta.

`apps/realvia-ingestion/src/storage/objectStore.ts`: lokálny gzip snapshot ingest (`vendor/orgSlug/yyyy/mm/dd/hh/runId.json.gz`) + **S3 stub, ktorý hádže**. Nie je to CRM dokumentové úložisko, žiadne signed URL, žiadne RLS. **Prevziať sa dá len myšlienka prefixu s `orgSlug` / tenant v kľúči** — nie kód.

CRM súbory dnes: žiadny upload v `apps/crm` (brief overený — `docx`/`mammoth`/`pizzip`/`handlebars` v `package.json` nie sú; `sharp` je v **devDependencies** na obrázky).

Návrh pre fázu 1 (text, nie implementácia): bucket `documents`, object key `{agency_id}/{document_id}.pdf`, Storage policy `agency_id` z JWT/profile, **signed URL** s krátkou TTL. Žiadne verejné URL.

---

## 3. Návrh migrácií (len text v reporte)

```sql
-- document_templates
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  doc_type text NOT NULL CHECK (doc_type = 'handover_protocol'),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  logo_path text,
  header_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_document_templates_agency ON public.document_templates (agency_id);
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_templates_tenant"
  ON public.document_templates FOR ALL TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));

-- documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id text REFERENCES public.properties(id) ON DELETE SET NULL,
  lead_id text REFERENCES public.leads(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('draft', 'finalized')) DEFAULT 'draft',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  storage_path text
);
-- Composite tenant FKs (pattern: agency_id + child id)
-- ALTER … ADD CONSTRAINT documents_property_agency_fk
--   FOREIGN KEY (agency_id, property_id) REFERENCES …  -- only if unique (agency_id, id) on properties
CREATE INDEX idx_documents_agency ON public.documents (agency_id);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_tenant"
  ON public.documents FOR ALL TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));
```

Poznámka: `properties.id` je `text` PK; composite FK `(agency_id, property_id)` vyžaduje unique na `(agency_id, id)` — dnes nemusí existovať. Fáza 1 môže začať s `agency_id` + RLS a CHECK triggrom, kým unique pribudne.

**Neaplikovať. Nie je v `supabase/migrations/`.**

---

## 4. Knižnice PDF (neinštalované)

| Balík | Licencia | Veľkosť (rádovo) | Nevýhody |
|---|---|---|---|
| `@react-pdf/renderer` | MIT | stovky kB + fonty | Iný layout model ako DOM; fonty SK diakritika treba dodať |
| `pdf-lib` | MIT | ~700 kB | Šablóna ako PDF, nie React; horšie na dynamické formuláre |
| Puppeteer / Playwright PDF | Apache-2.0 | **stovky MB** Chromium | Nehodí sa na Vercel Hobby timeout/size |

Fáza 1 brief odporúča PDF. `.docx` (`docx` npm, MIT) až ak founder zvolí editovateľný výstup.

---

## 5. Odhad rozsahu fázy 1

| Položka | ~súbory | ~LOC |
|---|---|---|
| 2 migrácie + storage SQL | 2–3 | 80–150 |
| Mapovanie stĺpec → pole (žiadny LLM) | 1–2 | 80–120 |
| `/dokumenty` list + nový protokol form | 4–6 | 250–400 |
| PDF export + signed URL | 2–3 | 120–200 |
| Testy (RLS, empty fields, no send) | 2–3 | 120–180 |
| **Spolu** | **~12–17** | **~650–1050** (nad hard 600 → 2 PR: schema+map, potom UI) |

Špecifikácia až po otázke Smolkovi (brief § otvorené otázky).

---

## Zistenie vs brief

Brief: „nič v repe neexistuje“ pre storage/docx/PDF — **potvrdené**. Dátová vrstva `properties` + `leads` + matches **existuje**. `contacts_dossier` ako tabuľka **nie**.

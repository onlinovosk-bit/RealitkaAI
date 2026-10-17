# XLSX import — critical bug hunt (2026-10-17)

Scope: commit `124c1468` / path wizard upload → `parseXlsxBuffer` → `POST /api/universal-import/start` → DB (`import_jobs` / `import_rows`) → later `run`.

Method: code trace + synthetic OOXML fixtures exercised through `parseXlsxBuffer` (vitest). Only high-severity correctness issues below.

## Verdict

**3 critical correctness bugs found** in `xlsx-parse.ts` (silent data loss / wrong sheet). **No auth/tenant bypass** on import start. **No infinite loop**. Resource limits exist (10 MB file, 80 MB inflate, 2000 rows) — full parse still happens before the row cap (same pattern as CSV; not claimed as a unique brick here).

---

## BUG 1 — Title / banner row treated as header → silent column wipe

### Trigger

`.xlsx` whose first non-empty row is a title (e.g. merged “Export kontaktov Realvia”), with real headers on row 2 and contacts below — common broker export shape.

### Evidence

`apps/crm/src/lib/universal-import/xlsx-parse.ts`:

```288:304:apps/crm/src/lib/universal-import/xlsx-parse.ts
  const nonEmpty = rowNodes.map(rowToColumns).filter((m) => m.size > 0);
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headerRow = nonEmpty[0];
  const headerByIndex = new Map<number, string>();
  const headers: string[] = [];
  for (const [index, text] of [...headerRow.entries()].sort((a, b) => a[0] - b[0])) {
    headerByIndex.set(index, text);
    headers.push(text);
  }

  const rows = nonEmpty.slice(1).map((cols) => {
    const record: Record<string, string> = {};
    for (const header of headers) record[header] = "";
    for (const [index, header] of headerByIndex) record[header] = cols.get(index) ?? "";
    return record;
  });
```

Only columns present in that first non-empty row become headers. Values in other columns on later rows are never copied into `record` → **silent drop**.

Repro output (synthetic sheet: title / Meno|Mobil|Email / Jan|0901…|jan@…):

```json
{"headers":["Export kontaktov Realvia"],"rows":[{"Export kontaktov Realvia":"Meno"},{"Export kontaktov Realvia":"Jan"}]}
```

Phone and email strings are absent from the parsed result entirely.

### Impact

`start/route.ts` persists `rawData` via `saveImportRows`. Mapping/preview/run then see a single garbage column. Contacts import without phone/email (or fail validation) — **data corruption / silent truncation** before any user mapping can recover the lost cells.

Downstream: `start/route.ts` L52–102 → `import_rows.raw_data` → `mapContactFromRow` in `import-runner.ts`.

---

## BUG 2 — Duplicate header labels → last column wins, earlier values discarded

### Trigger

Two columns with the same header text (e.g. `Email` / `Email`, or two `Telefón` columns from a CRM export).

### Evidence

Same builder (`xlsx-parse.ts` L299–303): `record` is `Record<string, string>` keyed by header text. Writing column A then column B both named `Email` overwrites A.

Repro:

```json
{"headers":["Email","Email","Meno"],"rows":[{"Email":"home@a.sk","Meno":"Anna"}]}
```

`work@a.sk` (column A) is gone. `headers` still lists `Email` twice, so UI/detectors can look fine while stored raw data already lost a field.

`ColumnMapping` is also `Record<string, ImportTargetField>` — even at mapping time only one `Email` key can exist (`types.ts` L88–89).

### Impact

Silent loss of a contact channel (work vs home email, primary vs secondary phone) written into DB and used for lead insert / duplicate detection.

---

## BUG 3 — Always first *visible* sheet; contacts on sheet 2 never read

### Trigger

Workbook with sheet 1 = visible instructions (“Pokyny” / “Návod”) and sheet 2 = “Kontakty” with the real table (both visible). Or any multi-sheet export where contacts are not the first visible sheet.

### Evidence

```201:221:apps/crm/src/lib/universal-import/xlsx-parse.ts
function firstSheetPath(workbook: string | undefined, rels: string | undefined): string {
  const fallback = "xl/worksheets/sheet1.xml";
  ...
  const visible = list.find((s) => (s["@_state"] ?? "visible") === "visible") ?? list[0];
  const rid = visible?.["@_r:id"];
  if (!rid || !rels) return fallback;
  ...
}
```

Hidden-first is handled (fixture `skryty-prvy-harok.xlsx`), but **first visible ≠ contacts sheet**. No `workbookView/@activeTab`, no sheet-name heuristic, no UI sheet picker.

Repro (Pokyny + Kontakty, both visible):

```json
{"headers":["Navod"],"rows":[{"Navod":"Exportujte list Kontakty"}]}
```

Contact row `Eva` / `0901` never appears.

Related footgun: if `r:id` / rels resolution fails, code falls back to `xl/worksheets/sheet1.xml` even when sheet1 is **hidden** junk (`firstSheetPath` L211, L219; `parseXlsxBuffer` L235) — less common for intact Excel files, but contradicts the “skip hidden” intent.

### Impact

Wrong sheet → wrong/empty columns persisted; user maps nonsense; run imports garbage or skips everyone. Classic **wrong sheet selection wiping/mis-mapping**.

---

## Checked — no critical finding

| Area | Result |
|------|--------|
| Auth on start | `resolveImportAuthContext()` → 401 without user/agency (`import-context.ts` L12–34; `start/route.ts` L23–24). |
| Tenant isolation | Job created with `ctx.agencyId`; rows insert with same agency; RLS on `import_jobs` / `import_rows` (`20260608120000_universal_crm_import.sql`). `mapping` / `run` compare `job.agencyId !== ctx.agencyId` → 403. |
| Zip bomb | `MAX_XLSX_INFLATED_BYTES` + `inflateRawSync({ maxOutputLength })` (`xlsx-parse.ts` L18–19, L73–97). |
| File / row caps | `MAX_IMPORT_FILE_BYTES` before `arrayBuffer`; `MAX_IMPORT_ROWS` after parse (`start/route.ts` L45–72). Oversized rows → **400**, not silent truncate. |
| Infinite loops | ZIP directory / row walks are bounded by entry counts and XML node lists. |
| Content sniffing | `looksLikeZipContainer` chooses XLSX vs CSV by magic bytes (`start/route.ts` L54–59) — correct for Realvia-saved-as-Excel case from the commit message. |
| Sparse cells | Column refs (`@_r`) map by letter index — fixture covers gaps (B/D missing). |
| Dates | Builtin + custom numFmt; Excel 1900 leap quirk handled (`excelSerialToIso`). |

### Not elevated to “critical” here

- **Blank header column** drops values under that index (same header-index loop). Real, but less common than title-row / duplicate-name cases.
- **`loadLearnedMappings(sourceSystem)`** (service role, no `agency_id` filter) can suggest another agency’s mapping at 0.99 confidence. Not an auth bypass; user still confirms mapping; pre-existed for all sources, not XLSX-only.
- **Parse-then-cap**: entire sheet is materialized before `rows.length > MAX_IMPORT_ROWS` — same as CSV; authenticated memory pressure possible, not uniquely introduced as an unbounded brick beyond the 10 MB / 80 MB caps.

---

## Path trace (for reviewers)

1. Wizard: `universal-import-wizard.tsx` → `POST /api/universal-import/start` with `FormData(file, sourceSystem)`.
2. Start: auth → size check → `looksLikeZipContainer` → `parseXlsxBuffer` / `parseCsvBuffer` → detect columns → `createImportJob` → `saveDetectedColumns` → `saveImportRows`.
3. Later: mapping → preview → `run` → `runUniversalImport` → leads (agency-scoped).

Bugs 1–3 corrupt or replace data at step 2 (`raw_data`), so later steps cannot recover lost cells.

---

## Recommended fix order (not done in this hunt)

1. Detect header row (not first non-empty): e.g. row with ≥2 non-empty cells matching known patterns, or skip single-cell banner rows.
2. Disambiguate duplicate headers (`Email`, `Email (2)`) before building `Record`.
3. Sheet selection: prefer `activeTab`, or sheet named like Kontakty/Contacts, or expose sheet picker; never fall back to hidden `sheet1.xml` when a visible sheet exists.

---

## Proof log

Vitest against synthetic ZIP/OOXML (2026-10-17, branch `cursor/critical-bug-management-4032`):

- duplicate headers → last wins, first email absent — PASS (bug confirmed)
- title row → phone/email absent under Mobil/Email — PASS (bug confirmed)
- first visible Pokyny vs Kontakty on sheet 2 — PASS (bug confirmed)
- blank header / broken-rels fallback — also confirmed; secondary

Existing unit suite `xlsx-parse.test.ts` (happy path + hidden first sheet) still green; it does not cover the failure modes above.

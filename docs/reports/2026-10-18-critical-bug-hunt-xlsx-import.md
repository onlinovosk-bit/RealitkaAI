# Critical bug hunt — XLSX import path (commit 124c1468)

Head at hunt: branch `cursor/critical-bug-scan-f19c`. Scope: `xlsx-parse.ts`, `universal-import/start`, wizard, related types/tests from `#861` / `124c1468`.

PoC harness: synthetic OOXML ZIP via `npx tsx` (not the Python fixtures alone). Existing unit+verification tests: 16/16 pass — they do not cover the cases below.

## CRITICAL findings

### 1. Duplicate column headers → silent cell loss (wrong CRM field values)

**Where:** `apps/crm/src/lib/universal-import/xlsx-parse.ts:291–304`

```ts
for (const [index, text] of [...headerRow.entries()].sort(...)) {
  headerByIndex.set(index, text);
  headers.push(text);
}
// ...
for (const [index, header] of headerByIndex) record[header] = cols.get(index) ?? "";
```

Rows are `Record<string, string>`. Identical header strings collapse to one key; later column index overwrites earlier.

**Trigger:** `.xlsx` with two columns sharing a header, e.g. `E-mail` | `E-mail` (work + personal), or two `Meno` columns. Confirmed PoC:

- Input row: `Ján Test` | `work@firma.sk` | `jan@gmail.com` | `0901111222`
- Parsed: `{ Meno: "Ján Test", "E-mail": "jan@gmail.com", Mobil: "0901111222" }` — **work email gone**, no error.

**Impact:** Silent data loss before mapping/preview. Wrong email/phone/name lands in `import_rows` and then leads. User sees one sample value and one mapping dropdown for a header that actually represented two columns.

---

### 2. Always first *visible* sheet → silent import of the wrong sheet

**Where:** `apps/crm/src/lib/universal-import/xlsx-parse.ts:201–222` (`firstSheetPath`), used at `:234`

```ts
const visible = list.find((s) => (s["@_state"] ?? "visible") === "visible") ?? list[0];
```

Hidden sheets are skipped (fixture `skryty-prvy-harok.xlsx`), but **among visible sheets only the first is read**. Wizard has no sheet picker.

**Trigger:** Workbook with two visible sheets — e.g. `Archív` (stale contacts) then `Aktuálne` (real export). Confirmed PoC returns only stale rows (`STARÝ` / `stary@x.sk`), never the second sheet.

Variant: first visible sheet is a one-cell cover (`Export info`) → `rows: []` → start route `400` „Excel neobsahuje žiadne dáta“ while sheet 2 has the contacts (significant breakage; not silent corruption).

**Impact:** Broker imports obsolete or wrong contacts into CRM with no warning that another sheet existed. Or blocks on empty first sheet despite valid data on sheet 2.

---

### 3. First non-empty row forced as header → title/banner rows corrupt the whole table

**Where:** `apps/crm/src/lib/universal-import/xlsx-parse.ts:288–304`

```ts
const nonEmpty = rowNodes.map(rowToColumns).filter((m) => m.size > 0);
const headerRow = nonEmpty[0];
```

**Trigger:** Common Excel layout: row 1 title (`Export kontaktov 2024`), row 2 real headers, row 3+ data. Confirmed PoC:

- `headers: ["Export kontaktov 2024"]`
- `rows: [{ "Export kontaktov 2024": "Meno" }, { "Export kontaktov 2024": "Eva" }]`

Real column headers become data; real multi-column rows collapse to a single key.

**Impact:** Mapping UI shows one nonsense column; preview/import either fails validation en masse or creates garbage leads if the broker maps the title column to `contact_name` (first “contact” literally named `Meno`). Significant user-facing breakage on otherwise valid exports.

## Near-misses (below bar — not full findings)

| Item | Why not CRITICAL alone |
|------|------------------------|
| Phone stored as Excel number / scientific notation (`9.01234567E+8`) | Faithful read of `<v>`; corruption already in the file. No recovery, but not a parser inventing wrong digits. |
| `loadLearnedMappings(sourceSystem)` without `agency_id` (service role, latest any tenant) | Cross-tenant **suggestion** at confidence 0.99; UI still requires confirm. Pre-existing, exercised by start route. |
| Shared-string index OOB → `""` then empty-row filter | Silent row drop needs corrupt/incomplete package. |
| Data in columns without a header cell | Silently omitted (by design of header-driven records). |
| External XXE | `fast-xml-parser` rejects `SYSTEM` entities (throws). Local entities expand; no file SSRF observed. |
| Zip inflate budget / 10 MB upload | Present (`MAX_XLSX_INFLATED_BYTES`, `maxOutputLength`). STORE size-lie still allocates up to file size before post-check — bounded by upload cap. |
| Auth on start/mapping/preview/run | `resolveImportAuthContext` + `job.agencyId !== ctx.agencyId` → 403. No tenant bypass found on this path. |
| `import-runner` overwrite of existing lead on email match | Pre-existing; not introduced by `124c1468`. |

## Cleared in scope

- Content-based ZIP sniff (`looksLikeZipContainer`) vs dropdown — intentional; non-xlsx ZIP fails with `XlsxParseError` → 400.
- Sparse cells with `@r` refs — values stay under correct headers (covered by fixture test).
- Date serial &lt; 61 / fake 1900-02-29 — handled and unit-tested.
- No `xlsx`/`exceljs` npm dependency (verification pin).

## Evidence commands

```bash
cd apps/crm && npx vitest run \
  src/lib/universal-import/__tests__/xlsx-parse.test.ts \
  tests/verification/xlsx-import.verification.test.ts
# → 16 passed

# Synthetic PoCs (duplicate headers, multi-sheet, title row) via npx tsx — see agent session.
```

## Next (GO gate)

**ĎALŠIA ÚLOHA:** One PR fixing findings 1–2 (dedupe headers with stable suffixes; sheet selection or “largest/densest sheet” heuristic + surface sheet name in start response/UI). Finding 3 can share that PR if header-row sniff stays minimal (skip single-cell first row), else follow-up.

**PREČO TERAZ:** Wrong-sheet + duplicate-header silently corrupt contact PII in CRM on the new `.xlsx` path; no PROD xlsx imports yet (commit notes) — cheapest time to fix.

**BRÁNA:** GO REQUIRED before implement/merge to `main`.

/**
 * Fetch ŠÚ SR DATAcube table sp3801qr (regional real-estate transaction-price
 * indexes, quarterly) for Prešovský + Košický kraj.
 *
 * Source: https://data.statistics.sk/api/ — no credentials required.
 * License: commercial use with citation (docs/legal/susr-povolenie-2026-08-10.md).
 *
 * NOT wired into valuation calc — data ingest only.
 *
 * Usage: npx tsx scripts/fetch-susr.ts
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://data.statistics.sk/api/v2";
const TABLE = "sp3801qr";

/** NUTS3 codes for Prešovský + Košický kraj (nuts13 dimension). */
const REGION_CODES = ["SK041", "SK042"] as const;

const REGION_LABELS: Record<(typeof REGION_CODES)[number], string> = {
  SK041: "Prešovský kraj",
  SK042: "Košický kraj",
};

const DIMENSION_ORDER = [
  "nuts13",
  "sp3801qr_rok",
  "sp3801qr_nakneh",
  "sp3801qr_stv",
  "sp3801qr_mj",
] as const;

const DIMENSION_NOTES: Record<(typeof DIMENSION_ORDER)[number], string> = {
  nuts13: "0 SR + Oblasti + Kraje",
  sp3801qr_rok: "Rok",
  sp3801qr_nakneh: "Nákupy nehnuteľností",
  sp3801qr_stv: "Štvrťrok",
  sp3801qr_mj: "Merná jednotka (index base)",
};

type JsonStatDimension = {
  class?: string;
  version?: string;
  label?: string;
  note?: string;
  category?: {
    index?: Record<string, number>;
    label?: Record<string, string | null>;
  };
};

type JsonStatDataset = {
  version?: string;
  class?: string;
  label?: string;
  update?: string;
  note?: string;
  href?: string;
  id?: string[];
  size?: number[];
  role?: Record<string, string[]>;
  dimension?: Record<string, JsonStatDimension>;
  value?: Array<number | null>;
};

function repoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..");
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} for ${url}${body ? `: ${body.slice(0, 400)}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

async function fetchDimension(
  dim: (typeof DIMENSION_ORDER)[number],
): Promise<JsonStatDimension> {
  const url = `${API_BASE}/dimension/${TABLE}/${dim}?lang=sk`;
  return fetchJson<JsonStatDimension>(url);
}

async function fetchDataset(): Promise<JsonStatDataset> {
  // PARAM order must match cube dimensions (collection href).
  const geo = REGION_CODES.join(",");
  const url =
    `${API_BASE}/dataset/${TABLE}/${geo}/all/all/all/all` +
    `?lang=sk&type=json`;
  return fetchJson<JsonStatDataset>(url);
}

function summarizeDimension(dim: JsonStatDimension) {
  const index = dim.category?.index ?? {};
  const labels = dim.category?.label ?? {};
  const codes = Object.keys(index).sort((a, b) => index[a]! - index[b]!);
  return {
    label: dim.label ?? null,
    note: dim.note ?? null,
    codes: codes.map((code) => ({
      code,
      label: labels[code] ?? null,
      index: index[code]!,
    })),
  };
}

async function main(): Promise<void> {
  const fetched = new Date().toISOString().slice(0, 10);
  const root = repoRoot();
  const outPath = path.join(root, "data", "susr-sp3801qr.json");
  const structurePath = path.join(root, "data", "susr-sp3801qr-structure-report.json");

  console.log(`[fetch-susr] Discovering dimensions for ${TABLE}…`);
  const dimensionSummaries: Record<string, ReturnType<typeof summarizeDimension>> =
    {};

  try {
    for (const dim of DIMENSION_ORDER) {
      const raw = await fetchDimension(dim);
      dimensionSummaries[dim] = summarizeDimension(raw);
      console.log(
        `  ${dim}: ${dimensionSummaries[dim].codes.length} codes — ${DIMENSION_NOTES[dim]}`,
      );
    }

    console.log(
      `[fetch-susr] Downloading ${REGION_CODES.join("+")} (${REGION_LABELS.SK041}, ${REGION_LABELS.SK042})…`,
    );
    const dataset = await fetchDataset();

    if (!dataset.value || !Array.isArray(dataset.value)) {
      throw new Error("Unexpected API payload: missing value[] array");
    }
    if (!dataset.dimension?.nuts13) {
      throw new Error("Unexpected API payload: missing nuts13 dimension");
    }

    const geoIndex = dataset.dimension.nuts13.category?.index ?? {};
    for (const code of REGION_CODES) {
      if (!(code in geoIndex)) {
        throw new Error(`Region ${code} missing from dataset response`);
      }
    }

    const nonNull = dataset.value.filter((v) => v !== null && v !== undefined).length;

    const payload = {
      meta: {
        source: "Štatistický úrad Slovenskej republiky",
        table: TABLE,
        table_label:
          dataset.label ??
          "Indexy realizačných cien nehnuteľností - regionálne, štvrťročne",
        fetched,
        licencia:
          "komerčné použitie s citáciou — docs/legal/susr-povolenie-2026-08-10.md",
        api_url: `${API_BASE}/dataset/${TABLE}`,
        datacube_href: dataset.href ?? null,
        source_update: dataset.update ?? null,
        regions: REGION_CODES.map((code) => ({
          code,
          label: REGION_LABELS[code],
        })),
        dimensions: DIMENSION_ORDER.map((id) => ({
          id,
          note: DIMENSION_NOTES[id],
          ...dimensionSummaries[id],
        })),
        index_bases: {
          b_romr: "romr = 100 (rovnaké obdobie minulého roka = 100)",
          b_predch_obd_f: "predchádzajúce obdobie = 100",
        },
        property_types: {
          TOTAL: "Spolu",
          DW_NEW: "Nákup nových nehnuteľností",
          DW_EXST: "Nákup existujúcich nehnuteľností",
        },
        note: dataset.note ?? null,
        observation_count: dataset.value.length,
        non_null_observation_count: nonNull,
        wired_into_valuation: false,
      },
      dataset,
    };

    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(
      `[fetch-susr] Wrote ${outPath} (${dataset.value.length} cells, ${nonNull} non-null)`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[fetch-susr] BLOCKED: ${message}`);
    const report = {
      meta: {
        source: "Štatistický úrad Slovenskej republiky",
        table: TABLE,
        fetched,
        status: "structure_report_only",
        error: message,
        licencia:
          "komerčné použitie s citáciou — docs/legal/susr-povolenie-2026-08-10.md",
        note: "No invented numbers. Investigate API before wiring.",
      },
      expected_dimensions: DIMENSION_ORDER.map((id) => ({
        id,
        note: DIMENSION_NOTES[id],
      })),
      discovered_dimensions: dimensionSummaries,
      target_regions: REGION_CODES.map((code) => ({
        code,
        label: REGION_LABELS[code],
      })),
    };
    await mkdir(path.dirname(structurePath), { recursive: true });
    await writeFile(
      structurePath,
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    console.error(`[fetch-susr] Structure report: ${structurePath}`);
    process.exitCode = 1;
  }
}

main();

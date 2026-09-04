/**
 * Backfill properties.type / transaction_type / rooms from Realvia payload_raw
 * using the official číselník mapper (same module as the worker — no logic copy).
 *
 * Default mode is --dry-run (no writes). Agent must NOT run this against prod.
 * Founder runs dry-run, then --apply with required --agency-id.
 *
 *   npx tsx scripts/backfill-realvia-taxonomy.ts --agency-id <uuid>
 *   npx tsx scripts/backfill-realvia-taxonomy.ts --agency-id <uuid> --apply
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  mapCategory,
  mapTransaction,
  roomsFromCategory,
} from "../src/lib/realvia/map-taxonomy";

config({ path: resolve(process.cwd(), ".env.local") });

type Args = {
  agencyId: string | null;
  apply: boolean;
};

function parseArgs(argv: string[]): Args {
  let agencyId: string | null = null;
  let apply = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--agency-id" && argv[i + 1]) {
      agencyId = String(argv[i + 1]).trim();
      i += 1;
    } else if (token === "--apply") {
      apply = true;
    } else if (token === "--dry-run") {
      apply = false;
    }
  }

  return { agencyId, apply };
}

function advertFromPayload(payloadRaw: unknown): {
  category?: number;
  transaction?: number;
  rooms_count?: number | null;
} | null {
  if (!payloadRaw || typeof payloadRaw !== "object") return null;
  const root = payloadRaw as Record<string, unknown>;
  const advert = root.advert;
  if (!advert || typeof advert !== "object") return null;
  return advert as {
    category?: number;
    transaction?: number;
    rooms_count?: number | null;
  };
}

function roomsLabel(roomsCount: number | null | undefined, category: number): string {
  if (roomsCount != null && Number(roomsCount) > 0) {
    return `${roomsCount} izby`;
  }
  return roomsFromCategory(category) ?? "";
}

async function main() {
  const { agencyId, apply } = parseArgs(process.argv.slice(2));

  if (!agencyId) {
    console.error(
      "FAIL-CLOSED: --agency-id is required (cross-tenant guard — see docs/reports/2026-09-03-realvia-cross-tenant-source-id.md).",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from("properties")
    .select("id, type, transaction_type, rooms, payload_raw")
    .eq("agency_id", agencyId)
    .not("payload_raw", "is", null);

  if (error) throw new Error(`properties query failed: ${error.message}`);

  const rows = data ?? [];
  const withAdvert = rows.filter((row) => advertFromPayload(row.payload_raw) != null);

  type Change = {
    id: string;
    field: "type" | "transaction_type" | "rooms";
    from: string;
    to: string;
  };

  const changes: Change[] = [];
  const comboCounts = new Map<string, number>();

  let typeWouldChange = 0;
  let txnWouldChange = 0;
  let roomsWouldChange = 0;
  let unchanged = 0;

  for (const row of withAdvert) {
    const advert = advertFromPayload(row.payload_raw);
    if (!advert) continue;

    const category = Number(advert.category);
    const transaction = Number(advert.transaction);
    if (!Number.isFinite(category) || !Number.isFinite(transaction)) continue;

    const newType = mapCategory(category);
    const newTxn = mapTransaction(transaction);
    const currentRooms = String(row.rooms ?? "").trim();
    const newRooms =
      currentRooms === ""
        ? roomsLabel(
            advert.rooms_count != null ? Number(advert.rooms_count) : null,
            category,
          )
        : currentRooms;

    const nowType = String(row.type ?? "");
    const nowTxn = String(row.transaction_type ?? "");

    const comboKey = `${nowType} | ${newType} | ${nowTxn} | ${newTxn}`;
    comboCounts.set(comboKey, (comboCounts.get(comboKey) ?? 0) + 1);

    let rowChanged = false;
    if (nowType !== newType) {
      typeWouldChange += 1;
      rowChanged = true;
      changes.push({ id: row.id, field: "type", from: nowType, to: newType });
    }
    if (nowTxn !== newTxn) {
      txnWouldChange += 1;
      rowChanged = true;
      changes.push({
        id: row.id,
        field: "transaction_type",
        from: nowTxn,
        to: newTxn,
      });
    }
    if (currentRooms === "" && newRooms !== "") {
      roomsWouldChange += 1;
      rowChanged = true;
      changes.push({ id: row.id, field: "rooms", from: "", to: newRooms });
    }
    if (!rowChanged) unchanged += 1;
  }

  console.log("teraz_typ | novy_typ | teraz_txn | novy_txn | počet");
  const sortedCombos = [...comboCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sortedCombos) {
    console.log(`${key} | ${count}`);
  }

  console.log("");
  console.log(
    `Súhrn: typ sa zmení ${typeWouldChange} / ${withAdvert.length}; transakcia ${txnWouldChange} / ${withAdvert.length}; rooms doplnené ${roomsWouldChange}; bez zmeny ${unchanged} / ${withAdvert.length}.`,
  );
  console.log(`Dotknuté riadky (aspoň jedno pole): ${new Set(changes.map((c) => c.id)).size}`);
  console.log(`Režim: ${apply ? "APPLY" : "DRY-RUN (default)"}`);

  if (!apply) {
    console.log("Žiadny zápis (dry-run). Pre zápis pridaj --apply.");
    return;
  }

  const affectedIds = [...new Set(changes.map((c) => c.id))];
  console.log(`Chystám zápis ${affectedIds.length} properties. Potvrď 'yes':`);
  const rl = createInterface({ input, output });
  const answer = (await rl.question("> ")).trim().toLowerCase();
  rl.close();
  if (answer !== "yes") {
    console.log("Zrušené — nič nezapísané.");
    return;
  }

  const logLines: string[] = [
    `# Backfill Realvia taxonomy — ${new Date().toISOString()}`,
    `agency_id: ${agencyId}`,
    "",
    "id | pole | z | na",
  ];

  for (const id of affectedIds) {
    const rowChanges = changes.filter((c) => c.id === id);
    const patch: Record<string, string> = {};
    for (const c of rowChanges) {
      patch[c.field] = c.to;
      logLines.push(`${c.id} | ${c.field} | ${c.from} | ${c.to}`);
    }
    const { error: updateError } = await sb
      .from("properties")
      .update(patch)
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (updateError) {
      throw new Error(`update ${id} failed: ${updateError.message}`);
    }
  }

  const finalPath = resolve(
    process.cwd(),
    "../../docs/reports/2026-09-04-backfill-realvia-taxonomy.md",
  );
  mkdirSync(dirname(finalPath), { recursive: true });
  writeFileSync(finalPath, `${logLines.join("\n")}\n`, "utf8");
  console.log(`Zápis hotový. Log: ${finalPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

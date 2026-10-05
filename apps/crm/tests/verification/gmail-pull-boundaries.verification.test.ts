import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GMAIL-PULL-FINISH — hranice, ktoré pull nesmie prekročiť. Statický strážca: padne, keď niekto
 * zmaže jednu z poistiek, ktoré robia z čítania cudzej schránky obhájiteľné spracovanie.
 */
const CRM = process.cwd();
const ROOT = join(CRM, "..", "..");
const read = (p: string) => readFileSync(p, "utf8");
const pull = () => read(join(CRM, "src/lib/inbound/gmail-pull.ts"));

describe("[verification] Gmail pull — hranice čítania", () => {
  it("číta iba štítok a iba časové okno (nikdy celú schránku)", () => {
    const src = pull();
    expect(src).toContain('searchParams.set("labelIds"');
    expect(src).toContain("newer_than:");
    expect(src).toContain("if (!labelId) throw new Error(\"label_id_required\")");
    // správa vrátená bez nášho štítku sa neposiela
    expect(src).toContain("(msg.labelIds ?? []).includes(cfg.labelId)");
  });

  it("bez pamäte spracovaných správ nečíta (fail-closed)", () => {
    const src = pull();
    expect(src).toContain('error: "seen_store_unavailable"');
    expect(src).toContain("await store.filterSeen(");
    // pamäť sa pýta PRED sťahovaním tela
    expect(src.indexOf("await store.filterSeen(")).toBeLessThan(src.indexOf("?format=full"));
  });

  it("telo sa orezáva a posiela sa iba do jedinej ingest cesty", () => {
    const src = pull();
    expect(src).toContain("slice(0, MAX_BODY_CHARS)");
    expect(src).toContain("/api/acquire/email");
    expect(src).not.toMatch(/from\(["']leads["']\)/);
    expect(src).not.toContain("profile_google_calendar");
  });

  it("schránka agentúry sa vyberá deterministicky, nie prvý riadok", () => {
    const src = pull();
    // #774: pickAgencyMailbox bere iba adresu celej agentúry (profile_id NULL), deterministicky.
    expect(src).toContain("pickAgencyMailbox((data ?? []) as MailboxRow[])");
    expect(src).not.toMatch(/inbound_mailboxes"\)[\s\S]{0,80}\.limit\(1\)/);
  });

  it("dočasná chyba správu neoznačí ako vybavenú (401/408/429/5xx sa opakuje)", () => {
    const src = pull();
    expect(src).toContain("status !== 401 && status !== 408 && status !== 429");
  });

  it("pamäť spracovaných správ nesie iba ID a výsledok, bez obsahu a adries", () => {
    const sql = read(join(CRM, "supabase/migrations/20261002090000_gmail_inbound_seen.sql"));
    const cols = sql.match(/create table[\s\S]*?\);/i)?.[0] ?? "";
    // názvy stĺpcov (prvé slovo riadku), nie typy — `text` je tu typ ID
    const names = [...cols.matchAll(/^\s{2}([a-z_]+)\s/gm)].map((m) => m[1]).filter((n) => n !== "primary");
    expect(names.sort()).toEqual(["acquired_at", "agency_id", "gmail_message_id", "outcome"]);
    expect(cols).toContain("gmail_message_id");
  });

  it("tabuľka je deny-all pre klientske roly (RLS bez politík + revoke)", () => {
    const sql = read(join(CRM, "supabase/migrations/20261002090000_gmail_inbound_seen.sql"));
    expect(sql).toMatch(/alter table public\.agency_gmail_inbound_seen enable row level security/i);
    expect(sql).toMatch(/revoke all on public\.agency_gmail_inbound_seen from anon, authenticated/i);
    expect(sql).not.toMatch(/create policy/i);
  });

  it("spúšťač: secret ide cez env, nie do príkazu; bez secrets sa preskočí", () => {
    const wf = read(join(ROOT, ".github/workflows/gmail-inbound-pull.yml"));
    expect(wf).toContain("secrets.CRON_SECRET");
    const runBlock = wf.slice(wf.indexOf("run: |"));
    expect(runBlock).not.toContain("secrets.");
    expect(runBlock).toContain('"Authorization: Bearer ${CRON_SECRET}"');
    expect(runBlock).toContain("exit 0");
    expect(wf).toContain("permissions: {}");
  });
});

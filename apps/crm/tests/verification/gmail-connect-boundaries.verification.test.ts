import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GMAIL-CONNECT — poistky, bez ktorých by uložený prístup k cudzej schránke nebol obhájiteľný.
 * Statický strážca: padne, keď niekto jednu z nich vymaže.
 */
const CRM = process.cwd();
const read = (rel: string) => readFileSync(join(CRM, rel), "utf8");
const MIG = "supabase/migrations/20261005100100_agency_gmail_inbound_oauth.sql";

describe("[verification] Gmail connect — token a súhlas", () => {
  it("v databáze nie je žiadny stĺpec s nezašifrovaným tokenom", () => {
    const sql = read(MIG);
    const cols = [...(sql.match(/create table[\s\S]*?\n\);/i)?.[0] ?? "").matchAll(/^\s{2}([a-z_]+)\s/gm)].map((m) => m[1]);
    expect(cols).toContain("refresh_token_ciphertext");
    for (const c of cols) expect(c).not.toMatch(/^(refresh_token|access_token|token)$/);
  });

  it("databáza sama odmietne povolenie nad čítanie a tabuľka je deny-all pre klientske roly", () => {
    const sql = read(MIG);
    expect(sql).toMatch(/scopes <@ array\[\s*'https:\/\/www\.googleapis\.com\/auth\/gmail\.readonly', 'openid', 'email'\s*\]/);
    expect(sql).toMatch(/'https:\/\/www\.googleapis\.com\/auth\/gmail\.readonly' = any\(scopes\)/);
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/revoke all on public\.agency_gmail_inbound_oauth from anon, authenticated/i);
    expect(sql).not.toMatch(/create policy/i);
  });

  it("token sa šifruje AES-256-GCM a tajomstvá nemajú záložnú hodnotu", () => {
    const src = read("src/lib/inbound/gmail-connect.ts");
    expect(src).toContain('"aes-256-gcm"');
    expect(src).not.toMatch(/dev-only|\|\|\s*"[^"]{6,}"/);
    expect(src).toContain('{ error: "missing_state_secret" }');
    expect(src).toContain('{ error: "missing_token_key" }');
  });

  it("žiadaný aj prijatý rozsah je iba gmail.readonly (+ openid, email)", () => {
    const src = read("src/lib/inbound/gmail-connect.ts");
    expect(src).toContain('export const CONNECT_SCOPES = [GMAIL_READONLY_SCOPE, "openid", "email"] as const;');
    expect(src).toContain('throw new Error("forbidden_gmail_scope")');
    expect(src).toContain('throw new Error("scope_readonly_missing")');
    expect(src).not.toMatch(/gmail\.(send|modify|compose)|mail\.google\.com/);
  });
});

describe("[verification] Gmail connect — trasy", () => {
  it("pripojenie berie agentúru z prihláseného profilu, nie z požiadavky", () => {
    const src = read("src/app/api/integrations/gmail-inbound/connect/route.ts");
    expect(src).toContain("agencyId: profile.agency_id");
    expect(src).not.toContain("searchParams");
    expect(src).toContain("canManageGmailConnection(profile)");
  });

  it("callback viaže state na prihlásený profil aj agentúru a ukladá iba šifrovaný token", () => {
    const src = read("src/app/api/integrations/gmail-inbound/callback/route.ts");
    expect(src).toContain("state.profileId !== profile.id || state.agencyId !== profile.agency_id");
    expect(src).toContain("ciphertext: encryptToken(conn.refreshToken, cfg.tokenKey)");
    expect(src).not.toMatch(/\n\s+refreshToken[,:]/);
    expect(src).toContain("canManageGmailConnection(profile)");
  });

  it("odpojenie najprv zmaže uložený token, až potom sa pokúsi o odvolanie u Googlu", () => {
    const src = read("src/app/api/integrations/gmail-inbound/disconnect/route.ts");
    expect(src.indexOf("await wipeConnection(")).toBeGreaterThan(-1);
    expect(src.indexOf("await wipeConnection(")).toBeLessThan(src.indexOf("await revokeGoogleToken("));
    expect(src).toContain("canManageGmailConnection(profile)");
  });

  it("stav pre používateľa nikdy nenesie token ani jeho šifrovanú podobu", () => {
    const store = read("src/lib/inbound/gmail-connect-store.ts");
    const status = store.slice(store.indexOf("export async function getConnectionStatus"), store.indexOf("export async function loadActiveConnections"));
    expect(status).not.toContain("refresh_token_ciphertext");
    expect(status).not.toContain('select("*")');
    const ui = read("src/components/integrations/gmail-inbound-panel.tsx");
    expect(ui).not.toMatch(/ciphertext|refresh_token|refreshToken/);
  });

  it("pull beží izolovane po agentúrach a ich tokeny sa nemiešajú", () => {
    const src = read("src/lib/inbound/gmail-pull.ts");
    expect(src).toContain("decryptToken(c.ciphertext, key)");
    expect(src).toContain("for (const cfg of jobs)");
    expect(src).toContain("await pullWithConfig(cfg,");
    expect(src).toContain('error: "missing_token_key"');
  });
});

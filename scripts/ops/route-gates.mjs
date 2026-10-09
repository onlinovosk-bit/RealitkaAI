#!/usr/bin/env node
/**
 * route-gates — deterministický (bez LLM, bez siete, bez hodín) inventár API trás
 * a stavu ich brány. Statická heuristika nad zdrojákmi `route.ts` a `proxy.ts`.
 *
 * Použitie (z koreňa repa):
 *   node scripts/ops/route-gates.mjs --out docs/audit/route-gates.md   # prepočíta dokument
 *   node scripts/ops/route-gates.mjs --json                            # JSON na stdout
 *   node scripts/ops/route-gates.mjs                                   # markdown na stdout
 * Voliteľné: --root <dir s trasami, default apps/crm/src/app/api>
 *            --proxy <proxy.ts, default apps/crm/src/proxy.ts>
 *
 * Čo skript NEDOKAZUJE: pozri sekciu „Čo skript NEDOKAZUJE" vo vygenerovanom
 * dokumente (docs/audit/route-gates.md). Skratka: nachádza ROZPOZNANÚ bránu
 * (importy/volania), nie že je správna, fail-closed, ani že beží v PROD.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export const CATEGORIES = [
  "GATED-TENANT",
  "GATED-SESSION",
  "GATED-SECRET",
  "PUBLIC-BY-DESIGN",
  "GONE",
  "UNGATED",
  "UNKNOWN",
];
/** Poradie „slabosti" pre zlúčenie metód jednej trasy: najslabšia metóda vyhráva. */
const WEAKNESS = ["UNGATED", "UNKNOWN", "GATED-SESSION", "GATED-SECRET", "GATED-TENANT"];

// ---------------------------------------------------------------------------
// Signály (identifikátory v kóde bez komentárov)
// ---------------------------------------------------------------------------
const SECRET_SIGNALS = [
  /\brevolisGuard\b/,
  /\bisAuthorizedCronBearer\b/,
  /\bauthorizeCron(?:Bearer)?\b/,
  /\bconciergeSecretOk\b/,
  /\btimingSafeEqual\b/,
  /\bcreateHmac\b/,
  /\bverify\w*(?:Signature|Webhook)\w*\b/,
  /\bCRON_SECRET\b/,
];
const SESSION_SIGNALS = [
  /\bgetUser\b/,
  /\bgetCurrentUser\b/,
  /\bgetCurrentProfile\b/,
  /\brequireUser\b/,
  /\brequirePlatformAdmin\b/,
  /\brequireRole\b/,
  /\brequireCallerAgency\b/,
  /\bresolveSessionAgencyId\b/,
  /\bresolveProfileForAuthUser\b/,
  /\bgetAgencyIdForAuthUser\b/,
];
const TENANT_SIGNALS = [
  /\bsameAgency\b/,
  /\bfilterRowsByAgency\b/,
  /\bresolveSessionAgencyId\b/,
  /\brequireCallerAgency\b/,
  /\bassertSameAgencyTarget\b/,
  /\bassertRuleOwned\b/,
  /\bagency_id\b/,
  /\bagencyId\b/,
];
/** Slabé náznaky brány, ktoré skript nevie vyhodnotiť → UNKNOWN (nikdy GATED). */
const WEAK_SIGNALS = [
  /\b(?:verify|authorize|authenticate|assert)[A-Z]\w*\s*\(/,
  /headers\.get\(\s*["'`](?:authorization|x-[\w-]*(?:secret|token|key|signature|auth)[\w-]*)["'`]/i,
  /\b[A-Z0-9_]*(?:WEBHOOK|SHARED|SIGNING|INBOUND|AUTH|IMPORT)[A-Z0-9_]*(?:SECRET|TOKEN|KEY)\b/,
  /searchParams\.get\(\s*["'`](?:token|key|secret|sig|signature)["'`]/i,
];

/** Handler posiela request do importovanej funkcie — brána môže byť tam (skript nevie). Použité len mimo session-režimu proxy. */
const DELEGATION_SIGNALS = [
  /\b(?:validate|handle|process|ingest|verify|authorize)\w*\s*\(\s*(?:req|request)\b/,
];

const RISK_RULES = [
  { tag: "odosielanie", w: 5, re: /\b(?:sendEmail|sendMail|sendSms|sendWhatsApp\w*|sendMessage|sendNotification\w*|sendLegal\w*|sendOutreach\w*|Resend|nodemailer|twilio|sendgrid)\b|messages\.send/i },
  { tag: "platby", w: 5, re: /stripe|checkout|payment|billing|subscription|invoice/i },
  { tag: "service-role", w: 4, re: /\b(?:createAdminClient|getSupabaseAdmin|supabaseAdmin|SUPABASE_SERVICE_ROLE_KEY)\b/ },
  { tag: "DB-zápis", w: 3, re: /\.(?:insert|update|upsert|delete)\(|\.rpc\(/ },
  { tag: "mutácia", w: 2, re: /\b(?:create|update|delete|upsert|insert|save|remove|import|assign|approve|publish|send)[A-Z]\w*\s*\(/ },
  { tag: "AI/náklady", w: 1, re: /openai|anthropic|embedding/i },
  { tag: "ext-fetch", w: 1, re: /\bfetch\(/ },
];

// Dôvody pre PUBLIC_PATHS (zo zdrojov/komentárov proxy.ts + názvu; NIE sú overené v PROD).
const PUBLIC_REASONS = {
  "/api/healthz": "liveness/health probe",
  "/api/demo/request": "verejný demo formulár (akvizícia)",
  "/api/demo/capture-lead": "verejný demo formulár (akvizícia)",
  "/api/demo/estimate": "verejný demo odhad (akvizícia)",
  "/api/demo/prefill-links": "verejný demo helper (akvizícia)",
  "/api/proof": "verejná proof stránka/dáta",
  "/api/billing/webhook": "webhook platobnej brány (autentifikácia podpisom v trase)",
  "/api/integrations/google/callback": "OAuth redirect z Google (volá prehliadač bez našej session)",
  "/api/webhooks/hubspot": "webhook HubSpot (podpis v trase)",
  "/api/leads/inbound": "príjem leadov z externých zdrojov",
  "/api/acquire/email": "príjem akvizičného e-mailu",
  "/api/acquisition/google/lead-webhook": "webhook Google lead formulára",
  "/api/valuation/submit": "verejný odhad nehnuteľnosti (lead capture)",
  "/api/valuation/estimate": "verejný odhad nehnuteľnosti",
  "/api/onboarding/session": "verejný onboarding wizard (proxy.ts komentár: Founder GO 2026-09-17; session_id + rate-limit v trase)",
  "/api/concierge/properties": "widget na webe klienta (proxy.ts komentár: CONCIERGE_SHARED_SECRET)",
  "/api/concierge/callback": "widget na webe klienta (proxy.ts komentár: CONCIERGE_SHARED_SECRET)",
  "/api/concierge/freebusy": "widget na webe klienta (proxy.ts komentár: CONCIERGE_SHARED_SECRET)",
};

// ---------------------------------------------------------------------------
// Skenovanie zdrojáku
// ---------------------------------------------------------------------------

/** Nahradí komentáre medzerami (zachová offsety a nové riadky); reťazce nechá. */
export function stripComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && src[i] !== "\n") { out += " "; i++; }
    } else if (c === "/" && d === "*") {
      out += "  "; i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { out += src[i] === "\n" ? "\n" : " "; i++; }
      if (i < n) { out += "  "; i += 2; }
    } else if (c === '"' || c === "'" || c === "`") {
      const q = c;
      out += c; i++;
      while (i < n && src[i] !== q) {
        if (src[i] === "\\") { out += src[i]; i++; }
        if (i < n) { out += src[i]; i++; }
      }
      if (i < n) { out += src[i]; i++; }
    } else {
      out += c; i++;
    }
  }
  return out;
}

/** Index zodpovedajúcej zatvárajúcej zátvorky (reťazce preskakuje). -1 ak nenájdená. */
function findMatching(code, openIdx, open, close) {
  let depth = 0;
  for (let i = openIdx; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c; i++;
      while (i < code.length && code[i] !== q) { if (code[i] === "\\") i++; i++; }
      continue;
    }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/** Telo funkcie od indexu za jej názvom (`(`...`)` potom prvý `{`). */
function bodyAfterParams(code, parenIdx) {
  const end = findMatching(code, parenIdx, "(", ")");
  if (end < 0) return null;
  const brace = code.indexOf("{", end);
  if (brace < 0) return null;
  const close = findMatching(code, brace, "{", "}");
  if (close < 0) return null;
  return code.slice(brace, close + 1);
}

/** Top-level pomocné funkcie súboru: meno → telo. */
function collectHelpers(code) {
  const helpers = new Map();
  const fnRe = /(?:^|[\s;}])(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>(]*>)?\s*\(/g;
  let m;
  while ((m = fnRe.exec(code))) {
    const parenIdx = m.index + m[0].length - 1;
    const body = bodyAfterParams(code, parenIdx);
    if (body && !helpers.has(m[1])) helpers.set(m[1], body);
  }
  const arrowRe = /(?:^|[\s;}])(?:export\s+)?const\s+(\w+)\s*(?::[^=\n]+)?=\s*(?:async\s*)?(\()/g;
  while ((m = arrowRe.exec(code))) {
    const parenIdx = m.index + m[0].length - 1;
    const end = findMatching(code, parenIdx, "(", ")");
    if (end < 0) continue;
    const rest = code.slice(end + 1, end + 200);
    const arrow = /^\s*(?::[^=]+)?=>\s*\{/.exec(rest);
    if (!arrow) continue;
    const brace = end + 1 + arrow[0].length - 1;
    const close = findMatching(code, brace, "{", "}");
    if (close > 0 && !helpers.has(m[1])) helpers.set(m[1], code.slice(brace, close + 1));
  }
  return helpers;
}

/**
 * Exportované HTTP handlery: { METHOD → { body: string|null, approx: boolean } }.
 * body === null znamená, že telo sa nepodarilo vyčleniť (re-export, wrapper, …).
 */
export function extractHandlers(code) {
  const handlers = new Map();
  const set = (method, body, approx) => {
    if (!handlers.has(method)) handlers.set(method, { body, approx });
  };
  const fnRe = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*(?:<[^>(]*>)?\s*\(/g;
  let m;
  while ((m = fnRe.exec(code))) {
    const body = bodyAfterParams(code, m.index + m[0].length - 1);
    set(m[1], body, body === null);
  }
  const constRe = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b\s*(?::[^=\n]+)?=\s*/g;
  while ((m = constRe.exec(code))) {
    const start = m.index + m[0].length;
    const tail = code.slice(start, start + 400);
    const inline = /^(?:async\s*)?(\()/.exec(tail);
    if (inline) {
      const parenIdx = start + inline[0].length - 1;
      const end = findMatching(code, parenIdx, "(", ")");
      const arrow = end > 0 ? /^\s*(?::[^=]+)?=>\s*\{/.exec(code.slice(end + 1, end + 200)) : null;
      if (arrow) {
        const brace = end + 1 + arrow[0].length - 1;
        const close = findMatching(code, brace, "{", "}");
        if (close > 0) { set(m[1], code.slice(brace, close + 1), false); continue; }
      }
      set(m[1], null, true);
      continue;
    }
    const call = /^(\w+)\s*\(/.exec(tail);
    if (call) {
      const parenIdx = start + call[0].length - 1;
      const end = findMatching(code, parenIdx, "(", ")");
      // wrapper: text celého volania vrátane názvu wrappera a vloženej funkcie
      set(m[1], end > 0 ? code.slice(start, end + 1) : null, true);
      continue;
    }
    const ident = /^(\w+)\s*;?/.exec(tail);
    set(m[1], ident ? ident[1] : null, true);
  }
  const reRe = /export\s*\{([^}]*)\}(\s*from\s*["'][^"']+["'])?/g;
  while ((m = reRe.exec(code))) {
    for (const part of m[1].split(",")) {
      const mm = /(?:^|\s)(?:(\w+)\s+as\s+)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*$/.exec(part.trim());
      if (mm) set(mm[2], m[2] ? null : mm[1] ?? mm[2], true);
    }
  }
  return handlers;
}

/** Text handlera + transitívne telá lokálnych pomocných funkcií, ktoré volá. */
function effectiveText(body, helpers, handlerNames) {
  if (body === null) return null;
  let text = body;
  const seen = new Set();
  const queue = [body];
  while (queue.length) {
    const cur = queue.pop();
    for (const [name, hbody] of helpers) {
      if (seen.has(name) || handlerNames.has(name)) continue;
      if (new RegExp(`\\b${name}\\b`).test(cur)) {
        seen.add(name);
        text += "\n" + hbody;
        queue.push(hbody);
      }
    }
  }
  return text;
}

function hits(text, regexes) {
  const found = [];
  for (const re of regexes) {
    const m = re.exec(text);
    if (m) found.push(m[0].replace(/\s*\($/, "").trim());
  }
  return found;
}

export function signalsOf(text) {
  return {
    secret: hits(text, SECRET_SIGNALS),
    session: hits(text, SESSION_SIGNALS),
    tenant: hits(text, TENANT_SIGNALS),
    weak: hits(text, WEAK_SIGNALS),
    delegates: hits(text, DELEGATION_SIGNALS),
  };
}

/** Handler, ktorého prvý príkaz je `return …410…` (GONE shim). */
function isGoneBody(body) {
  if (!body || body.length < 2) return false;
  const first = body.slice(1, -1).trim();
  const stmt = first.split(/;\s*\n|;\s*$/)[0];
  return /^return\b[\s\S]*\b410\b/.test(stmt);
}

// ---------------------------------------------------------------------------
// proxy.ts
// ---------------------------------------------------------------------------
function quoted(str) {
  return [...str.matchAll(/["'`]([^"'`]+)["'`]/g)].map((x) => x[1]);
}

export function parseProxy(proxySrc) {
  const code = stripComments(proxySrc);
  const setOf = (name) => {
    const m = new RegExp(`const\\s+${name}\\s*=\\s*new\\s+Set\\(\\[([\\s\\S]*?)\\]\\)`).exec(code);
    if (!m) throw new Error(`proxy.ts: nenájdený Set ${name} — skript treba aktualizovať`);
    return new Set(quoted(m[1]));
  };
  const strOf = (name) => {
    const m = new RegExp(`const\\s+${name}\\s*=\\s*["']([^"']+)["']`).exec(code);
    if (!m) throw new Error(`proxy.ts: nenájdená konštanta ${name} — skript treba aktualizovať`);
    return m[1];
  };
  const arrOf = (name) => {
    const m = new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`).exec(code);
    if (!m) throw new Error(`proxy.ts: nenájdené pole ${name} — skript treba aktualizovať`);
    return quoted(m[1]);
  };
  // Pravidlá zadrátované vo funkciách proxy — over, že v zdroji ešte sú.
  for (const needle of ["/api/realvia/import", "/api/uc/import", "/api/realsoft/import", "/api/healthz"]) {
    if (!code.includes(needle)) throw new Error(`proxy.ts: chýba pravidlo ${needle} — skript treba aktualizovať`);
  }
  return {
    publicPaths: setOf("PUBLIC_PATHS"),
    cronPrefixes: [strOf("CRON_PATH_PREFIX"), strOf("CRON_API_PATH_PREFIX")],
    cronExact: setOf("CRON_AUTH_API_PATHS"),
    scoringCron: arrOf("SCORING_CRON_PATHS"),
    deprecated: setOf("DEPRECATED_API_SHIMS"),
    removed: setOf("REMOVED_API_PATHS"),
    webhookSegment: strOf("WEBHOOK_API_SEGMENT"),
  };
}

/** Zrkadlí poradie vetiev vo funkcii `proxy()` a `isPublic()`/`isCronRoute()`. */
export function proxyModeOf(pathname, p) {
  if (p.publicPaths.has(pathname) || pathname.startsWith("/api/healthz")) return "public";
  const t = pathname;
  if (t === "/api/realvia/import" || t === "/api/realvia/import/") return "bypass:import";
  if (["/api/uc/import", "/api/uc/import/", "/api/realsoft/import", "/api/realsoft/import/"].includes(t)) return "bypass:import";
  if (t === p.webhookSegment || t.startsWith(`${p.webhookSegment}/`)) return "bypass:webhook";
  if (p.removed.has(t)) return "bypass:removed";
  if (p.deprecated.has(t)) return "bypass:410-shim";
  if (
    p.cronExact.has(t) ||
    p.cronPrefixes.some((x) => t.startsWith(x)) ||
    p.scoringCron.some((x) => t.startsWith(x))
  ) return "bypass:cron";
  return "session";
}

// ---------------------------------------------------------------------------
// Klasifikácia
// ---------------------------------------------------------------------------
function riskOf(code, methods) {
  const tags = [];
  let score = 0;
  for (const r of RISK_RULES) {
    if (r.re.test(code)) { tags.push(r.tag); score += r.w; }
  }
  if (methods.some((x) => ["POST", "PUT", "PATCH", "DELETE"].includes(x))) score += 1;
  return { tags, score };
}

function classifyMethod(sig, mode) {
  if (sig === null) return { cls: "UNKNOWN", why: "telo handlera sa nepodarilo vyčleniť", gates: [] };
  const gates = [];
  if (sig.secret.length) gates.push(`secret:${sig.secret.join("+")}`);
  if (sig.session.length) gates.push(`session:${sig.session.join("+")}`);
  if (sig.tenant.length && (sig.session.length || sig.secret.length)) gates.push(`tenant:${sig.tenant.join("+")}`);
  if (sig.secret.length) return { cls: "GATED-SECRET", gates };
  if (sig.session.length) {
    return { cls: sig.tenant.length ? "GATED-TENANT" : "GATED-SESSION", gates };
  }
  if (sig.weak.length) {
    return { cls: "UNKNOWN", why: `slabý náznak brány bez rozpoznanej: ${sig.weak.join(", ")}`, gates };
  }
  if (mode === "session") {
    return { cls: "GATED-SESSION", gates: ["session:proxy-only"], proxyOnly: true };
  }
  if (sig.delegates.length) {
    return { cls: "UNKNOWN", why: `proxy ${mode} nevynucuje session; request sa deleguje do importovanej funkcie (${sig.delegates.join(", ")}), brána môže byť tam, skript to nevie`, gates };
  }
  return { cls: "UNGATED", gates: [], why: `proxy ${mode} nevynucuje session a v trase nie je rozpoznaná brána` };
}

export function classifyRoute({ urlPath, source, proxy }) {
  const mode = proxyModeOf(urlPath, proxy);
  const code = stripComments(source);
  const helpers = collectHelpers(code);
  const handlers = extractHandlers(code);
  const methods = METHODS.filter((x) => handlers.has(x));
  const handlerNames = new Set(METHODS);
  const risk = riskOf(code, methods);
  const base = { urlPath, methods, proxyMode: mode, risk };

  if (methods.length === 0) {
    return { ...base, category: "UNKNOWN", methodClasses: {}, gates: [], note: "nenájdený exportovaný HTTP handler" };
  }

  const allGone = methods.every((x) => isGoneBody(handlers.get(x).body));
  if (allGone) return { ...base, category: "GONE", methodClasses: {}, gates: [], note: "všetky handlery končia 410" };

  const fileSig = signalsOf(code);
  const per = {};
  for (const m of methods) {
    const h = handlers.get(m);
    let sig = null;
    if (h.body !== null && !h.approx) {
      // pozor: identifikátor ako body (export const X = handler) rieši sa cez helpers
      sig = signalsOf(effectiveText(h.body, helpers, handlerNames));
    } else if (h.body !== null) {
      const eff = /^\w+$/.test(h.body) && helpers.has(h.body) ? helpers.get(h.body) : h.body;
      // wrapper/odkaz: rátaj telo + helpery; ak nič, spadni na signály celého súboru (aproximácia)
      const s1 = signalsOf(effectiveText(eff, helpers, handlerNames));
      const any = s1.secret.length + s1.session.length + s1.weak.length > 0;
      sig = any ? s1 : fileSig;
    }
    // handler, ktorý nič z toho nemá, ale sám je OPTIONS bez DB, nepovažuj za medzeru
    per[m] = classifyMethod(sig, mode);
    if (m === "OPTIONS" && per[m].cls === "UNGATED" && !risk.tags.some((t) => ["DB-zápis", "service-role"].includes(t))) {
      per[m] = { cls: "GATED-SESSION", gates: ["OPTIONS:preflight"], proxyOnly: true };
    }
  }

  const methodClasses = Object.fromEntries(methods.map((x) => [x, per[x].cls]));
  const gates = [...new Set(methods.flatMap((x) => per[x].gates))];
  const notes = [];
  for (const m of methods) if (per[m].why) notes.push(`${m}: ${per[m].why}`);
  if (methods.every((x) => per[x].proxyOnly)) notes.push("session len cez proxy.ts; v trase žiadna kontrola");
  else if (methods.some((x) => per[x].proxyOnly)) {
    notes.push(`session len cez proxy.ts pre: ${methods.filter((x) => per[x].proxyOnly).join(",")}`);
  }

  let category;
  if (mode === "public") {
    category = "PUBLIC-BY-DESIGN";
    if (!fileSig.secret.length && !fileSig.session.length && !fileSig.weak.length && !/rate[-_ ]?(?:limit|guard)|RateLimit/i.test(code)) {
      notes.push("verejná trasa bez rozpoznaného secretu/session/rate-limitu");
    }
  } else {
    category = methods
      .map((x) => per[x].cls)
      .sort((a, b) => WEAKNESS.indexOf(a) - WEAKNESS.indexOf(b))[0];
  }
  const out = { ...base, category, methodClasses, gates, note: notes.join("; ") };
  if (category === "PUBLIC-BY-DESIGN") out.publicReason = PUBLIC_REASONS[urlPath] ?? "NEZNÁME (cesta nie je v mape dôvodov skriptu)";
  return out;
}

// ---------------------------------------------------------------------------
// Prechod stromom
// ---------------------------------------------------------------------------
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") out.push(...walk(p)); }
    else if (e.name === "route.ts") out.push(p);
  }
  return out;
}

export function urlPathFor(root, file) {
  const rel = path.relative(root, path.dirname(file)).split(path.sep)
    .filter((s) => s && !/^\(.*\)$/.test(s)); // route groups (x) nie sú v URL
  return "/api" + (rel.length ? "/" + rel.join("/") : "");
}

export function scanRoutes({ root, proxyFile }) {
  const proxy = parseProxy(fs.readFileSync(proxyFile, "utf8"));
  const files = walk(root).sort();
  return files
    .map((f) => {
      const urlPath = urlPathFor(root, f);
      const res = classifyRoute({ urlPath, source: fs.readFileSync(f, "utf8"), proxy });
      return { file: path.relative(REPO_ROOT, f).split(path.sep).join("/"), ...res };
    })
    .sort((a, b) => (a.urlPath < b.urlPath ? -1 : a.urlPath > b.urlPath ? 1 : a.file < b.file ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------
function esc(s) { return String(s).replace(/\|/g, "\\|"); }
function riskSort(a, b) {
  return (
    b.risk.score - a.risk.score ||
    WEAKNESS.indexOf(a.category) - WEAKNESS.indexOf(b.category) ||
    (a.urlPath < b.urlPath ? -1 : 1)
  );
}

function gitMeta() {
  const run = (args) => {
    try { return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim(); }
    catch { return null; }
  };
  const sha = run(["rev-parse", "--short", "HEAD"]);
  const date = run(["log", "-1", "--format=%cs"]);
  const dirty = run(["status", "--porcelain", "--", "apps/crm/src/app/api", "apps/crm/src/proxy.ts"]);
  return { sha: sha ?? "NEZNÁME", date: date ?? "NEZNÁME", dirty: dirty ? true : false };
}

export function renderMarkdown(rows, meta) {
  const count = (pred) => rows.filter(pred).length;
  const L = [];
  L.push("# Brány API trás — inventár (WP-4 ROUTE-GATES)");
  L.push("");
  L.push("> Vygenerované skriptom `scripts/ops/route-gates.mjs` (deterministický, bez LLM, bez siete). **Needitovať ručne.**");
  L.push("");
  L.push("## Pôvod a prepočet");
  L.push("");
  L.push(`- Zdrojový commit: \`${meta.sha}\` (dátum commitu ${meta.date}${meta.dirty ? "; pracovný strom mal necommitnuté zmeny v api/proxy" : ""}).`);
  L.push("- Prepočet (z koreňa repa):");
  L.push("");
  L.push("```bash");
  L.push("node scripts/ops/route-gates.mjs --out docs/audit/route-gates.md");
  L.push("```");
  L.push("");
  L.push("- Vstupy: `apps/crm/src/app/api/**/route.ts` a `apps/crm/src/proxy.ts`. Rovnaký vstup dáva rovnaký výstup (dátum je dátum commitu, nie hodiny).");
  L.push("");
  L.push("## Čo skript NEDOKAZUJE");
  L.push("");
  L.push("Je to **heuristika nad textom zdrojákov**. Skript len nájde *rozpoznanú* bránu (volanie/import z fixného zoznamu mien). Nedokazuje:");
  L.push("");
  L.push("- že brána je **správna** (napr. že výsledok `getUser()` sa naozaj skontroluje na `null` a vráti 401),");
  L.push("- že je **fail-closed** (pri chýbajúcom env/secrete, pri výnimke, pri timeoute),");
  L.push("- že **tenant filter** (`agency_id`, `sameAgency`, …) je aplikovaný na *každý* dotaz a cestu v handleri — `GATED-TENANT` znamená len „v handleri je session signál aj tenant signál“,");
  L.push("- že kód beží v PROD ani že PROD zodpovedá tomuto commitu (nič nehovorí o zatvorených/otvorených cestách v produkcii),");
  L.push("- že `GATED-SESSION (proxy-only)` je bezpečné: session vynucuje len `proxy.ts` (matcher + `getUser()`), v trase žiadna kontrola — pri service-role klientovi je to jediná obrana,");
  L.push("- správnosť dôvodov pri `PUBLIC-BY-DESIGN` (dôvod je z komentárov `proxy.ts` / názvu cesty, nie overený).");
  L.push("");
  L.push("Overenie správnosti brán je **manuálna práca P14**. `UNKNOWN` = skript nevie rozhodnúť (nenájdený handler, wrapper/re-export, alebo len slabý náznak brány); **nikdy sa nezaokrúhľuje na GATED**. Slabosť metód: ak má trasa viac metód, kategória trasy je kategória *najslabšej* metódy (stĺpec „Metódy“ ukazuje všetky).");
  L.push("");
  L.push("Ako číta proxy: `PUBLIC_PATHS` + `/api/healthz*` = bez session; `/api/agents*`, `/api/cron/*`, `/api/followup`, `/api/inbound/gmail-pull`, `/api/scoring*` (cron), `/api/webhooks*`, importy `realvia`/`uc`/`realsoft`, 410 shimy a odstránené cesty **obchádzajú session** (potrebujú vlastnú bránu v trase). Všetky ostatné `/api/*` trasy dostanú od proxy 401 bez prihláseného usera.");
  L.push("");

  L.push("## Súhrn podľa kategórie");
  L.push("");
  L.push(`Počet trás (\`route.ts\`): **${rows.length}**`);
  L.push("");
  L.push("| Kategória | Počet |");
  L.push("|---|---:|");
  for (const c of CATEGORIES) L.push(`| ${c} | ${count((r) => r.category === c)} |`);
  L.push("");
  const proxyOnly = count((r) => r.category === "GATED-SESSION" && r.note.includes("session len cez proxy.ts; v trase"));
  const gatedAll = count((r) => r.category.startsWith("GATED-"));
  L.push(`Z toho \`GATED-SESSION\` výlučne cez proxy (bez kontroly v trase): **${proxyOnly}**.`);
  L.push("");
  L.push("### Kategória × režim proxy");
  L.push("");
  const modes = [...new Set(rows.map((r) => r.proxyMode))].sort();
  L.push(`| Kategória | ${modes.join(" | ")} |`);
  L.push(`|---|${modes.map(() => "---:").join("|")}|`);
  for (const c of CATEGORIES) L.push(`| ${c} | ${modes.map((m) => count((r) => r.category === c && r.proxyMode === m)).join(" | ")} |`);
  L.push("");

  L.push("## Zosúladenie čísel „27/40“ a „28/40“");
  L.push("");
  L.push(`Skript naráta **${rows.length}** súborov \`route.ts\`; z nich **${gatedAll}** má rozpoznanú bránu (GATED-*), **${count((r) => r.category === "PUBLIC-BY-DESIGN")}** je verejných podľa dizajnu, **${count((r) => r.category === "GONE")}** je 410, **${count((r) => r.category === "UNGATED")}** je UNGATED a **${count((r) => r.category === "UNKNOWN")}** UNKNOWN. Zoznam „40 ciest“ v repe neexistuje, takže čitateľ 27 (decisions.md) ani 28 (STATUS) sa tu **nedá zreprodukovať** — definícia „40“ je NEZNÁMA. Tento dokument nerobí žiadne tvrdenie o stave ciest v PROD.`);
  L.push("");

  const issues = rows.filter((r) => r.category === "UNGATED" || r.category === "UNKNOWN").sort(riskSort);
  L.push("## UNGATED a UNKNOWN podľa rizika");
  L.push("");
  L.push("Riziko = súčet váh nad celým súborom trasy: odosielanie 5, platby 5, service-role 4, DB-zápis 3, mutácia 2, mutujúca HTTP metóda 1, AI/náklady 1, ext-fetch 1. Je to len triedenie, nie hodnotenie závažnosti.");
  L.push("");
  if (issues.length === 0) L.push("_Žiadne._");
  else {
    L.push("| # | Riziko | Cesta | Kategória | Metódy | Proxy | Rizikové znaky | Poznámka |");
    L.push("|--:|--:|---|---|---|---|---|---|");
    issues.forEach((r, i) => L.push(`| ${i + 1} | ${r.risk.score} | \`${esc(r.urlPath)}\` | ${r.category} | ${r.methods.join(",")} | ${r.proxyMode} | ${esc(r.risk.tags.join(", ") || "-")} | ${esc(r.note || "-")} |`));
  }
  L.push("");

  const watch = rows
    .filter((r) => r.category === "GATED-SESSION" && r.note.includes("session len cez proxy.ts") && r.risk.tags.some((t) => ["service-role", "odosielanie", "platby"].includes(t)))
    .sort(riskSort);
  L.push("## Sledovať: session len cez proxy + service-role / odosielanie / platby");
  L.push("");
  L.push("Trasy bez kontroly session v samotnej trase, ktoré sa spoliehajú výlučne na `proxy.ts` a zároveň používajú service-role klienta, odosielanie alebo platby. Nie sú UNGATED, ale pri chybe v proxy (matcher, výnimka) nemajú druhú líniu.");
  L.push("");
  if (watch.length === 0) L.push("_Žiadne._");
  else {
    L.push("| Riziko | Cesta | Metódy | Rizikové znaky |");
    L.push("|--:|---|---|---|");
    for (const r of watch) L.push(`| ${r.risk.score} | \`${esc(r.urlPath)}\` | ${r.methods.join(",")} | ${esc(r.risk.tags.join(", "))} |`);
  }
  L.push("");

  const pub = rows.filter((r) => r.category === "PUBLIC-BY-DESIGN");
  L.push("## PUBLIC-BY-DESIGN (v PUBLIC_PATHS)");
  L.push("");
  L.push("| Cesta | Metódy | Dôvod (nie overený) | Brány v trase | Poznámka |");
  L.push("|---|---|---|---|---|");
  for (const r of pub) L.push(`| \`${esc(r.urlPath)}\` | ${r.methods.join(",")} | ${esc(r.publicReason)} | ${esc(r.gates.join("; ") || "-")} | ${esc(r.note || "-")} |`);
  L.push("");

  L.push("## Úplná tabuľka");
  L.push("");
  L.push("| Cesta | Metódy | Kategória | Proxy | Dôkaz brány | Rizikové znaky |");
  L.push("|---|---|---|---|---|---|");
  for (const r of rows) {
    const mc = new Set(Object.values(r.methodClasses));
    const methods = mc.size > 1 ? r.methods.map((m) => `${m}:${r.methodClasses[m]}`).join(", ") : r.methods.join(",");
    L.push(`| \`${esc(r.urlPath)}\` | ${esc(methods)} | ${r.category} | ${r.proxyMode} | ${esc(r.gates.join("; ") || (r.category === "GONE" ? "410" : "-"))} | ${esc(r.risk.tags.join(", ") || "-")} |`);
  }
  L.push("");
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function main(argv) {
  const arg = (name, def) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : def;
  };
  const root = path.resolve(arg("--root", path.join(REPO_ROOT, "apps/crm/src/app/api")));
  const proxyFile = path.resolve(arg("--proxy", path.join(REPO_ROOT, "apps/crm/src/proxy.ts")));
  const rows = scanRoutes({ root, proxyFile });
  let output;
  if (argv.includes("--json")) output = JSON.stringify(rows, null, 2) + "\n";
  else output = renderMarkdown(rows, gitMeta()) ;
  const out = arg("--out", null);
  if (out) fs.writeFileSync(path.resolve(out), output);
  else process.stdout.write(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2));
}

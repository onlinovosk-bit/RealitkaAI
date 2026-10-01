#!/usr/bin/env node
/**
 * Cieľová cesta: apps/crm/scripts/check-schema-gap.mjs
 *
 * SCHEMA-GAP-RATCHET: aplikačný kód nesmie volať tabuľku (alebo view), ktorú
 * nezakladá žiadna migrácia v `apps/crm/supabase/migrations/`.
 *
 * Prečo to existuje: je to tretí smer toho istého driftu, ktorý AP-022/AP-023
 * (#700, #701) zmerali v dvoch smeroch.
 *
 *   PROD    -> migrácie   30 tabuliek v PROD bez migrácie    (baseline migrácia)
 *   migrácie -> PROD      24 tabuliek z migrácie nie je v PROD  (deploy, nie repo)
 *   KÓD     -> migrácie   tabuľka, ktorú kód volá a nezakladá ju nič   <- TOTO
 *
 * Prvé dva smery sa dajú porovnať len proti živej databáze. Tretí sa dá
 * overiť zo samotného repozitára, teda v CI, za sekundy a bez secrets. A je to
 * presne trieda chyby, ktorá stála za tichým 23502 na `bri_history` (insert
 * roky padal so zahodenou chybou) a za #370 (kód nasadený proti schéme, ktorá
 * ho neuniesla): volanie, ktoré kompiluje, prejde review aj CI a zlyhá až
 * v produkcii — a to ticho, lebo `{ error }` sa zvyčajne zahodí.
 *
 * ČO TO NIE JE: nekontroluje stĺpce, RPC ani to, či je migrácia aplikovaná na
 * PROD. Číta len repo.
 *
 * VÝNIMKY sú viazané na PRÍČINU, nie na dátum (vzor z #744, rozšírený):
 *
 *   - Tabuľka, ktorú kód volá a nezakladá ju migrácia, musí mať záznam v
 *     `schema-gap-allowlist.json`, inak je to NOVÁ medzera a CI padá.
 *   - Záznam platí presne dovtedy, kým migrácia chýba. Keď ju niekto pridá,
 *     záznam je neplatný a CI žiada jeho zmazanie v tom istom PR. Nie je to
 *     byrokracia: záznam, ktorý prežije svoju príčinu, by po zmazaní migrácie
 *     potichu odpustil návrat tej istej medzery.
 *   - Záznam pre tabuľku, ktorú už žiadny kód nevolá, je tiež neplatný.
 *   - Zoznam sa teda môže len zmenšovať — nikdy nehnije.
 *
 * Rovnako sa ratchetujú `.from(<výraz>)`, ktoré sa zo zdroja nedajú rozlíšiť na
 * názov tabuľky (napr. `.from(table)` vo všeobecnom helperi). Je to slepá škvrna
 * skenera; ratchet zaručí, že neporastie nepozorovane.
 *
 * ČO SKENER VIDÍ, A ČO NIE (priznané, nie zatajené):
 *   vidí    `.from("x")`, `.from('x')`, `.from(`x`)`, `.from<T>("x")`,
 *           `?.from("x")` a `.from(KONŠTANTA)` kde je `const KONŠTANTA = "x"`
 *           v tom istom súbore alebo ako unikátny `export const` inde.
 *   nevidí  `client["from"]("x")`, názov tabuľky podaný ako argument funkcie
 *           (`selectAll("leads")` -> `.from(table)`), `.rpc()`, názvy zložené
 *           za behu. Tieto cesty ostávajú otvorené; skener to netvrdí.
 *   migrácie: `CREATE TABLE`/`VIEW`/`MATERIALIZED VIEW`/`FOREIGN TABLE`
 *           (nie TEMP), `RENAME TO`, `SET SCHEMA`, `DROP` v poradí súborov,
 *           aj v tele `DO $$ ... $$`. Nevidí `EXECUTE format('CREATE TABLE ..')`
 *           a `SELECT .. INTO novatabulka`. Presnosť parsera bola overená
 *           prehraním všetkých migrácií na Postgrese 16 (pozri PR).
 *
 * Použitie (z koreňa repa, rovnako ako ostatné ratchety):
 *   node apps/crm/scripts/check-schema-gap.mjs
 *   node apps/crm/scripts/check-schema-gap.mjs --ci
 *   node apps/crm/scripts/check-schema-gap.mjs --json
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

/** Kde žije kód, ktorý hovorí s CRM databázou. Relatívne ku CWD (koreň repa). */
export const CODE_ROOTS = [
  "apps/crm/src",
  "apps/crm/scripts",
  "apps/crm/supabase/functions",
  "scripts",
];
/** Jediný adresár, ktorý `supabase db reset` a deploy reálne prehrávajú. */
export const MIGRATIONS_DIR = "apps/crm/supabase/migrations";
export const ALLOWLIST_FILE = "apps/crm/scripts/schema-gap-allowlist.json";

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage", ".turbo"]);
const CODE_EXT = /\.(?:[cm]?[jt]s|tsx|jsx)$/;

/** Testy a mocky volajú tabuľky, ktoré v produkcii nemusia existovať. */
export function isTestPath(rel) {
  const p = rel.split(sep).join("/");
  return (
    /(^|\/)(?:__tests__|__mocks__|__fixtures__|tests|e2e|test-isolation)\//.test(p) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(p) ||
    /\.d\.[cm]?ts$/.test(p)
  );
}

/** `Buffer.from("abc")`, `Array.from("abc")` … nie sú dotaz na databázu. */
const NON_DB_RECEIVERS = new Set([
  "Buffer", "Array", "ArrayBuffer", "Int8Array", "Uint8Array", "Uint8ClampedArray",
  "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array",
  "Float64Array", "BigInt64Array", "BigUint64Array", "Readable", "Observable",
  "Iterator", "AsyncIterator",
  // `supabase.storage.from("bucket")` je Storage API, nie tabuľka.
  "storage",
]);

/** PostgREST builder po `.from(x)` pokračuje práve týmito metódami. */
const POSTGREST_VERB = /^\s*\??\.\s*(select|insert|update|upsert|delete)\b/;

// ---------------------------------------------------------------------------
// 1. Kód -> tabuľky
// ---------------------------------------------------------------------------

/**
 * Nahradí komentáre medzerami (nové riadky ostanú, takže čísla riadkov sedia).
 * Reťazce a šablónové literály nechá, lebo práve v nich je názov tabuľky.
 *
 * Dve heuristiky, ktoré bránia tomu, aby zle rozpoznaný reťazec „zožral“ kód
 * a skryl volanie (to by bol falošný negatív, najhorší druh chyby tejto brány):
 *   - '...' a "..." končia najneskôr na konci riadku (apostrof v JSX texte),
 *   - regex literál sa rozpozná podľa predchádzajúceho tokenu a preskočí celý.
 * Správnosť overuje test porovnaním s TypeScript AST nad celým repom.
 */
export function stripJsComments(src) {
  const n = src.length;
  const out = [];
  let i = 0;
  let prev = ""; // posledný významný znak mimo komentárov
  let prevWord = "";
  const blank = (s) => s.replace(/[^\n]/g, " ");
  const REGEX_AFTER_WORD = new Set(["return", "typeof", "case", "do", "else", "in", "of", "void", "delete", "throw", "new", "yield", "await"]);

  while (i < n) {
    const c = src[i];
    const d = src[i + 1];

    if (c === "/" && d === "/") {
      const j = src.indexOf("\n", i);
      const end = j === -1 ? n : j;
      out.push(blank(src.slice(i, end)));
      i = end;
      continue;
    }
    if (c === "/" && d === "*") {
      const j = src.indexOf("*/", i + 2);
      const end = j === -1 ? n : j + 2;
      out.push(blank(src.slice(i, end)));
      i = end;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      const end = src[j] === c ? j + 1 : j;
      out.push(src.slice(i, end));
      i = end;
      prev = c;
      prevWord = "";
      continue;
    }
    if (c === "`") {
      const end = templateEnd(src, i);
      // Komentáre vnútri `${ ... }` sú raritné; text šablóny nechávame celý.
      out.push(src.slice(i, end));
      i = end;
      prev = "`";
      prevWord = "";
      continue;
    }
    if (c === "/") {
      const regexAllowed =
        prev === "" || "(,=:[!&|?{};+-*%<>~^".includes(prev) || REGEX_AFTER_WORD.has(prevWord);
      if (regexAllowed) {
        let j = i + 1;
        let inClass = false;
        while (j < n && src[j] !== "\n") {
          const ch = src[j];
          if (ch === "\\") { j += 2; continue; }
          if (ch === "[") inClass = true;
          else if (ch === "]") inClass = false;
          else if (ch === "/" && !inClass) break;
          j++;
        }
        if (src[j] === "/") {
          j++;
          while (j < n && /[a-z]/i.test(src[j])) j++;
          out.push(src.slice(i, j));
          i = j;
          prev = "/";
          prevWord = "";
          continue;
        }
      }
    }
    if (/\s/.test(c)) {
      out.push(c);
      i++;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(src[j])) j++;
      prevWord = src.slice(i, j);
      out.push(prevWord);
      i = j;
      prev = "a";
      continue;
    }
    out.push(c);
    i++;
    prev = c;
    prevWord = "";
  }
  return out.join("");
}

/** Index za koncovým backtickom šablóny; `${ ... }` môže obsahovať vnorené šablóny. */
function templateEnd(src, start) {
  const n = src.length;
  let i = start + 1;
  while (i < n) {
    const c = src[i];
    if (c === "\\") { i += 2; continue; }
    if (c === "`") return i + 1;
    if (c === "$" && src[i + 1] === "{") {
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        const ch = src[i];
        if (ch === "`") { i = templateEnd(src, i); continue; }
        if (ch === '"' || ch === "'") {
          let j = i + 1;
          while (j < n && src[j] !== ch && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
          i = j + 1;
          continue;
        }
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        i++;
      }
      continue;
    }
    i++;
  }
  return n;
}

/** Obsah zátvoriek začínajúcich na `openIdx` (index znaku `(`), alebo null. */
function balancedArgs(code, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < code.length && code[j] !== c && code[j] !== "\n") j += code[j] === "\\" ? 2 : 1;
      i = j;
      continue;
    }
    if (c === "`") { i = templateEnd(code, i) - 1; continue; }
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return { args: code.slice(openIdx + 1, i), end: i + 1 };
    }
  }
  return null;
}

/** Rozdelí argumenty na najvyššej úrovni podľa čiarky (ignoruje vnorené zátvorky a reťazce). */
export function splitTopLevel(args) {
  const parts = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < args.length && args[j] !== c && args[j] !== "\n") j += args[j] === "\\" ? 2 : 1;
      i = j;
      continue;
    }
    if (c === "`") { i = templateEnd(args, i) - 1; continue; }
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (c === "," && depth === 0) {
      parts.push(args.slice(from, i).trim());
      from = i + 1;
    }
  }
  parts.push(args.slice(from).trim());
  // koncová čiarka `f(x,)` nie je ďalší argument
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

/** Index zatváracej `}` k otváracej na `openIdx`, alebo -1. Reťazce a šablóny preskakuje. */
function matchBrace(code, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < code.length && code[j] !== c && code[j] !== "\n") j += code[j] === "\\" ? 2 : 1;
      i = j;
      continue;
    }
    if (c === "`") { i = templateEnd(code, i) - 1; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const FROM_CALL = /(\?\.|\.)\s*from\s*(<[^()]*?>)?\s*\(/g;

const STRING_LITERAL = /^(["'`])((?:\\.|(?!\1)[^\\\n])*)\1$/;
const stringValue = (s) => {
  const m = s.match(STRING_LITERAL);
  return m && !(m[1] === "`" && m[2].includes("${")) ? m[2] : null;
};

/**
 * Nájde všetky `.from(...)` volania v zdroji.
 * Vracia { code, literal: [{table, line, receiver, verb}],
 *          other: [{expr, pos, line, receiver}] } — `other` je všetko, čo nie je
 * literál a za čím nasleduje PostgREST metóda (select/insert/update/upsert/delete);
 * `Buffer.from(x)` a podobné sa tak nikdy nedostanú do zoznamu.
 */
export function findFromCalls(source) {
  const code = stripJsComments(source);
  const literal = [];
  const other = [];
  const lineAt = (idx) => code.slice(0, idx).split("\n").length;

  FROM_CALL.lastIndex = 0;
  let m;
  while ((m = FROM_CALL.exec(code))) {
    const open = m.index + m[0].length - 1;
    const bal = balancedArgs(code, open);
    if (!bal) continue;
    const { args, end } = bal;
    if (splitTopLevel(args).length !== 1) continue; // PostgREST from() má jediný argument

    const before = code.slice(Math.max(0, m.index - 60), m.index);
    const recvMatch = before.match(/([A-Za-z_$][\w$]*)\s*$/);
    const receiver = recvMatch ? recvMatch[1] : /[)\]]\s*$/.test(before) ? "(výraz)" : "";
    if (NON_DB_RECEIVERS.has(receiver)) continue;

    const arg = args.trim();
    const verb = POSTGREST_VERB.test(code.slice(end, end + 40));
    const line = lineAt(m.index);

    const lit = stringValue(arg);
    if (lit !== null) {
      literal.push({ table: lit, line, receiver, verb });
    } else if (verb) {
      other.push({ expr: arg.replace(/\s+/g, " "), pos: m.index, line, receiver });
    }
  }
  return { code, literal, other };
}

/** `const NAME = "x"` / `export const NAME = "x" as const` -> Map<name, Set<hodnota>> */
export function findStringConstants(source) {
  const code = stripJsComments(source);
  const found = new Map();
  const re = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=\n]+)?=\s*(["'`])((?:\\.|(?!\2)[^\\\n])*)\2\s*(?:as\s+const\s*)?(?=[;,\n)}]|$)/g;
  let m;
  while ((m = re.exec(code))) {
    if (m[2] === "`" && m[3].includes("${")) continue;
    (found.get(m[1]) ?? found.set(m[1], new Set()).get(m[1])).add(m[3]);
  }
  return found;
}

/**
 * `const SYNC_TABLES = { adGroups: "acquisition_ad_groups", … } as const`
 * -> Map<"SYNC_TABLES", Map<"adGroups", "acquisition_ad_groups">>
 */
export function findObjectConstants(source) {
  const code = stripJsComments(source);
  const found = new Map();
  const re = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=\n]+)?=\s*\{/g;
  let m;
  while ((m = re.exec(code))) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(code, open);
    if (close === -1) continue;
    const entries = new Map();
    for (const part of splitTopLevel(code.slice(open + 1, close))) {
      const kv = part.match(/^(?:([A-Za-z_$][\w$]*)|"([^"]+)"|'([^']+)')\s*:\s*([\s\S]+)$/);
      const value = kv ? stringValue(kv[4].trim()) : null;
      if (kv && value !== null) entries.set(kv[1] ?? kv[2] ?? kv[3], value);
    }
    if (entries.size) found.set(m[1], entries);
  }
  return found;
}

/**
 * Funkcie so zoznamom parametrov a rozsahom tela:
 * `function f(a, b) {…}` a `const f = (async)? (a, b) => {…}`.
 * Slúži na dohľadanie `.from(table)` vo všeobecnom helperi -> volania helpera s literálom.
 */
export function findFunctions(code) {
  const fns = [];
  const re = /\bfunction\s+([A-Za-z_$][\w$]*)\s*(?:<[^()]*?>)?\s*\(|\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*(?:async\s*)?(?:function\s*)?\(/g;
  let m;
  while ((m = re.exec(code))) {
    const name = m[1] ?? m[2];
    const open = m.index + m[0].length - 1;
    const bal = balancedArgs(code, open);
    if (!bal) continue;
    const brace = code.indexOf("{", bal.end);
    if (brace === -1) continue;
    // medzi `)` a `{` smie byť len typ návratovej hodnoty a `=>`; všetko ostatné nie je telo funkcie
    if (/[;=](?!>)/.test(code.slice(bal.end, brace).replace(/=>/g, ""))) continue;
    const close = matchBrace(code, brace);
    if (close === -1) continue;
    const params = splitTopLevel(bal.args).map((p) => (p.replace(/^\.\.\./, "").match(/^[A-Za-z_$][\w$]*/) ?? [""])[0]);
    const esc = name.replace(/\$/g, "\\$");
    const exported =
      new RegExp(`\\bexport\\s+(?:async\\s+)?(?:function|const|let|var)\\s+${esc}\\b`).test(code) ||
      new RegExp(`\\bexport\\s*\\{[^}]*\\b${esc}\\b`).test(code);
    fns.push({ name, params, start: brace, end: close, exported });
  }
  return fns;
}

/** Volania `name(...)` v zdroji (okrem deklarácie): [{args: string[], pos}] */
function findCalls(code, name) {
  const out = [];
  const re = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, "\\$")}\\s*(?:<[^()]*?>)?\\s*\\(`, "g");
  let m;
  while ((m = re.exec(code))) {
    if (/\bfunction\s+$/.test(code.slice(Math.max(0, m.index - 12), m.index))) continue;
    const bal = balancedArgs(code, m.index + m[0].length - 1);
    if (bal) out.push({ args: splitTopLevel(bal.args), pos: m.index });
  }
  return out;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Zdrojové súbory, ktoré brána skenuje (bez testov), relatívne ku `cwd`, zoradené. */
export function listCodeFiles(roots = CODE_ROOTS, cwd = process.cwd()) {
  return roots
    .flatMap((r) => walk(join(cwd, r)))
    .map((p) => relative(cwd, p).split(sep).join("/"))
    .filter((rel) => CODE_EXT.test(rel) && !isTestPath(rel))
    .sort();
}

/**
 * Prejde zdrojáky a zloží zoznam tabuliek, ktoré kód volá.
 *
 * Názov tabuľky sa rozlišuje v tomto poradí: literál; konštanta (`const T = "x"` v
 * súbore, inak unikátny `export const`); člen objektovej konštanty (`TABLES.x`);
 * a nakoniec všeobecný helper `f(table) { … .from(table) … }` — vtedy sa názvy
 * zoberú z volaní `f("x")` v tom istom súbore. Čo sa nedá rozlíšiť, ide do
 * `dynamic` a brána to vyžaduje pomenovať (bezpečný smer: hlasno, nie ticho).
 *
 * @returns {{ tables: Map<string, {sites: {file, line}[]}>, dynamic: {file, expr}[], files: number }}
 */
export function scanCode(roots = CODE_ROOTS, cwd = process.cwd()) {
  const files = listCodeFiles(roots, cwd);
  const sources = new Map(files.map((f) => [f, readFileSync(join(cwd, f), "utf8")]));

  // Konštanty: najprv zo súboru samotného, potom unikátne exportované odinakiaľ.
  const strLocal = new Map();
  const objLocal = new Map();
  const strGlobal = new Map();
  const objGlobal = new Map();
  const isExported = (src, name) =>
    new RegExp(`\\bexport\\s+const\\s+${name.replace(/\$/g, "\\$")}\\b`).test(src);
  for (const [f, src] of sources) {
    const strs = findStringConstants(src);
    const objs = findObjectConstants(src);
    strLocal.set(f, strs);
    objLocal.set(f, objs);
    if (!/\bexport\s+const\b/.test(src)) continue;
    for (const [name, vals] of strs) {
      if (!isExported(src, name)) continue;
      const set = strGlobal.get(name) ?? strGlobal.set(name, new Set()).get(name);
      for (const v of vals) set.add(v);
    }
    for (const [name, entries] of objs) {
      if (!isExported(src, name)) continue;
      const byKey = objGlobal.get(name) ?? objGlobal.set(name, new Map()).get(name);
      for (const [k, v] of entries) (byKey.get(k) ?? byKey.set(k, new Set()).get(k)).add(v);
    }
  }

  /** Množina názvov tabuliek, na ktoré sa výraz dá previesť, inak null. */
  const resolveExpr = (expr, file) => {
    const lit = stringValue(expr);
    if (lit !== null) return new Set([lit]);
    if (/^[A-Za-z_$][\w$]*$/.test(expr)) {
      const local = strLocal.get(file)?.get(expr);
      if (local?.size) return local;
      const g = strGlobal.get(expr);
      return g?.size ? g : null;
    }
    const member = expr.match(/^([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)$/);
    if (member) {
      const local = objLocal.get(file)?.get(member[1])?.get(member[2]);
      if (local !== undefined) return new Set([local]);
      const g = objGlobal.get(member[1])?.get(member[2]);
      return g?.size ? g : null;
    }
    return null;
  };

  const tables = new Map();
  const dynamic = new Map();
  const add = (table, file, line) => {
    if (!tables.has(table)) tables.set(table, { sites: [] });
    tables.get(table).sites.push({ file, line });
  };
  const lineAt = (code, idx) => code.slice(0, idx).split("\n").length;

  for (const [file, src] of sources) {
    const { code, literal, other } = findFromCalls(src);
    for (const c of literal) add(c.table, file, c.line);
    if (!other.length) continue;

    const fns = findFunctions(code);
    for (const c of other) {
      const direct = resolveExpr(c.expr, file);
      if (direct) {
        for (const t of direct) add(t, file, c.line);
        continue;
      }

      // `.from(table)` v helperi: názvy sú vo volaniach helpera v tom istom súbore.
      let traced = false;
      if (/^[A-Za-z_$][\w$]*$/.test(c.expr)) {
        const fn = fns
          .filter((f) => f.start <= c.pos && c.pos <= f.end && f.params.includes(c.expr))
          .sort((a, b) => b.start - a.start)[0];
        if (fn && !fn.exported) {
          const k = fn.params.indexOf(c.expr);
          const calls = findCalls(code, fn.name).filter((x) => x.pos < fn.start || x.pos > fn.end);
          const resolved = calls.map((x) => ({ x, r: x.args[k] === undefined ? null : resolveExpr(x.args[k], file) }));
          if (resolved.length && resolved.every((y) => y.r)) {
            for (const { x, r } of resolved) for (const t of r) add(t, file, lineAt(code, x.pos));
            traced = true;
          }
        }
      }
      if (!traced) dynamic.set(`${file}#${c.expr}`, { file, expr: c.expr });
    }
  }
  return { tables, dynamic: [...dynamic.values()], files: files.length };
}

// ---------------------------------------------------------------------------
// 2. Migrácie -> tabuľky
// ---------------------------------------------------------------------------

const IDENT = String.raw`(?:"(?:[^"]|"")+"|[A-Za-z_][\w$]*)`;
const QNAME = String.raw`${IDENT}(?:\s*\.\s*${IDENT})?`;

/** `public."Moja tabuľka.v2"` -> { schema: "public", name: "Moja tabuľka.v2" } */
export function parseQName(raw) {
  const parts = [];
  const re = /"((?:[^"]|"")+)"|([A-Za-z_][\w$]*)/g;
  let m;
  while ((m = re.exec(raw))) {
    parts.push(m[1] !== undefined ? m[1].replace(/""/g, '"') : m[2].toLowerCase());
  }
  return parts.length >= 2
    ? { schema: parts[parts.length - 2], name: parts[parts.length - 1] }
    : { schema: "public", name: parts[0] };
}

/**
 * SQL -> text bez komentárov, so zamaskovanými '…' reťazcami. $$ telá nechá,
 * ale zapíše ich pozície, aby sa dalo rozhodnúť, či ide o `DO` blok.
 */
export function maskSql(sql) {
  const n = sql.length;
  let out = "";
  let i = 0;
  while (i < n) {
    const c = sql[i];
    const d = sql[i + 1];
    if (c === "-" && d === "-") {
      while (i < n && sql[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && d === "*") {
      // PostgreSQL komentáre sa vnárajú
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === "/" && sql[i + 1] === "*") { depth++; i += 2; }
        else if (sql[i] === "*" && sql[i + 1] === "/") { depth--; i += 2; }
        else i++;
      }
      out += " ";
      continue;
    }
    if (c === "'") {
      const escape = /[eE]$/.test(out) && !/[\w$]\w?[eE]$/.test(out.slice(-3));
      i++;
      while (i < n) {
        if (escape && sql[i] === "\\") { i += 2; continue; }
        if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue; }
        if (sql[i] === "'") break;
        i++;
      }
      i++;
      out += "''";
      continue;
    }
    if (c === '"') {
      const start = i;
      i++;
      while (i < n) {
        if (sql[i] === '"' && sql[i + 1] === '"') { i += 2; continue; }
        if (sql[i] === '"') break;
        i++;
      }
      i++;
      out += sql.slice(start, i);
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Rozdelí maskovaný SQL na príkazy podľa `;` na najvyššej úrovni. Telá $tag$ … $tag$
 * zostanú v jednom kuse (v nich `;` nie je koniec príkazu).
 */
export function splitStatements(masked) {
  const stmts = [];
  let cur = "";
  let i = 0;
  const n = masked.length;
  while (i < n) {
    const c = masked[i];
    if (c === "$") {
      const m = masked.slice(i).match(/^\$([A-Za-z_]\w*)?\$/);
      if (m) {
        const tag = m[0];
        const close = masked.indexOf(tag, i + tag.length);
        const end = close === -1 ? n : close + tag.length;
        cur += masked.slice(i, end);
        i = end;
        continue;
      }
    }
    if (c === '"') {
      let j = i + 1;
      while (j < n) {
        if (masked[j] === '"' && masked[j + 1] === '"') { j += 2; continue; }
        if (masked[j] === '"') break;
        j++;
      }
      cur += masked.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === ";") {
      stmts.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts.filter(Boolean);
}

const CREATE_RE = new RegExp(
  String.raw`^create\s+(?:or\s+replace\s+)?(?:(global|local)\s+)?(temp(?:orary)?\s+|unlogged\s+)?(?:recursive\s+)?(?:materialized\s+)?(table|view|foreign\s+table)\s+(?:if\s+not\s+exists\s+)?(${QNAME})`,
  "i",
);
const RENAME_RE = new RegExp(
  String.raw`^alter\s+(?:table|view|materialized\s+view|foreign\s+table)\s+(?:if\s+exists\s+)?(?:only\s+)?(${QNAME})\s+rename\s+to\s+(${IDENT})`,
  "i",
);
const SET_SCHEMA_RE = new RegExp(
  String.raw`^alter\s+(?:table|view|materialized\s+view|foreign\s+table)\s+(?:if\s+exists\s+)?(?:only\s+)?(${QNAME})\s+set\s+schema\s+(${IDENT})`,
  "i",
);
const DROP_RE = new RegExp(
  String.raw`^drop\s+(?:materialized\s+)?(?:table|view|foreign\s+table)\s+(?:if\s+exists\s+)?(${QNAME}(?:\s*,\s*${QNAME})*)`,
  "i",
);

/** Aplikuje príkazy na stav `rel` (Map<meno, {kind, file}>), v poradí. */
function applyStatement(stmt, file, rel, anchored) {
  const wrap = (re) => (anchored ? re : new RegExp(re.source.replace(/^\^/, "\\b"), "gi"));
  const run = (re, fn) => {
    const r = wrap(re);
    if (!anchored) {
      let m;
      while ((m = r.exec(stmt))) fn(m);
    } else {
      const m = stmt.match(r);
      if (m) fn(m);
    }
  };

  run(CREATE_RE, (m) => {
    if (m[2] && /^temp/i.test(m[2])) return; // dočasné objekty po migrácii zmiznú
    if (m[1] && /^(global|local)$/i.test(m[1]) && /temp/i.test(m[0])) return;
    const { schema, name } = parseQName(m[4]);
    if (schema !== "public") return;
    rel.set(name, { kind: m[3].toLowerCase().replace(/\s+/g, " "), file });
  });
  run(RENAME_RE, (m) => {
    const from = parseQName(m[1]);
    if (from.schema !== "public") return;
    const to = parseQName(m[2]).name;
    const entry = rel.get(from.name) ?? { kind: "table", file };
    rel.delete(from.name);
    rel.set(to, { ...entry, file });
  });
  run(SET_SCHEMA_RE, (m) => {
    const from = parseQName(m[1]);
    if (from.schema !== "public") return;
    if (parseQName(m[2]).name !== "public") rel.delete(from.name);
  });
  run(DROP_RE, (m) => {
    for (const q of m[1].split(/\s*,\s*(?=(?:"|[A-Za-z_]))/)) {
      const { schema, name } = parseQName(q);
      if (schema === "public") rel.delete(name);
    }
  });
}

/**
 * Prehrá migrácie v poradí názvov súborov (ako `supabase db reset`) a vráti
 * Map<meno, {kind, file}> objektov v `public`, ktoré po poslednej migrácii existujú.
 */
export function scanMigrations(dir = MIGRATIONS_DIR, cwd = process.cwd()) {
  const abs = join(cwd, dir);
  const rel = new Map();
  if (!existsSync(abs)) return { relations: rel, files: 0 };
  const files = readdirSync(abs).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
  for (const f of files) {
    const masked = maskSql(readFileSync(join(abs, f), "utf8"));
    for (const stmt of splitStatements(masked)) {
      if (/^do\b/i.test(stmt)) {
        // DO $$ … $$: príkazy v tele sa vykonajú, a môžu byť aj podmienené (IF … THEN CREATE …)
        const body = stmt.replace(/^do\s+(?:language\s+\w+\s+)?/i, "");
        applyStatement(body, f, rel, false);
      } else {
        applyStatement(stmt, f, rel, true);
      }
    }
  }
  return { relations: rel, files: files.length };
}

// ---------------------------------------------------------------------------
// 3. Porovnanie + výnimky viazané na príčinu
// ---------------------------------------------------------------------------

/**
 * @param {{tables: Map<string, any>, dynamic: {file, expr}[]}} code
 * @param {Map<string, any>} relations
 * @param {{ missingTable?: object[], dynamicSites?: object[] }} allow
 */
export function evaluate(code, relations, allow = {}) {
  const missing = [...code.tables.keys()].filter((t) => !relations.has(t)).sort();
  const entries = allow.missingTable ?? [];
  const allowed = new Set(entries.map((e) => e.table));

  const violations = [];

  for (const t of missing) {
    if (!allowed.has(t)) {
      violations.push({
        id: "NEW_GAP",
        subject: t,
        message:
          `kód volá tabuľku \`${t}\`, ktorú nezakladá žiadna migrácia v ${MIGRATIONS_DIR}/`,
        hint:
          "Pridaj migráciu (CREATE TABLE IF NOT EXISTS), alebo odstráň volanie. " +
          "Do allowlistu patrí len tabuľka, ktorej príčinu nevieš odstrániť v tomto PR — aj tak s vyplneným `cause`.",
        sites: code.tables.get(t).sites.slice(0, 5),
      });
    }
  }
  for (const e of entries) {
    if (relations.has(e.table)) {
      violations.push({
        id: "STALE_CAUSE_RESOLVED",
        subject: e.table,
        message:
          `výnimka pre \`${e.table}\` je neplatná: migrácia ${relations.get(e.table).file} ju už zakladá`,
        hint:
          `Zmaž záznam z ${ALLOWLIST_FILE}. Príčina výnimky zanikla; záznam, ktorý ju prežije, by potichu odpustil ` +
          "návrat medzery, keby sa migrácia raz zmazala.",
      });
    } else if (!code.tables.has(e.table)) {
      violations.push({
        id: "STALE_NO_CALLER",
        subject: e.table,
        message: `výnimka pre \`${e.table}\` je neplatná: kód túto tabuľku už nevolá`,
        hint: `Zmaž záznam z ${ALLOWLIST_FILE}.`,
      });
    }
    if (!e.cause || !e.resolution) {
      violations.push({
        id: "ENTRY_INCOMPLETE",
        subject: e.table,
        message: `výnimka pre \`${e.table}\` nemá \`cause\` a \`resolution\``,
        hint: "Výnimka bez príčiny je len vypnutá kontrola. Doplň, prečo medzera existuje a čo ju zruší.",
      });
    }
  }

  // Slepá škvrna: .from(<výraz>), ktorý nevieme previesť na názov tabuľky.
  const dynKey = (d) => `${d.file}#${d.expr}`;
  const dynAllowed = new Set((allow.dynamicSites ?? []).map(dynKey));
  const dynSeen = new Set(code.dynamic.map(dynKey));
  for (const d of code.dynamic) {
    if (!dynAllowed.has(dynKey(d))) {
      violations.push({
        id: "NEW_DYNAMIC_SITE",
        subject: dynKey(d),
        message: `\`.from(${d.expr})\` v ${d.file}: názov tabuľky sa zo zdroja nedá určiť, takže ho brána nemôže overiť`,
        hint:
          "Použi literál alebo `const NAZOV = \"tabulka\"` v tom istom súbore, alebo pridaj záznam do " +
          `\`dynamicSites\` v ${ALLOWLIST_FILE} s vysvetlením, kto volá a s akými tabuľkami.`,
      });
    }
  }
  for (const a of allow.dynamicSites ?? []) {
    if (!dynSeen.has(dynKey(a))) {
      violations.push({
        id: "STALE_DYNAMIC_SITE",
        subject: dynKey(a),
        message: `záznam \`dynamicSites\` ${dynKey(a)} je neplatný: toto volanie už v kóde nie je`,
        hint: `Zmaž záznam z ${ALLOWLIST_FILE}.`,
      });
    }
  }

  return { missing, violations };
}

export function loadAllowlist(cwd = process.cwd(), file = ALLOWLIST_FILE) {
  const p = join(cwd, file);
  if (!existsSync(p)) return { missingTable: [], dynamicSites: [] };
  const j = JSON.parse(readFileSync(p, "utf8"));
  return { missingTable: j.missingTable ?? [], dynamicSites: j.dynamicSites ?? [] };
}

// ---------------------------------------------------------------------------
// 4. CLI
// ---------------------------------------------------------------------------

/** Koreň repa = najbližší predok CWD, v ktorom je adresár migrácií. CI beží aj z `apps/crm`. */
export function findRepoRoot(cwd = process.cwd()) {
  let dir = cwd;
  for (;;) {
    if (existsSync(join(dir, MIGRATIONS_DIR))) return dir;
    const up = join(dir, "..");
    if (up === dir) return null;
    dir = up;
  }
}

export function run(argv = process.argv.slice(2), startDir = process.cwd()) {
  const cwd = findRepoRoot(startDir);
  if (!cwd) {
    console.error(`CHYBA: nad ${startDir} som nenašiel ${MIGRATIONS_DIR}/ — spusti z repa. Bez migrácií nie je čo porovnávať.`);
    return 2;
  }
  const code = scanCode(CODE_ROOTS, cwd);
  const { relations, files: migrationFiles } = scanMigrations(MIGRATIONS_DIR, cwd);
  // Prázdny harness nie je dôkaz: brána, ktorá nič neskenovala, by „prešla" aj pri medzere.
  if (code.files === 0 || migrationFiles === 0) {
    console.error(`CHYBA: skener nenašiel vstup (zdrojáky: ${code.files}, migrácie: ${migrationFiles}). Výsledok by nebol dôkaz.`);
    return 2;
  }
  const allow = loadAllowlist(cwd);
  const { missing, violations } = evaluate(code, relations, allow);

  if (argv.includes("--json")) {
    console.log(JSON.stringify({ missing, violations, tables: code.tables.size, relations: relations.size }, null, 2));
    return violations.length && argv.includes("--ci") ? 1 : 0;
  }

  const excused = missing.filter((t) => (allow.missingTable ?? []).some((e) => e.table === t));
  console.log(`Zdrojových súborov:           ${code.files}`);
  console.log(`Tabuliek, ktoré kód volá:     ${code.tables.size}`);
  console.log(`Migračných súborov:           ${migrationFiles}`);
  console.log(`Objektov, ktoré migrácie zakladajú (public): ${relations.size}`);
  console.log(`Volaných a nezakladaných:     ${missing.length}`);
  console.log(`  z toho s platnou výnimkou:  ${excused.length}`);
  console.log(`  NOVÝCH medzier:             ${missing.length - excused.length}`);
  console.log(`Nerozlíšiteľných .from(výraz): ${code.dynamic.length}`);
  if (excused.length) {
    console.log("\nTolerované (výnimka viazaná na príčinu):");
    for (const t of excused) {
      const e = allow.missingTable.find((x) => x.table === t);
      console.log(`  ${t}\n      príčina: ${e.cause}\n      zruší ju: ${e.resolution}`);
    }
  }
  if (violations.length) {
    console.log("\nPORUŠENIA:");
    for (const v of violations) {
      console.log(`  [${v.id}] ${v.message}`);
      for (const s of v.sites ?? []) console.log(`      ${s.file}:${s.line}`);
      console.log(`      -> ${v.hint}`);
    }
  }
  return violations.length && argv.includes("--ci") ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run());
}

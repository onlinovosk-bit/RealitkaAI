#!/usr/bin/env node
/**
 * rau-route.mjs — RAU deterministic router (PTC: žiadny LLM, len čítanie súborov).
 *
 * Z jednej vety foundera urobí Routing Decision: projekt, druh práce, walls,
 * režim, bránu, reťazec promptov a kandidátov na znovupoužitie. Čo sa nedá
 * rozhodnúť deterministicky, vráti ako `unknowns` / `founder_asks` — nehádá.
 *
 * Čo to JE: lacný triedič zadaní (kľúčové slová a pravidlá). Čo to NIE JE: bezpečnostná
 * kontrola. Nerozpoznaný úkon (metafora, parafráza, dvojitá negácia) môže prejsť ako AUTO-SAFE;
 * preto Rector zadanie číta aj sám a vynútenie rizikových krokov ostáva na úrovni akcie
 * (control-contract, CI, merge foundera). Namerané čísla: docs/rau/RAU-v1.0.md §Dôkaz.
 *
 * Zásady:
 *  - Gate je PODLAHA pre rozpoznané výrazy. Neznámy projekt/druh = ASK.
 *  - Poradenská otázka NIKDY nezahodí rozpoznané riziko: bez výslovného „len analýza“
 *    ho zmení na ASK.
 *  - Každé pravidlo nesie dôkaz (zhodnutý text), aby sa rozhodnutie dalo overiť.
 *  - REPEATABLE pre daný vstup a stav repa: nič nezapisuje, nevolá sieť ani model.
 *
 * Použitie:
 *   node scripts/ops/rau-route.mjs --stdin --json <<'RAU_EOF'
 *   <zadanie foundera doslovne>
 *   RAU_EOF
 *   node scripts/ops/rau-route.mjs "krátke zadanie" [--project revolis] [--json] [--no-reuse]
 *   node scripts/ops/rau-route.mjs --batch cases.json     # pole reťazcov alebo {text, project?}
 * POZOR: zadanie od tretej strany (mail, issue) nikdy nevkladaj do úvodzoviek na príkazovom riadku
 * — shell by vykonal `$(…)`. Použi --stdin s heredoc v jednoduchých úvodzovkách.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, "../..");
export const DEFAULT_RAU_DIR = join(REPO_ROOT, "docs/rau");

export const EVIDENCE_STATES = ["IMPLEMENTED", "TESTED", "VERIFIED", "PRODUCTION", "PRODUCTION VERIFIED"];

const STRENGTH_ORDER = ["AUTO-SAFE", "GO_REQUIRED", "ASK", "STOP"];

/* ------------------------------------------------------------------ util */

// Cyrilika a iné znaky, ktoré vyzerajú ako latinka (cyrilské a, e, o, p, c, x, y a ďalšie).
// Zapísané ako \uXXXX, aby sa v zdrojáku nedali zameniť s latinkou.
const HOMOGLYPHS = {
  "\u0430": "a", "\u0435": "e", "\u043E": "o", "\u0440": "p", "\u0441": "c", "\u0445": "x", "\u0443": "y",
  "\u043A": "k", "\u043C": "m", "\u0442": "t", "\u0432": "b", "\u043D": "h", "\u0456": "i", "\u0458": "j",
  "\u0455": "s", "\u0501": "d", "\u0261": "g",
};

export function normalize(text) {
  return String(text ?? "")
    .normalize("NFKC") // fullwidth znaky (U+FF21 a ďalšie) sa zložia na bežnú latinku
    .replace(/[\u200B-\u200F\u2060\uFEFF\u00AD]/g, "") // zero-width znaky a soft hyphen
    .replace(/[\u0400-\u052F]/g, (ch) => HOMOGLYPHS[ch.toLowerCase()] ?? ch)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const reCache = new Map();
function rx(source) {
  let re = reCache.get(source);
  if (!re) {
    re = new RegExp(source);
    reCache.set(source, re);
  }
  return re;
}

/** Prvá zhoda zo zoznamu vzorov → { pattern, match } alebo null. */
function firstMatch(patterns, text) {
  for (const p of patterns ?? []) {
    const m = rx(p).exec(text);
    if (m) return { pattern: p, match: m[0] };
  }
  return null;
}

function allMatches(patterns, text) {
  const out = [];
  for (const p of patterns ?? []) {
    const m = rx(p).exec(text);
    if (m) out.push({ pattern: p, match: m[0] });
  }
  return out;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadRegistry(rauDir = DEFAULT_RAU_DIR) {
  return readJson(join(rauDir, "registry.json"));
}

export function loadRules(rauDir = DEFAULT_RAU_DIR) {
  return readJson(join(rauDir, "routing-rules.json"));
}

/** id → { id, name, file, runs_in[] } z frontmatteru docs/rau/prompts/P??-*.md */
export function loadPrompts(rauDir = DEFAULT_RAU_DIR) {
  const dir = join(rauDir, "prompts");
  const out = {};
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).sort()) {
    if (!/^P\d\d-.*\.md$/.test(f)) continue;
    const src = readFileSync(join(dir, f), "utf8");
    const fm = /^---\n([\s\S]*?)\n---/.exec(src);
    const meta = {};
    if (fm) {
      for (const line of fm[1].split("\n")) {
        const m = /^([a-z_]+):\s*(.*)$/.exec(line);
        if (m) meta[m[1]] = m[2].trim();
      }
    }
    const id = meta.id ?? f.slice(0, 3);
    out[id] = {
      id,
      name: meta.name ?? f,
      file: relative(REPO_ROOT, join(dir, f)).split(sep).join("/"),
      runs_in: (meta.runs_in ?? "").replace(/[[\]]/g, "").split(",").map((x) => x.trim()).filter(Boolean),
    };
  }
  return out;
}

/** Citovaný text (UI copy, názvy) sa vynechá. Citát musí začínať/končiť na hranici slova, aby
 *  apostrof v „don't … isn't“ nezmazal nič navyše. */
export function maskQuotes(text) {
  let t = text.replace(/(^|[\s(:,;])(["„«])[^"“”»]{1,160}(["“”»])(?=[\s).,;:!?]|$)/g, "$1 ");
  t = t.replace(/(^|[\s(:,;])‚[^‘’]{1,160}[‘’](?=[\s).,;:!?]|$)/g, "$1 ");
  t = t.replace(/(^|[\s(:,;])'[^']{1,160}'(?=[\s).,;:!?]|$)/g, "$1 ");
  return t;
}

/** Negované pokyny („bez mergu“, „nič neposielaj“) sa vynechajú. */
export function maskNegations(text, rules) {
  let t = text;
  for (const p of rules.masks?.negations ?? []) t = t.replace(new RegExp(p, "g"), " ");
  return t.replace(/\s+/g, " ").trim();
}

export function maskForGate(text, rules) {
  return maskNegations(maskQuotes(text), rules);
}

/* --------------------------------------------------------------- project */

function detectProject(text, registry, rules) {
  // Celé meno projektu A môže obsahovať slovo projektu B („Revolis Agentic University“).
  // Fráza sa vymaskuje pre ostatné projekty, aby samostatná zmienka „Revolis“ inde v texte
  // stále rátala.
  const phrases = Object.entries(rules.name_phrases ?? {});
  let masked = text;
  for (const [, list] of phrases) for (const ph of list) masked = masked.split(ph).join(" ");
  const hits = {};
  for (const [id, base] of Object.entries(rules.projects)) {
    // id projektu je vždy silný znak (odvodené z registry, nie písané ručne)
    const literal = `\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`;
    const def = base.strong.includes(literal) ? base : { ...base, strong: [...base.strong, literal] };
    const own = (rules.name_phrases?.[id] ?? []).some((ph) => text.includes(ph));
    const t = own ? text : masked;
    hits[id] = { strong: allMatches(def.strong, t), weak: allMatches(def.weak, t) };
    if (own && !hits[id].strong.length) hits[id].strong.push({ pattern: "name_phrase", match: rules.name_phrases[id].find((ph) => text.includes(ph)) });
  }

  const strongIds = Object.keys(hits).filter((id) => hits[id].strong.length);
  const weakIds = Object.keys(hits).filter((id) => hits[id].weak.length);
  const evidenceOf = (ids) => ids.flatMap((id) => [...hits[id].strong, ...hits[id].weak].map((h) => h.match));

  if (strongIds.length === 1) {
    return { status: "RESOLVED", confidence: "KEYWORD", id: strongIds[0], candidates: strongIds, evidence: evidenceOf(strongIds) };
  }
  if (strongIds.length > 1) {
    return { status: "AMBIGUOUS", confidence: "NONE", id: null, candidates: strongIds, evidence: evidenceOf(strongIds) };
  }
  if (weakIds.length === 1) {
    return { status: "RESOLVED", confidence: "KEYWORD_WEAK", id: weakIds[0], candidates: weakIds, evidence: evidenceOf(weakIds) };
  }
  if (weakIds.length > 1) {
    return { status: "AMBIGUOUS", confidence: "NONE", id: null, candidates: weakIds, evidence: evidenceOf(weakIds) };
  }
  return { status: "NONE", confidence: "NONE", id: null, candidates: [], evidence: [] };
}

/* ------------------------------------------------------ triggers / cues */

function evalTriggers(text, rules) {
  const out = [];
  for (const t of rules.triggers) {
    const a = firstMatch(t.any, text);
    if (!a) continue;
    const evidence = [a.match];
    if (t.and?.length) {
      const b = firstMatch(t.and, text);
      if (!b) continue;
      evidence.push(b.match);
    }
    out.push({
      id: t.id,
      severity: t.severity,
      gate: t.gate,
      advisory_ok: t.advisory_ok === true,
      walls: t.walls,
      reason: t.reason,
      activates: t.activates ?? [],
      evidence,
    });
  }
  return out;
}

function evalCues(text, rules, kind) {
  const out = [];
  for (const c of rules.cues) {
    if (c.for_kinds && !c.for_kinds.includes(kind)) continue;
    const a = firstMatch(c.any, text);
    if (a) out.push({ id: c.id, activates: c.activates, evidence: [a.match] });
  }
  return out;
}

/** Výslovná veta („len analýza“) nesmie sama pôsobiť ako poradenské sloveso. */
function stripReadOnly(text, rules) {
  let t = text;
  for (const p of rules.read_only_phrases ?? []) t = t.replace(new RegExp(p, "g"), " ");
  return t;
}

function detectKind(text, gateText, adviceText, rules, triggers) {
  const hasOpsTrigger = triggers.some((t) => rules.ops_only_triggers.includes(t.id));
  const actVerb = firstMatch(rules.act_verbs, gateText);
  // Testy a dokumentácia nie sú „nová funkcia“ — inak by každé „pridaj testy“ chcelo Execution Contract.
  const fixFirst = firstMatch(rules.kinds.fix_first, text);
  if (fixFirst) return { kind: "FIX", evidence: [fixFirst.match] };
  for (const kind of rules.kinds.order) {
    if (kind === "OPS") {
      // Čisto poradenské sloveso (vysvetli, analyzuj, porovnaj…) bez povelového slovesa nie je OPS,
      // aj keď spomína merge/prod/migráciu. Riziko sa tým NEZAHADZUJE — rieši ho `route()`.
      const advice = firstMatch(rules.kinds.advice_first, adviceText);
      if (advice && !actVerb) return { kind: "DECIDE", evidence: [advice.match] };
      if (hasOpsTrigger) return { kind: "OPS", evidence: triggers.filter((t) => rules.ops_only_triggers.includes(t.id)).map((t) => t.evidence[0]) };
      continue;
    }
    const hit = firstMatch(rules.kinds[kind], text);
    if (!hit) continue;
    // Otázka/analýza NESMIE zakryť vykonanie. Povelové sloveso pri „rozhodovacom“ zadaní:
    //  - s rozpoznaným rizikom = OPS (gate z rizika),
    //  - bez rozpoznaného rizika = neznáme (ASK), nie AUTO-SAFE.
    if (kind === "DECIDE" && actVerb) {
      return triggers.length ? { kind: "OPS", evidence: [actVerb.match] } : { kind: "UNKNOWN", evidence: [actVerb.match] };
    }
    // Obsah („napíš text“, „nastav renderovanie videí“) s povelovým slovesom a bez rozpoznaného rizika:
    // nerozpoznaný úkon nesmie prejsť ako AUTO-SAFE.
    if (kind === "CONTENT" && actVerb && !triggers.length) return { kind: "UNKNOWN", evidence: [actVerb.match] };
    return { kind, evidence: [hit.match] };
  }
  // Rozpoznané riziko bez rozpoznaného druhu práce: bezpečnú podlahu určuje riziko (GO_REQUIRED/STOP),
  // nie neznámy druh (ASK) — inak by sa konkrétna brána schovala za otázku.
  if (triggers.length) return { kind: "OPS", evidence: triggers.map((t) => t.evidence[0]) };
  return { kind: "UNKNOWN", evidence: [] };
}

function backlogConflicts(text, registry) {
  const out = [];
  for (const b of registry.backlog) {
    const hit = firstMatch(b.match, text);
    if (hit) out.push({ id: b.id, title: b.title, veto: b.veto, unlock: b.unlock, source: b.source, evidence: [hit.match] });
  }
  return out;
}

/* ----------------------------------------------------------------- reuse */

function listFiles(dir, exts, exclude, base, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries.sort()) {
    if (name === "node_modules" || name === ".git") continue;
    const full = join(dir, name);
    const rel = relative(base, full).split(sep).join("/");
    if (exclude.some((e) => rel === e || rel.startsWith(`${e}/`))) continue;
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) listFiles(full, exts, exclude, base, out);
    else if (exts.some((e) => name.endsWith(e)) && st.size < 400_000) out.push({ full, rel });
  }
  return out;
}

function stemsOf(text, cfg) {
  const stop = new Set(cfg.stopwords);
  const stems = new Set();
  for (const tok of text.split(/[^a-z0-9]+/)) {
    if (tok.length < cfg.min_token_length || stop.has(tok) || /^\d+$/.test(tok)) continue;
    stems.add(tok.slice(0, cfg.stem_length));
  }
  return [...stems];
}

function reuseSearch(text, rules, root) {
  const cfg = rules.reuse;
  const stems = stemsOf(text, cfg);
  if (!stems.length) return { method: "HEURISTIC_STEM_OVERLAP", recommendation: "NO_STRONG_MATCH", candidates: [], note: "Žiadne významové slová na porovnanie." };
  const scored = [];
  for (const r of cfg.roots) {
    for (const f of listFiles(join(root, r), cfg.extensions, cfg.exclude, root)) {
      let head;
      try {
        head = readFileSync(f.full, "utf8").split("\n").slice(0, cfg.head_lines).join("\n");
      } catch {
        continue;
      }
      const hay = normalize(`${f.rel}\n${head}`);
      const matched = stems.filter((s) => hay.includes(s));
      if (matched.length >= cfg.min_listed) scored.push({ path: f.rel, score: matched.length, matched });
    }
  }
  scored.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : 1));
  const candidates = scored.slice(0, 5);
  const strong = candidates.length > 0 && candidates[0].score >= cfg.strong;
  return {
    method: "HEURISTIC_STEM_OVERLAP",
    recommendation: strong ? "CHECK_CANDIDATES_FIRST" : "NO_STRONG_MATCH",
    candidates,
    note: "Heuristika nad názvami a hlavičkami súborov, nie dôkaz. Kandidátov over ručne; „NO_STRONG_MATCH“ NEZNAMENÁ, že riešenie neexistuje — P05 vyžaduje vlastné hľadanie pred BUILD.",
  };
}

/* ----------------------------------------------------------------- chain */

function idNum(id) {
  return Number(id.slice(1));
}

function buildChain({ kind, mode, triggers, cues, registry, prompts }) {
  const why = new Map();
  const add = (id, reason) => {
    if (!why.has(id)) why.set(id, []);
    why.get(id).push(reason);
  };
  for (const id of registry.chains.kinds[kind] ?? []) add(id, `kind:${kind}`);
  if (kind !== "DECIDE") {
    for (const t of triggers) for (const id of t.activates) add(id, `trigger:${t.id}`);
    for (const c of cues) for (const id of c.activates) add(id, `cue:${c.id}`);
    if (mode === "HARDENED") for (const id of registry.chains.hardened_adds) add(id, "mode:HARDENED");
  }
  return [...why.keys()]
    .sort((a, b) => idNum(a) - idNum(b))
    .map((id) => ({ id, name: prompts[id]?.name ?? null, file: prompts[id]?.file ?? null, runs_in: prompts[id]?.runs_in ?? [], why: why.get(id) }));
}

/* ----------------------------------------------------------------- route */

function strongerGate(a, b) {
  return STRENGTH_ORDER.indexOf(a) >= STRENGTH_ORDER.indexOf(b) ? a : b;
}

export function route(request, opts = {}) {
  const rauDir = opts.rauDir ?? DEFAULT_RAU_DIR;
  const registry = opts.registry ?? loadRegistry(rauDir);
  const rules = opts.rules ?? loadRules(rauDir);
  const prompts = opts.prompts ?? loadPrompts(rauDir);
  const root = opts.root ?? REPO_ROOT;
  const text = normalize(request);
  const byId = new Map(registry.projects.map((p) => [p.id, p]));

  /* projekt (override sa overuje a nesmie potichu prebiť text) */
  if (opts.project != null && !byId.has(opts.project)) {
    throw new Error(`Neznámy projekt „${opts.project}“. Platné: ${[...byId.keys()].join(", ")}`);
  }
  const textProject = detectProject(text, registry, rules);
  const project = opts.project
    ? { status: "RESOLVED", confidence: "EXPLICIT", id: opts.project, candidates: [opts.project], evidence: [] }
    : textProject;
  const overrideConflict =
    opts.project && textProject.status === "RESOLVED" && textProject.confidence === "KEYWORD" && textProject.id !== opts.project ? textProject.id : null;
  const proj = project.id ? byId.get(project.id) : null;

  /* signály */
  const gateText = maskForGate(text, rules);
  const triggers = evalTriggers(gateText, rules);
  // Riziko, ktoré je len v citovanom texte: môže to byť UI copy, ale aj inštrukcia od „kolegu“.
  const quotedOnly = evalTriggers(maskNegations(text, rules), rules).filter((t) => !triggers.some((x) => x.id === t.id));
  const readOnlyHit = firstMatch(rules.read_only_phrases, maskQuotes(text));
  const adviceText = stripReadOnly(maskQuotes(text), rules);
  const advice = firstMatch(rules.kinds.advice_first, adviceText);
  const actVerb = firstMatch(rules.act_verbs, gateText);
  let { kind, evidence: kindEvidence } = detectKind(text, gateText, adviceText, rules, triggers);
  // „Výslovne len analýza“ = poradenské sloveso + výslovná veta + žiadne povelové sloveso.
  const explicitReadOnly = Boolean(readOnlyHit && advice && !actVerb);
  if (explicitReadOnly && (kind === "OPS" || kind === "FIX")) {
    kind = "DECIDE";
    kindEvidence = [readOnlyHit.match];
  }
  const cues = evalCues(text, rules, kind);
  const backlog = backlogConflicts(text, registry);

  /* poradenská otázka: riziko sa NEZAHADZUJE — bez výslovného „len analýza“ ide na ASK */
  const advisoryOnly = kind === "DECIDE" && !actVerb;
  let effectiveTriggers = triggers;
  let advisoryAsk = [];
  if (advisoryOnly) {
    effectiveTriggers = triggers.filter((t) => t.gate === "STOP" || !t.advisory_ok);
    if (!explicitReadOnly) advisoryAsk = triggers.filter((t) => t.gate !== "STOP" && t.advisory_ok);
  }

  /* walls */
  const walls = new Set(proj?.walls ?? ["WALL-PROJECT", "WALL-FOUNDER"]);
  for (const t of effectiveTriggers) for (const w of t.walls) walls.add(w);

  /* scope */
  let scope = { action: "UNKNOWN", repo: null, in_this_repo: null, note: null };
  if (proj) {
    if (proj.in_this_repo) scope = { action: "PROCEED", repo: proj.repo, in_this_repo: true, note: null };
    else if (proj.repo) scope = { action: "SWITCH_REPO", repo: proj.repo, in_this_repo: false, note: `Kód projektu je v ${proj.repo}; rozhodnutia patria tam (WALL-PROJECT).` };
    else scope = { action: "NO_REPO", repo: null, in_this_repo: false, note: "Projekt nemá v registry známy repozitár." };
  }

  /* gate (podlaha) */
  const gateReasons = [];
  let gate = "AUTO-SAFE";
  const raise = (g, reason) => {
    gate = strongerGate(gate, g);
    gateReasons.push(`${g}: ${reason}`);
  };

  const stopTriggers = effectiveTriggers.filter((t) => t.gate === "STOP");
  for (const t of stopTriggers) raise("STOP", `${t.id} — ${t.reason}`);

  if (!stopTriggers.length) {
    if (project.status === "AMBIGUOUS") raise("ASK", `viac projektov naraz (${project.candidates.join(", ")}) — jedna úloha = jeden projekt (WALL-PROJECT)`);
    else if (project.status === "NONE") raise("ASK", "zadanie nenavádza projekt");
    else if (scope.action === "SWITCH_REPO") raise("STOP", scope.note);
    else if (scope.action === "NO_REPO" && ["BUILD", "FIX", "OPS"].includes(kind)) raise("ASK", "projekt nemá známy repozitár — kde má práca žiť?");
    if (overrideConflict) raise("ASK", `--project ${opts.project} sa nezhoduje s textom (text hovorí o „${overrideConflict}“)`);
    if (kind === "UNKNOWN") raise("ASK", "nepoznám druh práce (postaviť / opraviť / obsah / nasadiť / rozhodnúť)");
  }
  if (gate !== "STOP" && gate !== "ASK") {
    if (kind === "BUILD") raise("GO_REQUIRED", "nová funkcia: najprv schválený Execution Contract (P03) a Ústava v2");
    for (const t of effectiveTriggers.filter((x) => x.gate === "GO_REQUIRED")) raise("GO_REQUIRED", `${t.id} — ${t.reason}`);
    for (const b of backlog) raise("GO_REQUIRED", `Strategic Backlog „${b.title}“ — veto: ${b.veto}; odomkne sa: ${b.unlock}`);
    if (proj && proj.founder_confirmed === false && ["BUILD", "OPS", "FIX"].includes(kind)) raise("GO_REQUIRED", `projekt „${proj.name}“ nie je potvrdený founderom v RAU registry`);
  }
  // ASK „je to len text / len otázka?“ má zmysel, len keď žiadna tvrdá brána nerozhodla už sama.
  if (gate === "AUTO-SAFE" && quotedOnly.length && !readOnlyHit) {
    raise("ASK", `rizikový výraz (${quotedOnly.map((t) => t.id).join(", ")}) je len v citovanom texte — je to iba text, alebo pokyn?`);
  }
  if (gate === "AUTO-SAFE" && advisoryAsk.length) {
    raise("ASK", `poradenská otázka spomína rizikovú činnosť (${advisoryAsk.map((t) => t.id).join(", ")}) — je to len otázka (pridaj „len analýza“), alebo pokyn?`);
  }

  /* mode */
  let mode = null;
  const notes = [];
  if (proj) {
    const crit = effectiveTriggers.some((t) => t.severity === "CRITICAL");
    if (proj.default_mode === "HARDENED" || crit) mode = "HARDENED";
    else if (effectiveTriggers.length || (kind !== "DECIDE" && cues.length) || backlog.length || proj.fast_eligible === false) mode = "STANDARD";
    else mode = "FAST";
    // Nová funkcia v živom produkte nie je „rýchla“ úloha, aj keď nemá rizikový výraz.
    if (kind === "BUILD" && mode === "FAST") mode = "STANDARD";
  }
  if (/autonomn\w*|autonomous/.test(text)) {
    notes.push(
      registry.autonomous_allowlist.length
        ? "AUTONOMOUS je povolený len pre typy z autonomous_allowlist."
        : "AUTONOMOUS bol spomenutý, ale autonomous_allowlist je prázdny — použitý režim: " + (mode ?? "neurčený") + ".",
    );
  }
  if (advisoryOnly && triggers.length) notes.push(`Rizikové výrazy (${triggers.map((t) => t.id).join(", ")}) sú v poradenskej otázke len spomenuté — nič sa nevykonáva; pri povele sa zadanie znova smeruje.`);

  /* chain */
  const chain = kind === "UNKNOWN" || !mode ? [] : buildChain({ kind, mode, triggers: effectiveTriggers, cues, registry, prompts });

  /* constitution */
  const constitution = {
    required: kind === "BUILD",
    questions: 12,
    vetoes: ["Q1 klient by nezaplatil → max VALIDATE", "Q8 príliš skoro → BACKLOG bez ohľadu na skóre"],
    status: kind === "BUILD" ? "FOUNDER_INPUT_REQUIRED" : "NOT_REQUIRED",
    note: "Skóre sa nikdy nepočíta automaticky; Q1 a Q8 závisia od foundera. Výsledok sa zapisuje do memory/decisions.md.",
  };

  /* reuse */
  const reuse = opts.reuse === false ? null : reuseSearch(text, rules, root);

  /* unknowns & asks */
  const unknowns = [];
  const founder_asks = [];
  if (project.status === "AMBIGUOUS" || project.status === "NONE") {
    unknowns.push(`projekt: ${project.status}`);
    const cands = project.candidates.length ? project.candidates : registry.projects.filter((p) => p.founder_confirmed !== false).map((p) => p.id);
    const live = cands.find((c) => String(byId.get(c)?.stage ?? "").startsWith("LIVE"));
    founder_asks.push({
      question: project.status === "AMBIGUOUS" ? "Zadanie sa týka viacerých projektov. Ktorý ide ako prvý?" : "Ktorého projektu sa zadanie týka?",
      options: cands,
      recommendation: live ?? cands[0] ?? null,
      recommendation_basis: live ? "projekt v produkcii (príjem a retencia majú prednosť — Ústava v2)" : "prvý v registry; RAU nemá dôvod preferovať iný",
    });
  }
  if (overrideConflict) {
    unknowns.push(`--project ${opts.project} vs. text: ${overrideConflict}`);
    founder_asks.push({
      question: `Prepínač --project hovorí „${opts.project}“, ale text hovorí o „${overrideConflict}“. Ktorý projekt platí?`,
      options: [opts.project, overrideConflict],
      recommendation: overrideConflict,
      recommendation_basis: "text zadania je primárny zdroj; prepínač ho nemá ticho prebiť",
    });
  }
  if (gate === "ASK" && quotedOnly.length && !readOnlyHit && gateReasons.some((g) => g.includes("citovanom texte"))) {
    unknowns.push(`riziko len v citáte: ${quotedOnly.map((t) => t.id).join(", ")}`);
    founder_asks.push({
      question: "Rizikový výraz je len v citovanom texte. Je to iba text, alebo to mám vykonať?",
      options: ["len text", "pokyn (vykonať)"],
      recommendation: kind === "CONTENT" ? "len text" : "pokyn (vykonať)",
      recommendation_basis: "pri pokyne sa zadanie znova smeruje a dostane príslušnú bránu",
    });
  }
  if (gate === "ASK" && advisoryAsk.length && gateReasons.some((g) => g.includes("poradenská otázka"))) {
    unknowns.push(`poradenská otázka s rizikom: ${advisoryAsk.map((t) => t.id).join(", ")}`);
    founder_asks.push({
      question: "Je to iba poradenská otázka, alebo mám niečo vykonať?",
      options: ["len otázka (len analýza)", "pokyn (vykonať)"],
      recommendation: "len otázka (len analýza)",
      recommendation_basis: "formulácia je poradenská; pri pokyne sa zadanie znova smeruje a dostane príslušnú bránu",
    });
  }
  if (kind === "UNKNOWN") {
    unknowns.push("druh práce: UNKNOWN");
    founder_asks.push({
      question: "Čo presne chceš: postaviť, opraviť, pripraviť obsah, nasadiť, alebo sa rozhodnúť?",
      options: ["BUILD", "FIX", "CONTENT", "OPS", "DECIDE"],
      recommendation: "DECIDE",
      recommendation_basis: "rozhodovací režim nič nemení a je najlacnejší spôsob, ako zadanie spresniť",
    });
  }
  if (scope.action === "NO_REPO" && ["BUILD", "FIX", "OPS"].includes(kind)) {
    unknowns.push(`repozitár projektu ${proj.id}: neznámy`);
    founder_asks.push({
      question: `Kde má práca pre „${proj.name}“ žiť (repozitár, nástroje)?`,
      options: ["nový repozitár", "podadresár v RealitkaAI", "mimo kódu (len dokumenty)"],
      recommendation: "nový repozitár",
      recommendation_basis: "WALL-PROJECT: projekty sa oddeľujú; RAU nevytvára repozitár bez GO",
    });
  }
  for (const u of proj?.open_unknowns ?? []) unknowns.push(`${proj.id}: ${u}`);
  unknowns.push("rozpočet: NEMERANÉ — statická poznámka z benchmarku 2026-09-26 (RAU ho nemeria): ledger nenesie model_calls ani tokeny (docs/reports/2026-09-26-baseline-benchmark.md N3, N4)");

  return {
    schema: "rau.route.v1",
    input: { request: String(request ?? ""), project_override: opts.project ?? null },
    project: { ...project, name: proj?.name ?? null, stage: proj?.stage ?? null, risk_class: proj?.risk_class ?? null },
    scope,
    kind: { value: kind, evidence: kindEvidence, advisory_only: advisoryOnly },
    walls: [...walls].sort(),
    triggers: effectiveTriggers.map(({ id, severity, gate: g, reason, evidence }) => ({ id, severity, gate: g, reason, evidence })),
    quoted_only_triggers: quotedOnly.map((t) => t.id),
    mentioned_not_executed: advisoryOnly ? triggers.filter((t) => t.gate !== "STOP" && t.advisory_ok).map((t) => t.id) : [],
    cues: cues.map(({ id, evidence }) => ({ id, evidence })),
    backlog_conflicts: backlog,
    mode,
    gate,
    gate_reasons: gateReasons.length ? gateReasons : ["AUTO-SAFE: žiadny rozpoznaný rizikový výraz; projekt aj druh práce sú jasné (nerozpoznaný úkon môže prejsť — Rector číta zadanie sám)"],
    requirements: {
      independent_verifier: mode === "HARDENED",
      evidence_states: EVIDENCE_STATES,
      evidence_rule: "Nikdy netvrď vyšší stav, než máš dôkaz. IMPLEMENTED ≠ TESTED ≠ VERIFIED ≠ PRODUCTION ≠ PRODUCTION VERIFIED.",
      agent_is_not_authority: true,
    },
    constitution,
    prompt_chain: chain,
    reuse,
    unknowns,
    founder_asks,
    notes,
  };
}

/* ----------------------------------------------------------------- brief */

export function formatBrief(r) {
  const L = [];
  L.push(`RAU ROUTE — ${r.kind.value} · ${r.project.name ?? "projekt neurčený"} · MODE ${r.mode ?? "—"}`);
  L.push(`BRÁNA: ${r.gate}`);
  for (const g of r.gate_reasons) L.push(`  • ${g}`);
  if (r.walls.length) L.push(`WALLS: ${r.walls.join(", ")}`);
  if (r.scope.note) L.push(`SCOPE: ${r.scope.note}`);
  if (r.backlog_conflicts.length) {
    L.push("BACKLOG:");
    for (const b of r.backlog_conflicts) L.push(`  • ${b.title} — odomkne sa: ${b.unlock}`);
  }
  if (r.prompt_chain.length) {
    L.push("REŤAZEC PROMPTOV:");
    for (const p of r.prompt_chain) L.push(`  ${p.id} ${p.name ?? "?"}  (${p.why.join(", ")})`);
  }
  if (r.reuse?.candidates.length) {
    L.push(`ZNOVUPOUŽITIE (${r.reuse.recommendation}, heuristika — over ručne):`);
    for (const c of r.reuse.candidates.slice(0, 3)) L.push(`  • ${c.path} (${c.score})`);
  }
  for (const a of r.founder_asks) {
    L.push(`OTÁZKA PRE FOUNDERA: ${a.question}`);
    L.push(`  možnosti: ${a.options.join(" | ")}`);
    L.push(`  odporúčanie: ${a.recommendation} (${a.recommendation_basis})`);
  }
  for (const n of r.notes) L.push(`POZNÁMKA: ${n}`);
  if (r.unknowns.length) {
    L.push("NEZNÁME:");
    for (const u of r.unknowns) L.push(`  • ${u}`);
  }
  return L.join("\n");
}

/* ------------------------------------------------------------------- CLI */

const USAGE = 'Použitie: node scripts/ops/rau-route.mjs "<zadanie>" [--project <id>] [--json] [--no-reuse]\n' +
  "          node scripts/ops/rau-route.mjs --stdin [--json]   (zadanie zo stdin; bezpečné pre text od tretích strán)\n" +
  "          node scripts/ops/rau-route.mjs --batch <súbor.json>";

class UsageError extends Error {}

function main(argv) {
  const args = [];
  const opts = {};
  let json = false;
  let batch = null;
  let stdin = false;
  const value = (i, flag) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new UsageError(`Prepínač ${flag} vyžaduje hodnotu.`);
    return v;
  };
  try {
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === "--json") json = true;
      else if (a === "--stdin") stdin = true;
      else if (a === "--batch") batch = resolve(value(i++, a));
      else if (a === "--reuse") opts.reuse = true;
      else if (a === "--project") opts.project = value(i++, a);
      else if (a === "--root") opts.root = resolve(value(i++, a));
      else if (a === "--rau-dir") opts.rauDir = resolve(value(i++, a));
      else if (a === "--no-reuse") opts.reuse = false;
      else if (a === "--help" || a === "-h") {
        console.log(USAGE);
        return 0;
      } else args.push(a);
    }

    if (batch) {
      let cases;
      try {
        cases = JSON.parse(readFileSync(batch, "utf8"));
      } catch (e) {
        throw new UsageError(e instanceof SyntaxError ? "Neplatný JSON v súbore --batch." : "Súbor --batch sa nedá prečítať.");
      }
      if (!Array.isArray(cases)) throw new UsageError("--batch očakáva JSON pole.");
      const batchOpts = { ...opts, reuse: opts.reuse === true };
      const results = cases.map((c) => {
        const item = typeof c === "string" ? { text: c } : c;
        if (typeof item?.text !== "string") throw new UsageError("Každý prvok --batch musí byť reťazec alebo {text}.");
        return route(item.text, { ...batchOpts, project: item.project ?? opts.project });
      });
      console.log(JSON.stringify(results));
      return 0;
    }

    const request = (stdin ? readFileSync(0, "utf8") : args.join(" ")).trim();
    if (!request) throw new UsageError("Chýba zadanie.");
    const result = route(request, opts);
    console.log(json ? JSON.stringify(result, null, 2) : formatBrief(result));
    return 0;
  } catch (e) {
    console.error(`rau-route: ${e.message}`);
    if (e instanceof UsageError) console.error(USAGE);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}

/**
 * Minimal YAML subset used by bus frontmatter.
 *
 * Deliberately not a YAML implementation: the bus owns its own write format and
 * only has to read what already lives in `.ai/bus`. Supported: nested maps by
 * indentation, block sequences (scalars and maps), quoted/plain scalars,
 * booleans, numbers, null, empty flow collections, `#` comments and block
 * scalars (`|`, `>`). Anything else throws rather than guessing.
 */

export type YamlValue =
  | string
  | number
  | boolean
  | null
  | YamlValue[]
  | { [key: string]: YamlValue };

interface Line {
  indent: number;
  content: string;
  lineNo: number;
}

/**
 * A `#` comment that was stripped from a line which also carried a value.
 *
 * `summary: PR #593 is open` is, per the YAML spec, the value `PR` plus a
 * comment — so the rest of the sentence is silently lost. Reporting these lets
 * callers catch text that an author never meant to throw away.
 */
export interface YamlStrippedComment {
  lineNo: number;
  /** The value text kept before the `#`. */
  kept: string;
  /** Everything from `#` onwards, which YAML discards. */
  dropped: string;
  /**
   * Mapping key on the line, when there is one. Lets a caller tell a comment
   * eaten from `gate: AUTO-SAFE` apart from one eaten from a prose field.
   */
  key?: string;
  /**
   * True when the comment looks accidental rather than deliberate: a real
   * comment is written `# like this`, while `#593` or `#tag` is prose that the
   * author expected to keep.
   */
  suspicious: boolean;
}

export interface ParseYamlOptions {
  /** Called for every comment stripped from a line that also had a value. */
  onComment?: (comment: YamlStrippedComment) => void;
}

export class YamlParseError extends Error {
  readonly lineNo: number;

  constructor(message: string, lineNo: number) {
    super(`${message} (line ${lineNo})`);
    this.name = "YamlParseError";
    this.lineNo = lineNo;
  }
}

function stripComment(raw: string): { content: string; dropped?: string } {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "#" && !inSingle && !inDouble) {
      if (i === 0 || /\s/.test(raw[i - 1]!)) return { content: raw.slice(0, i), dropped: raw.slice(i) };
    }
  }
  return { content: raw };
}

/** `  gate: AUTO-SAFE` -> `gate`. A line that is not a mapping entry has none. */
function mappingKey(kept: string): string | undefined {
  return /^-?\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:/.exec(kept)?.[1];
}

function toLines(source: string, options: ParseYamlOptions): Line[] {
  const out: Line[] = [];
  source.split(/\r?\n/).forEach((raw, index) => {
    const { content, dropped } = stripComment(raw);
    const kept = content.trim();
    if (dropped !== undefined && kept !== "" && options.onComment) {
      options.onComment({
        lineNo: index + 1,
        kept,
        dropped,
        key: mappingKey(kept),
        // `# note` is a comment; `#593` is prose the author expected to keep.
        suspicious: /^#\S/.test(dropped),
      });
    }
    if (kept === "") return;
    out.push({ indent: content.length - content.trimStart().length, content: kept, lineNo: index + 1 });
  });
  return out;
}

function parseScalar(raw: string, lineNo: number): YamlValue {
  const value = raw.trim();
  if (value === "") return "";
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
    (value.startsWith("'") && value.endsWith("'") && value.length > 1)
  ) {
    const inner = value.slice(1, -1);
    return value.startsWith('"') ? inner.replace(/\\"/g, '"').replace(/\\n/g, "\n") : inner.replace(/''/g, "'");
  }
  if (value === "[]") return [];
  if (value === "{}") return {};
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((part) => parseScalar(part, lineNo));
  }
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return Number.parseFloat(value);
  return value;
}

/** Block scalars keep their raw indentation-stripped text. */
function readBlockScalar(lines: Line[], start: number, parentIndent: number, fold: boolean): [string, number] {
  const collected: string[] = [];
  let index = start;
  while (index < lines.length && lines[index]!.indent > parentIndent) {
    collected.push(lines[index]!.content);
    index += 1;
  }
  return [fold ? collected.join(" ") : collected.join("\n"), index];
}

function parseBlock(lines: Line[], start: number, indent: number): [YamlValue, number] {
  if (start >= lines.length) return ["", start];
  if (lines[start]!.content.startsWith("- ") || lines[start]!.content === "-") {
    return parseSequence(lines, start, indent);
  }
  return parseMapping(lines, start, indent);
}

function parseSequence(lines: Line[], start: number, indent: number): [YamlValue[], number] {
  const items: YamlValue[] = [];
  let index = start;
  while (index < lines.length && lines[index]!.indent === indent && lines[index]!.content.startsWith("-")) {
    const line = lines[index]!;
    const rest = line.content === "-" ? "" : line.content.slice(2).trim();
    index += 1;
    if (rest === "") {
      const [value, next] = parseBlock(lines, index, index < lines.length ? lines[index]!.indent : indent + 2);
      items.push(value);
      index = next;
      continue;
    }
    // A sequence item that itself opens a mapping: `- id: A1`
    const keyMatch = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(rest);
    const hasNestedKeys = index < lines.length && lines[index]!.indent > indent;
    if (keyMatch && (hasNestedKeys || keyMatch[2] !== undefined)) {
      const itemIndent = indent + 2;
      const synthetic: Line[] = [{ indent: itemIndent, content: rest, lineNo: line.lineNo }];
      let scan = index;
      while (scan < lines.length && lines[scan]!.indent > indent) {
        synthetic.push({ ...lines[scan]!, indent: lines[scan]!.indent });
        scan += 1;
      }
      const [value] = parseMapping(synthetic, 0, itemIndent);
      items.push(value);
      index = scan;
      continue;
    }
    items.push(parseScalar(rest, line.lineNo));
  }
  return [items, index];
}

function parseMapping(lines: Line[], start: number, indent: number): [Record<string, YamlValue>, number] {
  const map: Record<string, YamlValue> = {};
  let index = start;
  while (index < lines.length && lines[index]!.indent === indent) {
    const line = lines[index]!;
    const match = /^([^:\s][^:]*):\s*(.*)$/.exec(line.content);
    if (!match) {
      // A bare `---` reaching the mapping parser means the caller handed over a
      // block that still contains a delimiter — in practice a bus file whose
      // frontmatter fence is duplicated. The generic message named the symptom
      // ("Unsupported YAML line: ---") and cost real time to trace back to it,
      // so it names the cause instead.
      if (line.content.trim() === "---") {
        throw new YamlParseError(
          "Unexpected `---` inside a YAML block — a duplicated frontmatter delimiter is the usual cause",
          line.lineNo,
        );
      }
      throw new YamlParseError(`Unsupported YAML line: ${line.content}`, line.lineNo);
    }
    const key = match[1]!.trim();
    const inline = match[2]!.trim();
    index += 1;
    // Block scalars with optional chomping/indent indicators: `|`, `>-`, `|+2`, ...
    const blockScalar = /^([|>])([+-]?)(\d*)$/.exec(inline);
    if (blockScalar) {
      const [text, next] = readBlockScalar(lines, index, indent, blockScalar[1] === ">");
      map[key] = text;
      index = next;
      continue;
    }
    if (inline !== "") {
      map[key] = parseScalar(inline, line.lineNo);
      continue;
    }
    if (index < lines.length && lines[index]!.indent > indent) {
      const [value, next] = parseBlock(lines, index, lines[index]!.indent);
      map[key] = value;
      index = next;
      continue;
    }
    // Sequences are allowed to sit at the parent indent level.
    if (index < lines.length && lines[index]!.indent === indent && lines[index]!.content.startsWith("-")) {
      const [value, next] = parseSequence(lines, index, indent);
      map[key] = value;
      index = next;
      continue;
    }
    map[key] = null;
  }
  return [map, index];
}

export function parseYaml(source: string, options: ParseYamlOptions = {}): Record<string, YamlValue> {
  const lines = toLines(source, options);
  if (lines.length === 0) return {};
  const [value, consumed] = parseMapping(lines, 0, lines[0]!.indent);
  if (consumed !== lines.length) {
    throw new YamlParseError("Inconsistent indentation in YAML block", lines[consumed]!.lineNo);
  }
  return value;
}

function needsQuotes(value: string): boolean {
  if (value === "") return true;
  if (/^[\s]|[\s]$/.test(value)) return true;
  if (/[:#\-{}\[\]&*!|>'"%@`,]/.test(value[0]!)) return true;
  if (/:\s/.test(value) || value.includes(" #")) return true;
  if (/^(true|false|null|~)$/i.test(value)) return true;
  if (/^-?\d+(\.\d+)?$/.test(value)) return true;
  return false;
}

function stringifyScalar(value: Exclude<YamlValue, YamlValue[] | object>): string {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (value.includes("\n")) return JSON.stringify(value);
  return needsQuotes(value) ? JSON.stringify(value) : value;
}

export function stringifyYaml(value: YamlValue, indent = 0): string {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value
      .map((item) => {
        if (item !== null && typeof item === "object") {
          const nested = stringifyYaml(item, indent + 2);
          return `${pad}-${nested.slice(indent + 1)}`;
        }
        return `${pad}- ${stringifyScalar(item as never)}`;
      })
      .join("\n");
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return `${pad}{}`;
    return entries
      .map(([key, child]) => {
        if (child !== null && typeof child === "object") {
          if (Array.isArray(child) && child.length === 0) return `${pad}${key}: []`;
          if (!Array.isArray(child) && Object.keys(child).length === 0) return `${pad}${key}: {}`;
          return `${pad}${key}:\n${stringifyYaml(child, indent + 2)}`;
        }
        return `${pad}${key}: ${stringifyScalar(child as never)}`;
      })
      .join("\n");
  }
  return `${pad}${stringifyScalar(value as never)}`;
}

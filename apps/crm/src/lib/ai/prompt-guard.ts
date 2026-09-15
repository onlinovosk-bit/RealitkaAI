/**
 * Prompt-injection guard for free-text fields interpolated into LLM prompts.
 * Neutralizes instruction-like content; does NOT strip PII (see sanitize.ts).
 */

const INSTRUCTION_LINE =
  /^\s*(ignoruj\b|ignore\s+(all\s+)?(previous|prior|above)|disregard\b|system\s*:|assistant\s*:|developer\s*:|```|<\/|\{\{)/i;

const MAX_LEN = 500;

function hasInjectionSignals(s: string): boolean {
  if (INSTRUCTION_LINE.test(s)) return true;
  if (/\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)\b/i.test(s)) return true;
  if (/\bignoruj\s+(predch[aá]dzaj[uú]ce|v[sš]etky)\s+(in[sš]trukcie|pravidl[aá])\b/i.test(s)) return true;
  if (/(^|\n)\s*(system|assistant|developer)\s*:/i.test(s)) return true;
  if (/```|<\//.test(s) || /\{\{/.test(s)) return true;
  return false;
}

/**
 * Neutralizuje voľný text od tretej strany pred vložením do promptu.
 * Oreže dĺžku, zruší riadky/fragmenty čo vyzerajú ako inštrukcia.
 * Čistý text prejde bez zmeny; podozrivý text je filtrovaný a obalený ako dáta.
 */
export function sanitizeFreeText(value: string | null | undefined): string {
  if (value == null) return "";
  const original = String(value);
  if (original === "") return "";

  // Fast path: ordinary notes without injection signals and within length
  if (!hasInjectionSignals(original) && original.length <= MAX_LEN) {
    return original;
  }

  let s = original.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
  s = s.replace(/\r\n?/g, "\n");

  const kept = s.split("\n").map((line) => {
    if (INSTRUCTION_LINE.test(line)) return "[filtered]";
    let out = line;
    out = out.replace(/\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)\b/gi, "[filtered]");
    out = out.replace(/\bignoruj\s+(predch[aá]dzaj[uú]ce|v[sš]etky)\s+(in[sš]trukcie|pravidl[aá])\b/gi, "[filtered]");
    out = out.replace(/(^|\s)(system|assistant|developer)\s*:/gi, "$1[filtered]:");
    out = out.replace(/```/g, "[filtered]");
    out = out.replace(/<\//g, "[filtered]");
    out = out.replace(/\{\{/g, "[filtered]");
    return out;
  });

  s = kept.join(" ").replace(/\s+/g, " ").trim();
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN) + "…";
  if (!s) return "";
  return `«user_data»${s}«/user_data»`;
}

export function looksLikeInjection(input: string | null | undefined): boolean {
  if (input == null || input === "") return false;
  return hasInjectionSignals(String(input));
}

import fs from "node:fs";
import path from "node:path";

/**
 * Golden porovnanie pre dôkaz „pri vypnutom prepínači je výstup zhodný bajt po bajte“.
 * Golden súbory sú vyrenderované z kódu PRED zmenou W2-D (bázový commit 26641e8).
 * Regenerácia (len vedome): UPDATE_GOLDEN=1 vitest run <súbor>
 */
export function expectMatchesGolden(dir: string, name: string, actual: string): void {
  const file = path.join(dir, "__golden__", `${name}.html`);
  if (process.env.UPDATE_GOLDEN === "1") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, actual, "utf8");
    return;
  }
  const expected = fs.readFileSync(file, "utf8");
  // Porovnanie bajt po bajte (žiadna normalizácia).
  if (Buffer.compare(Buffer.from(actual, "utf8"), Buffer.from(expected, "utf8")) !== 0) {
    throw new Error(`Výstup sa líši od golden súboru ${name}.html (dĺžka ${actual.length} vs ${expected.length})`);
  }
}

/** Viditeľný text z HTML (bez značiek, NBSP → medzera, zlúčené medzery) pre kontroly cien a mien. */
export function htmlText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ");
}

/** Zvyšky starých cien (79/71/63/49/99/199/449 a pridružené 299/249 z legacy ponuky) ako samostatné čísla. */
export const LEGACY_PRICE_TOKEN = /(?<![\d.,])(79|71|63|49|99|199|449|299|249)(?![\d]|[.,]\d)/;

/** Mená referenčného klienta a tenantov, ktoré sa v texte pre zákazníkov nesmú objaviť. */
export const FORBIDDEN_CLIENT_NAMES = /smolko|visit\s?real|tomčíkov|pethoov/i;

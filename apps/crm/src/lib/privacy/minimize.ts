// ================================================================
// BOD 9 (zadanie foundera 2026-10-15) — minimalizácia osobných údajov
// pred volaním LLM.
//
// Audit `docs/reports/2026-09-29-llm-callsite-pii-audit.md` našiel 34 volaní
// LLM. Tri živé úniky surových kontaktov opravil #750; zostalo 19 miest
// označených MINIMIZE: posielajú MENO (niekde adresu), ktoré úloha na svoju
// prácu nepotrebuje. GDPR čl. 5 ods. 1 písm. c) — zbierame a odovzdávame len
// to, čo je na účel nevyhnutné.
//
// Tento súbor je jediný zdroj pravdy pre tri vzory, ktoré audit navrhol:
//   1. meno vôbec neposlať        → úloha ho nepotrebuje (triage, skórovanie),
//   2. poslať iba krstné meno     → text oslovuje klienta,
//   3. poslať zástupný znak       → model napíše `[MENO]`, dosadíme lokálne.
//
// Nič z toho nie je anonymizácia: lead zostáva identifikovateľný cez ID v
// našej databáze. Je to minimalizácia toho, čo opustí náš systém.
// ================================================================

/** Zástupný znak za meno klienta. Model ho vypíše, `restoreName` ho nahradí. */
export const NAME_PLACEHOLDER = "[MENO]";

/** Zástupný znak za meno makléra, ktorý sa pod text podpisuje. */
export const AGENT_PLACEHOLDER = "[MAKLER]";

/** Zástupný znak za presnú adresu (ulica a číslo domu). */
export const ADDRESS_PLACEHOLDER = "[ADRESA]";

/** Tituly, ktoré sa pred menom bežne píšu a krstným menom nie sú. */
const TITLES = new Set([
  "ing", "mgr", "bc", "judr", "mudr", "phdr", "rndr", "paeddr", "doc", "prof",
  "dr", "mvdr", "jude", "ing.", "p", "pan", "pani",
]);

const clean = (value: string) => value.replace(/[.,]/g, "").trim().toLowerCase();

/**
 * Krstné meno: prvé slovo, ktoré nie je titul. Prázdny vstup, samé tituly
 * alebo samé interpunkčné znaky vrátia prázdny reťazec — volajúci sa potom
 * musí rozhodnúť, nie poslať „undefined" do promptu.
 */
export function firstNameOnly(full: string | null | undefined): string {
  if (typeof full !== "string") return "";
  for (const word of full.trim().split(/\s+/)) {
    const bare = clean(word);
    if (!bare || TITLES.has(bare)) continue;
    // Orežeme na rozumnú dĺžku; dlhší reťazec nie je krstné meno, ale vstup.
    return word.replace(/[.,;:]+$/, "").slice(0, 40);
  }
  return "";
}

/**
 * Mesto z adresy. Z „Hlavná 25, 811 01 Bratislava" vráti „Bratislava".
 * Keď sa mesto nedá oddeliť, vráti prázdny reťazec — radšej nič než ulicu
 * a číslo domu.
 */
export function cityOnly(address: string | null | undefined): string {
  if (typeof address !== "string") return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1];
  // PSČ (aj s medzerou) odstránime; zvyšok je mesto alebo mestská časť.
  const withoutZip = last.replace(/\b\d{3}\s?\d{2}\b/g, "").trim();
  // Číslo domu v poslednej časti znamená, že adresa nebola oddelená čiarkou.
  if (/\d/.test(withoutZip)) return "";
  return withoutZip.slice(0, 80);
}

/**
 * Nahradí zástupný znak skutočným menom. Robí sa to AŽ PO odpovedi modelu,
 * lokálne — meno teda nikdy neopustí náš systém.
 *
 * Keď meno chýba, zástupný znak sa odstráni aj s prebytočnou medzerou, aby
 * klientovi neprišlo „Dobrý deň [MENO],".
 */
export function restoreName(
  text: string,
  full: string | null | undefined,
  placeholder: string = NAME_PLACEHOLDER,
): string {
  const name = typeof full === "string" ? full.trim() : "";
  if (!text.includes(placeholder)) return text;
  if (name) return text.split(placeholder).join(name);
  return text
    .split(`${placeholder} `).join("")
    .split(` ${placeholder}`).join("")
    .split(placeholder).join("")
    .replace(/ {2,}/g, " ")
    .replace(/ ,/g, ",");
}

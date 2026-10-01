const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Plain text from Realvia/portal HTML descriptions — no tags in generated copy. */
export function stripHtmlToPlainText(input: string): string {
  let text = String(input ?? "");

  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/&([a-z]+);/gi, (_, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? "");
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/\s+([.,!?;:])/g, "$1");

  return text;
}

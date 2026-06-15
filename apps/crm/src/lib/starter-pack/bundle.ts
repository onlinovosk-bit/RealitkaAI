import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { STARTER_PACK_CONTENT_FILES } from "@/lib/starter-pack/constants";

function resolveContentDir(): string | null {
  const candidates = [
    join(process.cwd(), "docs", "products", "starter-pack"),
    join(process.cwd(), "..", "..", "docs", "products", "starter-pack"),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, STARTER_PACK_CONTENT_FILES[0]))) return dir;
  }
  return null;
}

/** Zloží markdown balík z docs/products/starter-pack (server-only). */
export function buildStarterPackMarkdownBundle(): string {
  const dir = resolveContentDir();
  if (!dir) {
    return "# Maklérsky štartovací balík\n\nObsah balíka je dočasne nedostupný. Kontaktujte support@revolis.ai.\n";
  }

  const parts: string[] = [
    "# Maklérsky štartovací balík Revolis\n",
    "_Interný materiál — DRAFT, vyžaduje schválenie pred šírením._\n",
  ];

  for (const file of STARTER_PACK_CONTENT_FILES) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    parts.push(readFileSync(path, "utf8"));
    parts.push("\n\n---\n\n");
  }

  return parts.join("\n");
}

/** HTML na tlač / uloženie ako PDF v prehliadači. */
export function buildStarterPackHtmlBundle(): string {
  const md = buildStarterPackMarkdownBundle();
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^- \[ \] (.+)$/gm, "<p>☐ $1</p>")
    .replace(/^- \[x\] (.+)$/gim, "<p>☑ $1</p>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="utf-8"/>
  <title>Maklérsky štartovací balík — Revolis</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.55; }
    h1 { font-size: 1.5rem; margin-top: 2rem; }
    h2 { font-size: 1.15rem; margin-top: 1.5rem; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body><p>${escaped}</p></body>
</html>`;
}

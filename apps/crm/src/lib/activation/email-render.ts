import { buildActivationEmailContent } from "./email-templates";
import type { ActivationEmailNode, AgencyActivationSnapshot, RenderedActivationEmail } from "./types";

function textToHtml(text: string, ctaUrl: string, ctaLabel: string): string {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!DOCTYPE html><html lang="sk"><body style="margin:0;padding:24px;font-family:system-ui,sans-serif;background:#f8fafc">
${paragraphs}
<p style="margin:24px 0"><a href="${ctaUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${ctaLabel}</a></p>
</body></html>`;
}

export function renderActivationEmail(
  node: ActivationEmailNode,
  snapshot: AgencyActivationSnapshot,
): RenderedActivationEmail {
  const content = buildActivationEmailContent(node, snapshot);
  return {
    node,
    subject: content.subject,
    subjectAlt: content.subjectAlt,
    preheader: content.preheader,
    html: textToHtml(content.body, content.ctaUrl, content.ctaLabel),
    plaintext: `${content.body}\n\n${content.ctaLabel}: ${content.ctaUrl}`,
    ctaUrl: content.ctaUrl,
    ctaLabel: content.ctaLabel,
  };
}

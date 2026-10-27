/**
 * Verejný blog žije na www.revolis.ai (apps/marketing), nie v CRM /blog
 * (ten ostáva redirect na /landing). Sitemap musí indexovať listing aj článok.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../../..");
const SLUG = "ceny-nehnutelnosti-2026-sadzby-nove-ltv";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("marketing public blog", () => {
  it("keeps the first article on the marketing host and in the sitemap contract", () => {
    const blog = read("apps/marketing/lib/blog.ts");
    const seo = read("apps/marketing/__tests__/seo.test.ts");
    const crmIndex = read("apps/crm/src/app/(marketing)/blog/page.tsx");
    const crmArticle = read("apps/crm/src/app/(marketing)/blog/[slug]/page.tsx");

    expect(blog).toContain(`slug: FIRST_ARTICLE_SLUG`);
    expect(blog).toContain(SLUG);
    expect(blog).toContain("Andrej Ondruš");
    expect(blog).toContain("2026-10-19");
    expect(blog).toContain("https://app.revolis.ai/register");
    expect(blog).not.toMatch(/pilot/i);

    expect(seo).toContain("'/blog'");
    expect(seo).toContain(`'/blog/${SLUG}'`);
    expect(seo).toContain(`https://www.revolis.ai/blog/${SLUG}`);

    expect(crmIndex).toContain('redirect("/landing")');
    expect(crmArticle).toContain('redirect("/landing")');
  });
});

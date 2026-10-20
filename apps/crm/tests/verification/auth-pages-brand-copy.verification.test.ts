import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";
import { AUTH_PAGE } from "@/lib/auth-page-theme";
import { AUTH_PREVIEW_PULSE, AUTH_PREVIEW_TILES } from "@/lib/auth-preview-features";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

const AUTH_PAGES = [
  "src/app/login/page.tsx",
  "src/app/(public)/register/page.tsx",
  "src/app/forgot-password/page.tsx",
  "src/app/reset-password/page.tsx",
] as const;

const TYKANIE = [
  "Prihlás sa",
  "Nemáš účet",
  "Už máš účet",
  "Pošleme ti",
  "Zadaj nové heslo",
  "Vyžiadaj si",
  "môžeš prihlásiť",
  "Skontroluj aj",
];

const TEAL_MARKERS = ["#0F766E", "#14B8A6", "from-teal-", "border-teal-", "text-teal-", "bg-teal-"];

describe("[verification] Auth pages brand + vykanie + real features", () => {
  it("reuses workdesk topbarGradient — no invented brand hex", () => {
    expect(AUTH_PAGE.headerBackground).toBe(SLATE_HORIZON.topbarGradient);
    expect(AUTH_PAGE.buttonBackground).toBe(SLATE_HORIZON.topbarGradient);
    expect(AUTH_PAGE.headerBackground).toContain(SLATE_HORIZON.brandDeep);
    expect(AUTH_PAGE.headerBackground).toContain(SLATE_HORIZON.brand);
    expect(AUTH_PAGE.headerBackground).toContain(SLATE_HORIZON.brandNavy);
  });

  it("auth pages import AUTH_PAGE and drop teal Ocean Trust palette", () => {
    for (const rel of AUTH_PAGES) {
      const source = read(rel);
      expect(source, rel).toContain("@/lib/auth-page-theme");
      expect(source, rel).toContain("AUTH_PAGE");
      for (const marker of TEAL_MARKERS) {
        expect(source, `${rel} still contains ${marker}`).not.toContain(marker);
      }
      expect(source, rel).not.toContain("Ocean Trust");
    }
  });

  it("uses formal Slovak vykanie — no leftover tykanie on auth pages", () => {
    for (const rel of AUTH_PAGES) {
      const source = read(rel);
      for (const phrase of TYKANIE) {
        expect(source, `${rel} still contains tykanie: ${phrase}`).not.toContain(phrase);
      }
    }
    const login = read("src/app/login/page.tsx");
    const register = read("src/app/(public)/register/page.tsx");
    expect(login).toContain("Prihláste sa do svojho účtu.");
    expect(login).toContain("Nemáte účet?");
    expect(register).toContain("Už máte účet?");
    expect(register).toContain("Prihláste sa");
  });

  it("login preview drops fake KPI numbers and cites existing product files", () => {
    const login = read("src/app/login/page.tsx");
    const preview = read("src/components/auth/AuthFeaturePreview.tsx");
    expect(login).toContain("AuthFeaturePreview");
    expect(preview).not.toContain("128");
    expect(preview).not.toContain(">17<");
    expect(preview).not.toContain("Všetky príležitosti");
    expect(preview).not.toContain("Live AI Pulse");
    expect(preview).not.toContain("live sync");
    expect(preview).not.toContain("Čo reálne beží");

    const claimed = [...AUTH_PREVIEW_TILES, ...AUTH_PREVIEW_PULSE];
    expect(claimed.map((f) => f.id).sort()).toEqual(
      ["call-coach", "inbound-draft", "lead-triage", "listing-content", "morning-brief", "valuation"].sort(),
    );
    for (const feature of claimed) {
      expect(existsSync(join(CRM_ROOT, feature.source)), feature.source).toBe(true);
    }
    expect(claimed.some((f) => /reel/i.test(f.id) || /reel/i.test(f.title))).toBe(false);
  });

  it("login still links to self-serve forgot-password", () => {
    expect(read("src/app/login/page.tsx")).toContain('href="/forgot-password"');
  });
});

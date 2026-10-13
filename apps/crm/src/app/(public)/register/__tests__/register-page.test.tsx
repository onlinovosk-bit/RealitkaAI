import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../actions", () => ({ register: () => undefined }));

import { RegisterScreen } from "../page";
import { SELF_SERVE_DEMO_CALENDLY_URL } from "@/lib/signup/self-serve";

describe("RegisterScreen", () => {
  it("pri zapnutej skúške sľubuje 14 dní bez karty a vyká", () => {
    const html = renderToStaticMarkup(<RegisterScreen selfServe params={{ plan: "start" }} />);
    expect(html).toContain("14 dní zadarmo, bez platobnej karty");
    expect(html).toContain('name="plan"');
    expect(html).toContain("Vytvoriť účet");
    expect(html).toContain("Už máte účet?");
    expect(html).toContain("Prihláste sa");
    expect(html).not.toContain("Už máš účet");
    expect(html).not.toContain("Prihlás sa");
  });

  it("pri vypnutej vlajke neukáže fiktívny trial formulár; primárne je ukážka", () => {
    const html = renderToStaticMarkup(<RegisterScreen selfServe={false} params={{}} />);
    expect(html).toContain("Skúška nie je otvorená");
    expect(html).toContain("Samoobslužná 14-dňová skúška nie je práve otvorená");
    expect(html).toContain("Dohodnite si ukážku");
    expect(html).toContain(SELF_SERVE_DEMO_CALENDLY_URL);
    expect(html).toContain("Máte pozvánku do kancelárie?");
    expect(html).toContain("Prepojiť pozvánku");
    expect(html).not.toContain("14 dní zadarmo, bez platobnej karty. Po skončení");
    expect(html).not.toContain("Vytvoriť účet");
    expect(html).toContain("Prihláste sa");
  });
});

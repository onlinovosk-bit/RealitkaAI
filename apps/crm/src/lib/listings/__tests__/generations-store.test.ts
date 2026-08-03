import { describe, it, expect, vi, beforeEach } from "vitest";

const from = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({ from }),
}));

import {
  saveGeneration,
  updateGenerationEdit,
  effectiveContent,
} from "@/lib/listings/generations-store";
import type { AiGeneration } from "@/lib/listings/generations-store";

const CONTENT = {
  portal_text: "p", fb_ad_copy: "f", ig_caption: "i",
  email_subject: "s", email_body: "b", seo_keywords: ["a"],
};
const PROPERTY = { type: "byt", location: "Prešov", size_m2: 70, price: 150000, condition: "novostavba", features: [] };

describe("generations-store", () => {
  beforeEach(() => from.mockReset());

  it("bez agency_id neukladá — nedá sa priradiť tenantovi", async () => {
    const r = await saveGeneration({
      agencyId: null, persona: "GENERAL", property: PROPERTY, content: CONTENT,
    });
    expect(r.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("chyba zápisu NIKDY nevyhodí výnimku — moat capture nesmie zhodiť produkt", async () => {
    from.mockReturnValue({
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: "boom" } }) }) }),
    });
    const r = await saveGeneration({
      agencyId: "a1", persona: "GENERAL", property: PROPERTY, content: CONTENT,
    });
    expect(r.ok).toBe(false);
  });

  it("uloží draft a vráti id", async () => {
    from.mockReturnValue({
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: "g1" }, error: null }) }) }),
    });
    const r = await saveGeneration({
      agencyId: "a1", persona: "FAMILY", property: PROPERTY, content: CONTENT,
    });
    expect(r).toEqual({ ok: true, id: "g1" });
  });

  it("update filtruje na agency_id — tenant guard aj pri service role", async () => {
    const eq = vi.fn();
    const chain = { eq };
    eq.mockReturnValueOnce(chain).mockReturnValueOnce({ error: null, count: 1 });
    from.mockReturnValue({ update: () => chain });

    const r = await updateGenerationEdit({ id: "g1", agencyId: "a1", editedOutput: CONTENT });
    expect(r.ok).toBe(true);
    expect(eq).toHaveBeenCalledWith("id", "g1");
    expect(eq).toHaveBeenCalledWith("agency_id", "a1");
  });

  it("cudzia agentúra nedostane not_found namiesto tichého úspechu", async () => {
    const eq = vi.fn();
    const chain = { eq };
    eq.mockReturnValueOnce(chain).mockReturnValueOnce({ error: null, count: 0 });
    from.mockReturnValue({ update: () => chain });

    const r = await updateGenerationEdit({ id: "g1", agencyId: "cudzia", editedOutput: CONTENT });
    expect(r).toEqual({ ok: false, error: "not_found" });
  });

  it("effectiveContent uprednostní úpravu makléra pred pôvodným AI výstupom", () => {
    const base = { id: "g", agencyId: "a", persona: null, input: PROPERTY,
      status: "draft", createdAt: "", updatedAt: "" } as unknown as AiGeneration;
    expect(effectiveContent({ ...base, output: CONTENT, editedOutput: null })).toEqual(CONTENT);
    const edited = { ...CONTENT, portal_text: "upravené" };
    expect(effectiveContent({ ...base, output: CONTENT, editedOutput: edited })?.portal_text).toBe("upravené");
  });
});

import { describe, expect, it, vi, afterEach } from "vitest";
import { sanitizeText } from "../sanitize";

describe("sanitizeText — international phone numbers", () => {
  it.each(["00421 903 123 456", "00420 601 123 456", "+43 664 1234567", "+49 170 1234567", "+44 7700 900123"])(
    "masks %s",
    (phone) => {
      const { sanitized } = sanitizeText(`Kontakt ${phone} večer.`);
      expect(sanitized).not.toContain(phone);
      expect(sanitized).toMatch(/\[PHONE_1\]/);
    },
  );

  it.each([
    "Rozpočet do 250 000 €.",
    "Cena 1 000 000 € vrátane DPH.",
    "Byt 68 m2, 3 izby, 2. poschodie z 8.",
    "Rok výstavby 2004, rekonštrukcia 2019.",
  ])("leaves %s untouched", (text) => {
    expect(sanitizeText(text).sanitized).toBe(text);
  });
});

describe("generateEmbedding — nothing identifying leaves", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("masks phones and e-mails before calling the embeddings API", async () => {
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ embedding: new Array(1536).fill(0.1) }], usage: { total_tokens: 1 } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { generateEmbedding } = await import("@/lib/embeddings");
    await generateEmbedding("Volal z 0903 123 456, píše na jan@example.sk, hľadá 3-izbový byt");
    const body = String((fetchMock.mock.calls[0] as unknown[])[1] && ((fetchMock.mock.calls[0] as unknown[])[1] as RequestInit).body);
    expect(body).not.toContain("0903 123 456");
    expect(body).not.toContain("jan@example.sk");
    expect(body).toContain("3-izbový byt");
  });
});

import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { enrichEstimateCommentary } from "@/lib/valuation/commentary";
import { buildDeterministicEstimate } from "@/lib/valuation/estimate-engine";

const propertyFields = {
  propertyType: z.enum(["byt", "dom"]),
  location: z.string().trim().min(3).max(200),
  postalCode: z.string().trim().max(12).optional(),
  sqm: z.coerce.number().min(1).max(10000),
  rooms: z.coerce.number().min(1).max(20).optional(),
  condition: z.enum(["povodny", "ciastocna", "kompletna", "novostavba"]).optional(),
  floor: z.coerce.number().min(-2).max(60).optional(),
  totalFloors: z.coerce.number().min(1).max(60).optional(),
  yearBuilt: z.coerce.number().min(1800).max(2035).optional(),
  hasElevator: z.boolean().optional(),
  hasBalcony: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  landSqm: z.coerce.number().min(1).max(100000).optional(),
  heating: z.enum(["plyn", "elektrina", "distancne", "tuhle", "ine"]).optional(),
};

/** Variant A: odhad len po kontakte. Variant B preview: odhad pred kontaktom (A/B test). */
const variantBPreviewSchema = z.object({
  ...propertyFields,
  abVariant: z.literal("B"),
  sessionId: z.string().trim().min(8).max(64),
  hp: z.string().optional(),
});

const contactGatedSchema = z.object({
  ...propertyFields,
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(6).max(50),
  privacyAck: z.literal(true),
  hp: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { allowed } = await rateLimit(`valuation-estimate:${ip}`, 10, 3_600_000);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Príliš veľa pokusov. Skúste neskôr." }, { status: 429 });
    }

    const raw = await request.json();
    if (raw?.hp) {
      return NextResponse.json({ ok: true });
    }

    const preview = variantBPreviewSchema.safeParse(raw);
    const contactGated = contactGatedSchema.safeParse(raw);

    if (!preview.success && !contactGated.success) {
      return NextResponse.json(
        { ok: false, error: "Najprv zadajte kontakt — bez neho nezobrazíme odhad." },
        { status: 400 },
      );
    }

    const input = preview.success ? preview.data : contactGated.data!;
    const estimate = buildDeterministicEstimate(input);
    const commentary = await enrichEstimateCommentary(input, estimate);

    return NextResponse.json({
      ok: true,
      estimate: { ...estimate, commentary },
    });
  } catch (error) {
    console.error("[POST /api/valuation/estimate]", error);
    return NextResponse.json({ ok: false, error: "Chyba servera." }, { status: 500 });
  }
}

import { z } from "zod";

export const ListingInputSchema = z.object({
  property_type: z.enum(["byt", "dom", "pozemok", "komerčný priestor", "chata"]),
  disposition: z.string().min(1),
  city: z.string().min(1),
  district: z.string().optional(),
  size_m2: z.number().positive(),
  price_eur: z.number().positive(),
  purpose: z.enum(["predaj", "prenájom"]),
  floor: z.number().int().optional(),
  total_floors: z.number().int().optional(),
  condition: z
    .enum([
      "novostavba",
      "po rekonštrukcii",
      "čiastočná rekonštrukcia",
      "pôvodný stav",
      "na rekonštrukciu",
    ])
    .optional(),
  construction: z.enum(["panel", "tehla", "montovaná", "iné"]).optional(),
  heating: z.string().optional(),
  orientation: z.string().optional(),
  outdoor: z.string().optional(),
  parking: z.string().optional(),
  energy_certificate: z.string().optional(),
  year_built: z.number().int().optional(),
  year_renovated: z.number().int().optional(),
  proximity: z.string().optional(),
  highlights: z.string().max(300).optional(),
  weaknesses: z.string().max(300).optional(),
  agent_name: z.string().optional(),
  agent_phone: z.string().optional(),
});

export type ListingInput = z.infer<typeof ListingInputSchema>;

export function formatListingInputForPrompt(input: ListingInput): string {
  const lines: string[] = [
    `Typ: ${input.property_type} · ${input.disposition}`,
    `Lokalita: ${input.city}${input.district ? `, ${input.district}` : ""}`,
    `Účel: ${input.purpose}`,
    `Výmera: ${input.size_m2} m²`,
    `Cena: ${input.price_eur.toLocaleString("sk-SK")} € (${Math.round(input.price_eur / input.size_m2).toLocaleString("sk-SK")} €/m²)`,
  ];
  const optional: [string, string | number | undefined][] = [
    ["Poschodie", input.floor != null ? `${input.floor}/${input.total_floors ?? "?"}` : undefined],
    ["Stav", input.condition],
    ["Konštrukcia", input.construction],
    ["Vykurovanie", input.heating],
    ["Orientácia", input.orientation],
    ["Exteriér", input.outdoor],
    ["Parkovanie", input.parking],
    ["Energetický certifikát", input.energy_certificate],
    ["Rok výstavby", input.year_built],
    ["Rok rekonštrukcie", input.year_renovated],
    ["Okolie", input.proximity],
    ["Najlepšie", input.highlights],
    ["Slabiny (obrátiť, nezamlčať)", input.weaknesses],
    ["Maklér", input.agent_name],
    ["Telefón", input.agent_phone],
  ];
  for (const [label, val] of optional) {
    if (val != null && String(val).trim()) lines.push(`${label}: ${val}`);
  }
  return lines.join("\n");
}

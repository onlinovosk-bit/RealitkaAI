import { z } from 'zod'

// Loose schema — unknown fields are preserved in `attributes`, not rejected.
// Tighten required fields incrementally once real Realvia payloads arrive (Phase 1).
// Any field marked .optional() here becomes a Phase 0 confirmation item.

export const RealviaListingSchema = z.object({
  // Identifiers — Q6 in Seliga email: confirm these are stable + unique
  id:            z.union([z.string(), z.number()]).transform(String),
  nazov:         z.string().optional(),           // title — field name TBC
  popis:         z.string().optional(),           // description — field name TBC

  // Type — exact enum values TBC
  typ:           z.string().optional(),

  // Status — exact values TBC
  stav:          z.string().optional(),

  // Price — TBC: is it always EUR? Is VAT included?
  cena:          z.number().optional(),
  mena:          z.string().optional().default('EUR'),

  // Area
  plocha:        z.number().optional(),           // m² — field name TBC
  pocet_izb:     z.number().optional(),           // rooms
  podlazie:      z.number().optional(),           // floor

  // Location — field names TBC
  mesto:         z.string().optional(),
  okres:         z.string().optional(),
  kraj:          z.string().optional(),
  ulica:         z.string().optional(),
  gps_lat:       z.number().optional(),
  gps_lon:       z.number().optional(),

  // Media — structure TBC (Q7: do URLs require auth?)
  fotky:         z.array(z.string()).optional(),
}).passthrough()   // unknown fields → captured in `attributes` by the normalizer

export type RealviaListing = z.infer<typeof RealviaListingSchema>

// Top-level API response wrapper — structure TBC after Phase 0
export const RealviaResponseSchema = z.object({
  data:    z.array(z.unknown()),
  total:   z.number().optional(),
  page:    z.number().optional(),
}).passthrough()

export type RealviaResponse = z.infer<typeof RealviaResponseSchema>

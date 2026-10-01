import { z } from "zod";

export const dossierSignalSchema = z.object({
  label: z.string(),
  confidence: z.number().min(0).max(1).nullable(),
  source: z.string(),
});

export const dossierSchema = z.object({
  owner: z.string().nullable(),
  estimated_value_eur: z.number().nullable(),
  company_ico: z.string().nullable(),
  risk_flags: z.array(z.string()),
  signals: z.array(dossierSignalSchema),
  sources: z.array(z.string()),
  null_reasons: z.record(z.string(), z.string()),
});

export type Dossier = z.infer<typeof dossierSchema>;

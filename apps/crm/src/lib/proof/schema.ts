import { z } from "zod";

export const proofSubmitSchema = z.object({
  agentsCount: z.coerce.number().int().min(1).max(500),
  leadsPerMonth: z.coerce.number().int().min(5).max(2000),
  responseMinutes: z.coerce.number().int().min(2).max(720),
  dealRatePercent: z.coerce.number().min(1).max(40),
  followUpRatePercent: z.coerce.number().min(0).max(100),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  company: z.string().trim().min(2).max(200),
  phone: z.string().trim().max(40).optional(),
  city: z.string().trim().max(80).optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Súhlas so spracovaním údajov je povinný." }),
  }),
});

export type ProofSubmitBody = z.infer<typeof proofSubmitSchema>;

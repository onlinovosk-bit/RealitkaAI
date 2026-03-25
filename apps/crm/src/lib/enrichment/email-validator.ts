// Validácia emailu cez externé API (napr. Abstract, ZeroBounce, EmailListVerify)
// Stub: len základná kontrola

export async function validateEmail(email: string): Promise<{ valid: boolean; reason?: string }> {
  if (!email || !email.includes('@')) return { valid: false, reason: 'Neplatný formát emailu' };
  // TODO: Integrácia na externé API podľa kľúča
  return { valid: true };
}

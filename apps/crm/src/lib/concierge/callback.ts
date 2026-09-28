export type ConciergeCallbackInput = {
  displayName?: string;
  phone?: string;
  email?: string;
  consentContact: boolean;
  propertyId?: string;
  preferredBrokerId?: string;
  note?: string;
  idempotencyKey?: string;
  honeypot?: string;
};

export type ConciergeCallbackValidation =
  | { ok: true; input: Required<Pick<ConciergeCallbackInput, "consentContact">> & ConciergeCallbackInput }
  | { ok: false; error: string; status: number };

export function validateConciergeCallback(
  body: Record<string, unknown>,
): ConciergeCallbackValidation {
  const honeypot = String(body.hp ?? body.honeypot ?? "").trim();
  if (honeypot) {
    return { ok: true, input: { consentContact: true, honeypot } };
  }

  const consentContact =
    body.consent_contact === true ||
    body.consentContact === true ||
    body.consent === true;

  if (!consentContact) {
    return { ok: false, error: "Súhlas s kontaktom je povinný.", status: 400 };
  }

  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!phone && !email) {
    return {
      ok: false,
      error: "Vyžaduje sa telefón alebo e-mail.",
      status: 400,
    };
  }

  return {
    ok: true,
    input: {
      consentContact: true,
      displayName: String(body.display_name ?? body.displayName ?? body.name ?? "")
        .trim()
        .slice(0, 200),
      phone: phone.slice(0, 50),
      email: email.slice(0, 254),
      propertyId: String(body.property_id ?? body.propertyId ?? "").trim() || undefined,
      preferredBrokerId:
        String(body.preferred_broker_id ?? body.preferredBrokerId ?? "").trim() ||
        undefined,
      note: String(body.note ?? "").trim().slice(0, 2000) || undefined,
      idempotencyKey:
        String(body.idempotency_key ?? body.idempotencyKey ?? "").trim().slice(0, 120) ||
        undefined,
    },
  };
}

export function buildCallbackIdempotencyKey(
  agencyId: string,
  input: ConciergeCallbackInput,
): string {
  if (input.idempotencyKey) return `${agencyId}:${input.idempotencyKey}`;
  const contact = (input.phone || input.email || "").toLowerCase();
  const prop = input.propertyId || "";
  return `${agencyId}:concierge:${contact}:${prop}`;
}

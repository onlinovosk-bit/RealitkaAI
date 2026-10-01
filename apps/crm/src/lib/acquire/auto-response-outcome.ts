import { emitPlatformEventServer } from "@/lib/platform-events-server";
import { INBOUND_AUTO_RESPONSE_EVENT } from "@/lib/platform-events-visibility";

export { INBOUND_AUTO_RESPONSE_EVENT };

/**
 * AUTO-RESPONSE-VISIBLE — každý pokus o potvrdenie leadovi zanechá jeden trvalý záznam.
 *
 * Prečo to vzniklo: v PROD je `leads.auto_response_sent_at` NULL u 515 z 515 leadov. Funkcia
 * mala 4 tiché východy, ktoré končili len v `console.error` (Vercel ho drží ~1 h) a v súbore,
 * ktorý sa na serverless nedá zapísať. Nedalo sa zistiť, či e-mail nikdy neodišiel kvôli
 * konfigurácii, doméne, reply-to alebo tomu, že sa funkcia nezavolala.
 *
 * Čítanie po hodinách:
 *
 *   select created_at, payload from platform_events
 *   where event_type = 'inbound.auto_response' order by created_at desc;
 *
 * Payload nesie iba kódy: výsledok, dôvod, HTTP status, názov chyby a ID leadu — nikdy
 * e-mail, meno, text správy ani text chyby (môže obsahovať kus vstupu). Tenant tento typ
 * udalosti cez SSE nevidí (viď platform-events-visibility.ts).
 */
export type AutoResponseOutcome =
  /** E-mail odišiel a `auto_response_sent_at` sa zapísal. */
  | "sent"
  /** E-mail odišiel, ale značku `auto_response_sent_at` sa nepodarilo zapísať (hrozí duplicita). */
  | "sent_unmarked"
  /** Lead nemá e-mail. */
  | "skipped_no_email"
  /** `auto_response_sent_at` už je nastavené (dedup). */
  | "skipped_already_sent"
  /** `agencies.auto_response_enabled = false`. */
  | "skipped_disabled"
  /** Nedá sa určiť reply-to (agentúra ani vlastník nemá e-mail). */
  | "failed_no_reply_to"
  /** Odoslanie zlyhalo — dôvod v `reason`. */
  | "failed_send"
  /** Zlyhala príprava (čítanie z DB, chýbajúci stĺpec, neočakávaná výnimka) — dôvod v `reason`. */
  | "failed_error";

export type AutoResponseSendReason =
  /** Chýba alebo je neplatný `RESEND_API_KEY` (u nás nie je v tvare `re_…`). */
  | "config"
  /** 401/403 z Resendu — kľúč je odvolaný alebo nemá oprávnenie. */
  | "auth"
  /** Odosielacia doména nie je v Resende overená / neexistuje. */
  | "domain_not_verified"
  | "invalid_from"
  /** Ostatné validačné chyby požiadavky (napr. neplatný príjemca). */
  | "validation"
  | "rate_limit"
  | "server_error"
  | "network"
  | "unknown";

export type AutoResponsePrepareReason =
  /** Chýba stĺpec `leads.auto_response_sent_at` (nespustená migrácia). */
  | "migration_required"
  /** Značku `auto_response_sent_at` sa po odoslaní nepodarilo zapísať. */
  | "dedup_update_failed"
  /** Neočakávaná výnimka (čítanie z DB, …). */
  | "unexpected";

export interface AutoResponseResult {
  outcome: AutoResponseOutcome;
  reason?: AutoResponseSendReason | AutoResponsePrepareReason | null;
  httpStatus?: number | null;
  /** Názov chyby (kódový reťazec), nikdy text správy. */
  errorName?: string | null;
}

const ERROR_NAME_RE = /^[A-Za-z][A-Za-z0-9_.]{0,47}$/;

/** Názov chyby je bezpečný, len ak vyzerá ako kód/trieda (nie ako veta s dátami). */
export function safeErrorName(v: unknown): string | null {
  const name =
    typeof v === "string"
      ? v
      : typeof v === "object" && v !== null && typeof (v as { name?: unknown }).name === "string"
        ? (v as { name: string }).name
        : null;
  return name && ERROR_NAME_RE.test(name) ? name : null;
}

/**
 * Best-effort: nikdy nehádže. Stratený záznam je len horšia diagnostika; stratený lead nie.
 */
export async function recordAutoResponseOutcome(input: {
  agencyId: string | null;
  leadId: string;
  result: AutoResponseResult;
}): Promise<void> {
  try {
    await emitPlatformEventServer({
      agencyId: input.agencyId,
      eventType: INBOUND_AUTO_RESPONSE_EVENT,
      payload: {
        lead_id: input.leadId,
        outcome: input.result.outcome,
        reason: input.result.reason ?? null,
        http_status: input.result.httpStatus ?? null,
        error_name: input.result.errorName ?? null,
      },
    });
  } catch (e) {
    console.warn(
      "[auto-response-outcome] record failed:",
      e instanceof Error ? e.message : String(e),
    );
  }
}

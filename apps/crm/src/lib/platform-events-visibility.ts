/**
 * Diagnostické udalosti v `platform_events`, ktoré patria prevádzke (nám), nie tenantovi.
 *
 * Prečo: SSE stream `/api/events/stream` posiela tenantovi všetky udalosti jeho agentúry
 * a Playbook stránka zobrazuje surový `event_type` poslednej udalosti v hlavičke. Bez tohto
 * zoznamu by Smolkov maklér videl text `ai.call_failed` alebo `inbound.auto_response`.
 *
 * Toto je filter streamu, nie ochrana dát: RLS politika `platform_events_select_tenant` stále
 * dovoľuje tenantovi čítať riadky svojej agentúry priamo. Skutočné oddelenie by vyžadovalo
 * zmenu RLS (migrácia) — viď decisions.md, BACKLOG.
 */
export const AI_CALL_FAILED_EVENT = "ai.call_failed";
export const INBOUND_AUTO_RESPONSE_EVENT = "inbound.auto_response";

export const OPERATOR_ONLY_EVENT_TYPES: readonly string[] = [
  AI_CALL_FAILED_EVENT,
  INBOUND_AUTO_RESPONSE_EVENT,
];

/** Hodnota pre PostgREST `not.in`, napr. `("ai.call_failed","inbound.auto_response")`. */
export function operatorOnlyEventTypesFilter(): string {
  return `(${OPERATOR_ONLY_EVENT_TYPES.map((t) => `"${t}"`).join(",")})`;
}

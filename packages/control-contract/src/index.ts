/**
 * Revolis Control Plane — CP-P0-4 Control Contract.
 *
 *   OBSERVE → DECIDE → AUTHORIZE → ACT → REPORT OUTCOME → LEARN
 *
 * Spec: docs/architecture/founder-control-plane-cp-spec-v1.md (v1.1.0, §3).
 * The contract lives outside apps/crm on purpose — cron jobs, .ai/bus agents and
 * future services must be able to import it without importing the CRM.
 */
export {
  actorId,
  causationId,
  correlationId,
  runId,
  tenantId,
  IdentityError,
  type Actor,
  type CausationId,
  type CorrelationId,
  type RunId,
  type TenantId,
} from "./identity.ts";

export { deriveIdempotencyKey, type IdempotencyInput } from "./idempotency.ts";
export { isReconstructable, type Provenance } from "./provenance.ts";

export {
  ACTION_REGISTRY,
  deliveryGuarantee,
  lookupAction,
  registeredActions,
  type ActionMetadata,
  type ActionRisk,
  type ProviderIdempotency,
} from "./actions.ts";

export {
  DEFAULT_AUTHORITY_POLICY,
  matchesDenyList,
  resolvePolicyForTenant,
  type AuthorityPolicy,
  type ExternallyVisibleOverride,
} from "./policy.ts";

export {
  applyApproval,
  buildAuthorityContext,
  mayAct,
  resolveAuthority,
  type Authority,
  type AuthorityContext,
  type AuthorityVerdict,
  type Capability,
  type ResolveAuthorityOptions,
  type SystemState,
} from "./authority.ts";

export {
  isRetryable,
  isValidOutcome,
  type ActionResult,
  type ActionStatus,
  type Alternative,
  type Availability,
  type Decision,
  type Lesson,
  type LessonStatus,
  type Observation,
  type Outcome,
  type OutcomeRecord,
  type OutcomeStatus,
  type OutcomeUnknownReason,
  type RetryableErrorCode,
} from "./phases.ts";

export {
  createInMemorySink,
  isScopeConsistent,
  type ControlEvent,
  type ControlEventSink,
  type ControlEventType,
  type EventScope,
  type InMemorySink,
} from "./events.ts";

export {
  ControlContractViolation,
  type ControlledAgent,
  type RunContext,
} from "./agent.ts";

export {
  runControlledAgent,
  type ControlRunResult,
  type RunOptions,
  type RunTermination,
} from "./runner.ts";

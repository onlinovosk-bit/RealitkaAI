/**
 * The platform's answer to "may agents act right now?" (CP-SPEC §3.4).
 *
 * Kill switch: set AGENT_KILL_SWITCH=1 (or "true") in the Vercel environment
 * and redeploy. Every action that goes through resolveAuthority is then
 * FORBIDDEN — including ones a human already approved (I-007). Unset or any
 * other value means the switch is off.
 *
 * Server-only. Read per call so tests and redeploys never see a cached value.
 */
import type { SystemState } from "@revolis/control-contract";

export function readSystemState(
  env: Readonly<Record<string, string | undefined>> = process.env,
): SystemState {
  const raw = env.AGENT_KILL_SWITCH?.trim().toLowerCase();
  return {
    degraded: false,
    killSwitch: raw === "1" || raw === "true",
  };
}

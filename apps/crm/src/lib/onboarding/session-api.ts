/**
 * Browser-safe helpers for onboarding_sessions sync via service-role API.
 * localStorage remains source of truth; callers soft-fail on network/API errors.
 */

export type OnboardingSessionPayload = {
  session_id: string;
  step: number;
  form_data: unknown;
  updated_at?: string;
};

export type OnboardingSessionRow = {
  session_id: string;
  step: number;
  form_data: unknown;
  updated_at?: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isOnboardingSessionId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export async function getOnboardingSession(
  sessionId: string,
): Promise<OnboardingSessionRow | null> {
  if (!isOnboardingSessionId(sessionId)) return null;
  const res = await fetch(
    `/api/onboarding/session?session_id=${encodeURIComponent(sessionId.trim())}`,
    { method: "GET", headers: { Accept: "application/json" } },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    ok?: boolean;
    session?: OnboardingSessionRow | null;
  };
  return json.session ?? null;
}

export async function upsertOnboardingSession(
  payload: OnboardingSessionPayload,
): Promise<boolean> {
  if (!isOnboardingSessionId(payload.session_id)) return false;
  const res = await fetch("/api/onboarding/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      session_id: payload.session_id.trim(),
      step: payload.step,
      form_data: payload.form_data,
      updated_at: payload.updated_at ?? new Date().toISOString(),
    }),
  });
  return res.ok;
}
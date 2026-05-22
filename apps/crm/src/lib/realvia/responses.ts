import { NextResponse } from 'next/server';

/** Realvia export/webhook API contract (Realvia dokumentácia exportu). */
export type RealviaApiResult = 'ok' | 'error';

export type RealviaApiBody = {
  result: RealviaApiResult;
  message: string;
};

/** Unified auth failure message for all Realvia-facing endpoints. */
export const REALVIA_AUTH_ERROR_MESSAGE = 'Invalid authentication';

/** Pick the primary user-facing message from validation errors. */
export function pickRealviaErrorMessage(errors: readonly string[]): string {
  if (errors.length === 0) return 'Request rejected';

  const authError = errors.find((e) =>
    /authentication|identifikator|secret|forbidden/i.test(e),
  );
  return authError ?? errors[0] ?? 'Request rejected';
}

export function realviaSuccess(message = 'OK', status = 200): NextResponse<RealviaApiBody> {
  return NextResponse.json({ result: 'ok', message }, { status });
}

export function realviaError(
  message: string,
  status = 403,
): NextResponse<RealviaApiBody> {
  return NextResponse.json({ result: 'error', message }, { status });
}

export function realviaErrorFromValidation(
  errors: readonly string[],
  status = 403,
): NextResponse<RealviaApiBody> {
  return realviaError(pickRealviaErrorMessage(errors), status);
}

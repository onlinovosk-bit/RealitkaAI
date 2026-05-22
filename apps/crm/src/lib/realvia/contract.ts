/** Realvia export/webhook JSON contract — single source for tests + smoke scripts. */
export const REALVIA_LEGACY_KEYS = ['error', 'details', 'ok'] as const;

export type RealviaContractBody = {
  result: 'ok' | 'error';
  message: string;
};

export function parseRealviaContractBody(raw: unknown): RealviaContractBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  if (body.result !== 'ok' && body.result !== 'error') return null;
  if (typeof body.message !== 'string' || body.message.length === 0) return null;
  return { result: body.result, message: body.message };
}

/** Fails if response violates Realvia documented schema or uses legacy keys. */
export function assertRealviaContractBody(raw: unknown): RealviaContractBody {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Realvia contract: body is not an object');
  }
  const body = raw as Record<string, unknown>;

  for (const legacyKey of REALVIA_LEGACY_KEYS) {
    if (legacyKey in body) {
      throw new Error(`Realvia contract: forbidden legacy key "${legacyKey}"`);
    }
  }

  const parsed = parseRealviaContractBody(body);
  if (!parsed) {
    throw new Error(
      `Realvia contract: expected { result: "ok"|"error", message: string }, got ${JSON.stringify(body)}`,
    );
  }
  return parsed;
}

import { describe, expect, it } from 'vitest';
import { assertRealviaContractBody, parseRealviaContractBody } from './contract';

describe('Realvia API contract', () => {
  it('accepts documented error shape', () => {
    expect(assertRealviaContractBody({ result: 'error', message: 'Invalid authentication' })).toEqual({
      result: 'error',
      message: 'Invalid authentication',
    });
  });

  it('accepts documented success shape', () => {
    expect(assertRealviaContractBody({ result: 'ok', message: 'Export received' })).toEqual({
      result: 'ok',
      message: 'Export received',
    });
  });

  it('rejects legacy { error, details } format', () => {
    expect(() =>
      assertRealviaContractBody({ error: 'Forbidden', details: ['Invalid authentication'] }),
    ).toThrow(/forbidden legacy key "error"/);
  });

  it('rejects legacy { ok: true } format', () => {
    expect(() => assertRealviaContractBody({ ok: true, received: true })).toThrow(
      /forbidden legacy key "ok"/,
    );
  });

  it('rejects missing message', () => {
    expect(parseRealviaContractBody({ result: 'error' })).toBeNull();
  });
});

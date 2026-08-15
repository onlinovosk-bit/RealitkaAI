import { cache } from "react";

type MemoMap = Map<string, Promise<unknown>>;

/**
 * Vitest has no Next.js request scope, so tests use this Map.
 * Production uses React.cache() — one Map per server request.
 */
let testMemo: MemoMap | null = null;

const createRequestMemo = cache(() => new Map() as MemoMap);

export function resetAuthProfileRequestMemoForTests(): void {
  testMemo = new Map();
}

export function getAuthProfileRequestMemo(): MemoMap {
  if (testMemo) return testMemo;
  return createRequestMemo();
}
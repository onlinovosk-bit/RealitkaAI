#!/usr/bin/env node
/**
 * Post-deploy smoke: Realvia export + webhook response contract on production.
 * Usage: node apps/crm/scripts/realvia-smoke.mjs [baseUrl]
 * Exit 0 = contract OK on all checks. Exit 1 = regression.
 */
const BASE = (process.argv[2] ?? 'https://app.revolis.ai').replace(/\/$/, '');

const LEGACY_KEYS = ['error', 'details', 'ok'];

function assertContract(label, status, body) {
  for (const key of LEGACY_KEYS) {
    if (key in body) {
      throw new Error(`${label}: forbidden legacy key "${key}" in ${JSON.stringify(body)}`);
    }
  }
  if (body.result !== 'ok' && body.result !== 'error') {
    throw new Error(`${label}: missing result ok|error — ${JSON.stringify(body)}`);
  }
  if (typeof body.message !== 'string' || !body.message) {
    throw new Error(`${label}: missing message — ${JSON.stringify(body)}`);
  }
  console.log(`OK  ${label} HTTP ${status} → ${JSON.stringify(body)}`);
}

async function hit(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`${path}: non-JSON response HTTP ${res.status}`);
  }
  return { status: res.status, body };
}

async function main() {
  console.log(`Realvia smoke → ${BASE}\n`);

  const importNoAuth = await hit('/api/realvia/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: '<test/>',
  });
  assertContract('import (no auth)', importNoAuth.status, importNoAuth.body);
  if (importNoAuth.status !== 403) {
    throw new Error(`import (no auth): expected HTTP 403, got ${importNoAuth.status}`);
  }

  const webhookNoAuth = await hit('/api/webhooks/realvia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assertContract('webhook (no auth)', webhookNoAuth.status, webhookNoAuth.body);
  if (webhookNoAuth.status !== 403) {
    throw new Error(`webhook (no auth): expected HTTP 403, got ${webhookNoAuth.status}`);
  }

  console.log('\nAll Realvia contract smoke checks passed.');
}

main().catch((err) => {
  console.error('\nRealvia smoke FAILED:', err.message);
  process.exit(1);
});

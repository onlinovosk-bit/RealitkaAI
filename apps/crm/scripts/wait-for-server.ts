// wait-for-server.ts
// Utility script to wait for the Next.js server to be ready before running Playwright tests

import http from 'http';

const url = process.env.HEALTHCHECK_URL || 'http://localhost:3000';
const path = process.env.HEALTHCHECK_PATH || '/api/system/smoke';
const timeout = Number(process.env.HEALTHCHECK_TIMEOUT) || 60000; // 60s default
const interval = Number(process.env.HEALTHCHECK_INTERVAL) || 2000; // 2s default

function checkServerReady(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url + path, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.abort();
      resolve(false);
    });
  });
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await checkServerReady()) {
      console.log('✅ Server is ready.');
      process.exit(0);
    }
    console.log('Waiting for server...');
    await new Promise((r) => setTimeout(r, interval));
  }
  console.error('❌ Server did not become ready in time.');
  process.exit(1);
}

waitForServer();

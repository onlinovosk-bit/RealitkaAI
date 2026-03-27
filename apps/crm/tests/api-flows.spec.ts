import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('API endpoints', () => {
  test('GET /api/leads returns leads', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/leads`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.leads)).toBeTruthy();
  });

  test('GET /api/leads/:id returns lead or error', async ({ request }) => {
    // First get all leads
    const res = await request.get(`${BASE_URL}/api/leads`);
    const data = await res.json();
    if (data.leads.length > 0) {
      const leadId = data.leads[0].id;
      const leadRes = await request.get(`${BASE_URL}/api/leads/${leadId}`);
      expect(leadRes.ok()).toBeTruthy();
      const leadData = await leadRes.json();
      expect(leadData.lead).toBeTruthy();
    }
  });

  test('GET /api/leads/nonexistent returns error', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/leads/nonexistent-lead-id`);
    expect(res.status()).not.toBe(200);
  });
});

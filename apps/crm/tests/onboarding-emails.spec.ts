import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_DOMAIN = process.env.RESEND_DOMAIN || 'testmail.com';

// Helper to generate random email
function randomEmail(prefix: string) {
	return `${prefix}_${Math.random().toString(36).substring(2, 8)}@${RESEND_DOMAIN}`;
}

async function getLastResendEmail(to: string) {
	if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
	const res = await fetch('https://api.resend.com/emails', {
		headers: {
			Authorization: `Bearer ${RESEND_API_KEY}`,
			'Content-Type': 'application/json',
		},
	});
	if (!res.ok) throw new Error('Failed to fetch Resend emails');
	const data = await res.json();
	return data.data.find((email: any) => email.to.includes(to));
}

test.describe('Onboarding Emails E2E', () => {
	test('Signup triggers welcome email', async ({ request }) => {
		const email = randomEmail('signup');
		const res = await request.post(`${BASE_URL}/api/team/users`, {
			data: {
				agencyId: '11111111-1111-1111-1111-111111111111',
				teamId: '22222222-2222-2222-2222-222222222222',
				fullName: 'Test Signup User',
				email,
				role: 'agent',
				phone: '0900111222',
			},
		});
		expect(res.ok()).toBeTruthy();
		const emailObj = await getLastResendEmail(email);
		expect(emailObj).toBeTruthy();
		expect(emailObj.subject.toLowerCase()).toContain('vitajte');
	});

	// Ďalšie testy môžete pridať podľa potreby
});

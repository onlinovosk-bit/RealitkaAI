import { Resend } from 'resend';
import {
  buildWelcomeEmail,
  buildCrmSyncReminderEmail,
  buildAiActivationEmail,
} from '@/lib/revolisCsSystem';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.OUTREACH_FROM_EMAIL || 'noreply@revolis.ai';

type OnboardingType = 'welcome' | 'crm' | 'ai';

export async function sendOnboardingEmail(
  type: OnboardingType,
  to: string,
  name: string,
  link: string
) {
  let subject = '';
  let html = '';
  if (type === 'welcome') {
    ({ subject, html } = buildWelcomeEmail(name, link));
  } else if (type === 'crm') {
    ({ subject, html } = buildCrmSyncReminderEmail(name, link));
  } else if (type === 'ai') {
    ({ subject, html } = buildAiActivationEmail(name, link));
  } else {
    throw new Error('Unknown onboarding email type');
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

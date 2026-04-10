import { Resend } from 'resend';
import {
  buildWelcomeEmail,
  buildCrmSyncReminderEmail,
  buildAiActivationEmail,
} from '@/lib/revolisCsSystem';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "missing");
}
const FROM = process.env.OUTREACH_FROM_EMAIL || 'noreply@revolis.ai';

type OnboardingType = 'welcome' | 'crm' | 'ai';

export async function sendOnboardingEmail(
  type: OnboardingType,
  to: string,
  name: string,
  _link: string
) {
  let subject = '';
  let html = '';
  if (type === 'welcome') {
    ({ subject, html } = buildWelcomeEmail({ email: to, name }));
  } else if (type === 'crm') {
    ({ subject, html } = buildCrmSyncReminderEmail({ email: to, name }));
  } else if (type === 'ai') {
    ({ subject, html } = buildAiActivationEmail({ email: to, name }));
  } else {
    throw new Error('Unknown onboarding email type');
  }
  try {
    await getResend().emails.send({ from: FROM, to, subject, html });
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

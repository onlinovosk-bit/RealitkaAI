import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.OUTREACH_FROM_EMAIL || 'noreply@revolis.ai';

export async function sendWelcomeEmail(to: string, name?: string) {
  const subject = 'Vitajte v Realitka AI!';
  const html = `<p>Dobrý deň${name ? `, ${name}` : ''},</p>
    <p>Vitajte v Realitka AI. Sme radi, že ste sa pripojili!</p>
    <p>Ak máte otázky, odpovedzte na tento email.</p>`;
  return resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendCRMSyncEmail(to: string, crmName?: string) {
  const subject = 'CRM bolo úspešne pripojené';
  const html = `<p>Vaše CRM${crmName ? ` (${crmName})` : ''} bolo úspešne pripojené k Realitka AI.</p>
    <p>Všetky dáta budú synchronizované automaticky.</p>`;
  return resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendAIActivationEmail(to: string) {
  const subject = 'AI funkcie boli aktivované';
  const html = `<p>Vaše AI funkcie v Realitka AI boli úspešne aktivované.</p>
    <p>Môžete začať využívať všetky inteligentné nástroje.</p>`;
  return resend.emails.send({ from: FROM, to, subject, html });
}

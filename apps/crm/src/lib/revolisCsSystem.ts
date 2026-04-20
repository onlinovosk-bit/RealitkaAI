// Šablóny onboarding emailov pre Resend

const BRAND = 'Revolis.AI';
const BRAND_COLOR = '#22D3EE';
const BRAND_URL = 'https://app.revolis.ai';

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="sk">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;padding:40px 0">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#1E293B;border-radius:16px;border:1px solid #334155;overflow:hidden;max-width:580px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:32px 40px;border-bottom:1px solid #334155">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:${BRAND_COLOR};letter-spacing:-0.5px">${BRAND}</h1>
          <p style="margin:4px 0 0;font-size:12px;color:#64748B">Predaj viac · Pracuj menej</p>
        </td></tr>
        <tr><td style="padding:32px 40px;color:#CBD5E1;font-size:15px;line-height:1.7">
          ${content}
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #334155;text-align:center">
          <p style="margin:0;font-size:12px;color:#475569">Realitky ktoré víťazia, používajú ${BRAND}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#334155"><a href="${BRAND_URL}" style="color:#475569">${BRAND_URL}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildWelcomeEmail({ email, name }: { email: string; name?: string }) {
  const displayName = name || email;
  return {
    subject: `Vitajte v ${BRAND}! Tu je váš prístup`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#F1F5F9">Vitajte, ${displayName}!</h2>
      <p style="margin:0 0 16px">Váš účet je aktívny. Pripravili sme pre vás rýchly štart — zvyčajne trvá menej ako 5 minút.</p>
      <p style="margin:0 0 8px;font-weight:600;color:#94A3B8">Čo vás čaká:</p>
      <ul style="margin:0 0 24px;padding-left:20px">
        <li style="margin-bottom:8px">Import leadov z vášho portálu</li>
        <li style="margin-bottom:8px">Aktivácia AI Asistenta</li>
        <li style="margin-bottom:8px">Prvé odporúčanie do 24 hodín</li>
      </ul>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
        <tr><td style="background:${BRAND_COLOR};border-radius:10px;padding:0">
          <a href="${BRAND_URL}/onboarding" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#0F172A;text-decoration:none;letter-spacing:-0.3px">Začať onboarding →</a>
        </td></tr>
      </table>
      <p style="margin:0;font-size:13px;color:#64748B">Ak tlačidlo nefunguje, skopírujte tento link: <a href="${BRAND_URL}/onboarding" style="color:${BRAND_COLOR}">${BRAND_URL}/onboarding</a></p>
    `)
  };
}

export function buildCrmSyncReminderEmail({ email, name }: { email: string; name?: string }) {
  const displayName = name || email;
  return {
    subject: `CRM úspešne prepojené s ${BRAND}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#F1F5F9">CRM je prepojené, ${displayName}!</h2>
      <p style="margin:0 0 16px">Vaše CRM bolo úspešne synchronizované s ${BRAND}. Všetky leady sa teraz spracujú automaticky.</p>
      <p style="margin:0 0 24px">AI Asistent začne analyzovať vaše leady a posielať vám odporúčania v reálnom čase.</p>
      <table cellpadding="0" cellspacing="0"><tr><td style="background:${BRAND_COLOR};border-radius:10px">
        <a href="${BRAND_URL}/dashboard" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#0F172A;text-decoration:none">Otvoriť dashboard →</a>
      </td></tr></table>
    `)
  };
}

export function buildAiActivationEmail({ email, name }: { email: string; name?: string }) {
  const displayName = name || email;
  return {
    subject: `AI odporúčania sú aktívne — ${BRAND}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#F1F5F9">AI je aktívne, ${displayName}!</h2>
      <p style="margin:0 0 16px">Váš AI Asistent teraz pracuje 24/7. Sleduje aktivitu leadov, hodnotí pripravenosť na kúpu a upozorní vás presne vo chvíli, keď treba konať.</p>
      <p style="margin:0 0 24px;padding:16px;background:rgba(34,211,238,0.08);border-left:3px solid ${BRAND_COLOR};border-radius:0 8px 8px 0;font-size:14px;color:#94A3B8">
        <strong style="color:${BRAND_COLOR}">${BRAND} nestojí ani zlomok jedného strateného obchodu.</strong>
      </p>
      <table cellpadding="0" cellspacing="0"><tr><td style="background:${BRAND_COLOR};border-radius:10px">
        <a href="${BRAND_URL}/dashboard" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#0F172A;text-decoration:none">Zobraziť AI odporúčania →</a>
      </td></tr></table>
    `)
  };
}

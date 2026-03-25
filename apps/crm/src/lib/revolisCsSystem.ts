// Šablóny onboarding emailov pre Resend

export function buildWelcomeEmail({ email, name }: { email: string; name?: string }) {
  return {
    subject: 'Vitajte v Realitka AI!',
    html: `<h1>Vitajte${name ? ', ' + name : ''}!</h1><p>Ďakujeme za registráciu v Realitka AI. Sme radi, že ste s nami.</p>`
  };
}

export function buildCrmSyncReminderEmail({ email, name }: { email: string; name?: string }) {
  return {
    subject: 'CRM úspešne pripojené',
    html: `<h1>CRM pripojené${name ? ', ' + name : ''}!</h1><p>Vaše CRM bolo úspešne prepojené s Realitka AI. Môžete začať využívať automatizácie.</p>`
  };
}

export function buildAiActivationEmail({ email, name }: { email: string; name?: string }) {
  return {
    subject: 'AI odporúčania sú aktívne',
    html: `<h1>AI aktivované${name ? ', ' + name : ''}!</h1><p>AI odporúčania sú teraz aktívne. Sledujte nové leady a odporúčania v CRM.</p>`
  };
}

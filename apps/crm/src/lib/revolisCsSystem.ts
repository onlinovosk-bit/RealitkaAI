// Šablóny onboarding emailov pre Resend
// Názvoslovie: Revolis.AI = obchodný názov SaaS produktu; ONLINOVO, s. r. o. = prevádzkovateľ / zriaďovateľ služby.

const EMAIL_FOOTER = `
  <p style="margin:32px 0 0;color:#64748b;font-size:12px;line-height:1.5;">
    Tím produktu <strong style="color:#0f172a;">Revolis.AI</strong><br/>
    ONLINOVO, s. r. o. · Štúrova 130/25, 058 01 Poprad · Slovenská republika
  </p>
`;

/** ~300 slov — onboarding po získaní prvej platiacej partnerskej realitnej kancelárie; telo je v slovenčine. */
function buildFirstPartnerOnboardingBody(name?: string): string {
  const greeting = name ? ` ${escapeHtml(name)}` : "";
  return `
<div style="font-family:system-ui,Segoe UI,sans-serif;font-size:15px;line-height:1.65;color:#1e293b;max-width:560px;">
  <p style="margin:0 0 16px;">Dobrý deň${greeting},</p>
  <p style="margin:0 0 16px;">
    ďakujeme, že ste sa rozhodli pre <strong>Revolis.AI</strong> — inteligentnú CRM a AI platformu určenú pre realitné
    kancelárie a profesionálnych maklérov. Službu Revolis.AI vám prináša spoločnosť <strong>ONLINOVO, s. r. o.</strong>, ktorá
    ako prevádzkovateľ zodpovedá za prevádzku, bezpečnosť dát, vývoj produktu a dodržiavanie zverejnených pravidiel ochrany
    osobných údajov. Pre nás máte výnimočný význam: ako naša <strong>prvá platiaca partnerská realitná kancelária</strong>
    pomáhate formovať produkt v priamom kontakte s praxou a vaša spätná väzba je pre náš tím prioritná pri plánovaní funkcií
    a úprav procesov.
  </p>
  <p style="margin:0 0 16px;">
    Čo od Revolis.AI môžete očakávať v praxi: jednotná práca s leadmi a kontaktmi, AI skórovanie a prioritizácia,
    automatizovaná komunikácia s kontaktmi a prehľadná analytika, aby ste vedeli, kde získavate obchod a kde tím stráca čas.
    AI odporúčania sú navrhnuté ako podpora rozhodovania — konečné kroky (kontakt, ponuka, zmluva) zostávajú vo vašich rukách
    a v súlade s GDPR zabezpečíte informovanie dotknutých osôb tam, kde je to vašou zodpovednosťou ako prevádzkovateľa
    voči vlastným klientom.
  </p>
  <p style="margin:0 0 16px;">
    Vaše dáta sú vaše. Údaje používame výhradne na poskytovanie služby Revolis.AI pre vás; zákaznícke dáta
    <strong>nepoužívame na tréning verejných AI modelov</strong>. Technické a organizačné opatrenia, rozsah spracovania a
    práva dotknutých osôb nájdete v zásadách ochrany osobných údajov, DPA a súvisiacich stránkach Trust Center / Legal v rámci
    aplikácie.
  </p>
  <p style="margin:0 0 16px;">
    Čo odporúčame v prvých dňoch: dokončite onboarding v aplikácii, importujte alebo prepojte kontakty, nastavte tímové role
    a prístupové práva a otestujte AI asistenta na reálnych leadoch. Ak potrebujete, dohodneme krátky onboarding hovor —
    prejdeme integráciu, otázky k dátam a spôsob práce, ktorý najviac vyhovuje vašej kancelárii. Pilotný mesiac vnímame ako
    spoločné nastavenie: sledujeme počet kvalifikovaných interakcií, čas odozvy voči leadom a priebežnú konverziu, aby ste
    mali jasný obraz návratnosti investície do nástroja.
  </p>
  <p style="margin:0 0 16px;">
    Tešíme sa na merateľné výsledky a na dlhodobú spoluprácu. Pri otázkach nás kontaktujte na
    <a href="mailto:support@revolis.ai" style="color:#0891b2;">support@revolis.ai</a>.
  </p>
  <p style="margin:0;">S pozdravom,</p>
  ${EMAIL_FOOTER}
</div>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildWelcomeEmail({ email: _email, name }: { email: string; name?: string }) {
  const displayName = name?.trim();
  return {
    subject: "Vitajte v Revolis.AI — onboarding partnerskej realitnej kancelárie",
    html: buildFirstPartnerOnboardingBody(displayName),
  };
}

export function buildCrmSyncReminderEmail({ email: _email, name }: { email: string; name?: string }) {
  const n = name?.trim();
  return {
    subject: "CRM úspešne pripojené — Revolis.AI",
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;max-width:560px;">
  <h1 style="font-size:20px;margin:0 0 12px;">CRM pripojené${n ? ", " + escapeHtml(n) : ""}</h1>
  <p style="margin:0 0 12px;">Vaše CRM bolo úspešne prepojené so službou <strong>Revolis.AI</strong> (prevádzkovateľ
  <strong>ONLINOVO, s. r. o.</strong>). Môžete začať využívať automatizácie a synchronizáciu v aplikácii.</p>
  ${EMAIL_FOOTER}
</div>`,
  };
}

export function buildAiActivationEmail({ email: _email, name }: { email: string; name?: string }) {
  const n = name?.trim();
  return {
    subject: "AI odporúčania sú aktívne — Revolis.AI",
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;max-width:560px;">
  <h1 style="font-size:20px;margin:0 0 12px;">AI aktivované${n ? ", " + escapeHtml(n) : ""}</h1>
  <p style="margin:0 0 12px;">AI odporúčania sú teraz aktívne v produkte <strong>Revolis.AI</strong>. Sledujte nové leady,
  skóre a návrhy priamo v CRM. ONLINOVO, s. r. o. ako prevádzkovateľ zabezpečuje beh služby podľa zverejnených podmienok.</p>
  ${EMAIL_FOOTER}
</div>`,
  };
}

import { NextResponse } from 'next/server';

/**
 * REVOLIS GUARD - L99 Security & Monitoring Middleware
 * Chráni endpointy kľúčom a hlási chyby do Slacku.
 */
export async function revolisGuard(req, taskName, handler) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  // 1. Kontrola bezpečnostného kľúča (musí sa zhodovať s .env)
  if (!key || key !== process.env.CRON_SECRET) {
    console.error(`🚨 Nepovolený prístup k ${taskName}!`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Spustenie samotnej logiky, ktorú sme do Guardu vložili
    return await handler();
  } catch (error) {
    // 3. Ak nastane chyba, zapíšeme ju do konzoly a pošleme na Slack
    console.error(`❌ Chyba v ${taskName}:`, error);
    
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ *CRITICAL ERROR: Revolis Engine*\n*Task:* ${taskName}\n*Error:* ${error.message}`,
            username: "Revolis Guard",
            icon_emoji: ":rotating_light:"
          })
        });
      } catch (slackError) {
        console.error("❌ Nepodarilo sa odoslať chybu na Slack:", slackError);
      }
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message }, 
      { status: 500 }
    );
  }
}

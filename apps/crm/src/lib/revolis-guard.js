import { NextResponse } from 'next/server';

export async function revolisGuard(req, taskName, handler) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!key || key !== process.env.CRON_SECRET) {
    console.error(`🚨 Nepovolený prístup k ${taskName}!`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return await handler();
  } catch (error) {
    console.error(`❌ Chyba v ${taskName}:`, error);
    
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ *ERROR: Revolis Engine*\n*Úloha:* ${taskName}\n*Chyba:* ${error.message}`,
          username: "Revolis Guard"
        })
      });
    }

    return NextResponse.json({ error: 'Server Error', msg: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

// TODO: In real app, load user's Google access token from DB/session
const DEMO_ACCESS_TOKEN = process.env.GOOGLE_DEMO_ACCESS_TOKEN;

export async function POST() {
  // Demo: create a simple event in Google Calendar
  const event = {
    summary: 'Demo udalosť z RealitkaAI',
    start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
    end: { dateTime: new Date(Date.now() + 7200000).toISOString() },
  };
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEMO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: 'Failed to create event', details: err }, { status: 400 });
  }
  const data = await res.json();
  return NextResponse.json({ event: data });
}

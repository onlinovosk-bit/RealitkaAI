import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import {
  disconnectCalendarIntegration,
  getCalendarIntegration,
  saveCalendarIntegration,
  syncCalendarFromIcs,
} from '@/lib/integrations-store';

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: 'Pouzivatel nie je prihlaseny.' },
        { status: 401 }
      );
    }

    const integration = await getCalendarIntegration(profile.id);
    return NextResponse.json({ ok: true, integration });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Chyba pri nacitani konfiguracie',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: 'Pouzivatel nie je prihlaseny.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const calendarIcsUrl =
      typeof body.calendarIcsUrl === 'string' ? body.calendarIcsUrl.trim() : '';

    if (!calendarIcsUrl) {
      return NextResponse.json(
        { ok: false, error: 'ICS URL je povinne' },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(calendarIcsUrl);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Neplatna URL adresa' },
        { status: 400 }
      );
    }

    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { ok: false, error: 'ICS URL musi pouzivat HTTPS' },
        { status: 400 }
      );
    }

    if (!parsedUrl.pathname.toLowerCase().includes('.ics')) {
      return NextResponse.json(
        { ok: false, error: 'URL nevyzera ako ICS odkaz' },
        { status: 400 }
      );
    }

    const saved = await saveCalendarIntegration({
      profileId: profile.id,
      calendarIcsUrl,
    });

    return NextResponse.json({
      ok: true,
      message: 'Konfiguracia kalendara bola uspesne ulozena',
      integration: saved,
    });
  } catch (error) {
    console.error('Error configuring calendar:', error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Chyba pri ukladani konfiguracie',
      },
      { status: 500 }
    );
  }
}

export async function POST_sync(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ ok: false, error: 'Pouzivatel nie je prihlaseny.' }, { status: 401 });
    }
    const integration = await getCalendarIntegration(profile.id);
    if (!integration?.calendarIcsUrl) {
      return NextResponse.json({ ok: false, error: 'Nie je nakonfigurovaný ICS kalendár.' }, { status: 400 });
    }
    const result = await syncCalendarFromIcs(integration.calendarIcsUrl, profile.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Chyba pri synchronizácii kalendára' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: 'Pouzivatel nie je prihlaseny.' },
        { status: 401 }
      );
    }

    await disconnectCalendarIntegration(profile.id);

    return NextResponse.json({
      ok: true,
      message: 'Kalendar integracia bola odpojena',
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Chyba pri odpajani integracie',
      },
      { status: 500 }
    );
  }
}

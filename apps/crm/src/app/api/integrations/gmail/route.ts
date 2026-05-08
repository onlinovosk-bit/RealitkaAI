import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import {
  disconnectGmailIntegration,
  getGmailIntegration,
  saveGmailIntegration,
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

    const integration = await getGmailIntegration(profile.id);
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
    const { imapHost, imapPort, imapUser, imapPassword } = body;

    if (!imapHost || !imapPort || !imapUser || !imapPassword) {
      return NextResponse.json(
        { ok: false, error: 'Vsetky polia su povinne' },
        { status: 400 }
      );
    }

    const parsedPort = Number(imapPort);
    if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Neplatny IMAP port' },
        { status: 400 }
      );
    }

    const saved = await saveGmailIntegration({
      profileId: profile.id,
      imapHost: String(imapHost).trim(),
      imapPort: parsedPort,
      imapUser: String(imapUser).trim(),
      imapPassword: String(imapPassword),
    });

    return NextResponse.json({
      ok: true,
      message: 'Konfiguracia bola uspesne ulozena',
      integration: saved,
    });
  } catch (error) {
    console.error('Error configuring Gmail IMAP:', error);
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

export async function DELETE() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: 'Pouzivatel nie je prihlaseny.' },
        { status: 401 }
      );
    }

    await disconnectGmailIntegration(profile.id);

    return NextResponse.json({
      ok: true,
      message: 'Gmail integracia bola odpojena',
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

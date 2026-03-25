import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { syncEmailInbox } from '@/lib/integrations-store';

export async function POST() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ ok: false, error: 'Pouzivatel nie je prihlaseny.' }, { status: 401 });
    }
    const result = await syncEmailInbox(profile.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Chyba pri synchronizácii emailu' }, { status: 500 });
  }
}

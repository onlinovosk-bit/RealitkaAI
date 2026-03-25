import { createClient } from "@/lib/supabase/server";
import { autoErrorCapture } from "./auto-error-capture";
import { getCurrentProfile } from "@/lib/auth";
import { sendOnboardingEmail } from "@/lib/send-onboarding-email";
// import ical from "node-ical";
// import { createActivity } from "./activities-store";
// import { ImapFlow } from 'imapflow';
import type {
  GmailIntegrationInput,
  CalendarIntegrationInput,
  GmailIntegrationData,
  CalendarIntegrationData
} from './integration-types';

async function getSupabase() {
  // captureServerInfo("Supabase client initialized (integrations)");
  return createClient();
}

export async function saveGmailIntegration(input: GmailIntegrationInput) {
  const supabase = await getSupabase();
  try {
    const { data, error } = await supabase
      .from("integration_settings")
      .upsert(
        {
          profile_id: input.profileId,
          imap_host: input.imapHost,
          imap_port: input.imapPort,
          imap_secure: true,
          imap_user: input.imapUser,
          imap_password: input.imapPassword,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" }
      )
      .select("profile_id, imap_host, imap_port, imap_secure, imap_user, updated_at")
      .single();
    if (error) {
      autoErrorCapture(error, "saveGmailIntegration");
      throw new Error(`Nepodarilo sa ulozit Gmail integraciu: ${error.message}`);
    }
    // captureServerInfo("Gmail integration saved", { profileId: input.profileId });
    return data;
  } catch (err) {
    autoErrorCapture(err, "saveGmailIntegration");
    throw err;
  }

  const result = {
    profileId: data.profile_id as string,
    imapHost: data.imap_host as string,
    imapPort: data.imap_port as number,
    imapSecure: data.imap_secure as boolean,
    imapUser: data.imap_user as string,
    updatedAt: data.updated_at as string,
  };
  // Odoslanie onboarding emailu po úspešnej integrácii
  try {
    const profile = await getCurrentProfile();
    if (profile && profile.email && profile.full_name) {
      await sendOnboardingEmail('crm', profile.email, profile.full_name, 'https://app.revolis.ai/crm');
    }
  } catch (e) {
    console.error('Nepodarilo sa odoslať CRM onboarding email:', e);
  }
  return result;
}

export async function saveCalendarIntegration(input: CalendarIntegrationInput) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("integration_settings")
    .upsert(
      {
        profile_id: input.profileId,
        calendar_ics_url: input.calendarIcsUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    )
    .select("profile_id, calendar_ics_url, updated_at")
    .single();

  if (error) {
    throw new Error(`Nepodarilo sa ulozit kalendar integraciu: ${error.message}`);
  }

  const result = {
    profileId: data.profile_id as string,
    calendarIcsUrl: data.calendar_ics_url as string,
    updatedAt: data.updated_at as string,
  };
  // Odoslanie onboarding emailu po úspešnej integrácii
  try {
    const profile = await getCurrentProfile();
    if (profile && profile.email && profile.full_name) {
      await sendOnboardingEmail('crm', profile.email, profile.full_name, 'https://app.revolis.ai/crm');
    }
  } catch (e) {
    console.error('Nepodarilo sa odoslať CRM onboarding email:', e);
  }
  return result;
}

export async function getGmailIntegration(
  profileId: string
): Promise<GmailIntegrationData | null> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("integration_settings")
    .select("profile_id, imap_host, imap_port, imap_secure, imap_user, imap_password, updated_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Nepodarilo sa nacitat Gmail integraciu: ${error.message}`);
  }

  if (!data || !data.imap_host) {
    return null;
  }

  return {
    profileId: data.profile_id as string,
    imapHost: data.imap_host as string,
    imapPort: data.imap_port as number,
    imapSecure: Boolean(data.imap_secure),
    imapUser: (data.imap_user as string) || "",
    imapPassword: (data.imap_password as string) || "",
    updatedAt: data.updated_at as string,
  };
}

export async function getCalendarIntegration(
  profileId: string
): Promise<CalendarIntegrationData | null> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("integration_settings")
    .select("profile_id, calendar_ics_url, updated_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Nepodarilo sa nacitat kalendar integraciu: ${error.message}`);
  }

  if (!data || !data.calendar_ics_url) {
    return null;
  }

  return {
    profileId: data.profile_id as string,
    calendarIcsUrl: data.calendar_ics_url as string,
    updatedAt: data.updated_at as string,
  };
}

export async function disconnectGmailIntegration(profileId: string) {
  const supabase = await getSupabase();

  const { error } = await supabase.from("integration_settings").upsert(
    {
      profile_id: profileId,
      imap_host: null,
      imap_port: null,
      imap_secure: true,
      imap_user: null,
      imap_password: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" }
  );

  if (error) {
    throw new Error(`Nepodarilo sa odpojit Gmail integraciu: ${error.message}`);
  }
}

export async function disconnectCalendarIntegration(profileId: string) {
  const supabase = await getSupabase();

  const { error } = await supabase.from("integration_settings").upsert(
    {
      profile_id: profileId,
      calendar_ics_url: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" }
  );

  if (error) {
    throw new Error(`Nepodarilo sa odpojit kalendar integraciu: ${error.message}`);
  }
}

export async function syncCalendarFromIcs(icsUrl: string, leadId: string): Promise<{ synced: number; message: string }> {
  try {
    // Fetch ICS file
    const response = await fetch(icsUrl);
    if (!response.ok) {
      return { synced: 0, message: `Nepodarilo sa stiahnuť ICS: ${response.statusText}` };
    }
    const icsText = await response.text();
    // Parse ICS
    const events = ical.parseICS(icsText);
    let synced = 0;
    for (const key in events) {
      const event = events[key];
      if (event.type === 'VEVENT') {
        // Create activity for each event
        await createActivity(
          leadId,
          'Kalendár',
          `${event.summary || 'Bez názvu'} (${event.start?.toISOString() || ''})`
        );
        synced++;
      }
    }
    return { synced, message: `Synchronizovaných udalostí: ${synced}` };
  } catch (e) {
    return { synced: 0, message: `Chyba pri synchronizácii kalendára: ${e}` };
  }
}

export async function syncEmailInbox(
  profileId: string,
  createActivityInjected?: typeof import('./activities-store').createActivity
): Promise<{ synced: number; message: string }> {
  // Fetch IMAP config from DB
            // IMAP sync logic is disabled: imapflow module not installed
    return { synced: 0, message: 'IMAP konfigurácia neexistuje.' };
  }
  const { imap_host, imap_port, imap_user, imap_password } = integration;
  if (!imap_host || !imap_port || !imap_user || !imap_password) {
    return { synced: 0, message: 'IMAP konfigurácia je neúplná.' };
  }
  const { ImapFlow } = await import('imapflow');
  const client = new ImapFlow({
    host: imap_host,
    port: imap_port,
    secure: true,
    auth: { user: imap_user, pass: imap_password },
  });
  let synced = 0;
  try {
    await client.connect();
    await client.mailboxOpen('INBOX');
    const { createActivity } = await import('./activities-store-proxy');
    const activityFn = createActivityInjected || createActivity;
    for await (const message of client.fetch({ seen: false }, { envelope: true })) {
      const subject = message.envelope.subject || '(bez predmetu)';
      const from = message.envelope.from?.map(f => f.address).join(', ') || '(neznámy odosielateľ)';
      await activityFn(profileId, 'Email', `Nový email od ${from}: ${subject}`);
      synced++;
    }
    await client.logout();
    return { synced, message: `Synchronizovaných emailov: ${synced}` };
  } catch (e) {
    return { synced: 0, message: `Chyba pri synchronizácii emailu: ${e}` };
  }
}

export async function importPortalLeadsFromCsv(
  csv: string
): Promise<{ imported: number; message: string }> {
  if (!csv.trim()) return { imported: 0, message: "Prázdny CSV obsah." };
  const lines = csv.trim().split("\n").filter(Boolean);
  // First line is header
  const dataLines = lines.slice(1);
  return {
    imported: dataLines.length,
    message: `CSV bol prijatý (${dataLines.length} riadkov). Reálny import bude implementovaný v ďalšej verzii.`,
  };
}


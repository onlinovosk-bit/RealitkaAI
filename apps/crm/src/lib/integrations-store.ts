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

    const result = {
      profileId: data.profile_id as string,
      imapHost: data.imap_host as string,
      imapPort: data.imap_port as number,
      imapSecure: data.imap_secure as boolean,
      imapUser: data.imap_user as string,
      updatedAt: data.updated_at as string,
    };

    // Odoslanie onboarding emailu
    try {
      const profile = await getCurrentProfile();
      if (profile && profile.email && profile.full_name) {
        await sendOnboardingEmail(
          "crm",
          profile.email,
          profile.full_name,
          "https://app.revolis.ai/crm"
        );
      }
    } catch (e) {
      console.error("Nepodarilo sa odoslať CRM onboarding email:", e);
    }

    return result;
  } catch (err) {
    autoErrorCapture(err, "saveGmailIntegration");
    throw err;
  }
}

-- GMAIL-CONNECT: pripojenie Gmailu agentúry (OAuth gmail.readonly) pre pull dopytov.
--
-- Jeden riadok na agentúru (príjem dopytov je na úrovni agentúry ako inbound_mailboxes).
-- Refresh token sa ukladá IBA šifrovaný (AES-256-GCM, kľúč v prostredí, nie v DB);
-- plaintext token neexistuje v žiadnom stĺpci. Tabuľku číta a píše výhradne service role:
-- RLS zapnutá bez politík = deny-all pre anon aj authenticated, fail-closed.
-- Aditívne a vratné (DROP TABLE).

create table if not exists public.agency_gmail_inbound_oauth (
  agency_id               uuid primary key references public.agencies(id) on delete cascade,
  granted_by_profile_id   uuid not null references public.profiles(id),
  gmail_user_email        text not null,
  refresh_token_ciphertext text not null,
  token_key_version       text not null default 'v1',
  scopes                  text[] not null,
  label_name              text not null default 'Revolis',
  status                  text not null default 'active'
                          check (status in ('active', 'error', 'revoked')),
  consent_recorded_at     timestamptz not null default now(),
  last_pulled_at          timestamptz,
  last_error              text,
  revoked_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- Povolenie nad čítanie (gmail.send, modify, mail.google.com) sa nesmie uložiť ani omylom.
  constraint agency_gmail_inbound_oauth_readonly_only
    check (scopes <@ array[
      'https://www.googleapis.com/auth/gmail.readonly', 'openid', 'email'
    ]::text[]
    and 'https://www.googleapis.com/auth/gmail.readonly' = any(scopes))
);

create index if not exists agency_gmail_inbound_oauth_status_idx
  on public.agency_gmail_inbound_oauth (status);

alter table public.agency_gmail_inbound_oauth enable row level security;

revoke all on public.agency_gmail_inbound_oauth from anon, authenticated;

comment on table public.agency_gmail_inbound_oauth is
  'Gmail pull: pripojenie agentúry. refresh_token_ciphertext je AES-256-GCM, kľúč mimo DB. Service role only.';

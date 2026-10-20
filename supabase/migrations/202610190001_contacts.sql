-- Run the entire file in Supabase SQL Editor. No existing data is deleted.
begin;

create table if not exists public.contact_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  code_hash bytea not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists contact_invites_sender on public.contact_invites(sender_id);

create table if not exists public.trusted_links (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (sender_id <> recipient_id)
);
create unique index if not exists trusted_links_one_recipient
  on public.trusted_links(sender_id) where revoked_at is null;
create index if not exists trusted_links_recipient on public.trusted_links(recipient_id);

-- One counter per account and operation bucket; not an event log.
create table if not exists public.contact_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null default now(),
  attempts integer not null default 1,
  primary key (user_id, bucket)
);

alter table public.contact_invites enable row level security;
alter table public.trusted_links enable row level security;
alter table public.contact_rate_limits enable row level security;
-- All access is through the authenticated function. Direct table access is denied.
revoke all on public.contact_invites, public.trusted_links, public.contact_rate_limits
  from public, anon, authenticated;

create or replace function public.contact_action(
  action text, invite_code text default null, link_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  invitation public.contact_invites%rowtype;
  connection public.trusted_links%rowtype;
  normalized text;
  new_code text;
  expiry timestamptz;
  attempt_count integer;
  operation_bucket text;
  links jsonb;
begin
  if caller is null then return jsonb_build_object('error', 'auth_required'); end if;
  if action not in ('list', 'create', 'preview', 'accept', 'revoke') or action is null then
    return jsonb_build_object('error', 'invalid_action');
  end if;

  if action = 'list' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', l.id, 'sender_id', l.sender_id, 'recipient_id', l.recipient_id,
      'sender_email', s.email, 'recipient_email', r.email
    ) order by l.created_at desc), '[]'::jsonb) into links
    from public.trusted_links l
    join auth.users s on s.id = l.sender_id
    join auth.users r on r.id = l.recipient_id
    where l.revoked_at is null and (l.sender_id = caller or l.recipient_id = caller);
    return jsonb_build_object('links', links);
  end if;

  if action in ('create', 'preview', 'accept') then
    operation_bucket := case when action = 'create' then 'create' else 'lookup' end;
    insert into public.contact_rate_limits as limits (user_id, bucket)
    values (caller, operation_bucket)
    on conflict (user_id, bucket) do update set
      attempts = case when limits.window_start <= now() - interval '15 minutes'
        then 1 else least(limits.attempts + 1, 11) end,
      window_start = case when limits.window_start <= now() - interval '15 minutes'
        then now() else limits.window_start end
    returning attempts into attempt_count;
    if attempt_count > (case when action = 'create' then 5 else 10 end) then
      return jsonb_build_object('error', 'rate_limited');
    end if;
    -- Expected failures RETURN, rather than RAISE: failed lookups still consume attempts.
  end if;

  if action = 'create' then
    perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
    if exists (select 1 from public.trusted_links where sender_id = caller and revoked_at is null) then
      return jsonb_build_object('error', 'already_connected');
    end if;
    update public.contact_invites set revoked_at = now()
      where sender_id = caller and used_at is null and revoked_at is null;
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    insert into public.contact_invites(sender_id, code_hash)
      values (caller, sha256(convert_to(new_code, 'UTF8'))) returning expires_at into expiry;
    return jsonb_build_object('code', new_code, 'expires_at', expiry);
  end if;

  if action = 'revoke' then
    select * into connection from public.trusted_links
      where id = link_id and (sender_id = caller or recipient_id = caller);
    if not found then return jsonb_build_object('error', 'not_found'); end if;
    perform pg_advisory_xact_lock(hashtextextended(connection.sender_id::text, 0));
    -- Repeating a successful revoke must not touch a newer connection.
    update public.trusted_links set revoked_at = now()
      where id = link_id and revoked_at is null;
    if found then
      update public.contact_invites set revoked_at = now()
        where sender_id = connection.sender_id and used_at is null and revoked_at is null;
    end if;
    return jsonb_build_object('ok', true);
  end if;

  normalized := upper(regexp_replace(coalesce(invite_code, ''), '[[:space:]-]', '', 'g'));
  if normalized !~ '^[0-9A-F]{12}$' then
    return jsonb_build_object('error', 'invalid_code');
  end if;
  select * into invitation from public.contact_invites
    where code_hash = sha256(convert_to(normalized, 'UTF8'));
  if not found then return jsonb_build_object('error', 'invalid_code'); end if;
  perform pg_advisory_xact_lock(hashtextextended(invitation.sender_id::text, 0));
  -- Re-read after locking: a competing create/accept/revoke may have changed it.
  select * into invitation from public.contact_invites where id = invitation.id for update;
  if invitation.used_at is not null or invitation.revoked_at is not null or invitation.expires_at <= now() then
    return jsonb_build_object('error', 'invalid_code');
  end if;
  if invitation.sender_id = caller then return jsonb_build_object('error', 'self_invite'); end if;
  if exists (select 1 from public.trusted_links where sender_id = invitation.sender_id and revoked_at is null) then
    return jsonb_build_object('error', 'already_connected');
  end if;
  if action = 'preview' then
    return jsonb_build_object('sender_email', (select email from auth.users where id = invitation.sender_id));
  end if;

  insert into public.trusted_links(sender_id, recipient_id) values (invitation.sender_id, caller);
  update public.contact_invites set used_at = now() where id = invitation.id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.contact_action(text, text, uuid) from public, anon, authenticated;
grant execute on function public.contact_action(text, text, uuid) to authenticated;
notify pgrst, 'reload schema';
commit;

-- Run AFTER 202610190001_contacts.sql. This does not delete existing data.
begin;
create table if not exists public.test_alerts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  link_id uuid not null references public.trusted_links(id),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  close_reason text check (close_reason in ('sender_finished', 'contact_removed'))
);
create unique index if not exists test_alerts_one_active
  on public.test_alerts(sender_id) where closed_at is null;
create table if not exists public.test_alert_recipients (
  alert_id uuid primary key references public.test_alerts(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  acknowledged_at timestamptz
);
create index if not exists test_alert_recipients_user on public.test_alert_recipients(recipient_id);
-- Durable mapping also covers a second request that found an existing active test.
create table if not exists public.test_alert_attempts (
  sender_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  alert_id uuid not null references public.test_alerts(id) on delete cascade,
  primary key (sender_id, request_id)
);
alter table public.test_alerts enable row level security;
alter table public.test_alert_recipients enable row level security;
alter table public.test_alert_attempts enable row level security;
revoke all on public.test_alerts, public.test_alert_recipients, public.test_alert_attempts
  from public, anon, authenticated;

create or replace view public.test_alert_details with (security_invoker = true) as
select a.*, r.recipient_id, r.acknowledged_at, s.email as sender_email,
  u.email as recipient_email, true as is_test,
  50.4111::numeric as latitude, 80.2275::numeric as longitude
from public.test_alerts a
join public.test_alert_recipients r on r.alert_id = a.id
join auth.users s on s.id = a.sender_id
join auth.users u on u.id = r.recipient_id;
revoke all on public.test_alert_details from public, anon, authenticated;

create or replace function public.close_tests_on_contact_revoke()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.revoked_at is null and new.revoked_at is not null then
    perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text, 0));
    update public.test_alerts set closed_at = now(), close_reason = 'contact_removed'
      where link_id = new.id and closed_at is null;
  end if;
  return new;
end;
$$;
revoke all on function public.close_tests_on_contact_revoke() from public, anon, authenticated;
drop trigger if exists close_tests_on_contact_revoke on public.trusted_links;
create trigger close_tests_on_contact_revoke before update of revoked_at on public.trusted_links
  for each row execute function public.close_tests_on_contact_revoke();

create or replace function public.alert_action(
  action text, alert_id uuid default null, request_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  event public.test_alerts%rowtype;
  connection public.trusted_links%rowtype;
  result jsonb;
begin
  if caller is null then return jsonb_build_object('error', 'auth_required'); end if;
  if action is null or action not in ('list','get','create','resolve','ack','finish') then
    return jsonb_build_object('error', 'invalid_action');
  end if;
  if action = 'list' then
    return jsonb_build_object(
      'outgoing', (select to_jsonb(d) from public.test_alert_details d where d.sender_id = caller and d.closed_at is null),
      'incoming', (select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at desc), '[]'::jsonb)
        from public.test_alert_details d join public.trusted_links l on l.id = d.link_id
        where d.recipient_id = caller and d.closed_at is null and l.revoked_at is null),
      'recipient_email', (select u.email from public.trusted_links l join auth.users u on u.id = l.recipient_id
        where l.sender_id = caller and l.revoked_at is null)
    );
  end if;
  if action in ('create','resolve') then
    if request_id is null then return jsonb_build_object('error', 'request_required'); end if;
    perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
    select a.* into event from public.test_alert_attempts p join public.test_alerts a on a.id = p.alert_id
      where p.sender_id = caller and p.request_id = alert_action.request_id;
    if not found and action = 'create' then
      select * into connection from public.trusted_links where sender_id = caller and revoked_at is null;
      if not found then return jsonb_build_object('error', 'no_contact'); end if;
      select * into event from public.test_alerts where sender_id = caller and closed_at is null;
      if not found then
        insert into public.test_alerts(sender_id,link_id) values(caller,connection.id) returning * into event;
        insert into public.test_alert_recipients(alert_id,recipient_id) values(event.id,connection.recipient_id);
      end if;
      insert into public.test_alert_attempts(sender_id,request_id,alert_id)
        values(caller,alert_action.request_id,event.id);
    end if;
  else
    select a.* into event from public.test_alerts a
      join public.test_alert_recipients r on r.alert_id = a.id
      join public.trusted_links l on l.id = a.link_id
      where a.id = alert_action.alert_id and (a.sender_id = caller or (r.recipient_id = caller and l.revoked_at is null));
    if not found then return jsonb_build_object('error', 'not_found'); end if;
    perform pg_advisory_xact_lock(hashtextextended(event.sender_id::text, 0));
    -- Re-check rights and state after a concurrent finish/revoke.
    select a.* into event from public.test_alerts a
      join public.test_alert_recipients r on r.alert_id = a.id
      join public.trusted_links l on l.id = a.link_id
      where a.id = alert_action.alert_id and (a.sender_id = caller or (r.recipient_id = caller and l.revoked_at is null));
    if not found then return jsonb_build_object('error', 'not_found'); end if;
    if action = 'ack' then
      if event.sender_id = caller then return jsonb_build_object('error','recipient_only'); end if;
      if event.closed_at is not null then return jsonb_build_object('error','closed'); end if;
      update public.test_alert_recipients set acknowledged_at = coalesce(acknowledged_at,now()) where test_alert_recipients.alert_id = event.id;
    elsif action = 'finish' then
      if event.sender_id <> caller then return jsonb_build_object('error','sender_only'); end if;
      update public.test_alerts set closed_at = now(), close_reason = 'sender_finished' where id = event.id and closed_at is null;
    end if;
  end if;
  select to_jsonb(d) into result from public.test_alert_details d where d.id = event.id;
  return jsonb_build_object('alert', result);
end;
$$;
revoke all on function public.alert_action(text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.alert_action(text,uuid,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;

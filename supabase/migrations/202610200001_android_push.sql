begin;
create table if not exists public.push_devices (
  token text primary key check (token ~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' and length(token) <= 256),
  user_id uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
create table if not exists public.push_jobs (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.test_alerts(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  state text not null default 'queued' check (state in ('queued','processing','accepted','complete','failed','skipped')),
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  lease_id uuid,
  lease_until timestamptz,
  ticket_id text,
  error_code text,
  unique(alert_id,token)
);
create index if not exists push_jobs_due on public.push_jobs(next_attempt_at) where state in ('queued','processing','accepted');
alter table public.push_devices enable row level security;
alter table public.push_jobs enable row level security;
revoke all on public.push_devices, public.push_jobs from public, anon, authenticated;
grant select on public.push_devices, public.push_jobs to service_role;

create or replace function public.push_device_action(action text, device_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return jsonb_build_object('error','auth_required'); end if;
  if device_token is null or length(device_token)>256 or device_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' then
    return jsonb_build_object('error','invalid_token');
  end if;
  if action='register' then
    insert into public.push_devices(token,user_id) values(device_token,auth.uid())
      on conflict(token) do update set user_id=excluded.user_id,updated_at=now();
  elsif action='remove' then
    delete from public.push_devices where token=device_token and user_id=auth.uid();
  else return jsonb_build_object('error','invalid_action');
  end if;
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.push_device_action(text,text) from public,anon,authenticated;
grant execute on function public.push_device_action(text,text) to authenticated;

create or replace function public.queue_sos_push()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.push_jobs(alert_id,recipient_id,token)
    select new.alert_id,new.recipient_id,d.token from public.push_devices d where d.user_id=new.recipient_id
    on conflict(alert_id,token) do nothing;
  return new;
end;
$$;
revoke all on function public.queue_sos_push() from public,anon,authenticated;
drop trigger if exists queue_sos_push on public.test_alert_recipients;
create trigger queue_sos_push after insert on public.test_alert_recipients for each row execute function public.queue_sos_push();

create or replace function public.claim_push_jobs()
returns setof public.push_jobs language plpgsql security definer set search_path = '' as $$
begin
  update public.push_jobs j set state='skipped',lease_id=null,lease_until=null
    where j.state in ('queued','accepted','processing') and (
      j.created_at < now()-interval '24 hours' or not exists (
        select 1 from public.test_alerts a join public.trusted_links l on l.id=a.link_id
        join public.push_devices d on d.token=j.token and d.user_id=j.recipient_id
        where a.id=j.alert_id and a.closed_at is null and l.revoked_at is null
      ));
  update public.push_jobs set state='failed',error_code='AttemptsExhausted',lease_id=null,lease_until=null
    where state='processing' and lease_until<now() and ticket_id is null and attempts>=3;
  return query
    with due as (
      select id from public.push_jobs where
        (state in ('queued','accepted') and next_attempt_at<=now()) or (state='processing' and lease_until<now())
        order by next_attempt_at for update skip locked limit 25
    )
    update public.push_jobs j set state='processing',lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',
      attempts=j.attempts+case when j.ticket_id is null then 1 else 0 end
      from due where j.id=due.id returning j.*;
end;
$$;
create or replace function public.finish_push_job(job_id uuid, job_lease uuid, outcome text, receipt_ticket text default null, failure_code text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare job public.push_jobs%rowtype;
begin
  select * into job from public.push_jobs where id=job_id and lease_id=job_lease and state='processing' for update;
  if not found then return; end if;
  if outcome not in ('accepted','complete','retry','failed','invalid') then raise exception 'invalid outcome'; end if;
  if outcome='invalid' then
    delete from public.push_devices where token=job.token and user_id=job.recipient_id;
  end if;
  update public.push_jobs set
    state=case when outcome='accepted' then 'accepted' when outcome='complete' then 'complete'
      when outcome='retry' and (job.ticket_id is not null or job.attempts<3) then case when job.ticket_id is null then 'queued' else 'accepted' end
      else 'failed' end,
    ticket_id=coalesce(receipt_ticket,job.ticket_id),error_code=left(failure_code,100),lease_id=null,lease_until=null,
    next_attempt_at=now()+case when outcome='accepted' or job.ticket_id is not null then interval '15 minutes'
      else interval '1 minute'*power(2,greatest(job.attempts-1,0)) end
    where id=job.id;
end;
$$;
revoke all on function public.claim_push_jobs(), public.finish_push_job(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_push_jobs(), public.finish_push_job(uuid,uuid,text,text,text) to service_role;

create or replace view public.test_alert_details with (security_invoker = true) as
select a.*, r.recipient_id, r.acknowledged_at, s.email as sender_email,
  u.email as recipient_email, true as is_test,
  50.4111::numeric as latitude, 80.2275::numeric as longitude,
  case
    when not exists(select 1 from public.push_jobs j where j.alert_id=a.id) then 'no_device'
    when exists(select 1 from public.push_jobs j where j.alert_id=a.id and j.state in ('accepted','complete')) then 'accepted'
    when exists(select 1 from public.push_jobs j where j.alert_id=a.id and j.state in ('queued','processing')) then 'queued'
    else 'failed'
  end as push_state
from public.test_alerts a
join public.test_alert_recipients r on r.alert_id=a.id
join auth.users s on s.id=a.sender_id
join auth.users u on u.id=r.recipient_id;
revoke all on public.test_alert_details from public,anon,authenticated;
notify pgrst,'reload schema';
commit;

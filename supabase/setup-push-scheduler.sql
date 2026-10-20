-- Execute after the push migration and after storing the worker URL/secret in Vault.
begin;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists supabase_vault with schema vault;

create or replace function public.wake_sos_push()
returns void language plpgsql security definer set search_path = '' as $$
declare worker_url text; worker_secret text;
begin
  if not exists (select 1 from public.push_jobs where
    (state in ('queued','accepted') and next_attempt_at<=now()) or (state='processing' and lease_until<now())) then return; end if;
  select decrypted_secret into worker_url from vault.decrypted_secrets where name='tumar_push_worker_url';
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name='tumar_push_worker_secret';
  if worker_url is null or worker_secret is null then return; end if;
  perform net.http_post(url:=worker_url, headers:=jsonb_build_object('Content-Type','application/json','x-push-secret',worker_secret),body:='{}'::jsonb,timeout_milliseconds:=20000);
exception when others then
  -- Queue survives a temporary wake-up failure; cron will try again.
  raise warning 'Push wake-up failed; job remains queued';
end;
$$;
revoke all on function public.wake_sos_push() from public,anon,authenticated;
create or replace function public.trigger_sos_push_worker()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from inserted_jobs) then perform public.wake_sos_push(); end if;
  return null;
end;
$$;
revoke all on function public.trigger_sos_push_worker() from public,anon,authenticated;
drop trigger if exists wake_sos_push on public.push_jobs;
create trigger wake_sos_push after insert on public.push_jobs referencing new table as inserted_jobs
  for each statement execute function public.trigger_sos_push_worker();
select cron.schedule('tumar-push-worker','* * * * *','select public.wake_sos_push()');
commit;

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('push: ownership, atomic deduplication, retry leases and contact revocation', async () => {
  const db = new PGlite();
  const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
  const token = 'ExponentPushToken[device-one]';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to authenticated,anon,service_role;
      insert into auth.users values ('${id(1)}','a@test.kz'),('${id(2)}','b@test.kz'),('${id(3)}','c@test.kz');`);
    for (const file of ['202610190001_contacts.sql','202610190002_test_sos.sql','202610200001_android_push.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    }
    // Verify the real transition-table trigger without making external HTTP calls.
    await db.exec(`create table public.worker_wakes(id int);
      create function public.wake_sos_push() returns void language sql as $$insert into public.worker_wakes values(1)$$;`);
    const scheduler = await readFile(new URL('../supabase/setup-push-scheduler.sql', import.meta.url), 'utf8');
    await db.exec(scheduler.slice(scheduler.indexOf('create or replace function public.trigger_sos_push_worker()'), scheduler.indexOf('select cron.schedule')));
    async function user(n, sql, args = []) {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [n ? id(n) : '']);
      await db.exec('set role authenticated');
      try { return (await db.query(sql, args)).rows; } finally { await db.exec('reset role'); }
    }
    async function claim() {
      await db.exec('set role service_role');
      try { return (await db.query('select * from public.claim_push_jobs()')).rows; } finally { await db.exec('reset role'); }
    }
    assert.equal((await user(null, "select public.push_device_action('register',$1) as r",[token]))[0].r.error, 'auth_required');
    assert.equal((await user(2, "select public.push_device_action('register','bad') as r"))[0].r.error, 'invalid_token');
    await user(2,"select public.push_device_action('register',$1)",[token]);
    await assert.rejects(user(1,'select * from public.push_devices'), /permission denied/i);
    await assert.rejects(user(1,'select * from public.claim_push_jobs()'), /permission denied/i);
    await db.query('insert into public.trusted_links(sender_id,recipient_id) values($1,$2)',[id(1),id(2)]);
    const event = (await user(1,"select public.alert_action('create',null,$1) as r",[id(100)]))[0].r.alert;
    await user(1,"select public.alert_action('create',null,$1)",[id(100)]);
    assert.equal((await db.query('select count(*)::int as n from public.push_jobs')).rows[0].n,1);
    assert.equal((await db.query('select count(*)::int as n from public.worker_wakes')).rows[0].n,1);
    const [job] = await claim();
    assert.equal(job.alert_id,event.id); assert.equal(job.recipient_id,id(2)); assert.equal(job.attempts,1);
    assert.equal((await claim()).length,0,'a claimed job cannot be claimed twice');
    await db.query("select public.finish_push_job($1,$2,'retry',null,'NetworkError')",[job.id,job.lease_id]);
    assert.equal((await claim()).length,0,'retry waits for backoff');
    await db.query("update public.push_jobs set next_attempt_at=now()-interval '1 minute'");
    const [retry] = await claim(); assert.equal(retry.attempts,2);
    await db.query("select public.finish_push_job($1,$2,'accepted','ticket-1',null)",[retry.id,retry.lease_id]);
    await db.query("select public.finish_push_job($1,$2,'failed',null,'stale')",[job.id,job.lease_id]);
    assert.equal((await db.query('select state from public.push_jobs')).rows[0].state,'accepted','old lease cannot overwrite newer result');
    await db.query("update public.push_jobs set next_attempt_at=now()-interval '1 minute'");
    const [receipt] = await claim(); assert.equal(receipt.ticket_id,'ticket-1'); assert.equal(receipt.attempts,2);
    await db.query("select public.finish_push_job($1,$2,'invalid',null,'DeviceNotRegistered')",[receipt.id,receipt.lease_id]);
    assert.equal((await db.query('select count(*)::int n from public.push_devices')).rows[0].n,0);

    await user(2,"select public.push_device_action('register',$1)",[token]);
    await user(3,"select public.push_device_action('register',$1)",[token]);
    await user(2,"select public.push_device_action('remove',$1)",[token]);
    assert.equal((await db.query('select user_id from public.push_devices')).rows[0].user_id,id(3),'old account cannot remove transferred device');
    await user(1,"select public.alert_action('finish',$1)",[event.id]);
    await user(2,"select public.push_device_action('register',$1)",[token]);
    await user(1,"select public.alert_action('create',null,$1)",[id(101)]);
    await db.query('update public.trusted_links set revoked_at=now() where sender_id=$1',[id(1)]);
    assert.equal((await claim()).length,0,'revoked contacts do not receive queued pushes');
    assert.equal((await db.query("select count(*)::int n from public.push_jobs where state='skipped'")).rows[0].n,1);
    await db.exec('set role anon');
    await assert.rejects(db.query("select public.push_device_action('register',$1)",[token]),/permission denied/i);
  } finally { await db.close(); }
});

test('Expo tickets and receipts: acceptance, permanent and transient failures', async () => {
  const { parseExpoResult } = await import('../supabase/functions/send-sos-push/expo-result.ts');
  assert.deepEqual(parseExpoResult(200,{data:{status:'ok',id:'ticket'}}),{outcome:'accepted',ticketId:'ticket'});
  assert.equal(parseExpoResult(200,{data:{status:'ok'}}).outcome,'retry');
  assert.equal(parseExpoResult(200,{data:{status:'error',details:{error:'DeviceNotRegistered'}}}).outcome,'invalid');
  assert.equal(parseExpoResult(200,{data:{status:'error',details:{error:'InvalidCredentials'}}}).outcome,'failed');
  assert.equal(parseExpoResult(429,{}).outcome,'retry');
  assert.equal(parseExpoResult(503,{}).outcome,'retry');
  assert.equal(parseExpoResult(401,{}).outcome,'failed');
  assert.equal(parseExpoResult(200,{data:{}} ,'receipt').outcome,'retry');
  assert.deepEqual(parseExpoResult(200,{data:{receipt:{status:'ok'}}},'receipt'),{outcome:'complete'});
});

test('notification tap opens only a valid event for the signed-in recipient', async () => {
  const { notificationAlert } = await import('../src/features/push/notification-alert.ts');
  const id = '00000000-0000-0000-0000-000000000001';
  assert.equal(notificationAlert({alertId:id,recipientId:'owner'},'owner'),id);
  assert.equal(notificationAlert({alertId:id,recipientId:'other'},'owner'),null);
  assert.equal(notificationAlert({alertId:'https://other.test',recipientId:'owner'},'owner'),null);
  assert.equal(notificationAlert(null,'owner'),null);
});

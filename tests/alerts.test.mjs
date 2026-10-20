import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('SOS: atomic creation, deduplication, authority, persistence and contact revocation', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to authenticated,anon;
      grant execute on function auth.uid() to authenticated,anon;
      insert into auth.users values
        ('00000000-0000-0000-0000-000000000001','a@example.com'),
        ('00000000-0000-0000-0000-000000000002','b@example.com'),
        ('00000000-0000-0000-0000-000000000003','c@example.com');
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/202610190001_contacts.sql', import.meta.url), 'utf8'));
    const migration = await readFile(new URL('../supabase/migrations/202610190002_test_sos.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
    async function call(user, action, alert = null, attempt = null) {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ? id(user) : '']);
      await db.exec('set role authenticated');
      try { return (await db.query('select public.alert_action($1,$2,$3) as result', [action, alert, attempt])).rows[0].result; }
      finally { await db.exec('reset role'); }
    }
    const attempt = id(100);
    assert.equal((await call(null, 'list')).error, 'auth_required');
    assert.equal((await call(1, 'create', null, attempt)).error, 'no_contact');
    const link = (await db.query('insert into public.trusted_links(sender_id,recipient_id) values ($1,$2) returning id', [id(1), id(2)])).rows[0].id;
    assert.equal((await call(1, 'create')).error, 'request_required');
    const event = (await call(1, 'create', null, attempt)).alert;
    assert.equal(event.is_test, true);
    assert.equal(event.recipient_id, id(2));
    assert.equal((await call(1, 'create', null, attempt)).alert.id, event.id);
    assert.equal((await call(1, 'create', null, id(101))).alert.id, event.id);
    assert.equal((await call(1, 'resolve', null, attempt)).alert.id, event.id);
    assert.equal((await call(1, 'resolve', null, id(102))).alert, null);
    assert.equal((await call(3, 'get', event.id)).error, 'not_found');
    assert.equal((await call(3, 'ack', event.id)).error, 'not_found');
    assert.equal((await call(1, 'ack', event.id)).error, 'recipient_only');
    assert.equal((await call(2, 'finish', event.id)).error, 'sender_only');
    const acknowledged = (await call(2, 'ack', event.id)).alert;
    assert.ok(acknowledged.acknowledged_at);
    assert.equal((await call(2, 'ack', event.id)).alert.acknowledged_at, acknowledged.acknowledged_at);
    assert.equal((await call(1, 'list')).outgoing.id, event.id, 'ack does not close the test');
    assert.equal((await call(2, 'list')).incoming[0].id, event.id);
    assert.deepEqual((await call(3, 'list')).incoming, []);
    await db.exec(migration);
    assert.equal((await call(1, 'get', event.id)).alert.id, event.id, 'migration preserves events');
    assert.ok((await call(1, 'finish', event.id)).alert.closed_at);
    assert.equal((await call(1, 'create', null, attempt)).alert.id, event.id, 'old attempts never create a new test');
    assert.equal((await call(1, 'create', null, id(101))).alert.id, event.id, 'an alias attempt also stays bound after closure');
    assert.equal((await call(2, 'ack', event.id)).error, 'closed');
    assert.equal((await call(1, 'list')).outgoing, null);
    const next = (await call(1, 'create', null, id(103))).alert;
    await assert.rejects(db.query('insert into public.test_alerts(sender_id,link_id) values ($1,$2)', [id(1), link]), /unique/i);

    // Exercise the existing contact RPC, not an artificial app-side close.
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id(2)]);
    await db.exec('set role authenticated');
    await db.query("select public.contact_action('revoke',null,$1)", [link]);
    await db.exec('reset role');
    assert.equal((await call(1, 'get', next.id)).alert.close_reason, 'contact_removed');
    assert.equal((await call(2, 'get', next.id)).error, 'not_found');
    assert.equal((await call(2, 'ack', next.id)).error, 'not_found');
    assert.equal((await call(1, 'create', null, id(105))).error, 'no_contact');
    await db.query('insert into public.trusted_links(sender_id,recipient_id) values ($1,$2)', [id(1), id(3)]);
    assert.equal((await call(3, 'get', next.id)).error, 'not_found', 'new contact cannot read old events');
    assert.equal((await call(1, 'create', null, id(106))).alert.recipient_id, id(3));

    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from public.test_alerts'), /permission denied/i);
    await assert.rejects(db.query('update public.test_alert_recipients set acknowledged_at=now()'), /permission denied/i);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query("select public.alert_action('list')"), /permission denied/i);
  } finally { await db.close(); }
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('contact SQL: consent, direction, privacy, expiry, revocation and rate limits', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key, email text);
      create function auth.uid() returns uuid language sql as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      insert into auth.users values
        ('00000000-0000-0000-0000-000000000001','a@example.com'),
        ('00000000-0000-0000-0000-000000000002','b@example.com'),
        ('00000000-0000-0000-0000-000000000003','c@example.com');
    `);
    const migration = await readFile(new URL('../supabase/migrations/202610190001_contacts.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    // Applying the setup twice must not delete invitations or connections.
    await db.exec(migration);
    const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
    async function asUser(n, action, code = null, link = null) {
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [n ? id(n) : '']);
      await db.exec('set role authenticated');
      try {
        const { rows } = await db.query('select public.contact_action($1,$2,$3) as result', [action, code, link]);
        return rows[0].result;
      } finally { await db.exec('reset role'); }
    }

    assert.equal((await asUser(null, 'list')).error, 'auth_required');
    const invitation = await asUser(1, 'create');
    assert.match(invitation.code, /^[0-9A-F]{12}$/);
    const { rows: stored } = await db.query('select * from public.contact_invites');
    assert.equal('code' in stored[0], false);
    assert.equal((await asUser(1, 'preview', invitation.code)).error, 'self_invite');
    const formattedCode = invitation.code.match(/.{1,4}/g).join('-').toLowerCase();
    assert.equal((await asUser(2, 'preview', ` ${formattedCode} `)).sender_email, 'a@example.com');
    assert.equal((await asUser(2, 'list')).links.length, 0, 'preview is not consent');
    assert.equal((await asUser(2, 'accept', invitation.code)).ok, true);
    await db.exec(migration);
    const aLinks = (await asUser(1, 'list')).links;
    assert.equal(aLinks.length, 1);
    assert.equal(aLinks[0].sender_id, id(1));
    assert.equal(aLinks[0].recipient_id, id(2));
    assert.equal((await asUser(2, 'list')).links[0].recipient_id, id(2));
    assert.deepEqual((await asUser(3, 'list')).links, []);
    assert.equal((await asUser(3, 'accept', invitation.code)).error, 'invalid_code');
    assert.equal((await asUser(1, 'create')).error, 'already_connected');
    assert.equal((await asUser(3, 'revoke', null, aLinks[0].id)).error, 'not_found');
    const bInvitation = await asUser(2, 'create');
    assert.equal((await asUser(3, 'accept', bInvitation.code)).ok, true);
    assert.equal((await asUser(2, 'list')).links.length, 2, 'receiving does not prevent having your own recipient');
    assert.equal((await asUser(3, 'list')).links.length, 1, 'third user only sees their own connection');

    // The database constraint backs the application check, including concurrent writers.
    await assert.rejects(db.query('insert into public.trusted_links(sender_id,recipient_id) values ($1,$2)', [id(1), id(3)]), /unique/i);
    assert.equal((await asUser(2, 'revoke', null, aLinks[0].id)).ok, true);
    assert.deepEqual((await asUser(1, 'list')).links, []);
    assert.equal((await asUser(2, 'list')).links.length, 1, 'revocation does not affect an unrelated connection');

    const oldCode = await asUser(1, 'create');
    const newCode = await asUser(1, 'create');
    assert.equal((await asUser(3, 'preview', oldCode.code)).error, 'invalid_code');
    const { rows: lifetime } = await db.query("select extract(epoch from (expires_at-created_at))::integer as seconds from public.contact_invites limit 1");
    assert.equal(lifetime[0].seconds, 24 * 60 * 60);
    await db.exec("update public.contact_invites set expires_at = now() - interval '1 second' where used_at is null");
    assert.equal((await asUser(3, 'preview', newCode.code)).error, 'invalid_code');
    assert.equal((await asUser(3, 'preview', 'BAD')).error, 'invalid_code');

    for (let i = 0; i < 12; i++) await asUser(3, 'preview', '000000000000');
    assert.equal((await asUser(3, 'preview', '000000000000')).error, 'rate_limited');
    await db.query("update public.contact_rate_limits set window_start = now() - interval '16 minutes' where user_id = $1", [id(3)]);
    assert.equal((await asUser(3, 'preview', '000000000000')).error, 'invalid_code');
    const lastInvitation = await asUser(1, 'create');
    assert.ok(lastInvitation.code);
    assert.equal((await asUser(1, 'create')).error, 'rate_limited');
    assert.equal((await asUser(3, 'accept', lastInvitation.code)).ok, true, 'rate limiting did not revoke the last issued code');

    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from public.contact_invites'), /permission denied/i);
    await assert.rejects(db.query('insert into public.trusted_links(sender_id,recipient_id) values ($1,$2)', [id(1), id(3)]), /permission denied/i);
    await assert.rejects(db.query('delete from public.contact_rate_limits'), /permission denied/i);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query("select public.contact_action('list')"), /permission denied/i);
  } finally { await db.close(); }
});

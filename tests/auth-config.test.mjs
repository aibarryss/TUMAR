import assert from 'node:assert/strict';
import test from 'node:test';
import { readAuthConfig } from '../src/services/auth-config.ts';

test('empty settings keep auth disabled without throwing', () => {
  assert.equal(readAuthConfig('', '').config, null);
});

test('accepts a public key and an HTTPS project URL', () => {
  assert.deepEqual(readAuthConfig(' https://test.supabase.co ', ' sb_publishable_test ').config, {
    url: 'https://test.supabase.co', key: 'sb_publishable_test',
  });
});

test('rejects secret keys and insecure or invalid URLs without exposing values', () => {
  for (const [url, key] of [
    ['https://test.supabase.co', 'sb_secret_do_not_expose'],
    ['https://test.supabase.co', 'service_role'],
    ['http://test.supabase.co', 'sb_publishable_test'],
    ['not-a-url', 'sb_publishable_test'],
  ]) {
    const result = readAuthConfig(url, key);
    assert.equal(result.config, null);
    assert.ok(result.error);
    assert.ok(!result.error.includes(key));
  }
});

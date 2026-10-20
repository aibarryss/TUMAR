export function readAuthConfig(rawUrl?: string, rawKey?: string) {
  const url = rawUrl?.trim() ?? '';
  const key = rawKey?.trim() ?? '';
  let validUrl = false;
  try {
    const parsed = new URL(url);
    validUrl = parsed.protocol === 'https:' && !parsed.username && !parsed.password;
  } catch {
    // Empty or malformed settings must not crash the app on startup.
  }
  if (!validUrl || !key.startsWith('sb_publishable_')) {
    return {
      config: null,
      error: 'Заполните URL проекта и Publishable key в .env, затем перезапустите Expo.',
    };
  }
  return { config: { url, key }, error: null };
}

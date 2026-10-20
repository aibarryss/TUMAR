import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { authConfigError, supabase } from '../../services/supabase';
import { resumePushSession, unregisterPushDevice } from '../push/push';

function errorMessage(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const messages: Record<string, string> = {
    invalid_credentials: 'Неверная почта или пароль.',
    user_already_exists: 'Аккаунт уже существует. Попробуйте войти.',
    email_not_confirmed: 'Подтвердите почту по ссылке из письма, затем войдите снова.',
    weak_password: 'Пароль слишком простой. Используйте более сложный пароль.',
    email_address_invalid: 'Проверьте адрес электронной почты.',
    over_request_rate_limit: 'Слишком много попыток. Попробуйте позже.',
    over_email_send_rate_limit: 'Лимит писем исчерпан. Попробуйте позже.',
    signup_disabled: 'Регистрация сейчас недоступна. Попробуйте позже.',
  };
  if (code && messages[code]) return messages[code];
  if (error instanceof Error && /network|fetch|timeout/i.test(error.message)) {
    return 'Не удалось подключиться. Проверьте интернет и попробуйте ещё раз.';
  }
  return 'Не удалось выполнить действие. Попробуйте ещё раз позже.';
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(Boolean(supabase));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(authConfigError);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    let authEventReceived = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      if (active) { setSession(nextSession); setRestoring(false); }
    });
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (!authEventReceived) setSession(data.session);
      if (sessionError) setError(errorMessage(sessionError));
    }).catch((cause: unknown) => {
      if (active) setError(errorMessage(cause));
    }).finally(() => { if (active) setRestoring(false); });

    if (AppState.currentState === 'active') client.auth.startAutoRefresh();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      appState.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);

  function clearMessage() { setError(authConfigError); setNotice(null); }

  async function authenticate(mode: 'login' | 'register', email: string, password: string) {
    if (!supabase || inFlight.current) return false;
    clearMessage();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Введите корректную электронную почту.'); return false;
    }
    if (!password || (mode === 'register' && password.length < 8)) {
      setError(mode === 'register' ? 'Пароль должен содержать минимум 8 символов.' : 'Введите пароль.');
      return false;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const credentials = { email: email.trim(), password };
      const { data, error: authError } = mode === 'register'
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);
      if (authError) throw authError;
      if (mode === 'register' && !data.session) {
        setNotice('Проверьте почту: подтвердите адрес по ссылке из письма, затем войдите.');
      }
      return true;
    } catch (cause) {
      setError(errorMessage(cause)); return false;
    } finally { inFlight.current = false; setBusy(false); }
  }

  async function signOut() {
    if (!supabase || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    clearMessage();
    try {
      await unregisterPushDevice();
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
    } catch (cause) { resumePushSession(); setError(errorMessage(cause)); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return { session, restoring, busy, error, notice, authenticate, signOut, clearMessage, configured: Boolean(supabase) };
}

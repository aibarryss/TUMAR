import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { alertRequest, AlertRequestError, type AlertSnapshot, type TestAlert } from './alerts';

export function useAlerts(userId: string) {
  const [snapshot, setSnapshot] = useState<AlertSnapshot | null>(null);
  const [detail, setDetail] = useState<TestAlert | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const active = useRef(true);
  const inFlight = useRef(false);
  const selection = useRef<string | null>(null);
  const navigation = useRef(0);
  const queuedOpen = useRef<string | null>(null);
  const key = `tumar.pending-sos.${userId}`;

  async function run(operation: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    const version = navigation.current;
    setBusy(true); setError(''); setNotice('');
    try { await operation(); }
    catch (cause) {
      if (active.current && version === navigation.current) setError(cause instanceof Error ? cause.message : 'Не удалось выполнить действие.');
    } finally {
      inFlight.current = false;
      if (active.current) {
        setBusy(false);
        const id = queuedOpen.current;
        queuedOpen.current = null;
        if (id) void open(id);
      }
    }
  }

  function show(event: TestAlert, version: number) {
    if (!active.current || version !== navigation.current) return;
    selection.current = event.id; setSelectedId(event.id); setDetail(event);
  }

  async function load() {
    const version = navigation.current;
    const id = selection.current;
    // Hide old details before revalidating access, especially after revocation.
    if (active.current && selection.current) setDetail(null);
    const attempt = await AsyncStorage.getItem(key);
    if (active.current) setPending(Boolean(attempt));
    const data = await alertRequest('list');
    if (active.current) setSnapshot(data);
    if (attempt) {
      const resolved = await alertRequest('resolve', null, attempt);
      if (resolved.alert) {
        await AsyncStorage.removeItem(key);
        if (active.current) setPending(false);
        if (active.current && version === navigation.current) setNotice('Результат отправки проверен.');
      } else if (active.current && version === navigation.current) {
        setNotice('Пока не удалось узнать результат отправки. Проверьте ещё раз или повторите отправку.');
      }
    }
    if (id && version === navigation.current) {
      const current = await alertRequest('get', id);
      if (current.alert) show(current.alert, version);
    }
  }

  function refresh() { return run(load); }
  function open(id: string) {
    if (inFlight.current) { queuedOpen.current = id; return; }
    const version = ++navigation.current;
    selection.current = id; setSelectedId(id); setDetail(null);
    return run(async () => {
      const result = await alertRequest('get', id);
      if (result.alert) show(result.alert, version);
    });
  }
  function back() { navigation.current++; queuedOpen.current = null; selection.current = null; setSelectedId(null); setDetail(null); setError(''); setNotice(''); }

  function send() {
    const version = navigation.current;
    return run(async () => {
      const attempt = await AsyncStorage.getItem(key) ?? randomUUID();
      // Persist BEFORE contacting the server. An uncertain request is never silently recreated.
      await AsyncStorage.setItem(key, attempt);
      if (active.current) setPending(true);
      if (active.current && version === navigation.current) setNotice('Отправляем тестовый SOS…');
      let result;
      try { result = await alertRequest('create', null, attempt); }
      catch (cause) {
        if (cause instanceof AlertRequestError && cause.definitive) {
          await AsyncStorage.removeItem(key);
          if (active.current) { setPending(false); setNotice(''); }
        } else if (active.current && version === navigation.current) setNotice('Проверяем отправку. Повтор не создаст второй сигнал.');
        throw cause;
      }
      if (!result.alert) throw new Error('Пока не удалось проверить отправку. Нажмите «Проверить сигналы».');
      await AsyncStorage.removeItem(key);
      if (active.current) setPending(false);
      if (active.current && version === navigation.current) setNotice('Тестовый сигнал отправлен.');
      show(result.alert, version);
      const data = await alertRequest('list');
      if (active.current) setSnapshot(data);
    });
  }

  function act(action: 'ack' | 'finish') {
    const version = navigation.current;
    return run(async () => {
      if (!selection.current) return;
      const id = selection.current;
      if (active.current) setDetail(null);
      const result = await alertRequest(action, id);
      if (result.alert) show(result.alert, version);
      const data = await alertRequest('list');
      if (active.current) setSnapshot(data);
    });
  }

  useEffect(() => {
    active.current = true;
    void refresh();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { active.current = false; listener.remove(); };
  }, []);

  return { snapshot, detail, selectedId, pending, busy, error, notice, refresh, open, back, send, act };
}

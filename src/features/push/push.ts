import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { isDevice } from 'expo-device';
import { DeviceEventEmitter, Platform } from 'react-native';
import { supabase } from '../../services/supabase';

export type PushState = 'loading' | 'ready' | 'denied' | 'unavailable' | 'error';
export const pushAvailable = Platform.OS === 'android' && isDevice && Constants.executionEnvironment !== 'storeClient';
export const notifications = () => import('expo-notifications');
const tokenKey = 'tumar.push-token';
let stopped = true;
let registration: Promise<PushState> | null = null;
let registrationUser: string | null = null;
let registrationActive: (() => boolean) | null = null;

async function deviceAction(action: 'register' | 'remove', token: string) {
  if (!supabase) throw new Error('Supabase unavailable');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const { data, error } = await supabase.rpc('push_device_action', { action, device_token: token }).abortSignal(controller.signal);
    if (error || !data?.ok) throw new Error('Device registration unavailable');
  } finally { clearTimeout(timer); }
}

export function startPushSession() { stopped = false; }
export function resumePushSession() { startPushSession(); DeviceEventEmitter.emit('tumar.push.retry'); }
export function registerPushDevice(userId: string, isActive: () => boolean): Promise<PushState> {
  if (!pushAvailable) return Promise.resolve('unavailable');
  if (registration) {
    if (registrationUser === userId && registrationActive?.()) return registration;
    return registration.catch(() => {}).then(() => isActive() && !stopped ? registerPushDevice(userId, isActive) : 'loading');
  }
  registrationUser = userId;
  registrationActive = isActive;
  registration = (async (): Promise<PushState> => {
    const api = await notifications();
    await api.setNotificationChannelAsync('sos', {
      name: 'Тестовые SOS', importance: api.AndroidImportance.HIGH,
      sound: 'default', vibrationPattern: [0, 300, 200, 300], lightColor: '#E9C176',
    });
    let permission = await api.getPermissionsAsync();
    if (permission.status === 'undetermined') permission = await api.requestPermissionsAsync();
    if (!permission.granted) {
      const old = await AsyncStorage.getItem(tokenKey);
      if (old && isActive() && !stopped) await deviceAction('remove', old);
      return 'denied';
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return 'error';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const token = await Promise.race([
      api.getExpoPushTokenAsync({ projectId }).then(result => result.data),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Push token timeout')), 15000); }),
    ]).finally(() => clearTimeout(timer));
    if (!isActive() || stopped) return 'loading';
    const previous = await AsyncStorage.getItem(tokenKey);
    if (previous && previous !== token) await deviceAction('remove', previous);
    await AsyncStorage.setItem(tokenKey, token);
    if (!isActive() || stopped) return 'loading';
    await deviceAction('register', token);
    return 'ready';
  })().finally(() => { registration = null; registrationUser = null; registrationActive = null; });
  return registration;
}

export async function unregisterPushDevice() {
  stopped = true;
  if (!pushAvailable) return;
  await registration?.catch(() => {});
  const token = await AsyncStorage.getItem(tokenKey);
  if (token) { await deviceAction('remove', token); await AsyncStorage.removeItem(tokenKey); }
  const api = await notifications();
  await api.dismissAllNotificationsAsync().catch(() => {});
  await api.clearLastNotificationResponseAsync().catch(() => {});
}

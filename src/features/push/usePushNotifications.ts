import { useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { notificationAlert } from './notification-alert';
import { notifications, pushAvailable, registerPushDevice, startPushSession, type PushState } from './push';

export function usePushNotifications(userId: string, onOpen: (id: string) => void, onRefresh: () => void) {
  const [state, setState] = useState<PushState>(pushAvailable ? 'loading' : 'unavailable');
  const callbacks = useRef({ onOpen, onRefresh });
  callbacks.current = { onOpen, onRefresh };
  useEffect(() => {
    if (!pushAvailable) return;
    let active = true;
    const cleanup: (() => void)[] = [];
    startPushSession();
    function register() {
      setState('loading');
      void registerPushDevice(userId, () => active).then(value => { if (active) setState(value); })
        .catch(() => { if (active) setState('error'); });
    }
    register();
    void notifications().then(async api => {
      if (!active) return;
      api.setNotificationHandler({ handleNotification: async notification => {
        const own = Boolean(notificationAlert(notification.request.content.data, userId));
        return { shouldShowBanner: own, shouldShowList: own, shouldPlaySound: own, shouldSetBadge: false };
      } });
      function respond(response: import('expo-notifications').NotificationResponse) {
        if (!active || response.actionIdentifier !== api.DEFAULT_ACTION_IDENTIFIER) return;
        const id = notificationAlert(response.notification.request.content.data, userId);
        if (id) callbacks.current.onOpen(id);
        void api.clearLastNotificationResponseAsync().catch(() => {});
      }
      const response = api.addNotificationResponseReceivedListener(respond);
      const received = api.addNotificationReceivedListener(notification => {
        if (notificationAlert(notification.request.content.data, userId)) callbacks.current.onRefresh();
      });
      const token = api.addPushTokenListener(register);
      cleanup.push(() => { response.remove(); received.remove(); token.remove(); api.setNotificationHandler(null); });
      const last = await api.getLastNotificationResponseAsync();
      if (last) respond(last);
    }).catch(() => { if (active) setState('error'); });
    const listener = AppState.addEventListener('change', value => { if (value === 'active') register(); });
    const retry = DeviceEventEmitter.addListener('tumar.push.retry', register);
    return () => { active = false; listener.remove(); retry.remove(); cleanup.forEach(stop => stop()); };
  }, [userId]);
  return state;
}

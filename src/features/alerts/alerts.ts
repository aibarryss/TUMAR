import { supabase } from '../../services/supabase';

export type TestAlert = {
  id: string; sender_id: string; recipient_id: string;
  sender_email: string; recipient_email: string;
  created_at: string; acknowledged_at: string | null; closed_at: string | null;
  close_reason: 'sender_finished' | 'contact_removed' | null;
  is_test: true; latitude: number; longitude: number;
  push_state?: 'no_device' | 'queued' | 'accepted' | 'failed';
};
export type AlertSnapshot = { outgoing: TestAlert | null; incoming: TestAlert[]; recipient_email: string | null };

export class AlertRequestError extends Error {
  constructor(message: string, public definitive = false) { super(message); }
}

export async function alertRequest(action: 'list' | 'get' | 'create' | 'resolve' | 'ack' | 'finish', alertId: string | null = null, requestId: string | null = null) {
  if (!supabase) throw new AlertRequestError('Заполните настройки Supabase.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await supabase.rpc('alert_action', { action, alert_id: alertId, request_id: requestId }).abortSignal(controller.signal);
  } finally { clearTimeout(timeout); }
  const { data, error } = response;
  if (error) throw new AlertRequestError(error.code === 'PGRST202'
    ? 'Сигналы пока недоступны. Попробуйте позже.'
    : 'Не удалось подключиться. Проверьте интернет и попробуйте ещё раз.');
  if (data?.error) {
    const messages: Record<string, string> = {
      auth_required: 'Войдите заново.', no_contact: 'Сначала добавьте доверенный контакт.',
      not_found: 'Тревога недоступна. Возможно, связь удалена. Вернитесь на главную.',
      recipient_only: 'Подтвердить просмотр может только получатель.',
      sender_only: 'Завершить тест может только отправитель.', closed: 'Тест уже завершён. Проверьте состояние.',
    };
    throw new AlertRequestError(messages[data.error] ?? 'Не удалось выполнить действие. Проверьте данные.', true);
  }
  if (!data || typeof data !== 'object') throw new AlertRequestError('Не удалось проверить ответ сервера. Обновите экран.');
  return data as AlertSnapshot & { alert: TestAlert | null };
}

export function alertStatus(alert: TestAlert) {
  if (alert.close_reason === 'contact_removed') return 'Тест завершён: связь удалена';
  if (alert.closed_at) return 'Тест завершён';
  return alert.acknowledged_at ? 'Получение подтверждено' : 'Ожидает подтверждения';
}

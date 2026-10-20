import { supabase } from '../../services/supabase';

export type TrustedLink = {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_email: string;
  recipient_email: string;
};

type ContactResult = {
  links?: TrustedLink[];
  code?: string;
  expires_at?: string;
  sender_email?: string;
  ok?: boolean;
  error?: string;
};

const messages: Record<string, string> = {
  auth_required: 'Войдите в аккаунт заново.',
  invalid_code: 'Код неверный, просрочен или уже использован.',
  self_invite: 'Нельзя принять собственное приглашение.',
  already_connected: 'У отправителя уже есть доверенный контакт.',
  rate_limited: 'Лимит попыток исчерпан. Попробуйте через 15 минут.',
  not_found: 'Связь не найдена или недоступна. Обновите список.',
};

export async function contactRequest(
  action: 'list' | 'create' | 'preview' | 'accept' | 'revoke',
  inviteCode: string | null = null,
  linkId: string | null = null,
): Promise<ContactResult> {
  if (!supabase) throw new Error('Сначала заполните настройки Supabase.');
  const { data, error } = await supabase.rpc('contact_action', {
    action, invite_code: inviteCode, link_id: linkId,
  });
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Подключение контактов пока недоступно. Попробуйте позже.');
    }
    throw new Error('Не удалось подключиться. Проверьте интернет и обновите список.');
  }
  if (!data || typeof data !== 'object') throw new Error('Сервер вернул неожиданный ответ.');
  if (data.error) throw new Error(messages[data.error] ?? 'Не удалось выполнить действие.');
  return data as ContactResult;
}

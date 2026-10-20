import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, AppState, Keyboard, Pressable, Share, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Icon, IconTile, StitchButton as Action } from '../../components/Stitch';
import { colors } from '../../theme/colors';
import { contactRequest, type TrustedLink } from './contacts';

type Props = { userId: string; visible: boolean };

export function ContactsScreen({ userId, visible }: Props) {
  const [links, setLinks] = useState<TrustedLink[] | null>(null);
  const [invitation, setInvitation] = useState<{ code: string; expires: string } | null>(null);
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [enteringCode, setEnteringCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const active = useRef(true);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const refreshQueued = useRef(false);
  const outgoing = links?.find((link) => link.sender_id === userId);
  const incoming = links?.filter((link) => link.recipient_id === userId) ?? [];
  const disabled = busy;

  async function run(action: Parameters<typeof contactRequest>[0], linkId?: string) {
    if (inFlight.current) { if (action === 'list') refreshQueued.current = true; return; }
    inFlight.current = true;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await contactRequest(action, code, linkId);
      if (!active.current) return;
      if (action === 'create' && result.code && result.expires_at) {
        setInvitation({ code: result.code, expires: result.expires_at });
      }
      if (action === 'preview') { Keyboard.dismiss(); setPreview(result.sender_email ?? null); }
      if (action === 'accept') {
        Keyboard.dismiss(); setPreview(null); setCode(''); setEnteringCode(false); setMessage('Приглашение принято.');
      }
      if (action === 'revoke') setMessage('Связь удалена.');
      if (action !== 'preview') {
        const current = action === 'list' ? result : await contactRequest('list');
        if (!active.current) return;
        setLinks(current.links ?? []);
        if (current.links?.some((link) => link.sender_id === userId)) setInvitation(null);
      }
    } catch (cause) {
      if (active.current) {
        setMessage(''); setError(cause instanceof Error ? cause.message : 'Не удалось выполнить действие.');
        if (action === 'preview' || action === 'accept') setPreview(null);
      }
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
      if (refreshQueued.current) {
        refreshQueued.current = false;
        if (active.current && visibleRef.current) void run('list');
      }
    }
  }

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    if (visible) void run('list');
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active' && visible) void run('list');
    });
    return () => listener.remove();
  }, [visible]);

  function remove(link: TrustedLink) {
    Alert.alert('Удалить связь?', 'Обмен сигналами по этой связи будет прекращён.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => { void run('revoke', link.id); } },
    ]);
  }

  function person(link: TrustedLink, email: string) {
    return <View style={styles.person} key={link.id}>
      <IconTile name="account-outline" round size={40} /><Text style={[styles.identity, styles.grow]}>{email}</Text>
      <Pressable onPress={() => remove(link)} disabled={disabled} accessibilityRole="button"
        accessibilityLabel={`Удалить связь с ${email}`} accessibilityState={{ disabled }}
        style={({ pressed }) => [styles.deleteButton, (pressed || disabled) && styles.dim]}>
        <Icon name="trash-can-outline" size={22} color={colors.placeholder} />
      </Pressable>
    </View>;
  }

  return <View style={styles.screen}>
    <View style={styles.headingRow}><Text style={styles.heading} accessibilityRole="header">Контакты <Text style={styles.dot}>•</Text></Text>
      <Pressable onPress={() => { void run('list'); }} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
        style={({ pressed }) => [styles.refresh, (pressed || disabled) && styles.dim]}>
        <Icon name="sync" size={21} color={colors.secondary} /><Text style={styles.refreshLabel}>Обновить</Text>
      </Pressable>
    </View>
    {busy && <ActivityIndicator color={colors.accent} accessibilityLabel="Загрузка контактов" />}
    {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    {!!message && <Text style={styles.body} accessibilityLiveRegion="polite">{message}</Text>}

    <View style={styles.section}>
      <View style={styles.row}><Icon name="shield-account-outline" size={24} color={colors.accent} />
        <Text style={styles.sectionTitle}>КОМУ Я ОТПРАВЛЯЮ СИГНАЛЫ</Text></View>
      <Text style={styles.body}>Вы можете привязать одного доверенного получателя. Ваш тестовый SOS поступит именно ему.</Text>
      {links === null ? <Text style={styles.body}>Загружаем контакты. При ошибке нажмите «Обновить».</Text> : outgoing ?
        <View style={styles.card}><View style={styles.wrapRow}><Text style={styles.caption}>ДОВЕРЕННЫЙ ПОЛУЧАТЕЛЬ</Text><Text style={styles.pill}>Связка активна</Text></View>
          {person(outgoing, outgoing.recipient_email)}</View> :
        <View style={styles.card}>
          <View style={styles.wrapRow}><Text style={styles.caption}><Text style={styles.dot}>● </Text> КОД ДЛЯ ПРИВЯЗКИ</Text><Text style={styles.pill}>Одноразовый</Text></View>
          {invitation && <>
            <View style={styles.codeBox}>
              <Text style={styles.codeCaption}>ПЕРЕДАЙТЕ КОД ДОВЕРЕННОМУ ЛИЦУ</Text>
              <Text selectable adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={styles.code} accessibilityLabel={`Код приглашения: ${invitation.code}`}>
                {invitation.code.match(/.{1,4}/g)?.join('-')}
              </Text>
              <View style={styles.row}><Icon name="clock-outline" size={16} color={colors.placeholder} />
                <Text style={[styles.expiry, styles.grow]}>Действует до {new Date(invitation.expires).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text></View>
            </View>
            <Action title="Поделиться кодом" icon="share-variant-outline" tone="gold" disabled={disabled} onPress={() => {
              void Share.share({ message: `Код приглашения TUMAR: ${invitation.code}. Введите его в приложении, чтобы получать мои сигналы. Действует 24 часа.` })
                .catch(() => setError('Не удалось поделиться кодом. Его можно скопировать долгим нажатием.'));
            }} />
          </>}
          <Action title={invitation ? 'Создать новый код' : 'Создать приглашение'} icon={invitation ? 'sync' : 'account-plus-outline'}
            tone={invitation ? 'plain' : 'gold'} disabled={disabled} onPress={() => { void run('create'); }} />
          {invitation && <Text style={styles.footnote}>Предыдущий код станет недействительным сразу после генерации.</Text>}
        </View>}
    </View>

    <View style={styles.section}>
      <View style={styles.row}><Icon name="bell-ring-outline" size={24} color="#BCC7DC" /><Text style={[styles.sectionTitle, styles.incomingTitle]}>ОТ КОГО Я ПОЛУЧАЮ СИГНАЛЫ</Text></View>
      <Text style={styles.body}>Люди, чьи тестовые сигналы вы готовы получать и просматривать.</Text>
      <View style={styles.card}>
        <View style={styles.wrapRow}><Text style={styles.caption}>АКТИВНАЯ СВЯЗЬ</Text><Text style={styles.pill}>{incoming.length} подключено</Text></View>
        {links !== null && incoming.length === 0 && <Text style={styles.body}>Пока никто не подключён.</Text>}
        {incoming.map((link) => person(link, link.sender_email))}
      </View>
      {!enteringCode ? <Pressable onPress={() => { setEnteringCode(true); setError(''); }} accessibilityRole="button"
        style={({ pressed }) => [styles.codeEntry, pressed && styles.dim]}>
        <IconTile name="numeric" size={32} /><Text style={[styles.identity, styles.grow]}>У меня есть код приглашения</Text><Icon name="chevron-right" size={24} color={colors.placeholder} />
      </Pressable> : <View style={styles.card}>
        <Text style={styles.body}>Введите код человека, чьи сигналы вы готовы получать.</Text>
        <Text style={styles.label}>Код приглашения</Text>
        <TextInput style={styles.input} placeholder="AB12-CD34-EF56"
          placeholderTextColor={colors.placeholder} accessibilityLabel="Код приглашения"
          autoCapitalize="characters" autoCorrect={false} value={code} editable={!disabled}
          maxLength={32} selectionColor={colors.accent} keyboardAppearance="dark" returnKeyType="done"
          onSubmitEditing={() => { if (!disabled && code.trim()) void run('preview'); }}
          onChangeText={(value) => { setCode(value); setPreview(null); setError(''); setMessage(''); }} />
        {preview ? <>
          <Text style={styles.identity}>{preview}</Text>
          <Text style={styles.body}>Вы будете получать сигналы этого человека.</Text>
          <Action title="Принять приглашение" icon="account-check-outline" tone="gold" disabled={disabled} onPress={() => { void run('accept'); }} />
        </> : <Action title="Проверить код" icon="magnify" tone="gold" disabled={disabled || !code.trim()} onPress={() => { void run('preview'); }} />}
        <Action title="Отмена" disabled={disabled} onPress={() => { Keyboard.dismiss(); setEnteringCode(false); setPreview(null); setCode(''); }} />
      </View>}
    </View>
    <View style={styles.info}><Icon name="lock-outline" size={24} color={colors.accent} /><View style={styles.grow}>
      <Text style={styles.identity}>Доверенная связь</Text><Text style={styles.body}>Принимайте код только от знакомого человека. Удалить связь можно в любой момент.</Text>
    </View></View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: 24 }, grow: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 4 },
  heading: { fontSize: 24, lineHeight: 32, fontWeight: '700', color: colors.text }, dot: { color: colors.gold },
  refresh: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1A2027', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  refreshLabel: { fontSize: 14, fontWeight: '700', color: colors.secondary },
  section: { gap: 12 }, sectionTitle: { color: colors.accent, fontSize: 14, lineHeight: 20, fontWeight: '700', flexShrink: 1 }, incomingTitle: { color: '#BCC7DC' },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 16, marginTop: 4 },
  caption: { color: colors.secondary, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  pill: { color: colors.accent, backgroundColor: '#2D3030', borderRadius: 16, paddingVertical: 4, paddingHorizontal: 10, fontSize: 11, fontWeight: '700' },
  body: { color: colors.placeholder, fontSize: 14, lineHeight: 23 }, identity: { color: colors.text, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  codeBox: { backgroundColor: colors.input, borderRadius: 12, padding: 16, gap: 14, alignItems: 'center' },
  codeCaption: { color: colors.placeholder, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  code: { color: colors.accent, fontSize: 24, lineHeight: 34, fontWeight: '700', textAlign: 'center', letterSpacing: 2, fontFamily: 'monospace', alignSelf: 'stretch' },
  expiry: { color: colors.secondary, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  footnote: { color: colors.placeholder, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 8, backgroundColor: '#1A2027' },
  deleteButton: { minWidth: 44, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  codeEntry: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 16, backgroundColor: colors.surface, minHeight: 72 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: colors.input, color: colors.text, borderRadius: 8, minHeight: 56, padding: 16, fontSize: 18 },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 20, borderRadius: 12, backgroundColor: colors.input },
  dim: { opacity: 0.5 }, error: { color: '#FFB4AB', fontSize: 14, lineHeight: 22 },
});

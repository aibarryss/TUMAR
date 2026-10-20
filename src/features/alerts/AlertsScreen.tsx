import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContactsScreen } from '../contacts/ContactsScreen';
import { AccountDialog } from '../../components/AccountDialog';
import { Icon, IconTile, StitchButton as Action } from '../../components/Stitch';
import { colors } from '../../theme/colors';
import { alertStatus, type TestAlert } from './alerts';
import { useAlerts } from './useAlerts';
import { usePushNotifications } from '../push/usePushNotifications';

type Props = { userId: string; email: string; onSignOut: () => Promise<void>; signingOut: boolean; authError: string | null };
const date = (value: string) => new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function AlertsScreen({ userId, email, onSignOut, signingOut, authError }: Props) {
  const [tab, setTab] = useState<'home' | 'contacts'>('home');
  const [accountOpen, setAccountOpen] = useState(false);
  const [mapError, setMapError] = useState('');
  const scroll = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const alerts = useAlerts(userId);
  const { snapshot, detail, selectedId, pending, busy, error, notice } = alerts;
  const disabled = busy || signingOut;
  const push = usePushNotifications(userId, id => {
    Keyboard.dismiss(); setAccountOpen(false); setTab('home'); setMapError(''); void alerts.open(id);
  }, () => { void alerts.refresh(); });

  function navigate(next: 'home' | 'contacts') {
    Keyboard.dismiss(); alerts.back(); setTab(next); setMapError('');
    if (next === 'home') void alerts.refresh();
  }
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [selectedId, tab]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!selectedId && tab === 'home') return false;
      navigate('home'); return true;
    });
    return () => listener.remove();
  }, [selectedId, tab]);

  function confirmSend() {
    Alert.alert('Отправить тестовый SOS?', 'Тестовый сигнал будет доступен вашему доверенному контакту. Экстренные службы не вызываются.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Отправить', onPress: () => { void alerts.send(); } },
    ]);
  }
  function status(event: TestAlert) {
    if (event.closed_at) return alertStatus(event);
    if (event.acknowledged_at) return event.sender_id === userId
      ? `${event.recipient_email} подтвердил просмотр` : 'Вы подтвердили просмотр';
    return event.sender_id === userId ? 'Сервер принял SOS. Ожидается подтверждение' : 'Ожидает вашего подтверждения';
  }
  function summary(event: TestAlert) {
    const incoming = event.sender_id !== userId;
    return <View key={event.id} style={[styles.card, incoming && styles.incoming]}>
      <View style={styles.wrapRow}><Text style={styles.badge}>● ТЕСТОВАЯ ТРЕВОГА</Text><Text style={styles.small}>{date(event.created_at)}</Text></View>
      <View style={styles.tight}>
        {!incoming && <Text style={styles.body}>Ваш сигнал для:</Text>}
        <Text style={incoming ? styles.title : styles.identity}>{incoming ? 'Сигнал от ' : ''}{incoming ? event.sender_email : event.recipient_email}</Text>
      </View>
      <View style={styles.statusBox}><Icon name={event.acknowledged_at ? 'check-circle-outline' : 'timer-sand'} size={21} color={colors.accent} />
        <Text style={styles.status}>{status(event)}</Text></View>
      <Action title={incoming && !event.acknowledged_at ? 'Посмотреть сигнал' : 'Подробнее'} icon={incoming ? 'eye-outline' : 'arrow-right'}
        onPress={() => { void alerts.open(event.id); }} disabled={disabled} compact={!incoming || Boolean(event.acknowledged_at)} tone={incoming && !event.acknowledged_at ? 'accent' : 'secondary'} />
    </View>;
  }

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        {selectedId ? <Pressable onPress={() => navigate('home')} accessibilityRole="button" accessibilityLabel="Назад на главную" style={styles.back}>
          <Icon name="arrow-left" size={20} color={colors.secondary} /><Text style={styles.body}>Назад</Text>
        </Pressable> : <Text style={styles.brand}>TUMAR <Text style={styles.brandDot}>•</Text></Text>}
        <Pressable onPress={() => { Keyboard.dismiss(); setAccountOpen(true); }} accessibilityRole="button" disabled={signingOut}
          accessibilityState={{ disabled: signingOut }} style={({ pressed }) => [styles.account, pressed && styles.dim]}>
          <Text style={styles.accountLabel}>Аккаунт</Text><View style={styles.avatar}><Icon name="account-outline" size={20} color={colors.onGold} /></View>
        </Pressable>
      </View>
    </View>
    <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.screen}>
        {!!authError && <Text style={styles.error} accessibilityRole="alert">{authError}</Text>}
        <View style={tab !== 'contacts' || selectedId ? styles.hidden : undefined}
          accessibilityElementsHidden={tab !== 'contacts' || Boolean(selectedId)}
          importantForAccessibility={tab !== 'contacts' || selectedId ? 'no-hide-descendants' : 'auto'}>
          <ContactsScreen userId={userId} visible={tab === 'contacts' && !selectedId} />
        </View>
        {tab === 'home' && <>
          <View style={styles.pageHeading}><Text style={styles.heading} accessibilityRole="header">{selectedId ? 'Тестовый сигнал' : 'Главная'}</Text>
            {!selectedId && <Text style={styles.small}>Тестовый режим</Text>}</View>
          {busy && <View style={styles.row} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.accent} /><Text style={styles.body}>Проверяем данные…</Text>
          </View>}
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          {!!notice && <Text style={styles.body} accessibilityLiveRegion="polite">{notice}</Text>}
          {!!mapError && <Text style={styles.error} accessibilityRole="alert">{mapError}</Text>}
          {selectedId ? detail ? <>
            <View style={styles.role}><Icon name={detail.sender_id === userId ? 'send-outline' : 'account-check-outline'} size={18} color={colors.onGold} />
              <Text style={styles.roleLabel}>{detail.sender_id === userId ? 'Вы отправитель' : 'Вы получатель'}</Text></View>
            <View style={styles.detailCard}>
              <Text style={[styles.badge, styles.goldBadge]}>● ТЕСТОВЫЙ СИГНАЛ</Text>
              <View style={styles.inset}>
                <View style={styles.row}><Icon name="swap-horizontal" size={20} color="#BCC7DC" />
                  <Text style={[styles.body, styles.grow]}>{detail.sender_id === userId ? 'Ваш сигнал для: ' : 'Сигнал от: '}
                    <Text style={styles.identity}>{detail.sender_id === userId ? detail.recipient_email : detail.sender_email}</Text></Text></View>
                <View style={styles.row}><Icon name={detail.closed_at || detail.acknowledged_at ? 'check-circle-outline' : 'timer-sand'} size={20} color={colors.accent} />
                  <Text style={[styles.title, styles.grow]}>{status(detail)}</Text></View>
              </View>
              {!detail.closed_at && detail.recipient_id === userId && !detail.acknowledged_at &&
                <Action title="Подтвердить просмотр" icon="eye-outline" tone="gold" disabled={disabled} onPress={() => { void alerts.act('ack'); }} />}
              {!detail.closed_at && detail.sender_id === userId &&
                <Action title="Завершить тест" icon="close-circle-outline" disabled={disabled} onPress={() => { void alerts.act('finish'); }} />}
              <Text style={styles.body}>Подтверждение означает только просмотр сигнала, а не оказание помощи.</Text>
              {detail.sender_id === userId && !detail.closed_at && detail.push_state && <Text style={styles.body}>{
                detail.push_state === 'no_device' ? 'У получателя ещё нет телефона с подключёнными уведомлениями. Сигнал доступен ему в приложении.'
                  : detail.push_state === 'failed' ? 'Уведомление не отправлено. Сигнал сохранён и доступен получателю в приложении.'
                  : detail.push_state === 'queued' ? 'Уведомление ожидает отправки. Сигнал уже сохранён.'
                  : 'Push-сервис принял уведомление. Ожидаем подтверждения просмотра человеком.'
              }</Text>}
            </View>
            <Action title="Проверить состояние" icon="sync" onPress={() => { void alerts.refresh(); }} disabled={disabled} />
            <View style={styles.detailCard}>
              <View style={styles.row}><Icon name="clock-outline" size={20} color={colors.accent} /><Text style={styles.cardTitle}>Хронология проверки</Text></View>
              {[
                ['Создан:', date(detail.created_at)],
                ['Подтверждён:', detail.acknowledged_at ? date(detail.acknowledged_at) : detail.closed_at ? 'Без подтверждения' : 'Ожидается'],
                ['Завершён:', detail.closed_at ? date(detail.closed_at) : 'В процессе'],
              ].map(([label, value]) => <View style={styles.timeRow} key={label}><Text style={styles.body}>{label}</Text><Text style={styles.time}>{value}</Text></View>)}
            </View>
            <View style={styles.detailCard}>
              <View style={styles.row}><View style={styles.grow}><Text style={styles.eyebrow}>КОНТРОЛЬНАЯ ОТМЕТКА</Text>
                <Text style={[styles.title, styles.locationTitle]}>Тестовая точка — Семей</Text></View><IconTile name="flag-outline" round size={40} /></View>
              <View style={styles.inset}><View style={styles.row}><Icon name="information-outline" size={20} color={colors.placeholder} />
                <Text style={[styles.body, styles.grow]}>Демонстрационная точка. Это не ваше местоположение.</Text></View></View>
              <Action title="Открыть тестовую точку в картах" icon="navigation-variant-outline" onPress={() => {
                setMapError('');
                void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${detail.latitude},${detail.longitude}`)
                  .catch(() => setMapError('Не удалось открыть карты. Попробуйте ещё раз.'));
              }} />
            </View>
          </> : <>
            <Text style={styles.body}>{busy ? 'Открываем сигнал…' : 'Не удалось загрузить сигнал. Проверьте ещё раз или вернитесь назад.'}</Text>
            <Action title="Проверить состояние" icon="sync" onPress={() => { void alerts.refresh(); }} disabled={disabled} />
          </> : <>
            <View style={styles.sectionHeading}><Text style={styles.eyebrow}>ПОЛУЧАЕТ МОИ СИГНАЛЫ</Text>
              {snapshot?.recipient_email && <Text style={styles.small}>1 доверенный контакт</Text>}</View>
            <View style={styles.card}>
              {snapshot === null ? <Text style={styles.body}>Загружаем данные. При ошибке нажмите «Проверить сигналы».</Text>
                : snapshot.recipient_email ? <>
                  <View style={styles.row}><IconTile name="shield-account-outline" /><View style={styles.grow}>
                    <Text style={styles.small}>Ваш сигнал получит:</Text><Text style={styles.identity}>{snapshot.recipient_email}</Text>
                    <Text style={styles.linkBadge}>Связка активна</Text></View></View>
                  {!pending && !snapshot.outgoing && <Action title="Отправить тестовый SOS" icon="broadcast" tone="sos" onPress={confirmSend} disabled={disabled} />}
                  <Text style={styles.footnote}>Это тест. Экстренные службы не вызываются.</Text>
                </> : <>
                  <Text style={styles.title}>Подключите близкого</Text>
                  <Text style={styles.body}>Выберите человека, которому будете отправлять сигналы.</Text>
                  <Action title="Добавить контакт" icon="account-plus-outline" onPress={() => navigate('contacts')} tone="gold" />
                </>}
            </View>
            {snapshot?.outgoing && summary(snapshot.outgoing)}
            <View style={styles.sectionHeading}><Text style={styles.eyebrow}>ВХОДЯЩИЕ ТРЕВОГИ / СИГНАЛЫ</Text><Text style={styles.goldDot}>●</Text></View>
            {snapshot && snapshot.incoming.length === 0 && <Text style={styles.body}>Новых сигналов нет.</Text>}
            {snapshot?.incoming.map(summary)}
            {pending && <View style={styles.pendingCard}>
              <View style={styles.row}><IconTile name="cloud-sync-outline" round size={32} /><View style={styles.grow}><Text style={styles.identity}>Проверяем отправку…</Text>
                <Text style={styles.small}>Уточняем результат запроса</Text></View></View>
              <View style={styles.row}><View style={styles.grow}><Action title="Проверить" icon="magnify" onPress={() => { void alerts.refresh(); }} disabled={disabled} /></View>
                <View style={styles.grow}><Action title="Повторить" icon="restore" onPress={confirmSend} disabled={disabled} /></View></View>
              <Text style={styles.small}>Повтор не создаст второй сигнал</Text>
            </View>}
            <View style={styles.sectionHeading}><Text style={styles.eyebrow}>ПРОВЕРКА СИГНАЛОВ</Text><Text style={styles.small}>Ручной опрос</Text></View>
            <Action title="Проверить сигналы" icon="refresh" onPress={() => { void alerts.refresh(); }} disabled={disabled} />
            <View style={styles.info}><Icon name="bell-off-outline" size={20} color={colors.placeholder} />
              <Text style={[styles.body, styles.grow]}>{push === 'ready' ? 'Уведомления включены на этом телефоне. Сигналы также можно проверить вручную.'
                : push === 'denied' ? 'Уведомления запрещены. Разрешите их в настройках Android или проверяйте сигналы вручную.'
                : push === 'unavailable' ? 'В Expo Go доступна ручная проверка. Для push установите Android APK.'
                : push === 'loading' ? 'Подключаем уведомления. Ручная проверка уже доступна.'
                : 'Не удалось подключить уведомления. Проверьте интернет и откройте приложение снова. Ручная проверка доступна.'}</Text></View>
          </>}
        </>}
      </View>
    </ScrollView>
    <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {(['home', 'contacts'] as const).map((name) => <Pressable key={name} accessibilityRole="tab"
        accessibilityState={{ selected: tab === name }} onPress={() => navigate(name)}
        style={({ pressed }) => [styles.tab, tab === name && styles.selectedTab, pressed && styles.dim]}>
        <Icon name={name === 'home' ? 'shield-outline' : 'account-group-outline'} size={24} color={tab === name ? colors.accent : colors.secondary} />
        <Text style={[styles.tabLabel, tab === name && styles.activeTab]}>{name === 'home' ? 'Главная' : 'Контакты'}</Text>
      </Pressable>)}
    </View>
    <AccountDialog visible={accountOpen} email={email} busy={signingOut} error={authError} onClose={() => setAccountOpen(false)} onSignOut={onSignOut} />
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, backgroundColor: '#0D1319', elevation: 3 },
  headerRow: { width: '100%', maxWidth: 390, alignSelf: 'center', minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { fontSize: 18, fontWeight: '700', color: colors.accent, letterSpacing: 2 }, brandDot: { color: colors.gold },
  back: { flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44, paddingRight: 8 },
  account: { minHeight: 44, borderRadius: 28, paddingLeft: 12, paddingRight: 8, paddingVertical: 6, backgroundColor: '#1A2027', flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountLabel: { fontSize: 12, fontWeight: '600', color: colors.secondary },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  scroll: { flex: 1 }, content: { paddingHorizontal: 16, paddingBottom: 32, alignItems: 'center' },
  screen: { width: '100%', maxWidth: 358, gap: 16 }, hidden: { display: 'none' }, grow: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, wrapRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  pageHeading: { gap: 4, paddingTop: 8, paddingBottom: 8 }, heading: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: colors.text },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  eyebrow: { fontSize: 12, lineHeight: 18, fontWeight: '700', color: colors.secondary }, goldDot: { color: colors.accent, fontSize: 14 },
  card: { padding: 16, borderRadius: 12, backgroundColor: colors.surface, gap: 16, elevation: 2 },
  detailCard: { padding: 20, borderRadius: 12, backgroundColor: colors.surface, gap: 14 },
  incoming: { borderLeftWidth: 6, borderLeftColor: colors.accent, paddingLeft: 10 },
  title: { fontSize: 18, lineHeight: 25, fontWeight: '700', color: colors.text },
  cardTitle: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: colors.text, flexShrink: 1 },
  identity: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: colors.text }, tight: { gap: 2 },
  body: { fontSize: 14, lineHeight: 22, color: colors.secondary }, small: { fontSize: 12, lineHeight: 18, color: colors.placeholder },
  statusBox: { padding: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A2027' },
  status: { fontSize: 13, lineHeight: 20, color: colors.text, flex: 1 },
  badge: { fontSize: 12, lineHeight: 17, fontWeight: '700', color: '#FFB4AB', alignSelf: 'flex-start', backgroundColor: '#3B3236', borderRadius: 16, paddingVertical: 4, paddingHorizontal: 8 },
  goldBadge: { color: colors.accent, backgroundColor: '#252A32', paddingHorizontal: 12 },
  linkBadge: { color: colors.accent, backgroundColor: '#35332D', borderRadius: 12, fontSize: 10, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start', marginTop: 8 },
  footnote: { fontSize: 12, lineHeight: 18, color: colors.placeholder, textAlign: 'center', marginTop: -8 },
  inset: { backgroundColor: colors.input, padding: 14, borderRadius: 8, gap: 10 },
  role: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.accent, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 24 },
  roleLabel: { color: colors.onGold, fontSize: 12, fontWeight: '700' },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6, backgroundColor: colors.input, padding: 12, borderRadius: 8 },
  time: { fontSize: 14, lineHeight: 22, fontWeight: '500', color: colors.text, flexShrink: 1 }, locationTitle: { color: colors.accent, marginTop: 4 },
  pendingCard: { backgroundColor: colors.input, borderRadius: 12, padding: 16, gap: 16 },
  info: { backgroundColor: '#121A20', borderRadius: 8, padding: 14, gap: 10, flexDirection: 'row', alignItems: 'flex-start', marginTop: -8 },
  dim: { opacity: 0.5 }, error: { color: '#FFB4AB', fontSize: 14, lineHeight: 22 },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface },
  tab: { flex: 1, minHeight: 64, borderTopWidth: 2, borderTopColor: 'transparent', paddingTop: 10, paddingHorizontal: 8, gap: 6, alignItems: 'center', justifyContent: 'center' },
  selectedTab: { borderTopColor: colors.accent }, tabLabel: { fontSize: 12, color: colors.secondary }, activeTab: { color: colors.accent },
});

import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { Icon, IconTile } from './Stitch';

export function AccountDialog({ visible, email, busy, error, onClose, onSignOut }: {
  visible: boolean; email: string; busy: boolean; error: string | null; onClose: () => void; onSignOut: () => Promise<void>;
}) {
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрыть аккаунт" accessibilityRole="button" />
      <View style={styles.dialog} accessibilityViewIsModal>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.dialogContent}>
        <View style={styles.row}><IconTile name="account-cog-outline" round size={40} /><Text style={styles.title} accessibilityRole="header">Аккаунт</Text></View>
        <View style={styles.identity}>
          <Icon name="shield-check-outline" size={24} color={colors.secondary} />
          <View style={styles.grow}><Text style={styles.label}>УЧЁТНАЯ ЗАПИСЬ</Text><Text style={styles.email}>{email}</Text></View>
        </View>
        <Text style={styles.body}>Вы вошли в систему TUMAR. Обмен тестовыми сигналами привязан к этому адресу.</Text>
        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        <View style={styles.actions}>
          <Pressable disabled={busy} onPress={() => { void onSignOut(); }} accessibilityRole="button" accessibilityState={{ disabled: busy, busy }}
            style={({ pressed }) => [styles.action, styles.logout, (pressed || busy) && styles.dim]}>
            {busy ? <ActivityIndicator color="#FFB4AB" /> : <Icon name="logout" size={21} color="#FFB4AB" />}
            <Text style={styles.logoutLabel}>{busy ? 'Выходим…' : 'Выйти из аккаунта'}</Text>
          </Pressable>
          <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && styles.dim]}>
            <Text style={styles.closeLabel}>Закрыть</Text>
          </Pressable>
        </View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 342, maxHeight: '100%', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: '#26303B', elevation: 20, overflow: 'hidden' },
  scroll: { flexGrow: 0, flexShrink: 1 }, dialogContent: { padding: 24, gap: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, grow: { flex: 1 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, backgroundColor: '#1A2027' },
  label: { fontSize: 11, color: colors.placeholder, letterSpacing: 0.5, marginBottom: 4 },
  email: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: colors.secondary },
  body: { fontSize: 14, lineHeight: 23, color: colors.secondary },
  actions: { gap: 10, paddingTop: 4 },
  action: { minHeight: 52, padding: 14, borderRadius: 10, backgroundColor: '#1A2027', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  logout: { backgroundColor: '#30171E' }, logoutLabel: { fontSize: 14, color: '#FFB4AB', fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  closeLabel: { fontSize: 14, color: colors.text, fontWeight: '700' }, dim: { opacity: 0.5 },
  error: { color: '#FFB4AB', fontSize: 14, lineHeight: 20 },
});

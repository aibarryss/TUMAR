import { useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import {
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from './src/features/auth/useAuth';
import { AlertsScreen } from './src/features/alerts/AlertsScreen';
import { colors } from './src/theme/colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { session, restoring, busy, error, notice, authenticate, signOut, clearMessage, configured } = useAuth();
  const disabled = busy || !configured;

  async function submit() {
    if (await authenticate(mode, email, password)) {
      setPassword('');
      setPasswordVisible(false);
    }
  }

  if (session && !restoring) return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AlertsScreen key={session.user.id} userId={session.user.id}
        email={session.user.email ?? ''} onSignOut={signOut} signingOut={busy} authError={error} />
    </SafeAreaProvider>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.screen}>
          {!session && <View style={styles.header}>
            <View style={styles.emblem} accessible={false}>
              <View style={styles.pendant}>
                <View style={styles.pendantCenter} />
              </View>
            </View>
            <Text style={styles.title} accessibilityRole="header">TUMAR</Text>
            <View style={styles.divider} />
            <Text style={styles.description}>Оставайтесь на связи с близкими</Text>
          </View>}

          {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          {notice && <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text>}
          {restoring ? (
            <ActivityIndicator size="large" color={colors.accent} accessibilityLabel="Восстанавливаем вход" />
          ) : (
          <>
          <View style={styles.form}>
            {mode === 'register' && <Text style={styles.signedInTitle}>Создать аккаунт</Text>}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Feather name="mail" size={20} color={colors.accent} />
                <Text style={styles.label}>Электронная почта</Text>
              </View>
              <TextInput
                style={styles.input}
                accessibilityLabel="Электронная почта"
                placeholder="example@mail.ru"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                keyboardAppearance="dark"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                selectionColor={colors.accent}
                value={email}
                onChangeText={setEmail}
                editable={!busy}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Feather name="lock" size={20} color={colors.accent} />
                <Text style={styles.label}>Пароль</Text>
              </View>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  accessibilityLabel="Пароль"
                  placeholder="••••••••"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!passwordVisible}
                  keyboardAppearance="dark"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  selectionColor={colors.accent}
                  value={password}
                  onChangeText={setPassword}
                  editable={!busy}
                />
                <Pressable
                  style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}
                  onPress={() => setPasswordVisible((visible) => !visible)}
                  accessibilityRole="button"
                  accessibilityLabel={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <Feather
                    name={passwordVisible ? 'eye' : 'eye-off'}
                    size={23}
                    color={colors.secondary}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={submit}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ disabled, busy }}
              style={({ pressed }) => [styles.loginButton, (pressed || disabled) && styles.pressed]}
            >
              {busy ? <ActivityIndicator color={colors.onGold} /> : (
                <>
                  <Text style={styles.loginLabel}>{mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</Text>
                  <Feather name="arrow-right" size={22} color={colors.onGold} />
                </>
              )}
            </Pressable>
          </View>

          <Pressable
            disabled={busy}
            onPress={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setPassword('');
              setPasswordVisible(false);
              clearMessage();
            }}
            style={({ pressed }) => [styles.registerButton, (pressed || busy) && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.registerText}>
              {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{'  '}
              <Text style={styles.registerLink}>{mode === 'login' ? 'Создать аккаунт' : 'Войти'}</Text>
            </Text>
          </Pressable>
          </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: (Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 44) + 16,
    paddingBottom: 48,
  },
  screen: { width: '100%', maxWidth: 440 },
  header: { alignItems: 'center', paddingBottom: 32 },
  emblem: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 12,
    borderColor: '#2B2E30', backgroundColor: colors.input,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  pendant: {
    width: 20, height: 30, borderRadius: 12, borderWidth: 2,
    borderColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  pendantCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  title: { fontSize: 40, fontWeight: '700', letterSpacing: 8, paddingLeft: 8, color: colors.text },
  divider: { width: 48, height: 4, borderRadius: 2, backgroundColor: colors.gold, marginVertical: 16 },
  description: { fontSize: 18, lineHeight: 26, color: colors.secondary, textAlign: 'center' },
  form: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, gap: 20 },
  field: { gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: colors.text, fontSize: 16, fontWeight: '600', flexShrink: 1 },
  input: {
    minHeight: 56, paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 8, backgroundColor: colors.input, color: colors.text, fontSize: 18,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.input, borderRadius: 8 },
  passwordInput: { flex: 1, minWidth: 0 },
  eyeButton: { width: 56, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.55 },
  loginButton: {
    minHeight: 56, padding: 16, borderRadius: 12, backgroundColor: colors.gold,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loginLabel: { color: colors.onGold, fontSize: 18, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  registerButton: {
    alignSelf: 'center', marginTop: 32, paddingHorizontal: 20, paddingVertical: 16,
    minHeight: 56, borderRadius: 12, backgroundColor: '#1A2027', justifyContent: 'center',
  },
  registerText: { color: colors.secondary, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  registerLink: { color: colors.accent, fontWeight: '600', textDecorationLine: 'underline' },
  signedInTitle: { color: colors.text, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  error: { color: '#FFB4AB', fontSize: 16, lineHeight: 24, marginBottom: 16 },
  notice: { color: colors.secondary, fontSize: 16, lineHeight: 24, marginBottom: 16 },
});

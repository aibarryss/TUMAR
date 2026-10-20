import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';

export { Icon };
export type IconName = ComponentProps<typeof Icon>['name'];

export function StitchButton({ title, onPress, disabled = false, tone = 'secondary', icon, compact = false }: {
  title: string; onPress: () => void; disabled?: boolean;
  tone?: 'secondary' | 'gold' | 'accent' | 'sos' | 'plain'; icon?: IconName; compact?: boolean;
}) {
  const foreground = tone === 'gold' || tone === 'accent' ? colors.onGold : tone === 'sos' ? '#FFDAD6' : tone === 'plain' ? colors.accent : colors.text;
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
    style={({ pressed }) => [styles.button, styles[tone], compact && styles.compact, (pressed || disabled) && styles.dim]}>
    {icon && <Icon name={icon} size={compact ? 20 : 23} color={tone === 'secondary' ? colors.accent : foreground} />}
    <Text style={[styles.label, (compact || tone === 'plain') && styles.compactLabel, { color: foreground }]}>{title}</Text>
  </Pressable>;
}

export function IconTile({ name, round = false, size = 48 }: { name: IconName; round?: boolean; size?: number }) {
  return <View style={[styles.tile, { width: size, height: size, borderRadius: round ? size / 2 : 12 }]}><Icon name={name} size={size <= 32 ? 20 : 24} color={colors.accent} /></View>;
}

const styles = StyleSheet.create({
  button: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, lineHeight: 23, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  compact: { minHeight: 44, paddingVertical: 10, borderRadius: 8 }, compactLabel: { fontSize: 14, lineHeight: 20 },
  secondary: { backgroundColor: '#1A2027' }, gold: { backgroundColor: colors.gold }, accent: { backgroundColor: colors.accent },
  sos: { backgroundColor: '#93000A' }, plain: { backgroundColor: 'transparent' }, dim: { opacity: 0.5 },
  tile: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1A2027', alignItems: 'center', justifyContent: 'center' },
});

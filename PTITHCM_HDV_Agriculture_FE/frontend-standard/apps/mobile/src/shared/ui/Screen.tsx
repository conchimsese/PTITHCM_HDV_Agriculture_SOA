import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@agri/design-tokens';
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1 },
  brand: { color: colors.brand700, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  title: { fontSize: 27, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 23 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  label: { color: colors.ink, fontWeight: '600', fontSize: 13, marginBottom: 8 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.control,
    padding: 12,
    color: colors.ink,
    backgroundColor: colors.card,
    fontSize: 15,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.control,
    backgroundColor: colors.brand700,
    padding: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: colors.card, fontWeight: '700', fontSize: 14 },
  secondary: { backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.brand700 },
  danger: { backgroundColor: colors.danger },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  error: {
    color: colors.danger,
    backgroundColor: '#fff0ed',
    padding: 14,
    borderRadius: 12,
    lineHeight: 22,
  },
  success: {
    color: colors.brand700,
    backgroundColor: colors.surfaceSoft,
    padding: 14,
    borderRadius: 12,
    lineHeight: 22,
  },
  badge: {
    color: colors.brand700,
    backgroundColor: colors.surfaceSoft,
    padding: 9,
    borderRadius: radius.control,
    fontSize: 12,
  },
});
export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={ui.screen}>
      <KeyboardAvoidingView style={ui.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
          <Text style={ui.brand}>❧ Ruộng Lúa Việt</Text>
          <Text style={ui.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle && <Text style={ui.subtitle}>{subtitle}</Text>}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Action({
  title,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        secondary && ui.secondary,
        danger && ui.danger,
        { opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[ui.buttonText, secondary && ui.secondaryText]}>{title}</Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={ui.input}
        {...props}
      />
    </View>
  );
}
export function Loading() {
  return (
    <View style={ui.row}>
      <ActivityIndicator color={colors.brand700} />
      <Text style={ui.subtitle}>Đang tải…</Text>
    </View>
  );
}
export function Failure({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={ui.card}>
      <Text style={ui.error} accessibilityRole="alert">
        {error.message}
      </Text>
      <Action title="Thử lại" onPress={retry} secondary />
    </View>
  );
}

import { useState } from 'react';
import { AppButton } from '@components/ui/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Mascot } from '@components/mascot/Mascot';
import { AppText } from '@components/ui/AppText';
import { useAppTheme } from '@contexts/AppearanceContext';
import { ReceiptInboxGuidance } from './ReceiptInboxGuidance';

interface ReceiptInboxChoiceProps {
  disabled: boolean;
  onBack?: () => void;
  onChooseEmail: (provider: 'gmail' | 'outlook') => void;
  onChooseAlternative: () => void;
}

export function ReceiptInboxChoice({ disabled, onBack, onChooseEmail, onChooseAlternative }: ReceiptInboxChoiceProps) {
  const theme = useAppTheme();
  const [selected, setSelected] = useState<'gmail' | 'outlook' | null>(null);
  return <View style={styles.container}>
    {onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Back" accessibilityState={{ disabled }} disabled={disabled} onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
      <Ionicons name="chevron-back" size={26} color={theme.colors.primary} />
    </Pressable> : null}
    <Mascot pose="prop-receipt" size={118} style={styles.mascot} accessibilityLabel="SnackTrack holding a receipt" />
    <View style={styles.heading}>
      <AppText variant="eyebrow" tone="brand">ADD YOUR HISTORY</AppText>
      <AppText variant="pageTitle" style={styles.title}>Find your delivery orders</AppText>
      <AppText tone="muted" style={styles.body}>Connect the inbox where you receive Uber Eats or DoorDash receipts.</AppText>
    </View>
    <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.slate200, borderRadius: theme.radii.card }]}>
      {(['gmail', 'outlook'] as const).map((provider, index) => <View key={provider}>
        {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} /> : null}
        <Pressable accessibilityRole="radio" accessibilityLabel={provider === 'gmail' ? 'Gmail' : 'Outlook'} accessibilityHint="Select your email service, then continue" accessibilityState={{ disabled, checked: selected === provider }} disabled={disabled} onPress={() => setSelected(provider)} style={({ pressed }) => [styles.row, (pressed || selected === provider) && { backgroundColor: theme.colors.infoBg }, disabled && styles.disabled]}>
          <View style={[styles.icon, { backgroundColor: theme.colors.chipActiveBg }]}><Ionicons name="mail-outline" size={24} color={theme.colors.primary} accessible={false} /></View>
          <AppText variant="surfaceTitle" style={styles.copy}>{provider === 'gmail' ? 'Gmail' : 'Outlook'}</AppText>
          <Ionicons name={selected === provider ? "checkmark-circle" : "ellipse-outline"} size={24} color={theme.colors.primary} />
        </Pressable>
      </View>)}
    </View>
    <AppText variant="metadata" tone="muted" style={styles.inboxNote}>This can be different from your SnackTrack sign-in email.</AppText>
    <View style={styles.actions}>
      <AppText variant="metadata" tone="muted" style={styles.note}>You’ll choose an account and review access before importing.</AppText>
      <AppButton label={selected ? `Continue with ${selected === 'gmail' ? 'Gmail' : 'Outlook'}` : 'Choose an inbox to continue'} size="journey" disabled={disabled || !selected} onPress={() => { if (selected) onChooseEmail(selected); }} />
      <AppButton label="Use another method" variant="tertiary" disabled={disabled} onPress={onChooseAlternative} />
    </View>
    <View style={styles.help}><ReceiptInboxGuidance showInboxNote={false} /></View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actions: { marginTop: 'auto', paddingTop: 24, gap: 10 },
  note: { textAlign: 'center' },
  inboxNote: { marginTop: 12 },
  back: { minWidth: 44, minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginBottom: 8 },
  mascot: { alignSelf: 'center', marginBottom: 16 },
  heading: { marginBottom: 18 },
  title: { marginTop: 5 },
  body: { marginTop: 12 },
  group: { borderWidth: 1, overflow: 'hidden' },
  row: { minHeight: 68, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  help: { marginTop: 18 },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.55 },
});

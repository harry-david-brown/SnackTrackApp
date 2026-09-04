import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { toDomainError } from '@utils/domainError';

interface MicrosoftEmailVerificationModalProps {
  visible: boolean;
  suggestedEmail?: string;
  onSendCode(email: string): Promise<{ resendAfter: number }>;
  onConfirm(email: string, code: string): Promise<void>;
  onCancel(): void;
}

export const MicrosoftEmailVerificationModal: React.FC<
  MicrosoftEmailVerificationModalProps
> = ({ visible, suggestedEmail, onSendCode, onConfirm, onCancel }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState(suggestedEmail ?? '');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (visible) {
      setEmail(suggestedEmail ?? '');
      setCode('');
      setCodeSent(false);
      setError(null);
      setResendSeconds(0);
    }
  }, [suggestedEmail, visible]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const sendCode = async () => {
    if (!email.trim()) {
      setError('Enter the email address you want to use for SnackTrack.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await onSendCode(email.trim());
      setCodeSent(true);
      setResendSeconds(result.resendAfter);
    } catch (value: unknown) {
      setError(toDomainError(value).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(email.trim(), code);
    } catch (value: unknown) {
      setError(toDomainError(value).message);
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card} accessibilityViewIsModal>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel Microsoft sign-in"
          >
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Confirm your email</Text>
          <Text style={styles.subtitle}>
            Microsoft did not provide an email we can safely verify. Confirm one with SnackTrack to
            finish signing in.
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.emailInput}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (codeSent) {
                  setCodeSent(false);
                  setCode('');
                }
              }}
              editable={!busy}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.gray500}
              accessibilityLabel="Email address"
            />
          </View>
          {codeSent ? (
            <View style={styles.inputContainer}>
              <Ionicons name="keypad-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
                editable={!busy}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor={theme.colors.gray500}
                accessibilityLabel="Six digit verification code"
              />
            </View>
          ) : null}
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[styles.primaryButton, busy && styles.disabledButton]}
            onPress={() => void (codeSent ? confirm() : sendCode())}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? 'Please wait…' : codeSent ? 'Confirm and Sign In' : 'Send Code'}
            </Text>
          </TouchableOpacity>
          {codeSent ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => void sendCode()}
              disabled={busy || resendSeconds > 0}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || resendSeconds > 0 }}
            >
              <Text style={styles.secondaryButtonText}>
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.helperText}>
            You are not connected to Outlook by doing this. Mailbox access is requested separately.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.alpha(theme.colors.black, 0.5),
  },
  card: { backgroundColor: theme.colors.white, borderRadius: 20, padding: 24 },
  closeButton: { alignSelf: 'flex-end', padding: 8, minWidth: 44, minHeight: 44 },
  title: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '500', marginBottom: 8 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  emailInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 16 },
  codeInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
  error: { color: theme.colors.errorDark, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  disabledButton: { backgroundColor: theme.colors.gray400 },
  primaryButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '600' },
  secondaryButton: { alignItems: 'center', paddingVertical: 14, minHeight: 44 },
  secondaryButtonText: { color: theme.colors.infoLink, fontSize: 15, fontWeight: '600' },
  helperText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 12,
  },
});

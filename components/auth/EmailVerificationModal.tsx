import type { AppTheme } from '@constants/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@services/authApi';
import { showAlert } from '@utils/platformAlert';
import { toDomainError } from '@utils/domainError';
import {
  verificationCodeFailure,
  verificationCodeMessage,
} from '@features/auth/contracts';
import { useAppTheme } from '@contexts/AppearanceContext';

interface EmailVerificationModalProps {
  visible: boolean;
  email: string;
  onVerified: () => void | Promise<void>;
  onClose: () => void;
}

const RESEND_COOLDOWN = 60;
type VerificationFlowState =
  | 'idle'
  | 'sending'
  | 'awaiting_code'
  | 'verifying'
  | 'invalid_code'
  | 'expired_code'
  | 'retryable'
  | 'success';

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  visible,
  email,
  onVerified,
  onClose,
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [code, setCode] = useState('');
  const [flowState, setFlowState] = useState<VerificationFlowState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;
  const isSending = flowState === 'sending';
  const isVerifying = flowState === 'verifying';

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendTimer]);

  const sendVerificationCode = useCallback(async () => {
    if (!email) return;
    setError(null);
    try {
      setFlowState('sending');
      const response = await authApi.sendVerificationEmail({ email });
      setResendTimer(response.expiresIn || RESEND_COOLDOWN);
      setFlowState('awaiting_code');
      // Removed alert - user can see the code input field is ready
    } catch (err: unknown) {
      const domainError = toDomainError(err);
      if (domainError.code === 'EMAIL_ALREADY_VERIFIED') {
        showAlert('Already Verified', 'This email is already verified.');
        setFlowState('success');
        await onVerifiedRef.current();
        return;
      }
      setFlowState('retryable');
      setError(domainError.message);
    }
  }, [email]);

  useEffect(() => {
    if (visible && email) {
      void sendVerificationCode();
    } else if (!visible) {
      setCode('');
      setError(null);
      setFlowState('idle');
      setResendTimer(0);
    }
  }, [email, sendVerificationCode, visible]);

  const handleVerify = async () => {
    if (code.length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    try {
      setFlowState('verifying');
      await authApi.verifyEmailCode({ email, code });
      setFlowState('success');
      showAlert('Email Verified', 'Your email has been verified successfully!');
      await onVerified();
    } catch (err: unknown) {
      const failure = verificationCodeFailure(toDomainError(err));
      setFlowState(
        failure === 'invalid' ? 'invalid_code' : failure === 'expired' ? 'expired_code' : 'retryable',
      );
      if (failure === 'expired') setResendTimer(0);
      setError(verificationCodeMessage(failure, 'email'));
    }
  };

  const handleResend = async () => {
    if ((resendTimer > 0 && flowState !== 'expired_code') || isSending) return;
    await sendVerificationCode();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close email verification"
          >
            <Ionicons name="close" size={22} color={theme.colors.inkNearBlack} />
          </TouchableOpacity>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit verification code to {email}. Enter it below to verify your email address.
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons name="keypad-outline" size={20} color={theme.colors.textSecondary} style={styles.icon} />
            <TextInput
              value={code}
              onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
              placeholder="123456"
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
              accessibilityLabel="Six-digit email verification code"
            />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.primaryButton, (isVerifying || !code) && styles.disabledButton]}
            onPress={handleVerify}
            disabled={isVerifying || !code}
            accessibilityRole="button"
            accessibilityState={{ disabled: isVerifying || !code, busy: isVerifying }}
          >
            <Text style={styles.primaryButtonText}>
              {isVerifying ? 'Verifying...' : 'Confirm Email'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, (resendTimer > 0 || isSending) && styles.disabledButton]}
            onPress={handleResend}
            disabled={(resendTimer > 0 && flowState !== 'expired_code') || isSending}
            accessibilityRole="button"
            accessibilityState={{
              disabled: (resendTimer > 0 && flowState !== 'expired_code') || isSending,
              busy: isSending,
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {flowState === 'expired_code'
                ? 'Send New Code'
                : resendTimer > 0
                  ? `Resend in ${resendTimer}s`
                  : flowState === 'retryable'
                    ? 'Try Sending Again'
                    : 'Resend Code'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Didn&apos;t get it? Check spam or promotions folders, or add noreply@getsnacktrack.com to contacts.
          </Text>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Skip email verification for now"
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.alpha(theme.colors.black, 0.5),
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 24,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 8,
    color: theme.colors.inkNearBlack,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    letterSpacing: 4,
    color: theme.colors.inkNearBlack,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.success,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderColor: theme.colors.slate200,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  helperText: {
    fontSize: 13,
    color: theme.colors.gray600,
    marginTop: 16,
    lineHeight: 18,
  },
  error: {
    color: theme.colors.error,
    marginBottom: 4,
    fontSize: 14,
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default EmailVerificationModal;

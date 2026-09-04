import type { AppTheme } from '@constants/theme';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@services/authApi';
import { toDomainError } from '@utils/domainError';
import {
  VerificationCodeFailure,
  verificationCodeFailure,
  verificationCodeMessage,
} from '@features/auth/contracts';
import { useAppTheme } from '@contexts/AppearanceContext';

type ResetStep = 'request' | 'verify' | 'reset' | 'success';
type PendingResetAction = 'request' | 'verify' | 'complete' | null;

interface PasswordResetModalProps {
  visible: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

const RESEND_COOLDOWN = 60;

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  visible,
  onClose,
  defaultEmail = '',
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [step, setStep] = useState<ResetStep>('request');
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingResetAction>(null);
  const [codeFailure, setCodeFailure] = useState<VerificationCodeFailure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [attemptLimit, setAttemptLimit] = useState<number | null>(null);
  const codeInputRef = useRef<TextInput>(null);
  const isLoading = pendingAction !== null;

  useEffect(() => {
    if (visible) {
      setEmail(defaultEmail);
    }
  }, [defaultEmail, visible]);

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

  // Handle keyboard transition when step changes to 'reset'
  useEffect(() => {
    if (step === 'reset') {
      // Blur the code input to dismiss numeric keyboard
      // This allows the password field's autoFocus to work with the correct keyboard type
      if (codeInputRef.current) {
        codeInputRef.current.blur();
      }
    }
  }, [step]);

  const resetState = () => {
    setStep('request');
    setEmail(defaultEmail);
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setPendingAction(null);
    setCodeFailure(null);
    setError(null);
    setResendTimer(0);
    setAttemptLimit(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validatePassword = useMemo(
    () => (password: string) => {
      const errors: string[] = [];
      if (password.length < 8) errors.push('At least 8 characters');
      if (!/[A-Z]/.test(password)) errors.push('At least 1 uppercase letter');
      if (!/[0-9]/.test(password)) errors.push('At least 1 number');
      return errors;
    },
    []
  );

  const handleRequestCode = async () => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      setPendingAction('request');
      const response = await authApi.requestPasswordReset({ email: trimmedEmail });
      setStep('verify');
      setCodeFailure(null);
      setResendTimer(response.expiresIn || RESEND_COOLDOWN);
      setAttemptLimit(response.attemptLimit ?? null);
      // Removed alert - user can see the step change to 'verify'
    } catch (err: unknown) {
      setError(toDomainError(err).message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    await handleRequestCode();
  };

  const handleVerifyCode = async () => {
    setError(null);
    if (code.length < 6) {
      setError('Enter the 6-digit code we emailed to you.');
      return;
    }
    try {
      setPendingAction('verify');
      await authApi.verifyPasswordResetCode({ email: email.trim().toLowerCase(), code });
      setCodeFailure(null);
      setStep('reset');
      // Removed alert - user can see the step change to 'reset'
    } catch (err: unknown) {
      const failure = verificationCodeFailure(toDomainError(err));
      setCodeFailure(failure);
      setError(verificationCodeMessage(failure, 'reset'));
      if (failure === 'expired') setResendTimer(0);
    } finally {
      setPendingAction(null);
    }
  };

  const handleCompleteReset = async () => {
    setError(null);
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length) {
      setError(`Password requirements:\n• ${passwordErrors.join('\n• ')}`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please confirm your new password.');
      return;
    }
    try {
      setPendingAction('complete');
      await authApi.completePasswordReset({
        email: email.trim().toLowerCase(),
        code,
        newPassword,
      });
      setStep('success');
    } catch (err: unknown) {
      const domainError = toDomainError(err);
      if (
        domainError.code === 'VERIFICATION_CODE_INVALID'
        || domainError.code === 'VERIFICATION_CODE_NOT_PENDING'
      ) {
        const failure = verificationCodeFailure(domainError);
        setCodeFailure(failure);
        setStep('verify');
        setResendTimer(0);
        setError(verificationCodeMessage(failure, 'reset'));
      } else {
        setError(domainError.message);
      }
    } finally {
      setPendingAction(null);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'request':
        return (
          <>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter the email you use for SnackTrack and we&apos;ll send you a secure reset code.
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.icon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              onPress={handleRequestCode}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </Text>
            </TouchableOpacity>
          </>
        );
      case 'verify':
        return (
          <>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to {email}. Enter it below to continue.
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color={theme.colors.textSecondary} style={styles.icon} pointerEvents="none" />
              <TextInput
                ref={codeInputRef}
                value={code}
                onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                style={styles.input}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                editable={true}
                autoFocus={step === 'verify'}
                autoCorrect={false}
              />
            </View>
            {attemptLimit && (
              <Text style={styles.helperText}>
                You have {attemptLimit} attempts remaining before the code expires.
              </Text>
            )}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              onPress={handleVerifyCode}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>{isLoading ? 'Verifying...' : 'Verify Code'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                resendTimer > 0 && codeFailure !== 'expired' && styles.disabledButton,
              ]}
              onPress={handleResend}
              disabled={(resendTimer > 0 && codeFailure !== 'expired') || isLoading}
            >
              <Text style={styles.secondaryButtonText}>
                {codeFailure === 'expired'
                  ? 'Request New Code'
                  : resendTimer > 0
                    ? `Resend in ${resendTimer}s`
                    : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </>
        );
      case 'reset':
        return (
          <>
            <Text style={styles.title}>Create a New Password</Text>
            <Text style={styles.subtitle}>
              Make sure your password is strong and unique. You’ll use it next time you sign in.
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.icon} pointerEvents="none" />
              <TextInput
                key={`new-password-${step}`}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                style={styles.input}
                secureTextEntry={true}
                autoCapitalize="none"
                keyboardType="default"
                returnKeyType="next"
                blurOnSubmit={false}
                editable={true}
                autoCorrect={false}
                autoFocus={step === 'reset'}
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.icon} pointerEvents="none" />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                style={styles.input}
                secureTextEntry={true}
                autoCapitalize="none"
                keyboardType="default"
                returnKeyType="done"
                editable={true}
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              onPress={handleCompleteReset}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Saving...' : 'Save New Password'}
              </Text>
            </TouchableOpacity>
          </>
        );
      case 'success':
        return (
          <>
            <Text style={styles.title}>Password Updated 🎉</Text>
            <Text style={styles.subtitle}>
              You can now sign in with your new password. Keep it somewhere safe.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
              <Text style={styles.primaryButtonText}>Return to Sign In</Text>
            </TouchableOpacity>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={theme.colors.inkNearBlack} />
          </TouchableOpacity>
          {renderContent()}
          {error && <Text style={styles.error}>{error}</Text>}
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
    shadowColor: theme.colors.black,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 10,
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
    marginBottom: 20,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 14,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.inkNearBlack,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.slate200,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  error: {
    color: theme.colors.error,
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  helperText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
});

export default PasswordResetModal;

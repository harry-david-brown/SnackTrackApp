import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../services/authApi';

interface EmailVerificationModalProps {
  visible: boolean;
  email: string;
  onVerified: () => void;
  onClose: () => void;
}

const RESEND_COOLDOWN = 60;

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  visible,
  email,
  onVerified,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

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

  useEffect(() => {
    if (visible && email) {
      sendVerificationCode();
    } else if (!visible) {
      setCode('');
      setError(null);
      setIsSending(false);
      setIsVerifying(false);
      setResendTimer(0);
    }
  }, [visible, email]);

  const sendVerificationCode = async () => {
    if (!email) return;
    setError(null);
    try {
      setIsSending(true);
      const response = await authApi.sendVerificationEmail({ email });
      setResendTimer(response.expiresIn || RESEND_COOLDOWN);
      // Removed alert - user can see the code input field is ready
    } catch (err: any) {
      // Handle backend error format: error.error?.message
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          err.message || 
                          'Unable to send verification email.';
      
      // Handle "already verified" case
      if (errorMessage.toLowerCase().includes('already verified')) {
        Alert.alert('Already Verified', 'This email is already verified.');
        onVerified(); // Update state to reflect verified status
        return;
      }
      
      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    try {
      setIsVerifying(true);
      await authApi.verifyEmailCode({ email, code });
      Alert.alert('Email Verified', 'Your email has been verified successfully!');
      onVerified();
    } catch (err: any) {
      // Handle backend error format: error.error?.message
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          err.message || 
                          'Invalid code. Please try again.';
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isSending) return;
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
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={22} color="#111" />
          </TouchableOpacity>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit verification code to {email}. Enter it below to verify your email address.
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons name="keypad-outline" size={20} color="#666" style={styles.icon} />
            <TextInput
              value={code}
              onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
              placeholder="123456"
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.primaryButton, (isVerifying || !code) && styles.disabledButton]}
            onPress={handleVerify}
            disabled={isVerifying || !code}
          >
            <Text style={styles.primaryButtonText}>
              {isVerifying ? 'Verifying...' : 'Confirm Email'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, (resendTimer > 0 || isSending) && styles.disabledButton]}
            onPress={handleResend}
            disabled={resendTimer > 0 || isSending}
          >
            <Text style={styles.secondaryButtonText}>
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Didn&apos;t get it? Check spam or promotions folders, or add noreply@getsnacktrack.com to contacts.
          </Text>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onClose}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    color: '#111',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderColor: '#d0d7de',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  helperText: {
    fontSize: 13,
    color: '#777',
    marginTop: 16,
    lineHeight: 18,
  },
  error: {
    color: '#D14343',
    marginBottom: 4,
    fontSize: 14,
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default EmailVerificationModal;



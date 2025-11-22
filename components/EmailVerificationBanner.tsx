import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import EmailVerificationModal from './EmailVerificationModal';

interface EmailVerificationBannerProps {
  onDismiss?: () => void;
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ onDismiss }) => {
  const { state, markEmailVerified } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if user is verified or dismissed
  if (!state.user || state.user.emailVerified || isDismissed) {
    return null;
  }

  const handleVerify = () => {
    setShowModal(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleVerificationSuccess = () => {
    markEmailVerified();
    setShowModal(false);
    setIsDismissed(true);
  };

  return (
    <>
      <View style={styles.banner}>
        <View style={styles.content}>
          <Ionicons name="mail-outline" size={20} color="#007AFF" style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              Confirm your email address to secure your account
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerify}
          >
            <Text style={styles.verifyButtonText}>Verify</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
          >
            <Ionicons name="close" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <EmailVerificationModal
        visible={showModal}
        email={state.user.email}
        onVerified={handleVerificationSuccess}
        onClose={() => setShowModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
});

export default EmailVerificationBanner;



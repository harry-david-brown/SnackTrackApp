import React, { useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@contexts/UserContext';
import EmailVerificationModal from './EmailVerificationModal';
import { useAppTheme } from '@contexts/AppearanceContext';
import { AppText } from '@components/ui/AppText';

interface EmailVerificationBannerProps {
  onDismiss?: () => void;
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ onDismiss }) => {
  const { state, markEmailVerified } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

  const handleVerificationSuccess = async () => {
    await markEmailVerified();
    setShowModal(false);
    setIsDismissed(true);
  };

  return (
    <>
      <View style={styles.banner}>
        <View style={styles.content}>
          <Ionicons name="mail-outline" size={20} color={theme.colors.primary} style={styles.icon} />
          <View style={styles.textContainer}>
            <AppText variant="rowTitle" style={styles.title}>Verify your email</AppText>
            <AppText variant="metadata" style={styles.subtitle}>
              Optional for now. Verify to help protect account recovery.
            </AppText>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerify}
            accessibilityRole="button"
            accessibilityLabel="Verify email address"
          >
            <AppText variant="button" style={styles.verifyButtonText}>Verify</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss email verification reminder"
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
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

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  banner: {
    backgroundColor: theme.colors.infoBg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.card,
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
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  verifyButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
  dismissButton: {
    padding: 4,
  },
});

export default EmailVerificationBanner;

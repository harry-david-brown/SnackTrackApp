import { Colors } from '@constants/theme';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalShellStyles } from './profileModalStyles';

interface HelpSupportModalProps {
  visible: boolean;
  onClose: () => void;
  onPrivacyPolicy: () => void;
  onDeleteAccount: () => void;
  isDeleting: boolean;
}

export function HelpSupportModal({
  visible,
  onClose,
  onPrivacyPolicy,
  onDeleteAccount,
  isDeleting,
}: HelpSupportModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalShellStyles.modalOverlay}>
        <View style={modalShellStyles.modalContent}>
          <View style={modalShellStyles.modalHeader}>
            <Text style={modalShellStyles.modalTitle}>Help & Support</Text>
            <TouchableOpacity onPress={onClose} style={modalShellStyles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={modalShellStyles.modalBody}>
            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>📋 Data & tracking</Text>
              <Text style={styles.helpSectionText}>
                Fastest start:{'\n'}
                1. Open Data & tracking{'\n'}
                2. Choose Gmail or Outlook{'\n'}
                3. Connect the email registered with your delivery apps{'\n'}
                4. Start a one-time email check when you are ready{'\n\n'}
                If email does not cover your orders, choose Import delivery history and follow the guided provider steps.
              </Text>
            </View>

            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>❓ Frequently Asked Questions</Text>
              <Text style={styles.helpSectionText}>
                <Text style={styles.helpQuestion}>Q: How long does it take to process my data?</Text>{'\n'}
                A: Email scans begin only after you review and start them. Delivery history files begin processing as soon as you choose the ZIP.{'\n\n'}

                <Text style={styles.helpQuestion}>Q: Is my data secure?</Text>{'\n'}
                A: We don’t sell your data or use receipt details to target ads. Limited app and device information may be processed by service providers as described in our privacy policy.{'\n\n'}

                <Text style={styles.helpQuestion}>Q: Which import method should I use?</Text>{'\n'}
                A: Choose the email service registered with your delivery apps for the quickest setup. Choose None of the above for phone-number, Apple sign-in, or other email accounts.{'\n\n'}

                <Text style={styles.helpQuestion}>Q: Can I delete my account?</Text>{'\n'}
                A: Yes, you can delete your account directly from the Account Deletion section below.
              </Text>
            </View>

            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>📧 Contact Us</Text>
              <Text style={styles.helpSectionText}>
                Need help? Reach out to us:{'\n'}
                Email: hello@getsnacktrack.com
              </Text>
            </View>

            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>🔒 Privacy Policy</Text>
              <TouchableOpacity onPress={onPrivacyPolicy} style={styles.privacyLink}>
                <Text style={styles.privacyLinkText}>View Privacy Policy</Text>
                <Ionicons name="open-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>🗑️ Account Deletion</Text>
              <TouchableOpacity
                onPress={onDeleteAccount}
                style={styles.deleteAccountButton}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <>
                    <Text style={styles.deleteAccountButtonText}>Delete My Account</Text>
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.deleteAccountWarning}>
                This will permanently delete all your data. This action cannot be undone.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  helpSection: {
    marginBottom: 24,
  },
  helpSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  helpSectionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  helpQuestion: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.infoBg,
    borderRadius: 8,
    marginTop: 8,
  },
  privacyLinkText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.errorSurfaceSoft,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.errorLegacySurface,
  },
  deleteAccountButtonText: {
    fontSize: 15,
    color: Colors.error,
    fontWeight: '500',
  },
  deleteAccountWarning: {
    fontSize: 12,
    color: Colors.gray500,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default HelpSupportModal;

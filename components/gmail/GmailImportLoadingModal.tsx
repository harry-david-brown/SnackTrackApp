import { Colors } from '@constants/theme';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type GmailPrimaryFlowState } from '@hooks/useGmailImport';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';

const GMAIL_IMPORT_MESSAGES = [
  'This can take up to 1-2 minutes depending on your gluttony.',
  'Questioning every late-night delivery choice with professional courtesy.',
  'Sorting tacos from impulse purchases.',
  'Teaching Gmail what counts as dinner.',
  'Looking for receipts and trying not to judge the sauce math.',
  'Counting fries with unnecessary precision.',
  'Separating real meals from side-quest snacks.',
];

export type GmailConnectPhase = 'idle' | 'connecting' | 'connected';

interface GmailImportLoadingModalProps {
  flowState: GmailPrimaryFlowState;
  connectPhase: GmailConnectPhase;
  visible: boolean;
}

/**
 * Full-screen progress modal for Gmail connection and manual imports.
 * Import results are presented separately with explicit navigation choices.
 */
export function GmailImportLoadingModal({
  flowState,
  connectPhase,
  visible,
}: GmailImportLoadingModalProps) {
  // A successful connect gets its own celebratory beat, distinct from an import.
  const showConnectSuccess = connectPhase === 'connected';
  const showSuccess = showConnectSuccess;
  const [messageIndex, setMessageIndex] = useState(0);
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!visible) {
      setMessageIndex(0);
      cardScale.setValue(0.92);
      cardOpacity.setValue(0);
      messageOpacity.setValue(1);
      successScale.setValue(0.7);
      return;
    }

    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    if (showSuccess) {
      successScale.setValue(0.7);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 95,
        useNativeDriver: true,
      }).start();
      return;
    }

    const messageTimer = setInterval(() => {
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((current) => (current + 1) % GMAIL_IMPORT_MESSAGES.length);
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    }, 3200);

    return () => {
      clearInterval(messageTimer);
    };
  }, [cardOpacity, cardScale, showSuccess, messageOpacity, successScale, visible]);

  const isConnecting = connectPhase === 'connecting';
  const inProgressTitle = isConnecting ? 'Connecting Gmail' : 'Importing from Gmail';
  const statusText = isConnecting
    ? 'Securing your inbox connection...'
    : flowState === 'preparing_import'
      ? 'Warming up the inbox...'
      : 'Importing receipt evidence...';
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={styles.loadingModalOverlay}>
        <Animated.View
          style={[
            styles.loadingModalCard,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {showConnectSuccess ? (
            <>
              {/* MASCOT: connect success — friendly wave (replaces the old native alert) */}
              <Animated.View
                style={[
                  styles.successMascotWrap,
                  {
                    transform: [{ scale: successScale }],
                  },
                ]}
              >
                <MascotPlaceholder pose="wave" size={96} />
              </Animated.View>

              <Text style={styles.loadingModalTitle}>Gmail connected!</Text>
              <Text style={styles.loadingModalSuccessText}>
                You&apos;re all set — import your receipts to get started.
              </Text>
            </>
          ) : (
            <>
              {/* MASCOT: in progress — hand-on-chin thinking */}
              <View style={styles.loadingIconWrap}>
                <View style={styles.loadingMascotBadge}>
                  <MascotPlaceholder pose="thinking" size={84} />
                </View>
                <ActivityIndicator size="small" color={Colors.primary} style={styles.loadingSpinnerBelowMascot} />
              </View>

              <Text style={styles.loadingModalTitle}>{inProgressTitle}</Text>
              <Text style={styles.loadingModalStatus}>{statusText}</Text>

              {!isConnecting && (
                <Animated.Text style={[styles.loadingModalMessage, { opacity: messageOpacity }]}>
                  {GMAIL_IMPORT_MESSAGES[messageIndex]}
                </Animated.Text>
              )}

              <View style={styles.loadingModalFooter}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.loadingModalFooterText}>
                  {isConnecting
                    ? 'Hang tight while we finish connecting your inbox.'
                    : 'Keep this open while SnackTrack does the inbox archaeology.'}
                </Text>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loadingModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.alpha(Colors.slateInk, 0.62),
    padding: 24,
  },
  loadingModalCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 12,
  },
  loadingIconWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 18,
  },
  loadingMascotBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.chipActiveBg,
  },
  successMascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loadingSpinnerBelowMascot: {
    marginTop: 8,
  },
  loadingModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  loadingModalStatus: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingModalMessage: {
    minHeight: 56,
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 18,
  },
  loadingModalSuccessText: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
  },
  loadingModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  loadingModalFooterText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
});

export default GmailImportLoadingModal;

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type GmailPrimaryFlowState } from '../../hooks/useGmailImport';
import { type GmailImportResponse } from '../../services/gmailApi';
import { MascotPlaceholder } from '../mascot/MascotPlaceholder';

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
  importResult: GmailImportResponse | null;
  connectPhase: GmailConnectPhase;
  visible: boolean;
}

/**
 * Full-screen modal covering the Gmail connect + import lifecycle:
 * connecting → connected (wave beat) and preparing/importing → imported
 * (celebration beat). Success feedback lives here, not in native alerts,
 * so nothing pops over the mascot.
 */
export function GmailImportLoadingModal({
  flowState,
  importResult,
  connectPhase,
  visible,
}: GmailImportLoadingModalProps) {
  // A successful connect gets its own celebratory beat, distinct from an import.
  const showConnectSuccess = !importResult && connectPhase === 'connected';
  const showSuccess = importResult !== null || showConnectSuccess;
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
  const importedReceiptCount = importResult?.totalReceiptsImported ?? 0;

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
          {importResult ? (
            <>
              {/* MASCOT: import success — arms-up celebration */}
              <Animated.View
                style={[
                  styles.successMascotWrap,
                  {
                    transform: [{ scale: successScale }],
                  },
                ]}
              >
                <MascotPlaceholder pose="celebrate" size={96} />
              </Animated.View>

              <Text style={styles.loadingModalTitle}>
                {importedReceiptCount} receipt{importedReceiptCount === 1 ? '' : 's'} found
              </Text>
              <Text style={styles.loadingModalSuccessText}>
                Receipt evidence secured. Preparing your summary...
              </Text>
            </>
          ) : showConnectSuccess ? (
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
                <MascotPlaceholder pose="thinking" size={96} />
                <ActivityIndicator size="small" color="#1F4E3A" style={styles.loadingSpinnerBelowMascot} />
              </View>

              <Text style={styles.loadingModalTitle}>{inProgressTitle}</Text>
              <Text style={styles.loadingModalStatus}>{statusText}</Text>

              {!isConnecting && (
                <Animated.Text style={[styles.loadingModalMessage, { opacity: messageOpacity }]}>
                  {GMAIL_IMPORT_MESSAGES[messageIndex]}
                </Animated.Text>
              )}

              <View style={styles.loadingModalFooter}>
                <Ionicons name="time-outline" size={16} color="#6F756E" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    padding: 24,
  },
  loadingModalCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 12,
  },
  loadingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9F5E2',
    marginBottom: 18,
  },
  successMascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loadingSpinnerBelowMascot: {
    marginTop: 10,
  },
  loadingModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#222222',
    textAlign: 'center',
  },
  loadingModalStatus: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F4E3A',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingModalMessage: {
    minHeight: 56,
    fontSize: 16,
    color: '#6F756E',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 18,
  },
  loadingModalSuccessText: {
    fontSize: 16,
    color: '#6F756E',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
  },
  loadingModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  loadingModalFooterText: {
    flex: 1,
    fontSize: 12,
    color: '#6F756E',
    marginLeft: 6,
  },
});

export default GmailImportLoadingModal;

import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGmailImport } from '../../hooks/useGmailImport';
import { type GmailImportResponse } from '../../services/gmailApi';

interface GmailConnectionProps {
  onImportSuccess?: (result: GmailImportResponse) => void;
  onClose?: () => void;
  onDisconnectSuccess?: () => void;
}

export const GmailConnection: React.FC<GmailConnectionProps> = ({
  onImportSuccess,
  onClose,
  onDisconnectSuccess,
}) => {
  const {
    connectionStatus,
    isLoading,
    isChecking,
    disconnectGmail,
    formatExpiry,
  } = useGmailImport({ onImportSuccess, onDisconnectSuccess });

  const isConnected = connectionStatus.connected;
  const needsReconnect = connectionStatus.needsReconnect;

  useEffect(() => {
    if (!isChecking && !isConnected) {
      onClose?.();
    }
  }, [isChecking, isConnected, onClose]);

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1F4E3A" />
        <Text style={styles.loadingText}>Checking Gmail connection...</Text>
      </View>
    );
  }

  if (!isConnected) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="mail-open-outline" size={26} color="#1F4E3A" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>Gmail connection</Text>
            <Text style={styles.heroTitle}>{needsReconnect ? 'Reconnect required' : 'Your Gmail is ready'}</Text>
            <Text style={styles.heroDescription}>
              {needsReconnect
                ? 'Your Gmail access expired. Reconnect before importing new receipts.'
                : 'Import Uber Eats receipts from the inbox tied to your delivery apps.'}
            </Text>
          </View>
        </View>

        {connectionStatus.email && (
          <View style={styles.connectedEmailPill}>
            <Ionicons name="mail-outline" size={16} color="#6F756E" />
            <Text style={styles.connectedEmailText}>{connectionStatus.email}</Text>
          </View>
        )}

        {connectionStatus.statusMessage && (
          <Text style={styles.statusMessage}>{connectionStatus.statusMessage}</Text>
        )}

        {isConnected && connectionStatus.connectionMode === 'temporary' && connectionStatus.expiresAt && (
          <Text style={styles.statusMeta}>Temporary access expires {formatExpiry(connectionStatus.expiresAt)}</Text>
        )}

        {needsReconnect && (
          <Text style={styles.warningText}>Reconnect Gmail before importing again.</Text>
        )}
      </View>

      <View style={styles.actionCard}>
        {needsReconnect ? (
          <View style={styles.reconnectNotice}>
            <Ionicons name="information-circle-outline" size={18} color="#1F4E3A" />
            <Text style={styles.reconnectNoticeText}>
              Reconnect Gmail from the main upload page before running another import.
            </Text>
          </View>
        ) : (
          <View style={styles.manageNotice}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#1F4E3A" />
            <Text style={styles.manageNoticeText}>
              Gmail is connected. Start imports from the main upload page.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.tertiaryButton, isLoading && styles.buttonDisabled]}
          onPress={disconnectGmail}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#6F756E" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={18} color="#6F756E" />
              <Text style={styles.tertiaryButtonText}>Disconnect Gmail</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>What this screen is for</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>1</Text>
          <Text style={styles.infoText}>Check which Gmail account is currently connected</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>2</Text>
          <Text style={styles.infoText}>See whether Gmail needs to be reconnected</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>3</Text>
          <Text style={styles.infoText}>Disconnect Gmail if you no longer want inbox imports</Text>
        </View>
      </View>

      <View style={styles.privacyCard}>
        <Ionicons name="shield-checkmark" size={24} color="#1F4E3A" />
        <View style={styles.privacyContent}>
          <Text style={styles.privacyTitle}>Your privacy matters</Text>
          <Text style={styles.privacyText}>
            We only request read-only Gmail access. We do not store your inbox, and we only extract receipt data from matching Uber Eats emails.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6F756E',
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#E9F5E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroText: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F4E3A',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#222222',
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 15,
    color: '#6F756E',
    lineHeight: 22,
  },
  connectedEmailPill: {
    marginTop: 18,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  connectedEmailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6F756E',
    fontWeight: '500',
  },
  statusMessage: {
    fontSize: 14,
    color: '#6F756E',
    lineHeight: 20,
    marginTop: 14,
  },
  statusMeta: {
    fontSize: 13,
    color: '#6F756E',
    marginTop: 10,
  },
  warningText: {
    fontSize: 14,
    color: '#C2410C',
    marginTop: 10,
    fontWeight: '600',
  },
  actionCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 4,
  },
  manageNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F7FAF7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  manageNoticeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1F4E3A',
    lineHeight: 20,
    fontWeight: '500',
  },
  reconnectNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F7FAF7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  reconnectNoticeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1F4E3A',
    lineHeight: 20,
    fontWeight: '500',
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tertiaryButtonText: {
    color: '#6F756E',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#222222',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1F4E3A',
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#6F756E',
    lineHeight: 22,
  },
  privacyCard: {
    backgroundColor: '#FAF8F4',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  privacyContent: {
    flex: 1,
    marginLeft: 12,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1F4E3A',
  },
  privacyText: {
    fontSize: 14,
    color: '#6F756E',
    lineHeight: 20,
  },
});

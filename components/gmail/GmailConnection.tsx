import type { AppTheme } from '@constants/theme';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GmailConnectionStatus } from '@features/import-flow/contracts';
import { AppButton } from '@components/ui/AppButton';
import { useAppTheme } from '@contexts/AppearanceContext';

interface GmailConnectionProps {
  connectionStatus: GmailConnectionStatus;
  isLoading: boolean;
  isChecking: boolean;
  canCheckForNewOrders: boolean;
  onCheckForNewOrders: () => void;
  onDisconnect: () => void;
  onClose?: () => void;
}

export const GmailConnection: React.FC<GmailConnectionProps> = ({
  connectionStatus,
  isLoading,
  isChecking,
  canCheckForNewOrders,
  onCheckForNewOrders,
  onDisconnect,
  onClose,
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
            <Ionicons name="mail-open-outline" size={26} color={theme.colors.primary} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>Gmail connection</Text>
            <Text style={styles.heroTitle}>{needsReconnect ? 'Reconnect required' : 'Your Gmail is ready'}</Text>
            <Text style={styles.heroDescription}>
              {needsReconnect
                ? 'Your Gmail access expired. Reconnect before checking for new receipts.'
                : 'Review the Gmail account used for receipt scans and optional ongoing updates.'}
            </Text>
          </View>
        </View>

        {connectionStatus.email && (
          <View style={styles.connectedEmailPill}>
            <Ionicons name="mail-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.connectedEmailText}>{connectionStatus.email}</Text>
          </View>
        )}

        {connectionStatus.statusMessage && (
          <Text style={styles.statusMessage}>{connectionStatus.statusMessage}</Text>
        )}

        {isConnected && connectionStatus.connectionMode === 'temporary' && connectionStatus.expiresAt && (
          <Text style={styles.statusMeta}>Temporary access expires {new Date(connectionStatus.expiresAt).toLocaleString()}</Text>
        )}

        {needsReconnect && (
          <Text style={styles.warningText}>Reconnect Gmail before importing again.</Text>
        )}
      </View>

      <View style={styles.actionCard}>
        {needsReconnect ? (
          <View style={styles.reconnectNotice}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.reconnectNoticeText}>
              Reconnect Gmail from Data & tracking before running another scan.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.manageNotice}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.manageNoticeText}>
                Gmail is connected. Ongoing updates handle new receipts automatically when enabled.
              </Text>
            </View>
            {canCheckForNewOrders ? (
              <AppButton
                label="Check for new orders"
                variant="secondary"
                icon="refresh-outline"
                pending={isLoading}
                onPress={onCheckForNewOrders}
              />
            ) : null}
          </>
        )}

        <TouchableOpacity
          style={[styles.tertiaryButton, isLoading && styles.buttonDisabled]}
          onPress={onDisconnect}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textSecondary} />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={18} color={theme.colors.textSecondary} />
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
          <Text style={styles.infoText}>Run an optional manual check or disconnect Gmail when needed</Text>
        </View>
      </View>

      <View style={styles.privacyCard}>
        <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
        <View style={styles.privacyContent}>
          <Text style={styles.privacyTitle}>Your privacy matters</Text>
          <Text style={styles.privacyText}>
            We only request read-only Gmail access and do not store your inbox. One-time scans use matching Uber Eats receipts; history-file alerts, when explicitly enabled, check for Uber’s matching data-ready email but never open its link or download the file.
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: theme.colors.white,
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: theme.colors.black,
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
    backgroundColor: theme.colors.chipActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroText: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  connectedEmailPill: {
    marginTop: 18,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  connectedEmailText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  statusMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: 14,
  },
  statusMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
  warningText: {
    fontSize: 14,
    color: theme.colors.warningDeep,
    marginTop: 10,
    fontWeight: '600',
  },
  actionCard: {
    backgroundColor: theme.colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: theme.colors.black,
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
    backgroundColor: theme.colors.infoBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  manageNoticeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: theme.colors.primary,
    lineHeight: 20,
    fontWeight: '500',
  },
  reconnectNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.infoBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  reconnectNoticeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: theme.colors.primary,
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
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoCard: {
    backgroundColor: theme.colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: theme.colors.black,
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
    fontWeight: '500',
    marginBottom: 16,
    color: theme.colors.textPrimary,
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
    backgroundColor: theme.colors.primary,
    color: theme.colors.white,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  privacyCard: {
    backgroundColor: theme.colors.background,
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
    fontWeight: '500',
    marginBottom: 8,
    color: theme.colors.primary,
  },
  privacyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});

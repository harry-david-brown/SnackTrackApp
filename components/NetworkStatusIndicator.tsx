import { Colors } from '@/constants/theme';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface NetworkStatusIndicatorProps {
  showWhenConnected?: boolean;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showWhenConnected = false,
}) => {
  const { isConnected, isInternetReachable } = useNetworkStatus();

  // Don't show anything if connected and showWhenConnected is false
  if (isConnected && isInternetReachable && !showWhenConnected) {
    return null;
  }

  // Show offline indicator
  if (!isConnected || isInternetReachable === false) {
    return (
      <View style={styles.offlineContainer}>
        <Ionicons name="wifi-outline" size={16} color={Colors.warning} />
        <Text style={styles.offlineText}>No internet connection</Text>
      </View>
    );
  }

  // Show connected indicator (if requested)
  if (showWhenConnected && isConnected && isInternetReachable) {
    return (
      <View style={styles.connectedContainer}>
        <Ionicons name="wifi" size={16} color={Colors.success} />
        <Text style={styles.connectedText}>Connected</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  offlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningLegacySurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warningPale,
  },
  offlineText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.warningLegacyText,
    fontWeight: '500',
  },
  connectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLegacySurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.successLegacyBorder,
  },
  connectedText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.successDeeper,
    fontWeight: '500',
  },
});

export default NetworkStatusIndicator;

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
        <Ionicons name="wifi-outline" size={16} color="#FF9500" />
        <Text style={styles.offlineText}>No internet connection</Text>
      </View>
    );
  }

  // Show connected indicator (if requested)
  if (showWhenConnected && isConnected && isInternetReachable) {
    return (
      <View style={styles.connectedContainer}>
        <Ionicons name="wifi" size={16} color="#34C759" />
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
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAA7',
  },
  offlineText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  connectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4EDDA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#C3E6CB',
  },
  connectedText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
  },
});

export default NetworkStatusIndicator;

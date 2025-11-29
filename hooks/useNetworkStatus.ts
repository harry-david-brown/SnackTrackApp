import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

// Configure NetInfo to not show native banners (native only)
// Reduced timeouts for faster network change detection
if (Platform.OS !== 'web') {
  NetInfo.configure({
    reachabilityUrl: 'https://clients3.google.com/generate_204',
    reachabilityTest: async (response) => response.status === 204,
    reachabilityLongTimeout: 60 * 1000, // 60s
    reachabilityShortTimeout: 1 * 1000, // 1s - faster detection
    reachabilityRequestTimeout: 3 * 1000, // 3s - faster timeout
    shouldFetchWiFiSSID: false, // Disable native prompts
    useNativeReachability: false, // Disable native network reachability (prevents banner)
  });
}

export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
  });

  useEffect(() => {
    // Web: Use browser's navigator.onLine API
    if (Platform.OS === 'web') {
      const updateOnlineStatus = () => {
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        setNetworkStatus({
          isConnected: isOnline,
          isInternetReachable: isOnline,
          type: isOnline ? 'wifi' : 'none',
        });
      };

      // Set initial status
      updateOnlineStatus();

      // Listen for online/offline events
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);

      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }

    // Native: Use NetInfo
    // Fetch initial network state immediately
    NetInfo.fetch().then(state => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return networkStatus;
};

export default useNetworkStatus;

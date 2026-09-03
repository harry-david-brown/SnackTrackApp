/**
 * useNetworkStatus Hook Tests
 * Tests for network status monitoring
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  configure: jest.fn(),
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

describe('useNetworkStatus', () => {
  let mockUnsubscribe: jest.Mock;
  let mockListener: (state: any) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();
    
    // Mock fetch to return connected state by default
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      mockListener = callback;
      return mockUnsubscribe;
    });
  });

  it('should initialize with connected state', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isInternetReachable).toBe(true);
      expect(result.current.type).toBe('wifi');
    });
  });

  it('should update when network disconnects', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(result.current.type).toBe('wifi');
    });
    
    // Simulate network disconnection
    act(() => mockListener({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isInternetReachable).toBe(false);
    });
  });

  it('should update when network reconnects', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(result.current.type).toBe('wifi');
    });
    
    // Disconnect
    act(() => mockListener({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
    
    // Reconnect
    act(() => mockListener({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isInternetReachable).toBe(true);
      expect(result.current.type).toBe('wifi');
    });
  });

  it('should handle null isInternetReachable', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(result.current.type).toBe('wifi');
    });
    
    act(() => mockListener({
      isConnected: true,
      isInternetReachable: null,
      type: 'cellular',
    }));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isInternetReachable).toBe(null);
      expect(result.current.type).toBe('cellular');
    });
  });

  it('should cleanup listener on unmount', async () => {
    const { result, unmount } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.type).toBe('wifi'));
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should configure NetInfo on import', () => {
    expect(NetInfo.configure).toHaveBeenCalledWith(expect.objectContaining({
      shouldFetchWiFiSSID: false,
      useNativeReachability: false,
    }));
  });
});

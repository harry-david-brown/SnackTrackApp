// Jest setup file

// Set up test environment variables before any imports
process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://test-api.example.com';
process.env.EXPO_PUBLIC_APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';

// The native Sentry package starts a module-level cleanup interval as soon as
// it is imported. Tests exercise our adapter, not Sentry internals, so keep the
// suite deterministic and handle-free with a small adapter-compatible mock.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: (callback: (scope: { setTag: jest.Mock }) => void) => callback({ setTag: jest.fn() }),
  startSpan: (_options: unknown, callback: (span: object) => unknown) => callback({}),
}));

// Mock Expo modules
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  setParams: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: mockRouter,
  useRouter: () => ({
    push: mockRouter.push,
    replace: mockRouter.replace,
    back: mockRouter.back,
    setParams: mockRouter.setParams,
  }),
  useLocalSearchParams: () => ({}),
  Stack: ({ children }: { children: React.ReactNode }) => children,
  Tabs: ({ children }: { children: React.ReactNode }) => children,
  Tab: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock Expo Constants for environment config
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://test-api.example.com',
        appEnv: process.env.EXPO_PUBLIC_APP_ENV || 'development',
      },
    },
  },
}));

// Cleanup intervals after all tests to prevent open handles
afterAll(async () => {
  // Cleanup rate limiter interval
  try {
    const rateLimiterModule = require('../utils/rateLimiter');
    if (rateLimiterModule.destroyRateLimiter) {
      rateLimiterModule.destroyRateLimiter();
    }
  } catch (error) {
    // Ignore errors if module is not loaded
  }
  
  // Give time for cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});
